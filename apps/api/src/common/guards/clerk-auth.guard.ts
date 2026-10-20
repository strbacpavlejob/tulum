import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createClerkClient } from '@clerk/backend';
import type { Request } from 'express';
import { verifySessionUserId } from '../clerk-session';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  });

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // WebSocket — ChatsGateway verifies the Clerk token in the socket
    // handshake, before any event reaches a handler.
    if (context.getType() === 'ws') return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { clerkUserId?: string }>();

    if (isPublic) {
      // Public routes also answer anonymous callers. A valid token still
      // identifies the caller (favorites on /events/active); an invalid one
      // is treated as anonymous instead of failing the request.
      if (request.headers['authorization']?.startsWith('Bearer ')) {
        request.clerkUserId = await this.verifyUserId(request).catch(
          () => undefined,
        );
      }
      return true;
    }

    request.clerkUserId = await this.verifyUserId(request);
    return true;
  }

  /** Returns the user id of a valid Clerk session token, or throws 401. */
  private async verifyUserId(request: Request): Promise<string> {
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }

    try {
      // authenticateRequest requires a Web Fetch API Request, not an Express Request.
      // Build one from the incoming Express request so Clerk can inspect headers/cookies.
      const url = `${request.protocol}://${request.get('host') ?? 'localhost'}${request.originalUrl}`;
      const webHeaders = new Headers();
      for (const [key, val] of Object.entries(request.headers)) {
        if (val === undefined) continue;
        if (Array.isArray(val)) {
          val.forEach((v) => webHeaders.append(key, v));
        } else {
          webHeaders.set(key, val);
        }
      }
      const webRequest = new Request(url, {
        method: request.method,
        headers: webHeaders,
      });

      return await verifySessionUserId(this.clerkClient, webRequest);
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Token verification failed');
    }
  }
}
