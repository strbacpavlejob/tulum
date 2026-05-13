import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const SETTINGS_TABLE = 'settings';

// DB uses 'SR', mobile uses 'RS'
const LANG_TO_DB: Record<string, string> = { RS: 'SR' };
const LANG_FROM_DB: Record<string, string> = { SR: 'RS' };

@Injectable()
export class SettingsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  async getSettings(userId: string) {
    const { data, error } = await this.db
      .from(SETTINGS_TABLE)
      .select('language, theme')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;

    const defaults = { language: 'EN' as const, theme: 'dark' as const };
    if (!data) return defaults;

    const lang = (data as any).language as string;
    return {
      language: (LANG_FROM_DB[lang] ?? lang) as 'EN' | 'RS' | 'RU',
      theme: (data as any).theme as 'light' | 'dark' | 'system',
    };
  }

  async upsertSettings(
    userId: string,
    patch: { language?: string; theme?: string },
  ) {
    // Fetch existing settings so partial patches don't null out other columns
    const existing = await this.getSettings(userId);

    const mergedLanguage = patch.language ?? existing.language;
    const mergedTheme = patch.theme ?? existing.theme;

    const payload = {
      user_id: userId,
      language: LANG_TO_DB[mergedLanguage] ?? mergedLanguage,
      theme: mergedTheme,
    };

    const { data, error } = await this.db
      .from(SETTINGS_TABLE)
      .upsert(payload, { onConflict: 'user_id' })
      .select('language, theme')
      .single();
    if (error) throw error;
    const lang = (data as any).language as string;
    return {
      language: (LANG_FROM_DB[lang] ?? lang) as 'EN' | 'RS' | 'RU',
      theme: (data as any).theme as 'light' | 'dark' | 'system',
    };
  }
}
