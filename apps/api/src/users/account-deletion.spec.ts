/**
 * HTTP-level checks for BUG-001: Settings → Delete account must really delete
 * the account. DELETE /users/me goes through the real ClerkAuthGuard,
 * UsersController and AccountDeletionService; Supabase, R2 and the Clerk
 * Backend API are stubbed. The rows themselves are removed by the delete-user
 * edge function when Clerk reports the deletion, so nothing here deletes them.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ClerkAPIResponseError } from '@clerk/backend/errors';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AccountDeletionService } from './account-deletion.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const CALLER = 'user_caller';
const AS_CALLER = { Authorization: 'Bearer caller-token' };

type VenueCount = { count: number | null; error: { code: string } | null };

// The venues the caller hosts, as `select('id', { count, head: true })`
// returns them.
let venueCount: VenueCount;
const venueQueries: Array<{ table: string; filters: string[] }> = [];

function from(table: string) {
  const filters: string[] = [];
  venueQueries.push({ table, filters });
  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => {
      filters.push(`${column}=${String(value)}`);
      return query;
    },
    then: (resolve: (result: VenueCount) => unknown) => resolve(venueCount),
  };
  return query;
}

const r2Service = {
  deleteFolder: jest.fn((prefix: string) => Promise.resolve(prefix.length)),
};
const clerkUsers = {
  deleteUser: jest.fn((userId: string) => Promise.resolve({ id: userId })),
};

describe('DELETE /users/me (BUG-001)', () => {
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
        AccountDeletionService,
        { provide: UsersService, useValue: {} },
        { provide: APP_GUARD, useValue: clerkGuard },
        { provide: SupabaseService, useValue: { getClient: () => ({ from }) } },
        { provide: R2Service, useValue: r2Service },
      ],
    }).compile();

    // The service's Clerk Backend API client.
    Object.assign(moduleRef.get(AccountDeletionService), {
      clerkClient: { users: clerkUsers },
    });

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
    jest.clearAllMocks();
    venueCount = { count: 0, error: null };
    venueQueries.length = 0;
  });

  const http = () => request(app.getHttpServer());

  it('deletes the photos, then the Clerk user', async () => {
    const res = await http().delete('/users/me').set(AS_CALLER).expect(200);

    expect(res.body).toEqual({ success: true });
    expect(venueQueries).toEqual([
      { table: 'venues', filters: [`host_id=${CALLER}`] },
    ]);
    expect(r2Service.deleteFolder.mock.calls).toEqual([[`guests/${CALLER}/`]]);
    expect(clerkUsers.deleteUser.mock.calls).toEqual([[CALLER]]);
    expect(r2Service.deleteFolder.mock.invocationCallOrder[0]).toBeLessThan(
      clerkUsers.deleteUser.mock.invocationCallOrder[0],
    );
  });

  it('refuses a venue host before deleting anything', async () => {
    venueCount = { count: 269, error: null };

    const res = await http().delete('/users/me').set(AS_CALLER).expect(409);

    expect(res.body.message).toBe(
      'This account hosts 269 venue(s). Move them to another host before deleting it.',
    );
    expect(r2Service.deleteFolder).not.toHaveBeenCalled();
    expect(clerkUsers.deleteUser).not.toHaveBeenCalled();
  });

  it('deletes nothing when the venue check fails', async () => {
    venueCount = { count: null, error: { code: '57014' } };

    await http().delete('/users/me').set(AS_CALLER).expect(500);

    expect(r2Service.deleteFolder).not.toHaveBeenCalled();
    expect(clerkUsers.deleteUser).not.toHaveBeenCalled();
  });

  it('keeps the account when the photos could not be deleted', async () => {
    r2Service.deleteFolder.mockImplementationOnce(() =>
      Promise.reject(new Error('R2 unavailable')),
    );

    const res = await http().delete('/users/me').set(AS_CALLER).expect(502);

    expect(res.body.message).toBe('Could not delete the profile photos');
    expect(clerkUsers.deleteUser).not.toHaveBeenCalled();
  });

  it('reports a failed Clerk deletion instead of claiming success', async () => {
    clerkUsers.deleteUser.mockImplementationOnce(() =>
      Promise.reject(
        new ClerkAPIResponseError('Internal Server Error', {
          data: [],
          status: 500,
        }),
      ),
    );

    const res = await http().delete('/users/me').set(AS_CALLER).expect(502);

    expect(res.body.message).toBe('Could not delete the account');
  });

  it('treats a Clerk user that is already gone as deleted', async () => {
    clerkUsers.deleteUser.mockImplementationOnce(() =>
      Promise.reject(
        new ClerkAPIResponseError('Not Found', { data: [], status: 404 }),
      ),
    );

    await http().delete('/users/me').set(AS_CALLER).expect(200);
  });

  it('needs a signed-in caller', async () => {
    await http().delete('/users/me').expect(401);
    await http().delete('/users/me').set('x-user-id', CALLER).expect(401);

    expect(venueQueries).toEqual([]);
    expect(r2Service.deleteFolder).not.toHaveBeenCalled();
    expect(clerkUsers.deleteUser).not.toHaveBeenCalled();
  });
});
