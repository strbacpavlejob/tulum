import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  guestVisibility,
  isShownTo,
  type GuestVisibility,
} from './guest-visibility';

const GUEST_BLOCKS_TABLE = 'guest_blocks';
const GUEST_SWIPES_TABLE = 'guest_swipes';
const GUESTS_TABLE = 'guests';

/**
 * PostgREST's answer for a table that doesn't exist (PGRST205; 42P01 from
 * older versions). guest_blocks is missing until
 * supabase/migrations/20261025103255_guest_safety_controls.sql is applied,
 * and until then nobody can have blocked anyone.
 */
function isMissingTable(error: { code?: string }): boolean {
  return error.code === 'PGRST205' || error.code === '42P01';
}

/**
 * Blocks and visibility: which guests may see each other. The deck, guest
 * lists, swipes, the inbox and chats all ask here, so a block or a
 * visibility setting is enforced by the API, not only hidden by the app.
 */
@Injectable()
export class GuestSafetyService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  /** Everyone the user blocked or was blocked by. */
  async blockedUserIds(userId: string): Promise<Set<string>> {
    const { data, error } = await this.db
      .from(GUEST_BLOCKS_TABLE)
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
    if (error) {
      if (isMissingTable(error)) return new Set();
      throw error;
    }
    const ids = new Set<string>();
    for (const row of (data ?? []) as {
      blocker_id: string;
      blocked_id: string;
    }[]) {
      ids.add(row.blocker_id === userId ? row.blocked_id : row.blocker_id);
    }
    return ids;
  }

  /** Whether either of the two blocked the other. */
  async isBlockedBetween(userId: string, otherUserId: string) {
    return (await this.blockedUserIds(userId)).has(otherUserId);
  }

  /** The guests who liked the user at the event. */
  async likedByAt(userId: string, eventId: string): Promise<Set<string>> {
    const { data, error } = await this.db
      .from(GUEST_SWIPES_TABLE)
      .select('swiper_user_id')
      .eq('swiped_user_id', userId)
      .eq('event_id', eventId)
      .eq('liked', true);
    if (error) throw error;
    return new Set(
      ((data ?? []) as { swiper_user_id: string }[]).map(
        (row) => row.swiper_user_id,
      ),
    );
  }

  /**
   * A guest's visibility, or undefined when they have no guests row. The row
   * is read whole (*) so this works before and after the migration.
   */
  async visibilityOf(userId: string): Promise<GuestVisibility | undefined> {
    const { data, error } = await this.db
      .from(GUESTS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle<Record<string, unknown>>();
    if (error) throw error;
    return data ? guestVisibility(data) : undefined;
  }

  /**
   * Whether the viewer may see the guest at the event, as the deck and the
   * guest list show them. A guest the viewer can't see can't be swiped
   * either.
   */
  async isShownAt(
    guestId: string,
    viewerId: string,
    eventId: string,
  ): Promise<boolean> {
    const [visibility, blockedIds] = await Promise.all([
      this.visibilityOf(guestId),
      this.blockedUserIds(viewerId),
    ]);
    if (!visibility) return false;
    const likedViewer =
      visibility === 'liked' &&
      (await this.likedByAt(viewerId, eventId)).has(guestId);
    return isShownTo(visibility, {
      blocked: blockedIds.has(guestId),
      likedViewer,
    });
  }

  /** Whether the user has a guest profile. */
  async isGuest(userId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from(GUESTS_TABLE)
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }

  /** POST /blocks: the user blocks another guest. */
  async blockGuest(userId: string, guestId: string) {
    if (guestId === userId) {
      throw new BadRequestException('You cannot block yourself');
    }
    if (!(await this.isGuest(guestId))) {
      throw new NotFoundException('Guest not found');
    }
    await this.block(userId, guestId);
    return { blocked: true };
  }

  /** Records the block. Blocking someone again changes nothing. */
  async block(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await this.db
      .from(GUEST_BLOCKS_TABLE)
      .upsert(
        { blocker_id: blockerId, blocked_id: blockedId },
        { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true },
      );
    if (error) throw error;
  }
}
