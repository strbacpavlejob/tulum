/**
 * HTTP-level checks for BUG-029: the Default Venue Type must be saved by
 * PATCH /settings/me and come back from GET /settings/me. Requests go through
 * the real ClerkAuthGuard, ValidationPipe, SettingsController and
 * SettingsService; Clerk is stubbed, and Supabase is replaced by an in-memory
 * settings table.
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
import { SupabaseService } from '../supabase/supabase.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

const CALLER = 'user_caller';
const AS_CALLER = { Authorization: 'Bearer caller-token' };

type Row = Record<string, unknown>;

// Whether supabase/migrations/20261024132329_add_settings_default_venue_type
// .sql has been applied. Like PostgREST, the fake refuses to write a column
// the table doesn't have.
let migrated = true;
const columns = () =>
  new Set([
    'user_id',
    'language',
    'theme',
    ...(migrated ? ['default_venue_type'] : []),
  ]);

const seedRow = (): Row => ({
  user_id: CALLER,
  language: 'EN',
  theme: 'dark',
  ...(migrated ? { default_venue_type: null } : {}),
});

let rows: Row[] = [];

// Just enough of the supabase-js query builder for SettingsService.
function from(table: string) {
  if (table !== 'settings') throw new Error(`unexpected table ${table}`);
  let userId: unknown;
  let upsert: Row | null = null;

  const run = () => {
    if (upsert) {
      const unknown = Object.keys(upsert).filter((c) => !columns().has(c));
      if (unknown.length > 0) {
        return { row: null, error: { code: 'PGRST204', unknown } };
      }
      let row = rows.find((r) => r.user_id === upsert!.user_id);
      if (!row) {
        row = migrated ? { default_venue_type: null } : {};
        rows.push(row);
      }
      Object.assign(row, upsert);
      return { row, error: null };
    }
    return { row: rows.find((r) => r.user_id === userId) ?? null, error: null };
  };

  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => {
      if (column === 'user_id') userId = value;
      return query;
    },
    upsert: (values: Row) => {
      upsert = values;
      return query;
    },
    maybeSingle: () => {
      const { row, error } = run();
      return Promise.resolve({ data: row ? { ...row } : null, error });
    },
    single: () => {
      const { row, error } = run();
      if (error) return Promise.resolve({ data: null, error });
      return Promise.resolve(
        row
          ? { data: { ...row }, error: null }
          : { data: null, error: { code: 'PGRST116' } },
      );
    },
  };
  return query;
}

const callerRow = () => rows.find((r) => r.user_id === CALLER);

describe('Default venue type on /settings/me (BUG-029)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    // Real guard, fake Clerk: only caller-token is signed in.
    const clerkGuard = new ClerkAuthGuard(new Reflector());
    Object.assign(clerkGuard, {
      clerkClient: {
        authenticateRequest: (webRequest: Request) => {
          const signedIn =
            webRequest.headers.get('authorization') === AS_CALLER.Authorization;
          return Promise.resolve({
            isAuthenticated: signedIn,
            toAuth: () => ({ userId: signedIn ? CALLER : undefined }),
          });
        },
      },
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        SettingsService,
        { provide: APP_GUARD, useValue: clerkGuard },
        { provide: SupabaseService, useValue: { getClient: () => ({ from }) } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    // Same pipe as main.ts.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    // The test before the migration expects a 500; keep its stack trace out
    // of the output.
    app.useLogger(false);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    migrated = true;
    rows = [seedRow()];
  });

  const http = () => request(app.getHttpServer());

  it('saves the default venue type and returns it on the next GET', async () => {
    const saved = await http()
      .patch('/settings/me')
      .set(AS_CALLER)
      .send({ default_venue_type: 'bar' })
      .expect(200);
    expect(saved.body).toStrictEqual({
      language: 'EN',
      theme: 'dark',
      default_venue_type: 'bar',
    });
    expect(callerRow()).toStrictEqual({
      ...seedRow(),
      default_venue_type: 'bar',
    });

    // What the app reads after a reload.
    const reloaded = await http()
      .get('/settings/me')
      .set(AS_CALLER)
      .expect(200);
    expect(reloaded.body).toStrictEqual(saved.body);
  });

  it('clears it with null', async () => {
    callerRow()!.default_venue_type = 'club';
    await http()
      .patch('/settings/me')
      .set(AS_CALLER)
      .send({ default_venue_type: null })
      .expect(200);
    expect(callerRow()).toStrictEqual(seedRow());
  });

  it('keeps it when only the language or theme changes', async () => {
    callerRow()!.default_venue_type = 'cafe';
    const saved = await http()
      .patch('/settings/me')
      .set(AS_CALLER)
      .send({ language: 'RS', theme: 'light' })
      .expect(200);
    expect(saved.body).toStrictEqual({
      language: 'RS',
      theme: 'light',
      default_venue_type: 'cafe',
    });
    expect(callerRow()).toStrictEqual({
      user_id: CALLER,
      language: 'SR',
      theme: 'light',
      default_venue_type: 'cafe',
    });
  });

  it('creates the settings row for a user who has none', async () => {
    rows = [];
    const before = await http().get('/settings/me').set(AS_CALLER).expect(200);
    expect(before.body).toStrictEqual({
      language: 'EN',
      theme: 'dark',
      default_venue_type: null,
    });

    await http()
      .patch('/settings/me')
      .set(AS_CALLER)
      .send({ default_venue_type: 'event_venue' })
      .expect(200);
    expect(rows).toStrictEqual([
      { ...seedRow(), default_venue_type: 'event_venue' },
    ]);
  });

  it.each([
    ['a venue type the app does not offer', { default_venue_type: 'pub' }],
    ['a venue type in the wrong case', { default_venue_type: 'Bar' }],
    ['a list of venue types', { default_venue_type: ['bar'] }],
    ['a language the app does not offer', { language: 'DE' }],
    ['a theme the app does not offer', { theme: 'neon' }],
  ])('refuses %s', async (_, body) => {
    await http().patch('/settings/me').set(AS_CALLER).send(body).expect(400);
    expect(rows).toStrictEqual([seedRow()]);
  });

  it('needs a signed-in caller', async () => {
    await http()
      .patch('/settings/me')
      .send({ default_venue_type: 'bar' })
      .expect(401);
    await http().get('/settings/me').expect(401);
    expect(rows).toStrictEqual([seedRow()]);
  });

  // The API may go out before the migration is applied.
  it('keeps language and theme working before the migration', async () => {
    migrated = false;
    rows = [seedRow()];

    const read = await http().get('/settings/me').set(AS_CALLER).expect(200);
    expect(read.body).toStrictEqual({
      language: 'EN',
      theme: 'dark',
      default_venue_type: null,
    });

    await http()
      .patch('/settings/me')
      .set(AS_CALLER)
      .send({ theme: 'light' })
      .expect(200);
    expect(callerRow()).toStrictEqual({ ...seedRow(), theme: 'light' });

    // Only the venue type itself needs the column.
    await http()
      .patch('/settings/me')
      .set(AS_CALLER)
      .send({ default_venue_type: 'bar' })
      .expect(500);
    expect(callerRow()).toStrictEqual({ ...seedRow(), theme: 'light' });
  });
});
