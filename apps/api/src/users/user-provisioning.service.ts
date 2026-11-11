import { Injectable, Logger } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import { SupabaseService } from '../supabase/supabase.service';

const USERS_TABLE = 'users';
const HOSTS_TABLE = 'hosts';

type UserRow = {
  id: string;
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

function isUniqueViolation(
  error: { code?: string; message?: string },
  constraint: string,
) {
  return error.code === '23505' && (error.message ?? '').includes(constraint);
}

/**
 * Makes the users row of a signed-in user who has none yet. The create-user
 * webhook (apps/host/supabase/functions/create-user) makes it at sign-up, but
 * Clerk can deliver it late, or retry a failed delivery minutes later. Until
 * then GET /users/me fails, and onboarding can't save the guests row, which
 * needs the users row. The row is made from the Clerk user the way the
 * webhook makes it, so whichever comes first makes it and the other changes
 * nothing.
 */
@Injectable()
export class UserProvisioningService {
  private readonly logger = new Logger(UserProvisioningService.name);
  private readonly clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  /** Users this process has seen a row for: each is looked up once. */
  private readonly knownUserIds = new Set<string>();
  /** Checks under way, so a user's parallel requests share one. */
  private readonly pending = new Map<string, Promise<void>>();

  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  /**
   * Makes sure the user has a users row. It never fails the request: when the
   * row can't be made, the caller goes on and fails as it did before.
   */
  async ensureUserRow(userId: string): Promise<void> {
    if (this.knownUserIds.has(userId)) return;
    let check = this.pending.get(userId);
    if (!check) {
      check = this.provision(userId).finally(() => this.pending.delete(userId));
      this.pending.set(userId, check);
    }
    await check;
  }

  private async provision(userId: string): Promise<void> {
    try {
      const { data, error } = await this.db
        .from(USERS_TABLE)
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        this.knownUserIds.add(userId);
        return;
      }

      const row = await this.rowFromClerk(userId);
      if (!row) return;

      const outcome = await this.insertUser(row);
      if (outcome === 'email_taken') {
        // Clerk emails are unique, so the other row is stale: most likely an
        // account deleted in Clerk that delete-user hasn't removed yet.
        this.logger.error(
          `No users row for ${userId}: another users row has their email`,
        );
        return;
      }
      if (outcome === 'created') {
        this.logger.warn(
          `Made the users row of ${userId}; the create-user webhook hadn't yet`,
        );
      }

      const hosts = await this.db
        .from(HOSTS_TABLE)
        .upsert(
          { user_id: userId },
          { onConflict: 'user_id', ignoreDuplicates: true },
        );
      if (hosts.error) throw hosts.error;

      this.knownUserIds.add(userId);
    } catch (err) {
      this.logger.error(`Making the users row of ${userId} failed`, err);
    }
  }

  /** The users row the webhook would make, or null without an email. */
  private async rowFromClerk(userId: string): Promise<UserRow | null> {
    const user = await this.clerkClient.users.getUser(userId);
    const emails = user.emailAddresses ?? [];
    const email = (
      emails.find((e) => e.id === user.primaryEmailAddressId) ?? emails[0]
    )?.emailAddress;
    if (!email) {
      // users.email is NOT NULL.
      this.logger.error(
        `No users row for ${userId}: the Clerk user has no email address`,
      );
      return null;
    }
    return {
      id: userId,
      email,
      username: user.username ?? email.split('@')[0],
      first_name: user.firstName,
      last_name: user.lastName,
      avatar_url: user.imageUrl,
    };
  }

  /**
   * Inserts the row unless one with this id exists, as the webhook does: a
   * taken username gets a suffix from the (unique) Clerk id, and a taken
   * email leaves the user without a row.
   */
  private async insertUser(
    row: UserRow,
  ): Promise<'created' | 'existed' | 'email_taken'> {
    const insert = (values: UserRow) =>
      this.db
        .from(USERS_TABLE)
        .upsert(values, { onConflict: 'id', ignoreDuplicates: true })
        .select('id');

    let { data, error } = await insert(row);
    if (error && isUniqueViolation(error, 'users_username_key')) {
      ({ data, error } = await insert({
        ...row,
        username: `${row.username}_${row.id.slice(-6).toLowerCase()}`,
      }));
    }
    if (error && isUniqueViolation(error, 'users_email_key')) {
      return 'email_taken';
    }
    if (error) throw error;
    return (data ?? []).length > 0 ? 'created' : 'existed';
  }
}
