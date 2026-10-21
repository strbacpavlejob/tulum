/**
 * HTTP-level checks for the report forms on the Profile tab.
 * BUG-015: POST /reports/bugs must refuse a blank description and save the
 * description without surrounding spaces.
 * BUG-035: POST /reports/venue-suggestions must save the Instagram handle
 * without a leading @, and refuse a blank venue name.
 * Requests go through the real ClerkAuthGuard, ValidationPipe, controller
 * and service; Clerk is stubbed, and Supabase is replaced by in-memory
 * tables.
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
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

const CALLER = 'user_caller';
const AS_CALLER = { Authorization: 'Bearer caller-token' };

type Row = Record<string, unknown>;

const emptyTables = (): Record<string, Row[]> => ({
  bugs: [],
  venue_suggestions: [],
});

let tables = emptyTables();

// Just enough of the supabase-js query builder for the reports service:
// from(table).insert(row).select('*').single().
function from(table: string) {
  let inserted: Row | null = null;

  const query = {
    insert: (values: Row) => {
      inserted = { id: `${table}-${tables[table].length + 1}`, ...values };
      return query;
    },
    select: () => query,
    single: () => {
      if (!inserted) {
        return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
      }
      tables[table].push(inserted);
      return Promise.resolve({ data: { ...inserted }, error: null });
    },
  };
  return query;
}

describe('ReportsController', () => {
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
      controllers: [ReportsController],
      providers: [
        ReportsService,
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
    tables = emptyTables();
  });

  const http = () => request(app.getHttpServer());

  describe('POST /reports/bugs refuses blank descriptions (BUG-015)', () => {
    it('saves the description without surrounding spaces', async () => {
      const created = await http()
        .post('/reports/bugs')
        .set(AS_CALLER)
        // The body the app sends.
        .send({ description: '  The map stays blank  ', additional_info: null })
        .expect(201);

      expect(tables.bugs).toStrictEqual([
        {
          id: 'bugs-1',
          user_id: CALLER,
          status: 'pending',
          description: 'The map stays blank',
          additional_info: null,
        },
      ]);
      expect(created.body).toMatchObject({
        description: 'The map stays blank',
      });
    });

    it.each([
      ['an empty description', { description: '' }],
      [
        'a description of only spaces and line breaks',
        { description: ' \n\t ' },
      ],
      ['no description', {}],
      ['null for the description', { description: null }],
      ['a description that is not text', { description: 42 }],
    ])('refuses %s and saves nothing', async (_, body) => {
      await http()
        .post('/reports/bugs')
        .set(AS_CALLER)
        .send({ ...body, additional_info: null })
        .expect(400);
      expect(tables).toStrictEqual(emptyTables());
    });
  });

  describe('POST /reports/venue-suggestions (BUG-035)', () => {
    it('saves the handle without the @ and the name without surrounding spaces', async () => {
      const created = await http()
        .post('/reports/venue-suggestions')
        .set(AS_CALLER)
        // The body the app sends.
        .send({
          name: '  Ben Akiba  ',
          instagram_handle: '@ben_akiba',
          additionalInfo: 'Techno on Fridays',
        })
        .expect(201);

      expect(tables.venue_suggestions).toStrictEqual([
        {
          id: 'venue_suggestions-1',
          user_id: CALLER,
          name: 'Ben Akiba',
          instagram_handle: 'ben_akiba',
          additional_info: 'Techno on Fridays',
          status: 'pending',
        },
      ]);
      expect(created.body).toMatchObject({ instagram_handle: 'ben_akiba' });
    });

    it.each([
      ['a handle without @', 'ben_akiba', 'ben_akiba'],
      ['several @ signs and spaces', '  @@ben_akiba ', 'ben_akiba'],
      ['a space after the @', '@ ben_akiba', 'ben_akiba'],
      ['an @ in the middle', 'ben@akiba', 'ben@akiba'],
      ['only an @', '@', null],
      ['an empty handle', '', null],
      ['null for the handle', null, null],
      ['no handle', undefined, null],
    ])('saves %s (%p) as %p', async (_, handle, saved) => {
      await http()
        .post('/reports/venue-suggestions')
        .set(AS_CALLER)
        .send({ name: 'Ben Akiba', instagram_handle: handle })
        .expect(201);
      expect(tables.venue_suggestions).toMatchObject([
        { instagram_handle: saved },
      ]);
    });

    it.each([
      ['an empty name', { name: '' }],
      ['a name of only spaces and line breaks', { name: ' \n\t ' }],
      ['no name', {}],
      ['null for the name', { name: null }],
      ['a name that is not text', { name: 42 }],
      [
        'a handle that is not text',
        { name: 'Ben Akiba', instagram_handle: 42 },
      ],
    ])('refuses %s and saves nothing', async (_, body) => {
      await http()
        .post('/reports/venue-suggestions')
        .set(AS_CALLER)
        .send(body)
        .expect(400);
      expect(tables).toStrictEqual(emptyTables());
    });
  });
});
