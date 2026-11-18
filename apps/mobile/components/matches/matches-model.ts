import { SwipeFilters, SwipeableProfile } from "@/lib/api";
import { Profile } from "@/types/profile";
import { GenderFilter } from "@/types/user";

/**
 * Metres within which the user is considered "at the venue", when the API
 * sends no checkin_radius_m with the ticket
 */
export const PROXIMITY_RADIUS_M = 300;

/** How often (ms) to re-check position on the location verification screen */
export const LOCATION_POLL_INTERVAL_MS = 5_000;

/** How often (ms) the locked screen checks again for a ticket whose event is live */
export const LOCKED_RECHECK_INTERVAL_MS = 30_000;

/** How often (ms) the deck's counts are checked again while it is open */
export const PROFILE_REFRESH_INTERVAL_MS = 30_000;

/** Profiles in a page of the deck */
export const DECK_PAGE_SIZE = 25;

/** The next page loads when the card shown is this close to the last one */
export const DECK_PREFETCH_CARDS = 5;

/** Wait (ms) after a filter change before the deck loads again */
export const FILTER_RELOAD_DELAY_MS = 400;

export const MAX_LIKE_PERCENTAGE = 0.2;

export const MIN_LIKE_LIMIT = 3;

export const PRE_EVENT_GRACE_MS = 5 * 60 * 1000;

export function mapToProfile(p: SwipeableProfile, eventTitle: string): Profile {
  const images =
    p.picture_urls.length > 0
      ? p.picture_urls
      : p.avatar_url
        ? [p.avatar_url]
        : ["https://picsum.photos/400/600"];
  return {
    id: p.user_id,
    name: p.first_name ?? "Unknown",
    age: p.age,
    bio: p.bio ?? "",
    images,
    distance: 1, // any truthy value so SwipeCard shows event title
    hobbies: p.interests,
    event: {
      id: String(p.event_id),
      image: "",
      title: eventTitle,
      venueName: "",
      address: "",
      location: { latitude: 0, longitude: 0 },
      isFavorite: false,
      guestCount: 0,
      date: "",
      tags: [],
    },
  };
}

export function calculateRawLikeLimit(eligibleGuestCount: number): number {
  const normalizedEligibleCount = Math.max(0, Math.floor(eligibleGuestCount));

  if (normalizedEligibleCount === 0) {
    return 0;
  }

  const percentageLimit = Math.floor(
    normalizedEligibleCount * MAX_LIKE_PERCENTAGE,
  );

  return Math.min(
    normalizedEligibleCount,
    Math.max(MIN_LIKE_LIMIT, percentageLimit),
  );
}

export function calculateEffectiveLikeLimit(
  eligibleGuestCount: number,
  likesUsed: number,
): number {
  return Math.max(
    Math.max(0, likesUsed),
    calculateRawLikeLimit(eligibleGuestCount),
  );
}

export type EligibilityState =
  | "checking"
  | "locked" // no ticket or event not live
  | "location_required" // ticket + live event, but not within GPS range
  | "eligible"; // all 3 conditions met

export interface LiveTicket {
  event_id: string;
  venue_lat: number;
  venue_lng: number;
  venue_name: string;
  event_title: string;
  /** How near the venue the user must be, in metres; set by the API. */
  checkin_radius_m: number;
}

/**
 * Whether a position counts as at the venue: within the radius once its
 * reported accuracy is allowed for. Indoors a browser's position can be a few
 * hundred metres off. The allowance is at most the radius, so a position that
 * vague still has to be nearby.
 */
export function isAtVenue(
  distanceM: number,
  accuracyM: number | null | undefined,
  radiusM: number,
): boolean {
  const allowance = Math.min(Math.max(accuracyM ?? 0, 0), radiusM);
  return distanceM - allowance <= radiusM;
}

export interface SwipeCandidate {
  profile: Profile;
  gender: "male" | "female" | "other" | null;
  likedByMe: boolean;
}

export interface LikeStats {
  likesUsed: number;
  likeLimit: number;
  eligibleGuestCount: number;
}

export function applyProfileFilters(
  candidates: SwipeCandidate[],
  genderFilter: GenderFilter,
  ageMin: number,
  ageMax: number,
): SwipeCandidate[] {
  return candidates.filter((candidate) => {
    const genderMatch =
      genderFilter === "everyone" || candidate.gender === genderFilter;
    const ageMatch =
      candidate.profile.age >= ageMin && candidate.profile.age <= ageMax;
    return genderMatch && ageMatch;
  });
}

/** Which filters a deck was loaded for. */
export function filtersKey(filters: SwipeFilters): string {
  return `${filters.genderFilter}|${filters.ageMin}|${filters.ageMax}`;
}

/** The deck's cards for the profiles in an answer, without blocked guests. */
export function toSwipeCandidates(
  profiles: SwipeableProfile[],
  eventTitle: string,
  blockedIds: ReadonlySet<string>,
): SwipeCandidate[] {
  return profiles
    .filter((p) => !blockedIds.has(p.user_id))
    .map((p) => ({
      profile: mapToProfile(p, eventTitle),
      gender: p.gender,
      likedByMe: Boolean(p.liked_by_me),
    }));
}
