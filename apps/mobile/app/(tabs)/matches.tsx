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
  type SwipeFilters,
  type SwipeableProfile,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";
import useStore from "@/store/useStore";

// ── Constants ──────────────────────────────────────────────────────────────────

/** Metres within which the user is considered "at the venue" */
const PROXIMITY_RADIUS_M = 300;

/** How often (ms) to re-check position on the location verification screen */
const LOCATION_POLL_INTERVAL_MS = 5_000;

const PROFILE_REFRESH_INTERVAL_MS = 15_000;
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
    bio: p.interests.join(", "),
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

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function MatchesScreen() {
  const { t } = useTranslation();
  const { userId, getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lookingForGenderFromProfile = useStore(
    (s) => s.user?.lookingForGender ?? "everyone",
  );
  const setSwipeableCandidatesForEvent = useStore(
    (s) => s.setSwipeableCandidatesForEvent,
  );
  const getSwipeableCandidatesForEvent = useStore(
    (s) => s.getSwipeableCandidatesForEvent,
  );

  // ── Eligibility ────────────────────────────────────────────────────────────
  const [eligibility, setEligibility] = useState<EligibilityState>("checking");
  const [liveTicket, setLiveTicket] = useState<LiveTicket | null>(null);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

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

  useEffect(() => {
    const eligibleGuestCount = filteredProfiles.length;
    setLikeStats((prev) => {
      const nextLikeLimit = calculateEffectiveLikeLimit(
        eligibleGuestCount,
        prev.likesUsed,
      );
      if (
        prev.eligibleGuestCount === eligibleGuestCount &&
        prev.likeLimit === nextLikeLimit
      ) {
        return prev;
      }
      return {
        ...prev,
        eligibleGuestCount,
        likeLimit: nextLikeLimit,
      };
    });
  }, [filteredProfiles.length]);

  const isLikeDisabled = likeStats.likesUsed >= likeStats.likeLimit;

  // ── GPS proximity check ───────────────────────────────────────────────────
  const checkLocation = useCallback(
    async (venueLat: number, venueLng: number) => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setEligibility("location_required");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        const dist = haversineMeters(latitude, longitude, venueLat, venueLng);
        if (dist <= PROXIMITY_RADIUS_M) {
          setEligibility("eligible");
        } else {
          setEligibility("location_required");
        }
      } catch {
        setEligibility("location_required");
      }
    },
    [],
  );

  // ── Find live-event ticket then check GPS ─────────────────────────────────
  const checkTickets = useCallback(async () => {
    if (!userId) return;
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
      };
      setLiveTicket(ticket);

      await checkLocation(ticket.venue_lat, ticket.venue_lng);
    } catch {
      setEligibility("locked");
    }
  }, [userId, checkLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Periodic re-check while on location_required screen ──────────────────
  useEffect(() => {
    if (eligibility !== "location_required" || !liveTicket) return;
    const id = setInterval(
      () => checkLocation(liveTicket.venue_lat, liveTicket.venue_lng),
      LOCATION_POLL_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [eligibility, liveTicket, checkLocation]);

  // ── Load swipeable profiles once eligible ─────────────────────────────────
  const loadProfiles = useCallback(async () => {
    if (!userId || loadingProfilesRef.current) return;
    loadingProfilesRef.current = true;
    setLoadingProfiles(true);
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const activeEventId = liveTicket?.event_id;
      // Ensure the backend records this user's active event session (check-in)
      if (activeEventId && checkedInEventIdRef.current !== activeEventId) {
        try {
          await createEventSession(token, activeEventId);
          checkedInEventIdRef.current = activeEventId;
        } catch {
          // ignore check-in failures — still try to load profiles
        }
      }
      const data = await fetchSwipeableProfiles(token, activeEventId);

      if (activeEventId) {
        setSwipeableCandidatesForEvent(
          activeEventId,
          data.event_title,
          data.profiles,
        );
      }

      const cached = activeEventId
        ? getSwipeableCandidatesForEvent(activeEventId)
        : null;
      const sourceProfiles =
        cached?.candidates && cached.candidates.length > 0
          ? cached.candidates
          : data.profiles;
      const sourceEventTitle = cached?.eventTitle || data.event_title;

      const activeProfileId =
        filteredProfilesRef.current[currentCardIndexRef.current]?.profile.id ??
        null;
      const nextProfiles = sourceProfiles.map((p) => ({
        profile: mapToProfile(p, sourceEventTitle),
        gender: p.gender,
        likedByMe: Boolean(p.liked_by_me),
      }));

      setEventId(data.event_id ?? activeEventId ?? null);
      setProfiles(nextProfiles);

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

      const likesUsed =
        typeof data.likes_used === "number"
          ? data.likes_used
          : nextProfiles.filter((candidate) => candidate.likedByMe).length;

      const eligibleGuestCount =
        typeof data.eligible_guest_count === "number"
          ? data.eligible_guest_count
          : nextFiltered.length;

      const likeLimit = calculateEffectiveLikeLimit(
        eligibleGuestCount,
        likesUsed,
      );

      const syncedLikeLimit = Math.max(
        likeLimit,
        typeof data.like_limit === "number" ? data.like_limit : 0,
      );

      setLikeStats({
        likesUsed,
        likeLimit: syncedLikeLimit,
        eligibleGuestCount,
      });
    } catch {
      // Keep empty state on error
    } finally {
      setLoadingProfiles(false);
      loadingProfilesRef.current = false;
    }
  }, [
    userId,
    liveTicket?.event_id,
    setSwipeableCandidatesForEvent,
    getSwipeableCandidatesForEvent,
  ]);

  useEffect(() => {
    checkTickets();
  }, [checkTickets]);
  useEffect(() => {
    if (eligibility === "eligible") loadProfiles();
  }, [eligibility, loadProfiles]);

  useEffect(() => {
    if (eligibility !== "eligible") return;
    const id = setInterval(() => {
      void loadProfiles();
    }, PROFILE_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [eligibility, loadProfiles]);

  // ── Swipe handlers ─────────────────────────────────────────────────────────
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
      toast.error(t("matchesRetrySoon") || "Please try again in a moment.");
      return;
    }

    const token = await getToken();
    if (!token) {
      toast.error(t("matchesRetrySoon") || "Please try again in a moment.");
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
        onBypass={() => setEligibility("eligible")}
        onCheckLocation={() =>
          checkLocation(liveTicket.venue_lat, liveTicket.venue_lng)
        }
      />
    );
  }

  if (eligibility === "eligible" && loadingProfiles && profiles.length === 0) {
    return <LoadingStateView />;
  }

  if (!profiles.length) {
    return (
      <EmptyMatchesView
        topInset={insets.top}
        bottomInset={insets.bottom}
        title={t("noMatchesTitle")}
        subtitle={t("noMatchesSubtitle")}
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
      currentCardIndex={currentCardIndex}
      onChangeCardIndex={handleVerticalIndexChange}
      onLike={handleSwipeRight}
      likedProfileIds={likedProfileIds}
      likesUsed={likeStats.likesUsed}
      likeLimit={likeStats.likeLimit}
      likeLimitReached={isLikeDisabled}
      likeDisabled={isLikeDisabled}
      showMatch={showMatch}
      matchedProfile={matchedProfile}
      matchId={matchId}
      onCloseMatch={() => setShowMatch(false)}
    />
  );
}
