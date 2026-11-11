/// <reference types="multer" />

import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  calculateEffectiveLikeLimit,
  normalizeLikeFilters,
  type LikeFilters,
} from '../common/like-limit';
import { isMissingFunction } from '../common/missing-function';
import { pageSize } from '../common/paging';
import { GuestSafetyService } from '../guest-safety/guest-safety.service';
import { guestVisibility, isShownTo } from '../guest-safety/guest-visibility';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';
import { UserProvisioningService } from '../users/user-provisioning.service';
import { OnboardingDto } from './dto/onboarding.dto';
import { deckProfileDetails } from './shared-profile';

const USERS_TABLE = 'users';
const GUESTS_TABLE = 'guests';
const GUEST_SWIPES_TABLE = 'guest_swipes';
const MAX_PHOTOS = 3;
// Profile photo dimensions and target quality
const PHOTO_WIDTH = 800;
const PHOTO_HEIGHT = 600;
// supabase/migrations/20261111210742_paged_swipe_deck_and_guest_list.sql
const SWIPE_DECK_FUNCTION = 'get_swipe_deck';
/** Profiles in a page of the deck when the request names no limit. */
export const DECK_PAGE_SIZE = 25;
/** A deck cursor: a guest's 12-digit arrival wave, then 32 hex digits. */
const DECK_CURSOR = /^\d{12}[0-9a-f]{32}$/;

/** A guest on the Matches deck, as the app gets them. */
export interface DeckProfile {
  user_id: string;
  event_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  gender: 'male' | 'female' | 'other' | null;
  picture_urls: string[];
  age: number;
  interests: string[];
  bio: string | null;
  liked_by_me: boolean;
}

/** What get_swipe_deck returns. */
interface SwipeDeckResult {
  eligible_guest_count: number;
  present_guest_count: number;
  likes_used: number;
  profiles: (Omit<DeckProfile, 'event_id' | 'age'> & { age: number | null })[];
  next_cursor: string | null;
  end_cursor: string | null;
}

interface DeckPage {
  profiles: DeckProfile[];
  likesUsed: number;
  eligibleGuestCount: number;
  /** Guests shown to the user before the filters. */
  presentGuestCount: number;
  nextCursor: string | null;
  endCursor: string | null;
}

function isOnboardingComplete(guest: Record<string, unknown> | null): boolean {
  if (!guest) return false;
  return !!(
    guest.gender != null &&
    guest.seeking != null &&
    Array.isArray(guest.interested_in) &&
    (guest.interested_in as unknown[]).length > 0
  );
}

function profileMatchesFilters(
  profile: {
    gender: 'male' | 'female' | 'other' | null;
    age: number;
    interests: string[];
  },
  filters: LikeFilters,
): boolean {
  const genderMatch =
    filters.genderFilter === 'everyone' ||
    profile.gender === filters.genderFilter;

  const ageMinMatch = filters.ageMin === null || profile.age >= filters.ageMin;
  const ageMaxMatch = filters.ageMax === null || profile.age <= filters.ageMax;

  const interestsMatch =
    filters.selectedInterests.length === 0 ||
    filters.selectedInterests.some((interest) =>
      profile.interests.includes(interest),
    );

  return genderMatch && ageMinMatch && ageMaxMatch && interestsMatch;
}

@Injectable()
export class GuestsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly r2Service: R2Service,
    private readonly guestSafety: GuestSafetyService,
    private readonly userProvisioning: UserProvisioningService,
  ) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  async getGuestMe(userId: string) {
    // The app asks this first after sign-in, so a users row the webhook
    // hasn't made yet is made here, before onboarding needs it.
    await this.userProvisioning.ensureUserRow(userId);
    const { data, error } = await this.db
      .from(GUESTS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return {
      guest: data ?? null,
      isOnboardingComplete: isOnboardingComplete(data),
    };
  }

  async getSwipeableGuests(
    userId: string,
    eventId?: string,
    filtersInput?: {
      genderFilter?: string | null;
      ageMin?: number | null;
      ageMax?: number | null;
      selectedInterests?: string[] | null;
    },
    page?: { cursor?: string | null; limit?: number | null },
  ) {
    const filters = normalizeLikeFilters(filtersInput);
    const cursor = page?.cursor || null;
    if (cursor !== null && !DECK_CURSOR.test(cursor)) {
      throw new BadRequestException('Invalid cursor');
    }
    const limit = pageSize(page?.limit, DECK_PAGE_SIZE);
    let targetEventId = eventId;

    if (!targetEventId) {
      // Auto-detect from the user's most recent active event session
      const { data: session } = await this.db
        .from('event_sessions')
        .select('event_id')
        .eq('user_id', userId)
        .is('exited_at', null)
        .order('entered_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!session)
        return {
          event_id: null,
          event_title: '',
          event_venue: '',
          profiles: [],
        };
      targetEventId = session.event_id as string;
    } else {
      // If an explicit eventId was provided, ensure the requesting user
      // is actually attending that event (active session OR valid ticket).
      // If they're not attending, return an empty result — we should only
      // return guests who are at the same event as the requester.
      // limit(1): a user may still have more than one active session, and
      // maybeSingle errors on two.
      const { data: userSession, error: userSessionError } = await this.db
        .from('event_sessions')
        .select('id')
        .eq('event_id', targetEventId)
        .eq('user_id', userId)
        .is('exited_at', null)
        .limit(1)
        .maybeSingle();
      if (userSessionError) throw userSessionError;

      let isAttending = Boolean(userSession);

      if (!isAttending) {
        const { data: userTicket } = await this.db
          .from('tickets')
          .select('id')
          .eq('event_id', targetEventId)
          .eq('guest_id', userId)
          .maybeSingle();
        isAttending = Boolean(userTicket);
      }

      if (!isAttending)
        return {
          event_id: null,
          event_title: '',
          event_venue: '',
          profiles: [],
        };
    }

    // Hidden pauses Matches for you as well: nobody sees you, and you see
    // nobody. Someone without a guest profile counts as visible.
    const visibility =
      (await this.guestSafety.visibilityOf(userId)) ?? 'everyone';
    if (visibility === 'hidden') {
      return {
        event_id: targetEventId as string | null,
        event_title: '',
        event_venue: '',
        profiles: [],
        visibility,
      };
    }

    // One page of the deck and its counts in one call. Until that function
    // exists, the whole deck is read as before.
    const deck =
      (await this.swipeDeckPage(
        userId,
        targetEventId,
        filters,
        cursor,
        limit,
      )) ??
      (await this.wholeSwipeDeck(
        userId,
        targetEventId,
        filters,
        cursor,
        limit,
      ));

    const likeLimit = calculateEffectiveLikeLimit(
      deck.eligibleGuestCount,
      deck.likesUsed,
    );

    // Fetch event title + venue name
    const { data: event } = await this.db
      .from('events')
      .select('id, title, venues!events_venue_id_fkey(name)')
      .eq('id', targetEventId)
      .maybeSingle();

    return {
      event_id: targetEventId as string | null,
      event_title: (event?.title ?? '') as string,
      event_venue: ((event?.venues as unknown as Record<string, unknown> | null)
        ?.name ?? '') as string,
      profiles: deck.profiles,
      likes_used: deck.likesUsed,
      like_limit: likeLimit,
      eligible_guest_count: deck.eligibleGuestCount,
      present_guest_count: deck.presentGuestCount,
      visibility,
      next_cursor: deck.nextCursor,
      end_cursor: deck.endCursor,
    };
  }

  /**
   * A page of the deck from get_swipe_deck: guests the filters keep, in the
   * order the function sets, with the counts for those filters. Null while
   * the function is missing.
   */
  private async swipeDeckPage(
    userId: string,
    eventId: string,
    filters: LikeFilters,
    cursor: string | null,
    limit: number,
  ): Promise<DeckPage | null> {
    const { data, error } = await this.db.rpc(SWIPE_DECK_FUNCTION, {
      p_viewer_id: userId,
      p_event_id: eventId,
      p_gender_filter: filters.genderFilter,
      p_age_min: filters.ageMin,
      p_age_max: filters.ageMax,
      p_interest_filters: filters.selectedInterests,
      p_cursor: cursor,
      p_limit: limit,
    });
    if (error) {
      if (isMissingFunction(error)) return null;
      throw error;
    }

    const deck = data as SwipeDeckResult;
    return {
      profiles: deck.profiles.map((p) => ({
        user_id: p.user_id,
        event_id: eventId,
        first_name: p.first_name ?? null,
        last_name: p.last_name ?? null,
        avatar_url: p.avatar_url ?? null,
        gender: p.gender ?? null,
        picture_urls: p.picture_urls ?? [],
        age: p.age ?? 0,
        interests: p.interests ?? [],
        ...deckProfileDetails(p),
        liked_by_me: Boolean(p.liked_by_me),
      })),
      likesUsed: deck.likes_used,
      eligibleGuestCount: deck.eligible_guest_count,
      presentGuestCount: deck.present_guest_count,
      nextCursor: deck.next_cursor ?? null,
      endCursor: deck.end_cursor ?? null,
    };
  }

  /**
   * The deck as it was read before get_swipe_deck, for while that function
   * is missing: everyone shown to the user at the event in one answer, for
   * the app to filter, with the counts for the filters. It has no pages, so
   * a request for a later page, or for the counts alone, gets no profiles.
   */
  private async wholeSwipeDeck(
    userId: string,
    eventId: string,
    filters: LikeFilters,
    cursor: string | null,
    limit: number,
  ): Promise<DeckPage> {
    // Guests blocked either way never show up. Who liked you here decides
    // whether a guest who shows themselves only to people they like does.
    const [blockedIds, likedMeIds] = await Promise.all([
      this.guestSafety.blockedUserIds(userId),
      this.guestSafety.likedByAt(userId, eventId),
    ]);

    // Find guests already matched with the current user at this event
    const { data: existingMatches } = await this.db
      .from('matches')
      .select('guest_id_1, guest_id_2')
      .eq('event_id', eventId)
      .or(`guest_id_1.eq.${userId},guest_id_2.eq.${userId}`);

    const matchedIds = new Set<string>([userId]);
    for (const m of existingMatches ?? []) {
      matchedIds.add(m.guest_id_1 as string);
      matchedIds.add(m.guest_id_2 as string);
    }

    // Load existing swipes so profiles can show liked-state and usage can be counted.
    const { data: mySwipes } = await this.db
      .from(GUEST_SWIPES_TABLE)
      .select('swiped_user_id, liked')
      .eq('swiper_user_id', userId)
      .eq('event_id', eventId);

    const likedByMeIds = new Set<string>(
      (mySwipes ?? [])
        .filter((s) => Boolean(s.liked))
        .map((s) => s.swiped_user_id as string),
    );
    const likesUsed = (mySwipes ?? []).filter((s) => Boolean(s.liked)).length;

    // Find all currently active user_ids at this event via event_sessions
    const { data: sessions } = await this.db
      .from('event_sessions')
      .select('user_id')
      .eq('event_id', eventId)
      .is('exited_at', null)
      .neq('user_id', userId);

    const candidateIds = Array.from(
      new Set(
        (sessions ?? []).map(
          (s: Record<string, unknown>) => s.user_id as string,
        ),
      ),
    ).filter((id) => !matchedIds.has(id) && !blockedIds.has(id));

    // Fetch guest profiles + user info for candidates
    let profiles: DeckProfile[] = [];
    if (candidateIds.length > 0) {
      // The rows are read whole (*) so this works before and after the
      // guest_safety_controls migration adds visibility; the profile below
      // picks what is sent.
      const { data: guests, error } = await this.db
        .from(GUESTS_TABLE)
        .select(
          '*, users!guests_user_id_fkey(first_name, last_name, avatar_url)',
        )
        .in('user_id', candidateIds);
      if (error) throw error;

      const shownGuests = ((guests ?? []) as Record<string, unknown>[]).filter(
        (g) =>
          isShownTo(guestVisibility(g), {
            blocked: blockedIds.has(g.user_id as string),
            likedViewer: likedMeIds.has(g.user_id as string),
          }),
      );

      profiles = shownGuests.map((g: Record<string, unknown>) => {
        const user = g.users as Record<string, unknown> | null;
        const birthday = g.birthday ? new Date(g.birthday as string) : null;
        const age = birthday
          ? Math.floor(
              (Date.now() - birthday.getTime()) / (365.25 * 24 * 3600 * 1000),
            )
          : 0;
        return {
          user_id: g.user_id as string,
          event_id: eventId,
          first_name: (user?.first_name ?? null) as string | null,
          last_name: (user?.last_name ?? null) as string | null,
          avatar_url: (user?.avatar_url ?? null) as string | null,
          gender: (g.gender ?? null) as 'male' | 'female' | 'other' | null,
          picture_urls: (g.picture_urls ?? []) as string[],
          age,
          interests: (g.interests ?? []) as string[],
          ...deckProfileDetails(g),
          liked_by_me: likedByMeIds.has(g.user_id as string),
        };
      });
    }

    const eligibleGuestCount = profiles.filter((profile) =>
      profileMatchesFilters(profile, filters),
    ).length;

    return {
      profiles: cursor === null && limit > 0 ? profiles : [],
      likesUsed,
      eligibleGuestCount,
      presentGuestCount: profiles.length,
      nextCursor: null,
      endCursor: null,
    };
  }

  async upsertOnboarding(userId: string, dto: OnboardingDto) {
    // The name is a users column; the users row is made at sign-up, or here
    // if the webhook that makes it is late. It is saved before the guest row,
    // because that row is what marks onboarding complete: if this write
    // fails, onboarding stays open to submit again.
    await this.userProvisioning.ensureUserRow(userId);
    const { error: nameError } = await this.db
      .from(USERS_TABLE)
      .update({ first_name: dto.first_name })
      .eq('id', userId);
    if (nameError) throw nameError;

    const payload = {
      user_id: userId,
      gender: dto.gender,
      seeking: dto.seeking,
      interested_in: dto.interested_in,
      interests: dto.interests ?? [],
      picture_urls: dto.picture_urls ?? [],
      venue_types: dto.venue_types ?? [],
      bio: dto.bio?.trim() || null,
      birthday: dto.birthday,
    };

    const { data, error } = await this.db
      .from(GUESTS_TABLE)
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return {
      guest: data,
      isOnboardingComplete: isOnboardingComplete(
        data as Record<string, unknown>,
      ),
    };
  }

  async uploadPhoto(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string[]> {
    const { data: guest } = await this.db
      .from(GUESTS_TABLE)
      .select('picture_urls')
      .eq('user_id', userId)
      .maybeSingle();

    const currentUrls: string[] = (guest?.picture_urls as string[]) ?? [];
    if (currentUrls.length >= MAX_PHOTOS) {
      throw new BadRequestException(
        `Maximum ${MAX_PHOTOS} photos allowed. Remove a photo first.`,
      );
    }

    const key = `guests/${userId}/${randomUUID()}.webp`;
    const url = await this.r2Service.uploadAndProcessImage(
      file.buffer,
      key,
      PHOTO_WIDTH,
      PHOTO_HEIGHT,
    );

    const updatedUrls = [...currentUrls, url];

    // Only UPDATE when the guest row already exists. If it doesn't (photo
    // uploaded during onboarding before submitOnboarding is called), skip the
    // DB write — the URL is returned to the client and will be included in
    // picture_urls when submitOnboarding completes.
    // Using UPDATE (not upsert) avoids a silent INSERT failure caused by the
    // NOT NULL constraint on `interested_in` which has no default.
    if (guest) {
      const { error } = await this.db
        .from(GUESTS_TABLE)
        .update({ picture_urls: updatedUrls })
        .eq('user_id', userId);
      if (error) throw error;
    }

    return updatedUrls;
  }

  async deletePhoto(userId: string, url: string): Promise<string[]> {
    const { data: guest } = await this.db
      .from(GUESTS_TABLE)
      .select('picture_urls')
      .eq('user_id', userId)
      .maybeSingle();

    const currentUrls: string[] = (guest?.picture_urls as string[]) ?? [];

    const key = this.r2Service.extractKeyFromUrl(url);
    if (key) {
      await this.r2Service.deleteObject(key).catch(() => {
        // Deletion from R2 is best-effort; proceed even if it fails
      });
    }

    const updatedUrls = currentUrls.filter((u) => u !== url);
    const { error } = await this.db
      .from(GUESTS_TABLE)
      .update({ picture_urls: updatedUrls })
      .eq('user_id', userId);
    if (error) throw error;

    return updatedUrls;
  }
}
