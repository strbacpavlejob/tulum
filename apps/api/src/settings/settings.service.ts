import { Injectable } from '@nestjs/common';
import { VenueTypeEnum } from '../scrape/domain/scraper-venue.interfaces';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateMySettingsDto } from './dto/update-my-settings.dto';

const SETTINGS_TABLE = 'settings';

// DB uses 'SR', mobile uses 'RS'
const LANG_TO_DB: Record<string, string> = { RS: 'SR' };
const LANG_FROM_DB: Record<string, string> = { SR: 'RS' };

interface SettingsRow {
  language: string;
  theme: string;
  // Absent until migration 20261024132329_add_settings_default_venue_type
  // is applied.
  default_venue_type?: VenueTypeEnum | null;
}

function toSettings(row: SettingsRow) {
  return {
    language: (LANG_FROM_DB[row.language] ?? row.language) as
      | 'EN'
      | 'RS'
      | 'RU',
    theme: row.theme as 'light' | 'dark' | 'system',
    default_venue_type: row.default_venue_type ?? null,
  };
}

@Injectable()
export class SettingsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  // Rows are read whole (*) so language and theme keep working before the
  // default_venue_type migration is applied.
  async getSettings(userId: string) {
    const { data, error } = await this.db
      .from(SETTINGS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle<SettingsRow>();
    if (error) throw error;

    if (!data) {
      return {
        language: 'EN' as const,
        theme: 'dark' as const,
        default_venue_type: null,
      };
    }
    return toSettings(data);
  }

  async upsertSettings(userId: string, patch: UpdateMySettingsDto) {
    // Fetch existing settings so partial patches don't null out other columns
    const existing = await this.getSettings(userId);

    const mergedLanguage = patch.language ?? existing.language;
    const mergedTheme = patch.theme ?? existing.theme;

    const payload: Record<string, unknown> = {
      user_id: userId,
      language: LANG_TO_DB[mergedLanguage] ?? mergedLanguage,
      theme: mergedTheme,
    };
    // Written only when sent; null clears it. A language or theme change
    // leaves the column alone.
    if (patch.default_venue_type !== undefined) {
      payload.default_venue_type = patch.default_venue_type;
    }

    const { data, error } = await this.db
      .from(SETTINGS_TABLE)
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single<SettingsRow>();
    if (error) throw error;
    return toSettings(data);
  }
}
