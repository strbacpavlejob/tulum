import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { UsersService } from '../../users/users.service';
import { AdminGuard } from './admin.guard';

const ADMIN_ID = 'user_admin';

function createGuard() {
  const isAdmin = jest.fn((userId: string) =>
    Promise.resolve(userId === ADMIN_ID),
  );
  const usersService = { isAdmin } as unknown as UsersService;
  return { guard: new AdminGuard(usersService), isAdmin };
}

function contextFor(request: {
  clerkUserId?: string;
  headers: Record<string, string>;
}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  it('allows a verified admin', async () => {
    const { guard, isAdmin } = createGuard();

    await expect(
      guard.canActivate(contextFor({ clerkUserId: ADMIN_ID, headers: {} })),
    ).resolves.toBe(true);
    expect(isAdmin).toHaveBeenCalledWith(ADMIN_ID);
  });

  it('rejects a verified user who is not an admin', async () => {
    const { guard } = createGuard();

    await expect(
      guard.canActivate(
        contextFor({ clerkUserId: 'user_regular', headers: {} }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("does not accept an admin's id from the x-user-id header", async () => {
    const { guard, isAdmin } = createGuard();

    await expect(
      guard.canActivate(contextFor({ headers: { 'x-user-id': ADMIN_ID } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(isAdmin).not.toHaveBeenCalled();
  });
});
