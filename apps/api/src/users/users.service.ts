import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const USERS_TABLE = 'users';
const GUESTS_TABLE = 'guests';
const HOSTS_TABLE = 'hosts';
const SETTINGS_TABLE = 'settings';

@Injectable()
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  // ── Users ──────────────────────────────────────────────────────────────

  async getUserById(id: string) {
    const { data, error } = await this.db
      .from(USERS_TABLE)
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async searchUsersByEmail(email: string) {
    const { data, error } = await this.db
      .from(USERS_TABLE)
      .select('*')
      .ilike('email', `%${email}%`);
    if (error) throw error;
    return data ?? [];
  }

  async createUser(user: Record<string, unknown>) {
    const { data, error } = await this.db
      .from(USERS_TABLE)
      .insert(user)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateUser(id: string, updates: Record<string, unknown>) {
    const { data, error } = await this.db
      .from(USERS_TABLE)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteUser(id: string) {
    const { error } = await this.db.from(USERS_TABLE).delete().eq('id', id);
    if (error) throw error;
  }

  // ── Guests ─────────────────────────────────────────────────────────────

  async getGuest(userId: string) {
    const { data, error } = await this.db
      .from(GUESTS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data;
  }

  async createGuest(guest: Record<string, unknown>) {
    const { data, error } = await this.db
      .from(GUESTS_TABLE)
      .insert(guest)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateGuest(userId: string, updates: Record<string, unknown>) {
    const { data, error } = await this.db
      .from(GUESTS_TABLE)
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteGuest(userId: string) {
    const { error } = await this.db
      .from(GUESTS_TABLE)
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
  }

  // ── Hosts ──────────────────────────────────────────────────────────────

  async getHost(userId: string) {
    const { data, error } = await this.db
      .from(HOSTS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data;
  }

  async createHost(host: Record<string, unknown>) {
    const { data, error } = await this.db
      .from(HOSTS_TABLE)
      .insert(host)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteHost(userId: string) {
    const { error } = await this.db
      .from(HOSTS_TABLE)
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
  }

  // ── Settings ───────────────────────────────────────────────────────────

  async getSettings(userId: string) {
    const { data, error } = await this.db
      .from(SETTINGS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data;
  }

  async updateSettings(userId: string, settings: Record<string, unknown>) {
    const { data, error } = await this.db
      .from(SETTINGS_TABLE)
      .update(settings)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
