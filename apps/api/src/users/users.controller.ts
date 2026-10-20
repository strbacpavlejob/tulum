import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserId } from '../common/decorators/user-id.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UsersService } from './users.service';

/** DTO instances carry every declared field; keep only the ones sent. */
function sentFields(dto?: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(dto ?? {}).filter(([, value]) => value !== undefined),
  );
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // The users/guests/hosts/settings routes below read or change any user's
  // rows by id, so they are admin-only. Signed-in users use /users/me.

  // ── Users ──────────────────────────────────────────────────────────────

  @Get()
  @UseGuards(AdminGuard)
  async getUser(@Query('id') id?: string, @Query('email') email?: string) {
    if (id) return this.usersService.getUserById(id);
    if (email) return this.usersService.searchUsersByEmail(email);
    throw new BadRequestException('Missing required parameter: id or email');
  }

  @Post()
  @UseGuards(AdminGuard)
  async createUser(@Body() user: Record<string, unknown>) {
    return this.usersService.createUser(user);
  }

  @Patch()
  @UseGuards(AdminGuard)
  async updateUser(
    @Body('id') id: string,
    @Body('updates') updates: Record<string, unknown>,
  ) {
    return this.usersService.updateUser(id, updates);
  }

  @Delete()
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Query('id') id: string) {
    await this.usersService.deleteUser(id);
    return { success: true };
  }

  // ── Guests ─────────────────────────────────────────────────────────────

  @Get('guests')
  @UseGuards(AdminGuard)
  async getGuest(@Query('user_id') userId: string) {
    return this.usersService.getGuest(userId);
  }

  @Post('guests')
  @UseGuards(AdminGuard)
  async createGuest(@Body() guest: Record<string, unknown>) {
    return this.usersService.createGuest(guest);
  }

  @Patch('guests')
  @UseGuards(AdminGuard)
  async updateGuest(
    @Body('user_id') userId: string,
    @Body('updates') updates: Record<string, unknown>,
  ) {
    return this.usersService.updateGuest(userId, updates);
  }

  @Delete('guests')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async deleteGuest(@Query('user_id') userId: string) {
    await this.usersService.deleteGuest(userId);
    return { success: true };
  }

  // ── Hosts ──────────────────────────────────────────────────────────────

  @Get('hosts')
  @UseGuards(AdminGuard)
  async getHost(@Query('user_id') userId: string) {
    return this.usersService.getHost(userId);
  }

  @Post('hosts')
  @UseGuards(AdminGuard)
  async createHost(@Body() host: Record<string, unknown>) {
    return this.usersService.createHost(host);
  }

  @Delete('hosts')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async deleteHost(@Query('user_id') userId: string) {
    await this.usersService.deleteHost(userId);
    return { success: true };
  }

  // ── Settings ───────────────────────────────────────────────────────────

  @Get('settings')
  @UseGuards(AdminGuard)
  async getSettings(@Query('user_id') userId: string) {
    return this.usersService.getSettings(userId);
  }

  @Patch('settings')
  @UseGuards(AdminGuard)
  async updateSettings(
    @Body('user_id') userId: string,
    @Body('settings') settings: Record<string, unknown>,
  ) {
    return this.usersService.updateSettings(userId, settings);
  }

  // ── Profile (user + guest joined) ──────────────────────────────────────
  // Always the signed-in caller. The user_id query/body field older clients
  // still send is ignored.

  @Get('me')
  async getMyProfile(@UserId() userId: string) {
    return this.usersService.getMyProfile(userId);
  }

  @Patch('me')
  async updateMyProfile(
    @UserId() userId: string,
    @Body() body: UpdateMyProfileDto,
  ) {
    return this.usersService.updateMyProfile(
      userId,
      sentFields(body.user),
      sentFields(body.guest),
    );
  }
}
