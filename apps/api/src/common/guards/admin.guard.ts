import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { clerkUserId?: string }>();

    // Only the id ClerkAuthGuard verified counts; x-user-id is not trusted.
    const userId = req.clerkUserId;
    if (!userId) throw new UnauthorizedException('Missing user id');

    if (!(await this.usersService.isAdmin(userId)))
      throw new ForbiddenException('Admin access required');

    return true;
  }
}
