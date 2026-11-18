import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * The service-role Supabase client every feature module queries through.
 * Data access lives with the features; the scrapers' reads and writes are in
 * ScrapedDataService.
 */
@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(SupabaseService.name);

  onModuleInit() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log('Supabase client initialized');
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }
}
