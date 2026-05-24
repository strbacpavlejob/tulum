import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createClerkClient } from '@clerk/backend';
import type { Request } from 'express';
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
    if (isPublic) return true;

    // WebSocket — skip Clerk auth (handled separately if needed)
    if (context.getType() === 'ws') return true;

    const request = context.switchToHttp().getRequest<Request>();

    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }

    try {
      const authorizedParties = process.env.CLERK_AUTHORIZED_PARTIES
        ? process.env.CLERK_AUTHORIZED_PARTIES.split(',').map((p) => p.trim())
        : undefined;

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

      const requestState = await this.clerkClient.authenticateRequest(
        webRequest,
        { ...(authorizedParties ? { authorizedParties } : {}) },
      );

      if (!requestState.isAuthenticated) {
        throw new UnauthorizedException('Invalid or expired session token');
      }

      const auth = requestState.toAuth();
      // `userId` exists on session token auth objects (`SignedInAuthObject`).
      // Reject m2m/api_key token types that do not carry a user context.
      if (!('userId' in auth) || !auth.userId) {
        throw new UnauthorizedException('Not a valid user session token');
      }
      (request as Request & { clerkUserId: string }).clerkUserId = auth.userId;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Token verification failed');
    }

    return true;
  }
}
