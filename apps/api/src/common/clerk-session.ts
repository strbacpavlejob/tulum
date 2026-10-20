import type { ClerkClient } from '@clerk/backend';
import { UnauthorizedException } from '@nestjs/common';

/**
 * Returns the user id of the Clerk session token in the request's
 * `Authorization: Bearer` header, or throws 401. ClerkAuthGuard uses it for
 * HTTP requests and ChatsGateway for socket handshakes, so both accept the
 * same tokens.
 */
export async function verifySessionUserId(
  clerkClient: Pick<ClerkClient, 'authenticateRequest'>,
  request: Request,
): Promise<string> {
  const authorizedParties = process.env.CLERK_AUTHORIZED_PARTIES
    ? process.env.CLERK_AUTHORIZED_PARTIES.split(',').map((p) => p.trim())
    : undefined;

  const requestState = await clerkClient.authenticateRequest(request, {
    ...(authorizedParties ? { authorizedParties } : {}),
  });

  if (!requestState.isAuthenticated) {
    throw new UnauthorizedException('Invalid or expired session token');
  }

  const auth = requestState.toAuth();
  // `userId` exists on session token auth objects (`SignedInAuthObject`).
  // Reject m2m/api_key token types that do not carry a user context.
  if (!('userId' in auth) || !auth.userId) {
    throw new UnauthorizedException('Not a valid user session token');
  }
  return auth.userId;
}
