/**
 * HTTP-level checks for BUG-011: the first name asked at onboarding step 1
 * must be saved by POST /guests/onboarding and come back from GET /users/me.
 * Requests go through the real ClerkAuthGuard, ValidationPipe, controllers
 * and services; Clerk and R2 are stubbed, and Supabase is replaced by
 * in-memory tables.
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
import { GuestSafetyService } from '../guest-safety/guest-safety.service';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AccountDeletionService } from '../users/account-deletion.service';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';

const CALLER = 'user_caller';
const AS_CALLER = { Authorization: 'Bearer caller-token' };

type Row = Record<string, unknown>;

// Like PostgREST, the fake refuses to write a column the table doesn't have.
const COLUMNS: Record<string, Set<string>> = {
  users: new Set([
    'id',
    'email',
    'username',
    'first_name',
    'last_name',
    'avatar_url',
    'is_admin',
    'push_token',
    'created_at',
    'updated_at',
  ]),
  guests: new Set([
    'user_id',
    'gender',
    'seeking',
    'interested_in',
    'interests',
    'picture_urls',
    'birthday',
    'venue_types',
    'bio',
  ]),
};

// The users row the Clerk webhook makes at sign-up. An email sign-up has no
// name yet; onboarding asks for it.
const seedTables = (): Record<string, Row[]> => ({
  users: [
    {
      id: CALLER,
      email: 'caller@example.com',
      username: 'caller',
      first_name: null,
      last_name: null,
      avatar_url: null,
    },
  ],
  guests: [],
});

let tables = seedTables();
let failUsersWrites = false;

// Just enough of the supabase-js query builder for onboarding and
// GET /users/me. Awaiting the builder runs it, as in supabase-js.
function from(table: string) {
  const rows = tables[table] ?? [];
  const filters: ((row: Row) => boolean)[] = [];
  let write: { upsert: boolean; values: Row } | null = null;

  const run = (): { found: Row[]; error?: unknown } => {
    if (!write) {
      return { found: rows.filter((row) => filters.every((f) => f(row))) };
    }
    const unknown = Object.keys(write.values).filter(
      (column) => !COLUMNS[table].has(column),
    );
    if (unknown.length > 0) {
      return { found: [], error: { code: 'PGRST204', unknown } };
    }
    if (table === 'users' && failUsersWrites) {
      return { found: [], error: { code: '57014' } };
    }
    if (write.upsert) {
      const values = write.values;
      const existing = rows.find((row) => row.user_id === values.user_id);
      if (existing) return { found: [Object.assign(existing, values)] };
      rows.push({ ...values });
      return { found: [rows[rows.length - 1]] };
    }
    const found = rows.filter((row) => filters.every((f) => f(row)));
    for (const row of found) Object.assign(row, write.values);
    return { found };
  };

  const query = {
    select: () => query,
    update: (values: Row) => {
      write = { upsert: false, values };
      return query;
    },
    upsert: (values: Row) => {
      write = { upsert: true, values };
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
      return Promise.resolve({ data: found[0] ?? null, error: error ?? null });
    },
    then: (
      resolve: (result: { data: null; error: unknown }) => unknown,
      reject: (reason: unknown) => unknown,
    ) => {
      const { error } = run();
      return Promise.resolve({ data: null, error: error ?? null }).then(
        resolve,
        reject,
      );
    },
  };
  return query;
}

const callerUser = () => tables.users.find((u) => u.id === CALLER);

// What the app sends after the last step, apart from the name.
const answers = {
  gender: 'female',
  seeking: 'friendship',
  interested_in: ['male', 'female', 'other'],
  interests: ['Music', 'Travel'],
  venue_types: ['bar'],
  picture_urls: [],
  bio: 'Hi',
  birthday: '1998-04-12',
};

describe('POST /guests/onboarding saves the first name (BUG-011)', () => {
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
      controllers: [GuestsController, UsersController],
      providers: [
        GuestsService,
        GuestSafetyService,
        UsersService,
        { provide: APP_GUARD, useValue: clerkGuard },
        { provide: SupabaseService, useValue: { getClient: () => ({ from }) } },
        { provide: R2Service, useValue: {} },
        { provide: AccountDeletionService, useValue: {} },
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
    failUsersWrites = false;
  });

  const http = () => request(app.getHttpServer());

  it('saves the name on the users row and the answers on the guest row', async () => {
    const submitted = await http()
      .post('/guests/onboarding')
      .set(AS_CALLER)
      .send({ ...answers, first_name: '  Ana  ' })
      .expect(201);
    expect(submitted.body.isOnboardingComplete).toBe(true);

    expect(callerUser()?.first_name).toBe('Ana');
    expect(tables.guests).toStrictEqual([{ user_id: CALLER, ...answers }]);

    // What the app reads once onboarding is done.
    const profile = await http().get('/users/me').set(AS_CALLER).expect(200);
    expect(profile.body).toMatchObject({
      first_name: 'Ana',
      guest: { gender: 'female', seeking: 'friendship' },
    });
  });

  it('accepts a 50-character name', async () => {
    const name = 'A'.repeat(50);
    await http()
      .post('/guests/onboarding')
      .set(AS_CALLER)
      .send({ ...answers, first_name: name })
      .expect(201);
    expect(callerUser()?.first_name).toBe(name);
  });

  it.each([
    ['no name', {}],
    ['an empty name', { first_name: '' }],
    ['a name of only spaces', { first_name: '   ' }],
    ['a 51-character name', { first_name: 'A'.repeat(51) }],
    ['a name that is not text', { first_name: 42 }],
    ['null for the name', { first_name: null }],
  ])('refuses %s and saves nothing', async (_, name) => {
    await http()
      .post('/guests/onboarding')
      .set(AS_CALLER)
      .send({ ...answers, ...name })
      .expect(400);
    expect(tables).toStrictEqual(seedTables());
  });

  it('leaves onboarding open when the name cannot be saved', async () => {
    failUsersWrites = true;
    await http()
      .post('/guests/onboarding')
      .set(AS_CALLER)
      .send({ ...answers, first_name: 'Ana' })
      .expect(500);
    expect(tables.guests).toStrictEqual([]);

    const status = await http().get('/guests/me').set(AS_CALLER).expect(200);
    expect(status.body.isOnboardingComplete).toBe(false);
  });

  it('needs a signed-in caller', async () => {
    await http()
      .post('/guests/onboarding')
      .send({ ...answers, first_name: 'Ana' })
      .expect(401);
    expect(tables).toStrictEqual(seedTables());
  });
});
