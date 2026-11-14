/**
 * GET and PUT /users/me/consents through the real guard, controller and
 * ConsentsService. Clerk is stubbed, and the consents table lives in memory.
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
import { ConsentsController } from './consents.controller';
import { ConsentsService } from './consents.service';

const CALLER = 'user_caller';
const OTHER = 'user_other';
const AS_CALLER = { Authorization: 'Bearer caller-token' };
const WORDING = 'Email me when the Tulum app is out';

type Row = Record<string, unknown>;

let rows: Row[] = [];
/** Answers every query with PostgREST's "no such table". */
let tableMissing = false;
let clock = Date.parse('2026-11-14T10:00:00.000Z');

function from(table: string) {
  expect(table).toBe('marketing_consents');
  const filters: ((row: Row) => boolean)[] = [];
  const missing = { code: 'PGRST205', message: 'Could not find the table' };
  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => {
      filters.push((row) => row[column] === value);
      return query;
    },
    // Newest first, as the service asks.
    order: () => query,
    limit: () => query,
    maybeSingle: () => {
      if (tableMissing) return Promise.resolve({ data: null, error: missing });
      const found = rows
        .filter((row) => filters.every((f) => f(row)))
        .sort((a, b) =>
          String(b.created_at).localeCompare(String(a.created_at)),
        );
      return Promise.resolve({ data: found[0] ?? null, error: null });
    },
    insert: (row: Row) => {
      if (tableMissing) return Promise.resolve({ data: null, error: missing });
      clock += 1000;
      rows.push({ ...row, created_at: new Date(clock).toISOString() });
      return Promise.resolve({ data: null, error: null });
    },
  };
  return query;
}

describe('GET and PUT /users/me/consents', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
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
      controllers: [ConsentsController],
      providers: [
        ConsentsService,
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
    rows = [];
    tableMissing = false;
  });

  const http = () => request(app.getHttpServer());

  it('answers null before the guest has answered', async () => {
    const res = await http()
      .get('/users/me/consents')
      .set(AS_CALLER)
      .expect(200);
    expect(res.body).toEqual({ app_launch: null });
  });

  it('keeps every answer and reports the latest, for the caller only', async () => {
    rows.push({
      user_id: OTHER,
      topic: 'app_launch',
      granted: true,
      created_at: '2026-11-14T12:00:00.000Z',
    });

    await http()
      .put('/users/me/consents/app-launch')
      .set(AS_CALLER)
      .send({
        granted: true,
        wording: WORDING,
        language: 'sr',
        platform: 'web-ios',
      })
      .expect(200);
    const withdrawn = await http()
      .put('/users/me/consents/app-launch')
      .set(AS_CALLER)
      .send({ granted: false, wording: WORDING })
      .expect(200);

    expect(withdrawn.body.app_launch).toMatchObject({ granted: false });
    const mine = rows.filter((row) => row.user_id === CALLER);
    expect(mine).toEqual([
      expect.objectContaining({
        topic: 'app_launch',
        granted: true,
        wording: WORDING,
        language: 'sr',
        platform: 'web-ios',
        source: 'settings',
      }),
      expect.objectContaining({ granted: false, source: 'settings' }),
    ]);
  });

  it('refuses an answer without its wording, or with a malformed platform', async () => {
    await http()
      .put('/users/me/consents/app-launch')
      .set(AS_CALLER)
      .send({ granted: true })
      .expect(400);
    await http()
      .put('/users/me/consents/app-launch')
      .set(AS_CALLER)
      .send({ granted: true, wording: WORDING, platform: 'iPhone 15!' })
      .expect(400);
    expect(rows).toEqual([]);
  });

  it('answers 503 until the consents table exists', async () => {
    tableMissing = true;
    await http().get('/users/me/consents').set(AS_CALLER).expect(503);
    await http()
      .put('/users/me/consents/app-launch')
      .set(AS_CALLER)
      .send({ granted: true, wording: WORDING })
      .expect(503);
  });

  it('needs a signed-in caller', async () => {
    await http().get('/users/me/consents').expect(401);
  });
});
