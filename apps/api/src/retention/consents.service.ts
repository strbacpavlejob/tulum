import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { toUtcIsoString } from '../common/db-timestamp';
import { isMissingTableOrColumn } from '../common/missing-schema';
import { SupabaseService } from '../supabase/supabase.service';

const CONSENTS_TABLE = 'marketing_consents';
/** "Email me when the Tulum app is out". */
const APP_LAUNCH_TOPIC = 'app_launch';

export interface ConsentAnswer {
  granted: boolean;
  /** The text the guest was shown with the checkbox. */
  wording: string;
  language?: string | null;
  platform?: string | null;
  /** Where the guest answered. */
  source: 'onboarding' | 'settings';
}

/** The guest's latest answer, or null if they never answered. */
export type ConsentState = { granted: boolean; at: string | null } | null;

/**
 * Guests' consent to be emailed when the native app launches. Answers are
 * kept as a log, one row each: a change adds a row instead of editing one,
 * so every answer keeps its time, wording, language and phone type. The
 * latest row is the guest's current answer.
 */
@Injectable()
export class ConsentsService {
  private readonly logger = new Logger(ConsentsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  /** The guest's latest answer. 503 until the consents table exists. */
  async appLaunch(userId: string): Promise<ConsentState> {
    const { data, error } = await this.db
      .from(CONSENTS_TABLE)
      .select('granted, created_at')
      .eq('user_id', userId)
      .eq('topic', APP_LAUNCH_TOPIC)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw this.unavailableOr(error);
    return data
      ? {
          granted: data.granted as boolean,
          at: toUtcIsoString(data.created_at),
        }
      : null;
  }

  /** Records an answer. 503 until the consents table exists. */
  async recordAppLaunch(userId: string, answer: ConsentAnswer): Promise<void> {
    const { error } = await this.db.from(CONSENTS_TABLE).insert({
      user_id: userId,
      topic: APP_LAUNCH_TOPIC,
      granted: answer.granted,
      wording: answer.wording,
      language: answer.language ?? null,
      platform: answer.platform ?? null,
      source: answer.source,
    });
    if (error) throw this.unavailableOr(error);
  }

  private unavailableOr(error: { code?: string; message?: string }) {
    if (!isMissingTableOrColumn(error)) return error;
    this.logger.warn(
      `${CONSENTS_TABLE} is missing; apply the consent migration (${error.message ?? error.code})`,
    );
    return new ServiceUnavailableException('Consents are not set up yet');
  }
}
