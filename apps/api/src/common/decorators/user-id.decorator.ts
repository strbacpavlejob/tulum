import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const UserId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<{
      clerkUserId?: string;
      headers: Record<string, string>;
    }>();
    // Prefer the userId extracted from the verified Clerk JWT by ClerkAuthGuard.
    // Fall back to the legacy x-user-id header for backwards-compatibility during migration.
    return req.clerkUserId ?? req.headers['x-user-id'];
  },
);
