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

    const userId = req.clerkUserId ?? req.headers['x-user-id'];
    if (!userId) throw new UnauthorizedException('Missing user id');

    const user = await this.usersService.getUserById(String(userId));
    const isAdmin = (user && (user.is_admin ?? user.isAdmin)) === true;

    if (!isAdmin) throw new ForbiddenException('Admin access required');

    return true;
  }
}
