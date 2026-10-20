/**
 * HTTP-level checks for BUG-010: the Profile tab details must be saved by
 * PATCH /users/me and come back from GET /users/me. Requests go through the
 * real ClerkAuthGuard, ValidationPipe, UsersController and UsersService;
 * Clerk is stubbed, and Supabase is replaced by in-memory tables.
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
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const CALLER = 'user_caller';
const AS_CALLER = { Authorization: 'Bearer caller-token' };

type Row = Record<string, unknown>;

// The guests columns once supabase/migrations/
// 20261020135713_add_guest_profile_details.sql is applied. Like PostgREST,
// the fake refuses to write any other column.
const GUEST_COLUMNS = new Set([
  'user_id',
  'gender',
  'seeking',
  'interested_in',
  'interests',
  'picture_urls',
  'birthday',
  'venue_types',
  'bio',
  'work',
  'education',
  'height_cm',
  'has_children',
  'drinking',
  'smoking',
  'languages',
  'relationship_status',
  'sexuality',
  'star_sign',
  'pets',
  'religion',
]);

const seedTables = (): Record<string, Row[]> => ({
  users: [
    {
      id: CALLER,
      email: 'caller@example.com',
      username: 'caller',
      first_name: 'Tulum',
      last_name: null,
      avatar_url: null,
    },
  ],
  guests: [
    {
      user_id: CALLER,
      gender: 'male',
      seeking: 'relationship',
      interested_in: ['female'],
      interests: ['Food', 'Tech', 'Reading'],
      picture_urls: [],
      birthday: '1996-01-01T00:00:00+00:00',
      venue_types: [],
      bio: 'Proveravamo dugmence',
      work: null,
      education: null,
      height_cm: null,
      has_children: null,
      drinking: null,
      smoking: null,
      languages: [],
      relationship_status: null,
      sexuality: null,
      star_sign: null,
      pets: [],
      religion: null,
    },
  ],
});

let tables = seedTables();

// Just enough of the supabase-js query builder for UsersService's profile
// methods.
function from(table: string) {
  const rows = tables[table] ?? [];
  const filters: ((row: Row) => boolean)[] = [];
  let changes: Row | null = null;

  const run = () => {
    const unknown = Object.keys(changes ?? {}).filter(
      (column) => table === 'guests' && !GUEST_COLUMNS.has(column),
    );
    if (unknown.length > 0) {
      return { found: [], error: { code: 'PGRST204', unknown } };
    }
    const found = rows.filter((row) => filters.every((f) => f(row)));
    if (changes) for (const row of found) Object.assign(row, changes);
    return { found, error: null };
  };

  const query = {
    select: () => query,
    update: (values: Row) => {
      changes = values;
      return query;
    },
    eq: (column: string, value: unknown) => {
      filters.push((row) => row[column] === value);
      return query;
    },
    single: () => {
      const { found, error } = run();
      if (error) return Promise.resolve({ data: null, error });
      return Promise.resolve(
        found.length === 1
          ? { data: { ...found[0] }, error: null }
          : { data: null, error: { code: 'PGRST116' } },
      );
    },
    maybeSingle: () => {
      const { found, error } = run();
      return Promise.resolve({ data: found[0] ?? null, error });
    },
  };
  return query;
}

const callerGuest = () => tables.guests.find((g) => g.user_id === CALLER);

describe('Profile details on /users/me (BUG-010)', () => {
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
      controllers: [UsersController],
      providers: [
        UsersService,
        { provide: APP_GUARD, useValue: clerkGuard },
        { provide: SupabaseService, useValue: { getClient: () => ({ from }) } },
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

  const details = {
    work: 'QA Tester (temp)',
    education: 'University of Belgrade',
    height_cm: 182,
    has_children: 'no',
    drinking: 'socially',
    smoking: 'never',
    languages: ['English', 'Serbian'],
    relationship_status: 'single',
    sexuality: 'prefer not to say',
    star_sign: 'Libra',
    pets: ['dog'],
    religion: 'agnostic',
  };

  it('saves every Profile tab field and returns it on the next GET', async () => {
    const saved = await http()
      .patch('/users/me')
      .set(AS_CALLER)
      .send({
        user: {},
        guest: {
          ...details,
          bio: 'Edited bio',
          interests: ['Music'],
          seeking: 'party',
        },
      })
      .expect(200);
    expect(saved.body.guest).toMatchObject(details);

    // What the app reads after a reload.
    const reloaded = await http().get('/users/me').set(AS_CALLER).expect(200);
    expect(reloaded.body.guest).toMatchObject({
      ...details,
      bio: 'Edited bio',
      interests: ['Music'],
      seeking: 'party',
    });
  });

  it('writes only the fields that were sent', async () => {
    await http()
      .patch('/users/me')
      .set(AS_CALLER)
      .send({ guest: { work: 'QA Tester (temp)' } })
      .expect(200);
    expect(callerGuest()).toStrictEqual({
      ...seedTables().guests[0],
      work: 'QA Tester (temp)',
    });
  });

  it('clears a single value with null and a list with []', async () => {
    Object.assign(callerGuest()!, details);
    await http()
      .patch('/users/me')
      .set(AS_CALLER)
      .send({
        guest: { work: null, height_cm: null, drinking: null, languages: [] },
      })
      .expect(200);
    expect(callerGuest()).toMatchObject({
      work: null,
      height_cm: null,
      drinking: null,
      languages: [],
      education: details.education,
    });
  });

  it.each([
    ['a drinking choice the app does not offer', { drinking: 'daily' }],
    ['a height below 50 cm', { height_cm: 5 }],
    ['a height above 300 cm', { height_cm: 1800 }],
    ['a height that is not a whole number', { height_cm: 180.5 }],
    ['a star sign in the wrong case', { star_sign: 'libra' }],
    ['an unknown language', { languages: ['Klingon'] }],
    ['a language list sent as text', { languages: 'English' }],
    ['null for a list column', { pets: null }],
  ])('refuses %s', async (_, guest) => {
    await http().patch('/users/me').set(AS_CALLER).send({ guest }).expect(400);
    expect(callerGuest()).toStrictEqual(seedTables().guests[0]);
  });

  it('needs a signed-in caller', async () => {
    await http()
      .patch('/users/me')
      .send({ guest: { work: 'x' } })
      .expect(401);
    expect(callerGuest()).toStrictEqual(seedTables().guests[0]);
  });

  // The guest fields reuse the onboarding rules, but first_name is a users
  // column (BUG-011); the guests table has none.
  it('drops a first_name sent with the guest fields', async () => {
    await http()
      .patch('/users/me')
      .set(AS_CALLER)
      .send({ guest: { first_name: 'Ana' } })
      .expect(200);
    expect(tables).toStrictEqual(seedTables());
  });
});
