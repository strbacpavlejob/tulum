/**
 * HTTP-level checks for BUG-008: GET /events/active and /events/active/:id
 * must report the signed-in caller's favorites. Requests go through the real
 * ClerkAuthGuard, controllers, EventsCrudService and FavoritesService; Clerk
 * is stubbed, and Supabase is replaced by in-memory tables.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { FavoritesController } from '../favorites/favorites.controller';
import { FavoritesService } from '../favorites/favorites.service';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';
import { EventsCrudController } from './events-crud.controller';
import { EventsCrudService } from './events-crud.service';

const CALLER = 'user_caller';
const OTHER = 'user_other';
const TOKEN_USERS: Record<string, string> = {
  'caller-token': CALLER,
  'other-token': OTHER,
};
const AS_CALLER = { Authorization: 'Bearer caller-token' };
const AS_OTHER = { Authorization: 'Bearer other-token' };
const VENUE_ID = '7a1b2c3d-4e5f-4a6b-9c7d-8e9f0a1b2c3d';
const SAVED_EVENT = 'f5f8b2e0-bfcf-4a77-90b7-e7631f38a101';
const UNSAVED_EVENT = '3c9d4b8e-2f1a-4c6d-8e7f-5a4b3c2d1e0f';

type Row = Record<string, unknown>;
type Result = { data: unknown; error: unknown };

const hoursFromNow = (hours: number) =>
  new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

const event = (id: string, title: string): Row => ({
  id,
  title,
  description: '',
  picture_url: null,
  scraper: null,
  venue_id: VENUE_ID,
  status: 'active',
  start_date_time: hoursFromNow(2),
  end_date_time: hoursFromNow(6),
  tags: [],
});

// The caller saved one event and has only seen the other; OTHER saved the
// other one.
const seedTables = (): Record<string, Row[]> => ({
  events: [event(SAVED_EVENT, 'Saved'), event(UNSAVED_EVENT, 'Not saved')],
  venues: [
    {
      id: VENUE_ID,
      name: 'Witch Bar',
      latitude: 44.82,
      longitude: 20.45,
      address: 'Pariska 13',
      capacity: 80,
      venue_type: 'bar',
      picture_url: null,
      contact_id: null,
      requires_reservation: false,
    },
  ],
  event_engagements: [
    { user_id: CALLER, event_id: SAVED_EVENT, engagement_type: 'saved' },
    { user_id: CALLER, event_id: UNSAVED_EVENT, engagement_type: 'seen' },
    { user_id: OTHER, event_id: UNSAVED_EVENT, engagement_type: 'saved' },
  ],
  tickets: [],
});

let tables = seedTables();

// Just enough of the supabase-js query builder for the two services.
function from(table: string) {
  const rows = (tables[table] ??= []);
  const filters: ((row: Row) => boolean)[] = [];
  let deleting = false;
  const matching = () => rows.filter((row) => filters.every((f) => f(row)));
  const where = (filter: (row: Row) => boolean) => {
    filters.push(filter);
    return query;
  };

  const query = {
    select: () => query,
    order: () => query,
    limit: () => query,
    eq: (column: string, value: unknown) =>
      where((row) => row[column] === value),
    in: (column: string, values: unknown[]) =>
      where((row) => values.includes(row[column])),
    gte: (column: string, value: string) =>
      where((row) => String(row[column]) >= value),
    lte: (column: string, value: string) =>
      where((row) => String(row[column]) <= value),
    delete: () => {
      deleting = true;
      return query;
    },
    insert: (row: Row) => {
      rows.push(row);
      return Promise.resolve({ data: null, error: null });
    },
    upsert: (row: Row, options: { onConflict: string }) => {
      const keys = options.onConflict.split(',');
      if (!rows.some((existing) => keys.every((k) => existing[k] === row[k])))
        rows.push(row);
      return Promise.resolve({ data: null, error: null });
    },
    single: () => {
      const found = matching();
      return Promise.resolve(
        found.length === 1
          ? { data: found[0], error: null }
          : { data: null, error: { code: 'PGRST116' } },
      );
    },
    maybeSingle: () =>
      Promise.resolve({ data: matching()[0] ?? null, error: null }),
    then: (
      resolve: (value: Result) => unknown,
      reject: (reason: unknown) => unknown,
    ) => {
      const found = matching();
      if (deleting) {
        for (const row of found) rows.splice(rows.indexOf(row), 1);
      }
      return Promise.resolve({
        data: deleting ? null : found,
        error: null,
      }).then(resolve, reject);
    },
  };
  return query;
}

type ListedEvent = { id: string; isFavorite: boolean };
const favoritesIn = (body: unknown) =>
  Object.fromEntries(
    (body as { events: ListedEvent[] }).events.map((e) => [e.id, e.isFavorite]),
  );

describe('Favorites on the active events routes (BUG-008)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    // Real guard, fake Clerk: only the tokens in TOKEN_USERS are signed in.
    const clerkGuard = new ClerkAuthGuard(new Reflector());
    Object.assign(clerkGuard, {
      clerkClient: {
        authenticateRequest: (webRequest: Request) => {
          const token = (webRequest.headers.get('authorization') ?? '').replace(
            'Bearer ',
            '',
          );
          const userId = TOKEN_USERS[token];
          return Promise.resolve({
            isAuthenticated: userId !== undefined,
            toAuth: () => ({ userId }),
          });
        },
      },
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [EventsCrudController, FavoritesController],
      providers: [
        EventsCrudService,
        FavoritesService,
        { provide: APP_GUARD, useValue: clerkGuard },
        { provide: SupabaseService, useValue: { getClient: () => ({ from }) } },
        { provide: R2Service, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    // Same pipe as main.ts.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    tables = seedTables();
  });

  const http = () => request(app.getHttpServer());

  it('GET /events/active marks the events the signed-in caller saved', async () => {
    const res = await http().get('/events/active').set(AS_CALLER).expect(200);
    expect(favoritesIn(res.body)).toEqual({
      [SAVED_EVENT]: true,
      [UNSAVED_EVENT]: false,
    });
  });

  it('GET /events/active marks each caller’s own favorites', async () => {
    const res = await http().get('/events/active').set(AS_OTHER).expect(200);
    expect(favoritesIn(res.body)).toEqual({
      [SAVED_EVENT]: false,
      [UNSAVED_EVENT]: true,
    });
  });

  it('GET /events/active marks nothing without a valid token', async () => {
    const anonymous = await http().get('/events/active').expect(200);
    const invalid = await http()
      .get('/events/active')
      .set('Authorization', 'Bearer expired')
      .expect(200);
    for (const res of [anonymous, invalid]) {
      expect(favoritesIn(res.body)).toEqual({
        [SAVED_EVENT]: false,
        [UNSAVED_EVENT]: false,
      });
    }
  });

  it('GET /events/active?only_favorites=true lists the caller’s favorites', async () => {
    const res = await http()
      .get('/events/active?only_favorites=true')
      .set(AS_CALLER)
      .expect(200);
    expect(favoritesIn(res.body)).toEqual({ [SAVED_EVENT]: true });
  });

  it('GET /events/active/:id reports whether the caller saved the event', async () => {
    const saved = await http()
      .get(`/events/active/${SAVED_EVENT}`)
      .set(AS_CALLER)
      .expect(200);
    expect(saved.body).toMatchObject({ id: SAVED_EVENT, isFavorite: true });

    const seenOnly = await http()
      .get(`/events/active/${UNSAVED_EVENT}`)
      .set(AS_CALLER)
      .expect(200);
    expect(seenOnly.body).toMatchObject({
      id: UNSAVED_EVENT,
      isFavorite: false,
      isSeen: true,
    });

    const anonymous = await http()
      .get(`/events/active/${SAVED_EVENT}`)
      .expect(200);
    expect(anonymous.body).toMatchObject({ isFavorite: false });
  });

  it('a favorite saved with POST /favorites stays until DELETE /favorites removes it', async () => {
    const reload = async () => {
      const list = await http().get('/events/active').set(AS_CALLER);
      const details = await http()
        .get(`/events/active/${UNSAVED_EVENT}`)
        .set(AS_CALLER);
      return [
        favoritesIn(list.body)[UNSAVED_EVENT],
        (details.body as ListedEvent).isFavorite,
      ];
    };

    // Saving twice, as a heart that showed a stale state would, keeps it.
    for (let i = 0; i < 2; i++) {
      const saved = await http()
        .post('/favorites')
        .set(AS_CALLER)
        .send({ event_id: UNSAVED_EVENT })
        .expect(201);
      expect(saved.body).toEqual({ isFavorite: true });
    }
    expect(await reload()).toEqual([true, true]);

    const removed = await http()
      .delete(`/favorites?event_id=${UNSAVED_EVENT}`)
      .set(AS_CALLER)
      .expect(200);
    expect(removed.body).toEqual({ isFavorite: false });
    expect(await reload()).toEqual([false, false]);

    // OTHER's favorite of the same event is untouched.
    const other = await http().get('/events/active').set(AS_OTHER);
    expect(favoritesIn(other.body)[UNSAVED_EVENT]).toBe(true);
  });
});
