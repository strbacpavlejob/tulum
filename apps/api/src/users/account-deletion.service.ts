import {
  BadGatewayException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import { isClerkAPIResponseError } from '@clerk/backend/errors';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Deletes the signed-in user's account (DELETE /users/me).
 *
 * The database rows are not deleted here: deleting the Clerk user makes Clerk
 * call its user.deleted webhook, the delete-user edge function
 * (apps/host/supabase/functions/delete-user), which removes them. That also
 * covers users deleted in the Clerk dashboard. This service does what only
 * the API can do: the profile photos in R2, then the Clerk user itself.
 */
@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);
  private readonly clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly r2Service: R2Service,
  ) {}

  async deleteAccount(userId: string): Promise<void> {
    // venues.host_id has no ON DELETE action, so the webhook can't remove a
    // host who still has venues, and deleting the venues would take their
    // events, with other guests' tickets, matches and chats. Refuse before
    // anything is deleted.
    const { count, error } = await this.supabaseService
      .getClient()
      .from('venues')
      .select('id', { count: 'exact', head: true })
      .eq('host_id', userId);
    if (error) throw error;
    if (count) {
      throw new ConflictException(
        `This account hosts ${count} venue(s). Move them to another host before deleting it.`,
      );
    }

    // Photos go first: once the Clerk user is deleted, the app can't retry.
    try {
      await this.r2Service.deleteFolder(`guests/${userId}/`);
    } catch (err) {
      this.logger.error(`Deleting the photos of ${userId} failed`, err);
      throw new BadGatewayException('Could not delete the profile photos');
    }

    try {
      await this.clerkClient.users.deleteUser(userId);
    } catch (err) {
      // Already deleted, e.g. by an earlier attempt whose response was lost.
      // Clerk's webhook removes the data in that case too.
      if (isClerkAPIResponseError(err) && err.status === 404) return;
      this.logger.error(`Deleting the Clerk user ${userId} failed`, err);
      throw new BadGatewayException('Could not delete the account');
    }
  }
}
