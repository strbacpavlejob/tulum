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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Users ──────────────────────────────────────────────────────────────

  @Get()
  async getUser(@Query('id') id?: string, @Query('email') email?: string) {
    if (id) return this.usersService.getUserById(id);
    if (email) return this.usersService.searchUsersByEmail(email);
    throw new BadRequestException('Missing required parameter: id or email');
  }

  @Post()
  async createUser(@Body() user: Record<string, unknown>) {
    return this.usersService.createUser(user);
  }

  @Patch()
  async updateUser(
    @Body('id') id: string,
    @Body('updates') updates: Record<string, unknown>,
  ) {
    return this.usersService.updateUser(id, updates);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Query('id') id: string) {
    await this.usersService.deleteUser(id);
    return { success: true };
  }

  // ── Guests ─────────────────────────────────────────────────────────────

  @Get('guests')
  async getGuest(@Query('user_id') userId: string) {
    return this.usersService.getGuest(userId);
  }

  @Post('guests')
  async createGuest(@Body() guest: Record<string, unknown>) {
    return this.usersService.createGuest(guest);
  }

  @Patch('guests')
  async updateGuest(
    @Body('user_id') userId: string,
    @Body('updates') updates: Record<string, unknown>,
  ) {
    return this.usersService.updateGuest(userId, updates);
  }

  @Delete('guests')
  @HttpCode(HttpStatus.OK)
  async deleteGuest(@Query('user_id') userId: string) {
    await this.usersService.deleteGuest(userId);
    return { success: true };
  }

  // ── Hosts ──────────────────────────────────────────────────────────────

  @Get('hosts')
  async getHost(@Query('user_id') userId: string) {
    return this.usersService.getHost(userId);
  }

  @Post('hosts')
  async createHost(@Body() host: Record<string, unknown>) {
    return this.usersService.createHost(host);
  }

  @Delete('hosts')
  @HttpCode(HttpStatus.OK)
  async deleteHost(@Query('user_id') userId: string) {
    await this.usersService.deleteHost(userId);
    return { success: true };
  }

  // ── Settings ───────────────────────────────────────────────────────────

  @Get('settings')
  async getSettings(@Query('user_id') userId: string) {
    return this.usersService.getSettings(userId);
  }

  @Patch('settings')
  async updateSettings(
    @Body('user_id') userId: string,
    @Body('settings') settings: Record<string, unknown>,
  ) {
    return this.usersService.updateSettings(userId, settings);
  }
}
