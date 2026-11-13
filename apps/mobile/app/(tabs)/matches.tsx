import MatchModal from "@/components/MatchModal";
import MatchesDeck from "@/components/matches/MatchesDeck";
import {
  EmptyMatchesView,
  LoadingStateView,
  LocationRequiredView,
  LockedStateView,
} from "@/components/matches/MatchesEligibilityViews";
import {
  createMatchSwipe,
  fetchMyTickets,
  fetchSwipeableProfiles,
  createEventSession,
  GuestUnavailableError,
  type SwipeFilters,
  type SwipeableProfile,
  type SwipeableResponse,
} from "@/lib/api";
import { useTranslation } from "react-i18next";
import { Profile } from "@/types/profile";
import type { GenderFilter } from "@/types/user";
import { useAuth } from "@clerk/expo";
import * as Location from "expo-location";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { toast } from "sonner-native";
import useStore from "@/store/useStore";

// ── Constants ──────────────────────────────────────────────────────────────────

/**
 * Metres within which the user is considered "at the venue", when the API
 * sends no checkin_radius_m with the ticket
 */
const PROXIMITY_RADIUS_M = 300;

/** How often (ms) to re-check position on the location verification screen */
const LOCATION_POLL_INTERVAL_MS = 5_000;

/** How often (ms) the locked screen checks again for a ticket whose event is live */
const LOCKED_RECHECK_INTERVAL_MS = 30_000;

/** How often (ms) the deck's counts are checked again while it is open */
const PROFILE_REFRESH_INTERVAL_MS = 30_000;
/** Profiles in a page of the deck */
const DECK_PAGE_SIZE = 25;
/** The next page loads when the card shown is this close to the last one */
const DECK_PREFETCH_CARDS = 5;
/** Wait (ms) after a filter change before the deck loads again */
const FILTER_RELOAD_DELAY_MS = 400;
const MAX_LIKE_PERCENTAGE = 0.2;
const MIN_LIKE_LIMIT = 3;
const PRE_EVENT_GRACE_MS = 5 * 60 * 1000;

// ── Helpers ────────────────────────────────────────────────────────────────────

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapToProfile(p: SwipeableProfile, eventTitle: string): Profile {
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

function calculateRawLikeLimit(eligibleGuestCount: number): number {
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

function calculateEffectiveLikeLimit(
  eligibleGuestCount: number,
  likesUsed: number,
): number {
  return Math.max(
    Math.max(0, likesUsed),
    calculateRawLikeLimit(eligibleGuestCount),
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────

type EligibilityState =
  | "checking"
  | "locked" // no ticket or event not live
  | "location_required" // ticket + live event, but not within GPS range
  | "eligible"; // all 3 conditions met

interface LiveTicket {
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
function isAtVenue(
  distanceM: number,
  accuracyM: number | null | undefined,
  radiusM: number,
): boolean {
  const allowance = Math.min(Math.max(accuracyM ?? 0, 0), radiusM);
  return distanceM - allowance <= radiusM;
}

interface SwipeCandidate {
  profile: Profile;
  gender: "male" | "female" | "other" | null;
  likedByMe: boolean;
}

interface LikeStats {
  likesUsed: number;
  likeLimit: number;
  eligibleGuestCount: number;
}

// The API filters the deck it sends; an API from before paging sent everyone
// at the event, so the deck is filtered here as well. Between a filter change
// and the deck it loads, this also narrows the deck shown at once.
function applyProfileFilters(
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
function filtersKey(filters: SwipeFilters): string {
  return `${filters.genderFilter}|${filters.ageMin}|${filters.ageMax}`;
}

/** The deck's cards for the profiles in an answer, without blocked guests. */
function toSwipeCandidates(
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

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function MatchesScreen() {
  const { t } = useTranslation();
  const { userId, getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lookingForGenderFromProfile = useStore(
    (s) => s.user?.lookingForGender ?? "everyone",
  );

  // ── Eligibility ────────────────────────────────────────────────────────────
  const [eligibility, setEligibility] = useState<EligibilityState>("checking");
  const eligibilityRef = useRef(eligibility);
  eligibilityRef.current = eligibility;
  const checkingTicketsRef = useRef(false);
  const [liveTicket, setLiveTicket] = useState<LiveTicket | null>(null);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  // The browser or the phone refuses Tulum the location: the gate says how
  // to allow it.
  const [locationDenied, setLocationDenied] = useState(false);

  // ── Swipe state ────────────────────────────────────────────────────────────
  const [profiles, setProfiles] = useState<SwipeCandidate[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [matchId, setMatchId] = useState<number | null>(null);
  const [showMatch, setShowMatch] = useState(false);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>(
    lookingForGenderFromProfile,
  );
  const [ageRange, setAgeRange] = useState({ min: 18, max: 60 });
  const [likeStats, setLikeStats] = useState<LikeStats>({
    likesUsed: 0,
    likeLimit: 0,
    eligibleGuestCount: 0,
  });
  // Your visibility is hidden: Matches is paused for you (the API sends no
  // profiles).
  const [selfHidden, setSelfHidden] = useState(false);
  // Guests you blocked or reported here. The API leaves them out from then
  // on; this also drops them from an answer that was already on its way.
  const blockedIdsRef = useRef(new Set<string>());
  // Guests here shown to you, before the filters: tells an event with nobody
  // yet from filters that leave nobody. Null until the first answer.
  const [presentGuestCount, setPresentGuestCount] = useState<number | null>(
    null,
  );
  // The deck loads a page at a time: more follow while hasMoreProfiles, from
  // deckCursorRef, where the loaded deck ends.
  const [hasMoreProfiles, setHasMoreProfiles] = useState(false);
  const hasMoreProfilesRef = useRef(false);
  const deckCursorRef = useRef<string | null>(null);
  // The eligible count when the end of the deck loaded. Another count later
  // means guests came or went, so the deck asks again from its end.
  const endEligibleCountRef = useRef<number | null>(null);
  // Each full load replaces the deck: a page asked for before it is dropped.
  const deckGenerationRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const loadedFiltersKeyRef = useRef<string | null>(null);
  // False when the deck came whole, without an end_cursor: from an API from
  // before paging, or one reading it whole until the paging migration is
  // applied. Such a deck loads whole at every refresh, as before, so guests
  // who check in later show up.
  const pagedDeckRef = useRef(true);

  useEffect(() => {
    setGenderFilter(lookingForGenderFromProfile);
  }, [lookingForGenderFromProfile]);

  const filteredProfiles = useMemo(() => {
    return applyProfileFilters(
      profiles,
      genderFilter,
      ageRange.min,
      ageRange.max,
    );
  }, [profiles, genderFilter, ageRange.min, ageRange.max]);

  const likedProfileIds = useMemo(() => {
    return new Set(
      profiles
        .filter((candidate) => candidate.likedByMe)
        .map((candidate) => candidate.profile.id),
    );
  }, [profiles]);

  useEffect(() => {
    setCurrentCardIndex(0);
  }, [genderFilter]);

  const eventIdRef = useRef<string | null>(null);
  eventIdRef.current = eventId;
  const currentCardIndexRef = useRef(0);
  currentCardIndexRef.current = currentCardIndex;
  const filteredProfilesRef = useRef<SwipeCandidate[]>([]);
  filteredProfilesRef.current = filteredProfiles;
  const checkedInEventIdRef = useRef<string | null>(null);
  const loadingProfilesRef = useRef(false);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const genderFilterRef = useRef(genderFilter);
  genderFilterRef.current = genderFilter;
  const ageRangeRef = useRef(ageRange);
  ageRangeRef.current = ageRange;

  const swipeFilters = useMemo<SwipeFilters>(
    () => ({
      genderFilter,
      ageMin: ageRange.min,
      ageMax: ageRange.max,
    }),
    [genderFilter, ageRange.min, ageRange.max],
  );

  const isLikeDisabled = likeStats.likesUsed >= likeStats.likeLimit;

  // ── GPS proximity check ───────────────────────────────────────────────────
  const checkLocation = useCallback(async (ticket: LiveTicket) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationDenied(true);
        setEligibility("location_required");
        return;
      }
      setLocationDenied(false);
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude, accuracy } = pos.coords;
      setUserCoords({ lat: latitude, lng: longitude });
      const dist = haversineMeters(
        latitude,
        longitude,
        ticket.venue_lat,
        ticket.venue_lng,
      );
      if (isAtVenue(dist, accuracy, ticket.checkin_radius_m)) {
        setEligibility("eligible");
      } else {
        setEligibility("location_required");
      }
    } catch {
      setEligibility("location_required");
    }
  }, []);

  // ── Find live-event ticket then check GPS ─────────────────────────────────
  const checkTickets = useCallback(async () => {
    if (!userId || checkingTicketsRef.current) return;
    checkingTicketsRef.current = true;
    try {
      const token = await getToken();
      if (!token) {
        setEligibility("locked");
        return;
      }

      const tickets = await fetchMyTickets(token, userId);
      const now = Date.now();
      const live = tickets.find((tk: any) => {
        const start = tk.date ? new Date(tk.date).getTime() : null;
        const end = tk.end_date_time
          ? new Date(tk.end_date_time).getTime()
          : null;
        return (
          start !== null &&
          end !== null &&
          now >= start - PRE_EVENT_GRACE_MS &&
          now <= end
        );
      });

      if (!live) {
        setEligibility("locked");
        return;
      }

      const ticket: LiveTicket = {
        event_id: live.event_id,
        venue_lat: live.latitude ?? live.location?.latitude ?? 0,
        venue_lng: live.longitude ?? live.location?.longitude ?? 0,
        venue_name: live.venue_name ?? "",
        event_title: live.title ?? "",
        checkin_radius_m:
          typeof live.checkin_radius_m === "number"
            ? live.checkin_radius_m
            : PROXIMITY_RADIUS_M,
      };
      setLiveTicket(ticket);
      // A re-check from the locked screen shows the loading view while the
      // location is read, as the first check does.
      setEligibility("checking");

      await checkLocation(ticket);
    } catch {
      setEligibility("locked");
    } finally {
      checkingTicketsRef.current = false;
    }
  }, [userId, checkLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-check while locked ─────────────────────────────────────────────────
  // The tab stays mounted while other tabs are open, so checking only on
  // mount would keep it locked after the event goes live. While it is locked,
  // check again when the tab regains focus, when the app returns to the
  // foreground, and every LOCKED_RECHECK_INTERVAL_MS while the tab is shown.
  useFocusEffect(
    useCallback(() => {
      const recheckIfLocked = () => {
        if (AppState.currentState !== "active") return;
        if (eligibilityRef.current === "locked") void checkTickets();
      };
      recheckIfLocked();
      const interval = setInterval(recheckIfLocked, LOCKED_RECHECK_INTERVAL_MS);
      const appStateSubscription = AppState.addEventListener(
        "change",
        recheckIfLocked,
      );
      return () => {
        clearInterval(interval);
        appStateSubscription.remove();
      };
    }, [checkTickets]),
  );

  // ── Periodic re-check while on location_required screen ──────────────────
  useEffect(() => {
    if (eligibility !== "location_required" || !liveTicket) return;
    const id = setInterval(
      () => checkLocation(liveTicket),
      LOCATION_POLL_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [eligibility, liveTicket, checkLocation]);

  const liveEventId = liveTicket?.event_id;

  // hasMoreProfiles, also for the refresh, which runs outside renders.
  const setMoreProfiles = useCallback((more: boolean) => {
    hasMoreProfilesRef.current = more;
    setHasMoreProfiles(more);
  }, []);

  // The filters on now, as the API takes them.
  const currentFilters = useCallback(
    (): SwipeFilters => ({
      genderFilter: genderFilterRef.current,
      ageMin: ageRangeRef.current.min,
      ageMax: ageRangeRef.current.max,
    }),
    [],
  );

  // The counts in an answer: the like limit and how many guests are here.
  // If the filters changed while it loaded, its like counts are for the old
  // ones; those of the deck loaded for the new filters come next.
  const syncDeckCounts = useCallback(
    (
      data: SwipeableResponse,
      requestedFilters: SwipeFilters,
      fallback?: { likesUsed: number; eligibleGuestCount: number },
    ) => {
      setPresentGuestCount(
        typeof data.present_guest_count === "number"
          ? data.present_guest_count
          : data.profiles.length,
      );
      if (filtersKey(requestedFilters) !== filtersKey(currentFilters())) {
        return;
      }
      setLikeStats((prev) => {
        const likesUsed =
          typeof data.likes_used === "number"
            ? data.likes_used
            : (fallback?.likesUsed ?? prev.likesUsed);
        const eligibleGuestCount =
          typeof data.eligible_guest_count === "number"
            ? data.eligible_guest_count
            : (fallback?.eligibleGuestCount ?? prev.eligibleGuestCount);
        const likeLimit = Math.max(
          calculateEffectiveLikeLimit(eligibleGuestCount, likesUsed),
          typeof data.like_limit === "number" ? data.like_limit : 0,
        );
        return { likesUsed, likeLimit, eligibleGuestCount };
      });
    },
    [currentFilters],
  );

  // ── Load swipeable profiles once eligible ─────────────────────────────────
  // The first page of the deck, for the filters on now. It replaces the deck.
  const loadProfiles = useCallback(async () => {
    if (!userId || loadingProfilesRef.current) return;
    loadingProfilesRef.current = true;
    setLoadingProfiles(true);
    deckGenerationRef.current += 1;
    // The API filters the deck, and counts eligible guests and the like
    // limit for these filters, as when you like someone.
    const requestedFilters = currentFilters();
    loadedFiltersKeyRef.current = filtersKey(requestedFilters);
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const activeEventId = liveEventId;
      // Ensure the backend records this user's active event session (check-in)
      if (activeEventId && checkedInEventIdRef.current !== activeEventId) {
        try {
          await createEventSession(token, activeEventId);
          checkedInEventIdRef.current = activeEventId;
        } catch {
          // ignore check-in failures — still try to load profiles
        }
      }
      const data = await fetchSwipeableProfiles(
        token,
        activeEventId,
        requestedFilters,
        { limit: DECK_PAGE_SIZE },
      );

      setSelfHidden(data.visibility === "hidden");

      const activeProfileId =
        filteredProfilesRef.current[currentCardIndexRef.current]?.profile.id ??
        null;
      const nextProfiles = toSwipeCandidates(
        data.profiles,
        data.event_title,
        blockedIdsRef.current,
      );

      setEventId(data.event_id ?? activeEventId ?? null);
      setProfiles(nextProfiles);
      pagedDeckRef.current = data.end_cursor != null;
      deckCursorRef.current = data.end_cursor ?? null;
      setMoreProfiles(Boolean(data.next_cursor));
      endEligibleCountRef.current = data.next_cursor
        ? null
        : (data.eligible_guest_count ?? null);

      const nextFiltered = applyProfileFilters(
        nextProfiles,
        genderFilterRef.current,
        ageRangeRef.current.min,
        ageRangeRef.current.max,
      );

      if (!nextFiltered.length) {
        setCurrentCardIndex(0);
      } else if (activeProfileId) {
        const nextIndex = nextFiltered.findIndex(
          (candidate) => candidate.profile.id === activeProfileId,
        );
        setCurrentCardIndex(
          nextIndex >= 0
            ? nextIndex
            : Math.min(currentCardIndexRef.current, nextFiltered.length - 1),
        );
      } else {
        setCurrentCardIndex((prev) => Math.min(prev, nextFiltered.length - 1));
      }

      syncDeckCounts(data, requestedFilters, {
        likesUsed: nextProfiles.filter((candidate) => candidate.likedByMe)
          .length,
        eligibleGuestCount: nextFiltered.length,
      });
    } catch {
      // Keep empty state on error
    } finally {
      setLoadingProfiles(false);
      loadingProfilesRef.current = false;
    }
  }, [userId, liveEventId, currentFilters, syncDeckCounts, setMoreProfiles]);

  // The next page, after the end of the loaded deck.
  const loadMoreProfiles = useCallback(async () => {
    const cursor = deckCursorRef.current;
    if (!userId || loadingMoreRef.current || loadingProfilesRef.current) {
      return;
    }
    if (!cursor) {
      setMoreProfiles(false);
      return;
    }
    loadingMoreRef.current = true;
    const generation = deckGenerationRef.current;
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const requestedFilters = currentFilters();
      const data = await fetchSwipeableProfiles(
        token,
        liveEventId,
        requestedFilters,
        { cursor, limit: DECK_PAGE_SIZE },
      );
      // A full load replaced the deck this page would continue.
      if (generation !== deckGenerationRef.current) return;

      const page = toSwipeCandidates(
        data.profiles,
        data.event_title,
        blockedIdsRef.current,
      );
      setProfiles((prev) => {
        const loadedIds = new Set(prev.map((c) => c.profile.id));
        return [...prev, ...page.filter((c) => !loadedIds.has(c.profile.id))];
      });
      setSelfHidden(data.visibility === "hidden");
      deckCursorRef.current = data.end_cursor ?? cursor;
      setMoreProfiles(Boolean(data.next_cursor));
      endEligibleCountRef.current = data.next_cursor
        ? null
        : (data.eligible_guest_count ?? null);
      syncDeckCounts(data, requestedFilters);
    } catch {
      // Tried again when the deck moves near its end again.
    } finally {
      loadingMoreRef.current = false;
    }
  }, [userId, liveEventId, currentFilters, syncDeckCounts, setMoreProfiles]);

  // Every PROFILE_REFRESH_INTERVAL_MS: the counts. The deck itself loads
  // again only while it is empty, so a deck you are going through isn't
  // replaced; guests who check in later come from its end (see below).
  const refreshDeck = useCallback(async () => {
    if (!userId || loadingProfilesRef.current || loadingMoreRef.current) {
      return;
    }
    if (filteredProfilesRef.current.length === 0 || !pagedDeckRef.current) {
      await loadProfiles();
      return;
    }
    const generation = deckGenerationRef.current;
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const requestedFilters = currentFilters();
      const data = await fetchSwipeableProfiles(
        token,
        liveEventId,
        requestedFilters,
        { limit: 0 },
      );
      if (generation !== deckGenerationRef.current) return;

      setSelfHidden(data.visibility === "hidden");
      syncDeckCounts(data, requestedFilters);
      // At the end of the deck, a new count means guests came or went: ask
      // again from the end, once the deck is near it.
      const eligibleGuestCount = data.eligible_guest_count;
      if (
        !hasMoreProfilesRef.current &&
        deckCursorRef.current &&
        typeof eligibleGuestCount === "number" &&
        eligibleGuestCount !== endEligibleCountRef.current
      ) {
        endEligibleCountRef.current = eligibleGuestCount;
        setMoreProfiles(true);
      }
    } catch {
      // Tried again at the next refresh.
    }
  }, [
    userId,
    liveEventId,
    currentFilters,
    syncDeckCounts,
    setMoreProfiles,
    loadProfiles,
  ]);

  useEffect(() => {
    checkTickets();
  }, [checkTickets]);
  useEffect(() => {
    if (eligibility === "eligible") loadProfiles();
  }, [eligibility, loadProfiles]);

  // The API filters the deck: other filters load it again, once the slider
  // or the gender choice has settled, and after a load already on its way.
  useEffect(() => {
    if (eligibility !== "eligible" || loadingProfiles) return;
    if (filtersKey(swipeFilters) === loadedFiltersKeyRef.current) return;
    const id = setTimeout(() => {
      void loadProfiles();
    }, FILTER_RELOAD_DELAY_MS);
    return () => clearTimeout(id);
  }, [eligibility, loadingProfiles, swipeFilters, loadProfiles]);

  // Near the end of the loaded deck, the next page loads.
  useEffect(() => {
    if (eligibility !== "eligible" || !hasMoreProfiles) return;
    if (currentCardIndex < filteredProfiles.length - DECK_PREFETCH_CARDS) {
      return;
    }
    void loadMoreProfiles();
  }, [
    eligibility,
    hasMoreProfiles,
    currentCardIndex,
    filteredProfiles.length,
    loadMoreProfiles,
  ]);

  useEffect(() => {
    if (eligibility !== "eligible") return;
    const id = setInterval(() => {
      void refreshDeck();
    }, PROFILE_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [eligibility, refreshDeck]);

  // ── Swipe handlers ─────────────────────────────────────────────────────────
  // The guest is gone for you: you blocked or reported them, or they are no
  // longer visible to you.
  const removeProfile = useCallback((guestId: string) => {
    setProfiles((prev) =>
      prev.filter((candidate) => candidate.profile.id !== guestId),
    );
  }, []);

  const handleGuestBlocked = useCallback(
    (guestId: string) => {
      blockedIdsRef.current.add(guestId);
      removeProfile(guestId);
    },
    [removeProfile],
  );

  const handleSwipeRight = async (profile: Profile) => {
    if (likedProfileIds.has(profile.id)) {
      toast("You already liked this profile.");
      return;
    }

    if (isLikeDisabled) {
      toast("You have used all Likes for your current filters.");
      return;
    }

    if (eventIdRef.current == null) {
      toast.error(t("matchesRetrySoon"));
      return;
    }

    const token = await getToken();
    if (!token) {
      toast.error(t("matchesRetrySoon"));
      return;
    }

    let isMutualMatch = false;
    let mutualMatchId: number | null = null;
    let reachedLimitAfterLike = false;
    try {
      const result = await createMatchSwipe(
        token,
        profile.id,
        eventIdRef.current,
        true,
        swipeFilters,
      );

      const likesUsed =
        typeof result.likes_used === "number"
          ? result.likes_used
          : likeStats.likesUsed + 1;
      const eligibleGuestCount =
        typeof result.eligible_guest_count === "number"
          ? result.eligible_guest_count
          : filteredProfiles.length;

      const calculatedLikeLimit = calculateEffectiveLikeLimit(
        eligibleGuestCount,
        likesUsed,
      );
      const nextLikeLimit = Math.max(
        calculatedLikeLimit,
        typeof result.like_limit === "number" ? result.like_limit : 0,
      );

      setLikeStats({
        likesUsed,
        likeLimit: nextLikeLimit,
        eligibleGuestCount,
      });

      reachedLimitAfterLike = likesUsed >= nextLikeLimit;

      setProfiles((prev) =>
        prev.map((candidate) =>
          candidate.profile.id === profile.id
            ? { ...candidate, likedByMe: true }
            : candidate,
        ),
      );

      isMutualMatch = result.matched;
      mutualMatchId = result.match_id;
    } catch (err) {
      if (err instanceof GuestUnavailableError) {
        removeProfile(profile.id);
        toast(t("guestUnavailable"));
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Like limit reached")) {
        toast("You have used all Likes for your current filters.");
        return;
      }
      toast.error(msg || "Failed to submit swipe.");
      return;
    }

    if (isMutualMatch) {
      setMatchedProfile(profile);
      setMatchId(mutualMatchId);
      setShowMatch(true);
    }

    if (reachedLimitAfterLike) {
      toast("Like limit reached. You can still browse all profiles.");
    }
  };

  const handleVerticalIndexChange = (nextIndex: number) => {
    setCurrentCardIndex(nextIndex);
  };

  const handleAgeChange = (next: { min: number; max: number }) => {
    setAgeRange(next);
    setCurrentCardIndex(0);
  };

  useEffect(() => {
    if (currentCardIndex < filteredProfiles.length) {
      return;
    }
    setCurrentCardIndex(Math.max(filteredProfiles.length - 1, 0));
  }, [currentCardIndex, filteredProfiles.length]);

  // ── Render ─────────────────────────────────────────────────────────────────

  // The match modal is drawn over whichever view shows (BUG-043). Inside
  // the deck, a refresh that left the deck empty unmounted it while open.
  return (
    <>
      {renderView()}
      <MatchModal
        visible={showMatch}
        profile={matchedProfile}
        matchId={matchId}
        onClose={() => setShowMatch(false)}
      />
    </>
  );

  function renderView() {
    if (eligibility === "checking") {
      return <LoadingStateView />;
    }

    if (eligibility === "locked") {
      return (
        <LockedStateView
          topInset={insets.top}
          bottomInset={insets.bottom}
          title={t("matchesLocked")}
          subtitle={t("matchesLockedSubtitle")}
          buttonText={t("matchesUnlockButton")}
          onUnlock={() => router.push("/tickets")}
        />
      );
    }

    if (eligibility === "location_required" && liveTicket) {
      return (
        <LocationRequiredView
          liveTicket={liveTicket}
          userCoords={userCoords}
          setUserCoords={setUserCoords}
          topInset={insets.top}
          bottomInset={insets.bottom}
          locationDenied={locationDenied}
          onBypass={() => setEligibility("eligible")}
          onCheckLocation={() => checkLocation(liveTicket)}
        />
      );
    }

    // Before the loading view, so the refresh every 30 s doesn't flash it.
    if (eligibility === "eligible" && selfHidden) {
      return (
        <LockedStateView
          topInset={insets.top}
          bottomInset={insets.bottom}
          title={t("matchesHiddenTitle")}
          subtitle={t("matchesHiddenSubtitle")}
          buttonText={t("matchesHiddenButton")}
          onUnlock={() => router.push("/profile")}
        />
      );
    }

    // Only the first load: a deck that filters left empty stays on screen,
    // filters and all, while the deck for new filters loads.
    if (
      eligibility === "eligible" &&
      loadingProfiles &&
      profiles.length === 0 &&
      presentGuestCount === null
    ) {
      return <LoadingStateView />;
    }

    // Nobody here yet. With guests here whom the filters leave out, the deck
    // shows instead, so the filters can be changed.
    if (!profiles.length && !presentGuestCount) {
      return (
        <EmptyMatchesView
          topInset={insets.top}
          bottomInset={insets.bottom}
          title={t("matchesNobodyHereTitle")}
          subtitle={t("matchesNobodyHereSubtitle")}
        />
      );
    }

    return (
      <MatchesDeck
        topInset={insets.top}
        bottomInset={insets.bottom}
        venueName={liveTicket?.venue_name ?? ""}
        eventTitle={liveTicket?.event_title ?? ""}
        venuePeopleCount={Math.max(
          filteredProfiles.length,
          likeStats.eligibleGuestCount,
        )}
        genderFilter={genderFilter}
        onGenderChange={setGenderFilter}
        ageMin={ageRange.min}
        ageMax={ageRange.max}
        onAgeChange={handleAgeChange}
        profiles={filteredProfiles}
        hasMoreProfiles={hasMoreProfiles}
        currentCardIndex={currentCardIndex}
        onChangeCardIndex={handleVerticalIndexChange}
        onLike={handleSwipeRight}
        likedProfileIds={likedProfileIds}
        likesUsed={likeStats.likesUsed}
        likeLimit={likeStats.likeLimit}
        likeLimitReached={isLikeDisabled}
        likeDisabled={isLikeDisabled}
        eventId={eventId}
        onGuestBlocked={handleGuestBlocked}
      />
    );
  }
}
