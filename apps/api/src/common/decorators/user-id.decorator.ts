import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const UserId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<{ clerkUserId?: string }>();
    // Only the userId ClerkAuthGuard verified from the Bearer token. On a
    // @Public() route it is undefined unless the caller sent a valid token.
    // There is no x-user-id header fallback: any client could set it.
    return req.clerkUserId;
  },
);
