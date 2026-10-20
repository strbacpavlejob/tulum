import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, jest } from '@jest/globals';
import { ClerkAuthGuard } from './clerk-auth.guard';

const VALID_TOKEN = 'valid-session-token';
const CALLER_ID = 'user_caller';

type FakeRequest = {
  headers: Record<string, string>;
  protocol: string;
  originalUrl: string;
  method: string;
  get: (name: string) => string | undefined;
  clerkUserId?: string;
};

function createGuard(isPublic: boolean) {
  const reflector = {
    getAllAndOverride: jest.fn(() => isPublic),
  } as unknown as Reflector;
  const guard = new ClerkAuthGuard(reflector);

  // Stands in for Clerk: only VALID_TOKEN is a signed-in session.
  const authenticateRequest = jest.fn((request: Request) => {
    const authorization = request.headers.get('authorization');
    const userId =
      authorization === `Bearer ${VALID_TOKEN}` ? CALLER_ID : undefined;
    return Promise.resolve({
      isAuthenticated: userId !== undefined,
      toAuth: () => ({ userId }),
    });
  });
  Object.assign(guard, { clerkClient: { authenticateRequest } });

  return { guard, authenticateRequest };
}

function httpRequest(headers: Record<string, string> = {}): FakeRequest {
  return {
    headers,
    protocol: 'http',
    originalUrl: '/users/me',
    method: 'GET',
    get: () => 'localhost:3001',
  };
}

function contextFor(request: FakeRequest, type = 'http'): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    getType: () => type,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('ClerkAuthGuard on private routes', () => {
  it('sets the user id from a valid session token', async () => {
    const { guard } = createGuard(false);
    const request = httpRequest({ authorization: `Bearer ${VALID_TOKEN}` });

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.clerkUserId).toBe(CALLER_ID);
  });

  it('rejects a request without a Bearer token', async () => {
    const { guard, authenticateRequest } = createGuard(false);

    await expect(
      guard.canActivate(contextFor(httpRequest())),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authenticateRequest).not.toHaveBeenCalled();
  });

  it('rejects an invalid token', async () => {
    const { guard } = createGuard(false);
    const request = httpRequest({ authorization: 'Bearer forged' });

    await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
      'Invalid or expired session token',
    );
    expect(request.clerkUserId).toBeUndefined();
  });

  it('does not accept an x-user-id header as identity', async () => {
    const { guard } = createGuard(false);
    const request = httpRequest({ 'x-user-id': 'user_victim' });

    await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(request.clerkUserId).toBeUndefined();
  });
});

describe('ClerkAuthGuard on public routes', () => {
  it('lets an anonymous request through without verifying anything', async () => {
    const { guard, authenticateRequest } = createGuard(true);
    const request = httpRequest();

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.clerkUserId).toBeUndefined();
    expect(authenticateRequest).not.toHaveBeenCalled();
  });

  it('identifies the caller when a valid token is sent', async () => {
    const { guard } = createGuard(true);
    const request = httpRequest({ authorization: `Bearer ${VALID_TOKEN}` });

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.clerkUserId).toBe(CALLER_ID);
  });

  it('treats an invalid token as anonymous instead of failing', async () => {
    const { guard } = createGuard(true);
    const request = httpRequest({ authorization: 'Bearer forged' });

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.clerkUserId).toBeUndefined();
  });

  it('ignores an x-user-id header', async () => {
    const { guard } = createGuard(true);
    const request = httpRequest({ 'x-user-id': 'user_victim' });

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.clerkUserId).toBeUndefined();
  });
});

describe('ClerkAuthGuard on WebSocket contexts', () => {
  it('leaves socket authentication to the gateway', async () => {
    const { guard, authenticateRequest } = createGuard(false);

    await expect(
      guard.canActivate(contextFor(httpRequest(), 'ws')),
    ).resolves.toBe(true);
    expect(authenticateRequest).not.toHaveBeenCalled();
  });
});
