import { Injectable, Logger } from '@nestjs/common';
import { isMissingTableOrColumn } from '../common/missing-schema';
import { SupabaseService } from '../supabase/supabase.service';

const GUESTS_TABLE = 'guests';
/** A QR poster's tag, e.g. p07 from /e/{id}?src=p07. */
const SOURCE_TAG = /^[A-Za-z0-9_-]{1,32}$/;
/** Where the app runs, e.g. web-ios or web-android-instagram. */
const PLATFORM_TAG = /^[a-z0-9-]{1,64}$/;

/**
 * Where each guest came from: the platform they signed up on, and the first
 * event they joined with the QR poster that brought them. Kept to measure
 * Maskenbal and to plan the native launch. Each value is written once, the
 * first time, and never overwritten.
 *
 * Recording is best effort: a failure is logged and never fails the request
 * it rides on. Until the migration that adds the columns is applied, nothing
 * is recorded.
 */
@Injectable()
export class AttributionService {
  private readonly logger = new Logger(AttributionService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  async recordSignupPlatform(userId: string, platform: unknown): Promise<void> {
    if (typeof platform !== 'string' || !PLATFORM_TAG.test(platform)) return;
    await this.setOnce(userId, 'signup_platform', {
      signup_platform: platform,
    });
  }

  /** On a guest's first join; source is the QR poster's tag, if any. */
  async recordFirstEvent(
    userId: string,
    eventId: string,
    source: unknown,
  ): Promise<void> {
    await this.setOnce(userId, 'first_event_id', {
      first_event_id: eventId,
      first_source:
        typeof source === 'string' && SOURCE_TAG.test(source) ? source : null,
    });
  }

  /** Writes values on the guest's row while column is still empty. */
  private async setOnce(
    userId: string,
    column: string,
    values: Record<string, unknown>,
  ): Promise<void> {
    try {
      const { error } = await this.db
        .from(GUESTS_TABLE)
        .update(values)
        .eq('user_id', userId)
        .is(column, null);
      if (error) {
        this.logger.warn(
          isMissingTableOrColumn(error)
            ? `Attribution not recorded; apply the attribution migration (${error.message ?? error.code})`
            : `Attribution not recorded: ${error.message ?? error.code}`,
        );
      }
    } catch (err) {
      this.logger.warn(`Attribution not recorded: ${(err as Error).message}`);
    }
  }
}
