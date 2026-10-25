/**
 * HTTP-level checks for TASK-001: blocking a guest (POST /blocks), reporting
 * one (POST /reports/guests), and the admin review of reports (GET and
 * PATCH /reports/guests). Requests go through the real ClerkAuthGuard,
 * AdminGuard, ValidationPipe, controllers and services; Clerk is stubbed,
 * and Supabase is replaced by in-memory tables.
 */
import { randomUUID } from 'crypto';
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
import { UsersService } from '../users/users.service';
import { BlocksController } from './blocks.controller';
import { GuestReportsController } from './guest-reports.controller';
import { GuestReportsService } from './guest-reports.service';
import { GuestSafetyService } from './guest-safety.service';

const CALLER = 'user_caller';
const OTHER = 'user_other';
const THIRD = 'user_third';
const ADMIN = 'user_admin';
// Signed in, but never finished onboarding: no guest profile.
const NOT_A_GUEST = 'user_not_a_guest';
const TOKEN_USERS: Record<string, string> = {
  'caller-token': CALLER,
  'admin-token': ADMIN,
};
const AS_CALLER = { Authorization: 'Bearer caller-token' };
const AS_ADMIN = { Authorization: 'Bearer admin-token' };

const EVENT = 'f5f8b2e0-bfcf-4a77-90b7-e7631f38a101';
const OTHER_EVENT = '2c9e4a1b-7d3f-4e5a-8b6c-0d1e2f3a4b5c';
const MISSING_EVENT = '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d';
const CHAT = '0b6c3f0e-5f8e-4a3e-9d7a-1c2b3d4e5f60';

type Row = Record<string, unknown>;
type Result = { data: unknown; error: unknown; count?: number | null };

let tables: Record<string, Row[]>;
let clock: number;

// Each write gets a later timestamp, so "newest first" is well defined.
const tick = () =>
  new Date(Date.UTC(2026, 9, 25, 12, 0, clock++)).toISOString();

const user = (id: string, first: string, extra: Row = {}): Row => ({
  id,
  first_name: first,
  last_name: null,
  avatar_url: null,
  is_admin: false,
  ...extra,
});

const guest = (userId: string, extra: Row = {}): Row => ({
  user_id: userId,
  picture_urls: [`https://cdn.example.com/${userId}.webp`],
  bio: `Bio of ${userId}`,
  ...extra,
});

const seedTables = (): Record<string, Row[]> => ({
  users: [
    user(CALLER, 'Mila', { last_name: 'Petrović' }),
    user(OTHER, 'Marko', {
      avatar_url: 'https://cdn.example.com/marko-avatar.webp',
    }),
    user(THIRD, 'Ana'),
    user(ADMIN, 'Admin', { is_admin: true }),
    user(NOT_A_GUEST, 'Host'),
  ],
  guests: [guest(CALLER), guest(OTHER), guest(THIRD), guest(ADMIN)],
  events: [
    { id: EVENT, title: 'Jazz night', start_date_time: '2026-10-25T19:00:00' },
    {
      id: OTHER_EVENT,
      title: 'Techno',
      start_date_time: '2026-10-26T22:00:00',
    },
  ],
  matches: [
    { id: 7, guest_id_1: CALLER, guest_id_2: OTHER, event_id: EVENT },
    { id: 8, guest_id_1: OTHER, guest_id_2: THIRD, event_id: OTHER_EVENT },
  ],
  chats: [{ id: CHAT, match_id: 7, event_id: EVENT }],
  chat_messages: [],
  guest_blocks: [],
  guest_reports: [],
});

/** The embedded resources PostgREST returns for the admin list. */
function withReportEmbeds(row: Row): Row {
  const userRow = (id: unknown) =>
    tables.users.find((u) => u.id === id) ?? null;
  const names = (u: Row | null) =>
    u ? { first_name: u.first_name, last_name: u.last_name } : null;
  const reported = userRow(row.reported_user_id);
  const reportedGuest =
    tables.guests.find((g) => g.user_id === row.reported_user_id) ?? null;
  const event = tables.events.find((e) => e.id === row.event_id) ?? null;
  return {
    ...row,
    reporter: names(userRow(row.reporter_id)),
    reported: reported
      ? {
          ...names(reported),
          avatar_url: reported.avatar_url,
          guest: reportedGuest
            ? {
                picture_urls: reportedGuest.picture_urls,
                bio: reportedGuest.bio,
              }
            : null,
        }
      : null,
    reviewer: names(userRow(row.reviewed_by)),
    event: event
      ? {
          id: event.id,
          title: event.title,
          start_date_time: event.start_date_time,
        }
      : null,
  };
}

// Just enough of the supabase-js query builder for these services. Like
// PostgREST, a plain column list returns only those columns, an insert
// with an event_id that names no event fails with 23503, and the
// guest_blocks primary key is unique.
function from(table: string) {
  const filters: ((row: Row) => boolean)[] = [];
  let columns = '*';
  let head = false;
  let order: { column: string; ascending: boolean } | null = null;
  let limit: number | null = null;
  let write: {
    kind: 'insert' | 'upsert' | 'update';
    values: Row;
    ignore?: boolean;
  } | null = null;

  const project = (row: Row): Row => {
    if (table === 'guest_reports' && columns.includes('reporter:')) {
      return withReportEmbeds(row);
    }
    if (/[(*:]/.test(columns)) return { ...row };
    return Object.fromEntries(
      columns.split(',').map((c) => [c.trim(), row[c.trim()]]),
    );
  };

  const run = (): { rows: Row[]; error: unknown } => {
    const rows = (tables[table] ??= []);
    if (write?.kind === 'insert') {
      const values = write.values;
      if (
        table === 'guest_reports' &&
        values.event_id &&
        !tables.events.some((e) => e.id === values.event_id)
      ) {
        return { rows: [], error: { code: '23503' } };
      }
      const now = tick();
      const row: Row =
        table === 'guest_reports'
          ? {
              id: randomUUID(),
              status: 'pending',
              reviewed_by: null,
              reviewed_at: null,
              created_at: now,
              updated_at: now,
              ...values,
            }
          : { ...values };
      rows.push(row);
      return { rows: [row], error: null };
    }
    if (write?.kind === 'upsert') {
      const values = write.values;
      const existing = rows.find(
        (r) =>
          r.blocker_id === values.blocker_id &&
          r.blocked_id === values.blocked_id,
      );
      if (existing) {
        if (!write.ignore) Object.assign(existing, values);
        return { rows: [], error: null };
      }
      rows.push({ ...values, created_at: tick() });
      return { rows: [], error: null };
    }
    let found = rows.filter((r) => filters.every((f) => f(r)));
    if (write?.kind === 'update') {
      for (const row of found) Object.assign(row, write.values);
    }
    if (order) {
      const { column, ascending } = order;
      found = [...found].sort(
        (a, b) =>
          (String(a[column]) < String(b[column]) ? -1 : 1) *
          (ascending ? 1 : -1),
      );
    }
    if (limit !== null) found = found.slice(0, limit);
    return { rows: found, error: null };
  };

  const query = {
    select: (selected = '*', options?: { head?: boolean }) => {
      columns = selected;
      head = Boolean(options?.head);
      return query;
    },
    insert: (values: Row) => {
      write = { kind: 'insert', values };
      return query;
    },
    upsert: (values: Row, options?: { ignoreDuplicates?: boolean }) => {
      write = { kind: 'upsert', values, ignore: options?.ignoreDuplicates };
      return query;
    },
    update: (values: Row) => {
      write = { kind: 'update', values };
      return query;
    },
    eq: (column: string, value: unknown) => {
      filters.push((row) => row[column] === value);
      return query;
    },
    in: (column: string, values: unknown[]) => {
      filters.push((row) => values.includes(row[column]));
      return query;
    },
    // Only the "a.eq.x,b.eq.y" form the services use.
    or: (expression: string) => {
      const terms = expression.split(',').map((term) => term.split('.eq.'));
      filters.push((row) =>
        terms.some(([column, value]) => row[column] === value),
      );
      return query;
    },
    order: (column: string, options?: { ascending?: boolean }) => {
      order = { column, ascending: options?.ascending ?? true };
      return query;
    },
    limit: (count: number) => {
      limit = count;
      return query;
    },
    single: (): Promise<Result> => {
      const { rows, error } = run();
      if (error) return Promise.resolve({ data: null, error });
      return Promise.resolve(
        rows.length === 1
          ? { data: project(rows[0]), error: null }
          : { data: null, error: { code: 'PGRST116' } },
      );
    },
    maybeSingle: (): Promise<Result> => {
      const { rows, error } = run();
      return Promise.resolve({
        data: rows[0] ? project(rows[0]) : null,
        error,
      });
    },
    then: (
      resolve: (value: Result) => unknown,
      reject: (reason: unknown) => unknown,
    ) => {
      const { rows, error } = run();
      const result: Result = head
        ? { data: null, error, count: rows.length }
        : { data: error ? null : rows.map(project), error };
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return query;
}

const message = (sender: string, text: string, n: number): Row => ({
  id: randomUUID(),
  chat_id: CHAT,
  sender_id: sender,
  message: text,
  sent_at: new Date(Date.UTC(2026, 9, 25, 20, n)).toISOString(),
});

describe('Guest safety routes (TASK-001)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    // Real guard, fake Clerk: each known token signs in one user.
    const clerkGuard = new ClerkAuthGuard(new Reflector());
    Object.assign(clerkGuard, {
      clerkClient: {
        authenticateRequest: (webRequest: Request) => {
          const token = webRequest.headers
            .get('authorization')
            ?.replace('Bearer ', '');
          const userId = token ? TOKEN_USERS[token] : undefined;
          return Promise.resolve({
            isAuthenticated: Boolean(userId),
            toAuth: () => ({ userId }),
          });
        },
      },
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [BlocksController, GuestReportsController],
      providers: [
        GuestSafetyService,
        GuestReportsService,
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
    clock = 0;
  });

  const http = () => request(app.getHttpServer());
  const blocks = () =>
    tables.guest_blocks.map(({ blocker_id, blocked_id }) => [
      blocker_id,
      blocked_id,
    ]);

  describe('POST /blocks', () => {
    it('blocks the guest', async () => {
      const response = await http()
        .post('/blocks')
        .set(AS_CALLER)
        .send({ user_id: OTHER })
        .expect(201);

      expect(response.body).toStrictEqual({ blocked: true });
      expect(blocks()).toStrictEqual([[CALLER, OTHER]]);
    });

    it('changes nothing when the guest is blocked again', async () => {
      await http().post('/blocks').set(AS_CALLER).send({ user_id: OTHER });
      await http()
        .post('/blocks')
        .set(AS_CALLER)
        .send({ user_id: OTHER })
        .expect(201);

      expect(blocks()).toStrictEqual([[CALLER, OTHER]]);
    });

    it.each([
      ['yourself', { user_id: CALLER }, 400],
      ['a user without a guest profile', { user_id: NOT_A_GUEST }, 404],
      ['an unknown user', { user_id: 'user_nobody' }, 404],
      ['no user_id', {}, 400],
      ['an empty user_id', { user_id: '' }, 400],
    ])('refuses %s and blocks nobody', async (_, body, status) => {
      await http().post('/blocks').set(AS_CALLER).send(body).expect(status);
      expect(tables.guest_blocks).toStrictEqual([]);
    });

    it('needs a signed-in user', async () => {
      await http().post('/blocks').send({ user_id: OTHER }).expect(401);
      expect(tables.guest_blocks).toStrictEqual([]);
    });
  });

  describe('POST /reports/guests', () => {
    it('saves a report from a profile and blocks the guest', async () => {
      const response = await http()
        .post('/reports/guests')
        .set(AS_CALLER)
        // The body the app sends from the Matches deck.
        .send({
          reported_user_id: OTHER,
          reason: 'inappropriate',
          source: 'profile',
          details: '  Photos are not his  ',
          event_id: EVENT,
        })
        .expect(201);

      expect(response.body).toStrictEqual({
        id: expect.any(String),
        status: 'pending',
        created_at: expect.any(String),
        blocked: true,
      });
      expect(tables.guest_reports).toStrictEqual([
        expect.objectContaining({
          id: response.body.id,
          reporter_id: CALLER,
          reported_user_id: OTHER,
          event_id: EVENT,
          match_id: null,
          source: 'profile',
          reason: 'inappropriate',
          details: 'Photos are not his',
          messages: null,
          status: 'pending',
        }),
      ]);
      expect(blocks()).toStrictEqual([[CALLER, OTHER]]);
    });

    it("keeps the chat's last 50 messages from a chat report, and the match's event", async () => {
      tables.chat_messages = Array.from({ length: 52 }, (_, n) =>
        message(n % 2 ? OTHER : CALLER, `message ${n}`, n),
      );

      await http()
        .post('/reports/guests')
        .set(AS_CALLER)
        .send({
          reported_user_id: OTHER,
          reason: 'harassment',
          source: 'chat',
          match_id: 7,
          // A chat report takes the event from the match.
          event_id: OTHER_EVENT,
        })
        .expect(201);

      const [report] = tables.guest_reports;
      expect(report).toMatchObject({ match_id: 7, event_id: EVENT });
      const kept = report.messages as Row[];
      expect(kept).toHaveLength(50);
      // Oldest first; the first two messages fell off.
      expect(kept[0]).toStrictEqual({
        sender_id: CALLER,
        message: 'message 2',
        sent_at: '2026-10-25T20:02:00.000Z',
      });
      expect(kept[49]).toMatchObject({
        sender_id: OTHER,
        message: 'message 51',
      });
      expect(blocks()).toStrictEqual([[CALLER, OTHER]]);
    });

    it('saves no messages for a match without a chat', async () => {
      tables.chats = [];

      await http()
        .post('/reports/guests')
        .set(AS_CALLER)
        .send({
          reported_user_id: OTHER,
          reason: 'spam',
          source: 'chat',
          match_id: 7,
        })
        .expect(201);

      expect(tables.guest_reports).toMatchObject([
        { match_id: 7, messages: null },
      ]);
    });

    it('asks for details when the reason is other', async () => {
      const body = {
        reported_user_id: OTHER,
        reason: 'other',
        source: 'profile',
      };
      await http()
        .post('/reports/guests')
        .set(AS_CALLER)
        .send(body)
        .expect(400);
      await http()
        .post('/reports/guests')
        .set(AS_CALLER)
        .send({ ...body, details: '   ' })
        .expect(400);
      await http()
        .post('/reports/guests')
        .set(AS_CALLER)
        .send({ ...body, details: 'Followed me home' })
        .expect(201);

      expect(tables.guest_reports).toMatchObject([
        { reason: 'other', details: 'Followed me home' },
      ]);
    });

    const valid = {
      reported_user_id: OTHER,
      reason: 'fake_profile',
      source: 'profile',
    };

    it.each([
      ['yourself', { ...valid, reported_user_id: CALLER }, 400],
      [
        'a user without a guest profile',
        { ...valid, reported_user_id: NOT_A_GUEST },
        404,
      ],
      ['an unknown reason', { ...valid, reason: 'boring' }, 400],
      ['an unknown source', { ...valid, source: 'guest_list' }, 400],
      ['a chat report without a match', { ...valid, source: 'chat' }, 400],
      [
        'a match between other guests',
        { ...valid, source: 'chat', match_id: 8 },
        404,
      ],
      ['a missing match', { ...valid, source: 'chat', match_id: 99 }, 404],
      [
        'details over 1000 characters',
        { ...valid, details: 'x'.repeat(1001) },
        400,
      ],
      [
        'an event id that is not a uuid',
        { ...valid, event_id: 'event-1' },
        400,
      ],
    ])('refuses %s, and saves and blocks nothing', async (_, body, status) => {
      await http()
        .post('/reports/guests')
        .set(AS_CALLER)
        .send(body)
        .expect(status);

      expect(tables.guest_reports).toStrictEqual([]);
      expect(tables.guest_blocks).toStrictEqual([]);
    });

    it('refuses an event that does not exist', async () => {
      const response = await http()
        .post('/reports/guests')
        .set(AS_CALLER)
        .send({ ...valid, event_id: MISSING_EVENT })
        .expect(400);

      expect(response.body.message).toBe('Unknown event');
      expect(tables.guest_reports).toStrictEqual([]);
    });

    it('needs a signed-in user', async () => {
      await http().post('/reports/guests').send(valid).expect(401);
      expect(tables.guest_reports).toStrictEqual([]);
    });
  });

  describe('Admin review of reports', () => {
    const report = (body: Row, token = AS_CALLER) =>
      http().post('/reports/guests').set(token).send(body).expect(201);

    it('lists the newest reports first, with what an admin needs to review them', async () => {
      tables.chat_messages = [
        message(OTHER, 'Send me your address', 1),
        message(CALLER, 'No', 2),
      ];
      // An admin's earlier report of the same guest.
      await report(
        { reported_user_id: OTHER, reason: 'spam', source: 'profile' },
        AS_ADMIN,
      );
      await report({
        reported_user_id: OTHER,
        reason: 'harassment',
        source: 'chat',
        match_id: 7,
        details: 'Kept asking where I live',
      });

      const response = await http()
        .get('/reports/guests')
        .set(AS_ADMIN)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toStrictEqual({
        id: expect.any(String),
        status: 'pending',
        reason: 'harassment',
        source: 'chat',
        details: 'Kept asking where I live',
        created_at: expect.any(String),
        reviewed_at: null,
        reviewed_by: null,
        match_id: 7,
        reporter: { user_id: CALLER, name: 'Mila Petrović' },
        reported: {
          user_id: OTHER,
          name: 'Marko',
          photos: [`https://cdn.example.com/${OTHER}.webp`],
          bio: `Bio of ${OTHER}`,
          report_count: 2,
        },
        // Event times are sent as UTC.
        event: {
          id: EVENT,
          title: 'Jazz night',
          start_date_time: '2026-10-25T19:00:00.000Z',
        },
        messages: [
          {
            from: 'reported',
            message: 'Send me your address',
            sent_at: '2026-10-25T20:01:00.000Z',
          },
          {
            from: 'reporter',
            message: 'No',
            sent_at: '2026-10-25T20:02:00.000Z',
          },
        ],
      });
      expect(response.body[1]).toMatchObject({
        reason: 'spam',
        reporter: { user_id: ADMIN },
        event: null,
        messages: null,
      });
    });

    it('filters by status, counts pending reports, and records who handled one', async () => {
      const first = await report({
        reported_user_id: OTHER,
        reason: 'spam',
        source: 'profile',
      });
      await report({
        reported_user_id: THIRD,
        reason: 'underage',
        source: 'profile',
      });

      await http()
        .get('/reports/guests/summary')
        .set(AS_ADMIN)
        .expect(200, { pending: 2 });

      const updated = await http()
        .patch(`/reports/guests/${first.body.id}`)
        .set(AS_ADMIN)
        .send({ status: 'resolved' })
        .expect(200);
      expect(updated.body).toStrictEqual({
        id: first.body.id,
        status: 'resolved',
        reviewed_at: expect.any(String),
      });
      expect(tables.guest_reports[0]).toMatchObject({
        status: 'resolved',
        reviewed_by: ADMIN,
      });

      await http()
        .get('/reports/guests/summary')
        .set(AS_ADMIN)
        .expect(200, { pending: 1 });
      const resolved = await http()
        .get('/reports/guests?status=resolved')
        .set(AS_ADMIN)
        .expect(200);
      expect(resolved.body).toMatchObject([
        { id: first.body.id, reviewed_by: 'Admin' },
      ]);
    });

    it.each([
      ['GET', '/reports/guests'],
      ['GET', '/reports/guests/summary'],
      ['PATCH', `/reports/guests/${randomUUID()}`],
    ])('%s %s is for admins only', async (method, path) => {
      const call = () =>
        method === 'GET'
          ? http().get(path)
          : http().patch(path).send({ status: 'resolved' });
      await call().set(AS_CALLER).expect(403);
      await call().expect(401);
    });

    it.each([
      ['an unknown status', { status: 'approved' }, 400],
      ['no status', {}, 400],
    ])('PATCH refuses %s', async (_, body, status) => {
      const created = await report({
        reported_user_id: OTHER,
        reason: 'spam',
        source: 'profile',
      });
      await http()
        .patch(`/reports/guests/${created.body.id}`)
        .set(AS_ADMIN)
        .send(body)
        .expect(status);
      expect(tables.guest_reports[0]).toMatchObject({ status: 'pending' });
    });

    it('PATCH answers 404 for a report that does not exist', async () => {
      await http()
        .patch(`/reports/guests/${randomUUID()}`)
        .set(AS_ADMIN)
        .send({ status: 'resolved' })
        .expect(404);
    });

    it('GET refuses an unknown status filter', async () => {
      await http().get('/reports/guests?status=done').set(AS_ADMIN).expect(400);
    });
  });
});
