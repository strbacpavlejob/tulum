import ActionButtons from "@/components/ActionButtons";
import EmptyIndicator from "@/components/EmptyIndicator";
import HandsIcon from "@/components/illustrations/Hands";
import { MatchLocationMap } from "@/components/MatchLocationMap";
import MatchModal from "@/components/MatchModal";
import SwipeCard from "@/components/SwipeCard";
import {
  createMatchSwipe,
  fetchMyTickets,
  fetchSwipeableProfiles,
  type SwipeableProfile,
} from "@/lib/api";
import { useTranslation } from "react-i18next";
import { Profile } from "@/types/profile";
import { useAuth } from "@clerk/expo";
import * as Location from "expo-location";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LoadingIndicator from "@/components/loading-indicator";
import MatchIcon from "@/components/illustrations/Match";
import { useRouter } from "expo-router";

// ── Constants ──────────────────────────────────────────────────────────────────

/** Metres within which the user is considered "at the venue" */
const PROXIMITY_RADIUS_M = 300;

/** How often (ms) to re-check position on the location verification screen */
const LOCATION_POLL_INTERVAL_MS = 5_000;

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

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function MatchesScreen() {
  const { t } = useTranslation();
  const { userId, getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ── Eligibility ────────────────────────────────────────────────────────────
  const [eligibility, setEligibility] = useState<EligibilityState>("checking");
  const [liveTicket, setLiveTicket] = useState<LiveTicket | null>(null);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // ── Swipe state ────────────────────────────────────────────────────────────
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [showMatch, setShowMatch] = useState(false);

  const eventIdRef = useRef<string | null>(null);
  eventIdRef.current = eventId;

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
        return start !== null && end !== null && now >= start && now <= end;
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
    if (!userId) return;
    setLoadingProfiles(true);
    try {
      const token = await getToken();
      if (!token) return;
      const data = await fetchSwipeableProfiles(token);
      setEventId(data.event_id);
      setProfiles(data.profiles.map((p) => mapToProfile(p, data.event_title)));
    } catch {
      // Keep empty state on error
    } finally {
      setLoadingProfiles(false);
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    checkTickets();
  }, [checkTickets]);
  useEffect(() => {
    if (eligibility === "eligible") loadProfiles();
  }, [eligibility, loadProfiles]);

  // ── Swipe handlers ─────────────────────────────────────────────────────────
  const handleSwipeLeft = (_profile: Profile) => {
    setTimeout(() => setCurrentCardIndex((prev) => prev + 1), 300);
  };

  const handleSwipeRight = async (profile: Profile) => {
    if (userId && eventIdRef.current != null) {
      const token = await getToken();
      if (token) {
        createMatchSwipe(token, userId, profile.id, eventIdRef.current).catch(
          () => {},
        );
      }
    }
    setMatchedProfile(profile);
    setShowMatch(true);
    setTimeout(() => setCurrentCardIndex((prev) => prev + 1), 300);
  };

  const handleSuperLike = () => {
    if (currentCardIndex < profiles.length)
      handleSwipeRight(profiles[currentCardIndex]);
  };
  const handlePass = () => {
    if (currentCardIndex < profiles.length)
      handleSwipeLeft(profiles[currentCardIndex]);
  };
  const handleLike = () => {
    if (currentCardIndex < profiles.length)
      handleSwipeRight(profiles[currentCardIndex]);
  };
  const handleRewind = () => {
    if (currentCardIndex > 0) setCurrentCardIndex((prev) => prev - 1);
  };

  const renderCards = () => {
    const cardsToShow = 3;
    const visible: React.ReactNode[] = [];
    for (let i = 0; i < cardsToShow; i++) {
      const cardIndex = currentCardIndex + i;
      if (cardIndex >= profiles.length) break;
      visible.push(
        <SwipeCard
          key={profiles[cardIndex].id}
          profile={profiles[cardIndex]}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          index={i}
          totalCards={cardsToShow}
        />,
      );
    }
    return visible.reverse();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (eligibility === "checking") {
    return (
      <View className="flex-1 items-center justify-center bg-light-background dark:bg-dark-background">
        <LoadingIndicator />
      </View>
    );
  }

  if (eligibility === "locked") {
    return (
      <View className="flex-1 bg-light-background dark:bg-dark-background">
        <SafeAreaView className="flex-1">
          <View
            style={{
              flex: 1,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              paddingHorizontal: 24,
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
            }}
          >
            <EmptyIndicator
              title={t("matchesLocked")}
              subtitle={t("matchesLockedSubtitle")}
              picture={MatchIcon}
              onPress={() => router.push("/tickets")}
              buttonText={t("matchesUnlockButton")}
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (eligibility === "location_required" && liveTicket) {
    return (
      <View className="flex-1 bg-light-background dark:bg-dark-background">
        {/* Full-screen map — user dot + venue pin */}
        <MatchLocationMap
          venueLat={liveTicket.venue_lat}
          venueLng={liveTicket.venue_lng}
          userLat={userCoords?.lat ?? liveTicket.venue_lat + 0.003}
          userLng={userCoords?.lng ?? liveTicket.venue_lng + 0.003}
        />

        {/* Overlay card */}
        <View
          className="gap-2 rounded-[20px] bg-light-backgroundStrong p-5 dark:bg-dark-backgroundStrong"
          style={{
            position: "absolute",
            top: insets.top + 16,
            left: 16,
            right: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Text className="text-[18px] font-bold leading-[26px] text-light-color dark:text-dark-color">
            {t("matchesAlmostThere")}
          </Text>
          <Text className="text-[13px] leading-5 text-light-gray10 dark:text-dark-gray10">
            {t("matchesArriveAtVenue")}
          </Text>
          <TouchableOpacity
            onPress={() =>
              checkLocation(liveTicket.venue_lat, liveTicket.venue_lng)
            }
            className="mt-1 self-start rounded-full bg-light-color px-5 py-2.5 dark:bg-dark-color"
          >
            <Text className="text-[13px] font-semibold text-light-background dark:text-dark-background">
              {t("matchesCheckLocation")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Legend */}
        <View
          className="flex-row gap-4 rounded-[14px] bg-light-backgroundStrong p-[14px] dark:bg-dark-backgroundStrong"
          style={{
            position: "absolute",
            bottom: insets.bottom + 24,
            left: 16,
            right: 16,
          }}
        >
          <View className="flex-row items-center gap-2">
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: "#3b82f6",
                borderWidth: 2,
                borderColor: "white",
              }}
            />
            <Text className="text-xs text-light-gray10 dark:text-dark-gray10">
              {t("matchesYourLocation")}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="h-3 w-3 rounded-full bg-light-color dark:bg-dark-color" />
            <Text className="text-xs text-light-gray10 dark:text-dark-gray10">
              {liveTicket.venue_name || t("matchesEventVenue")}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (eligibility === "eligible" && loadingProfiles) {
    return (
      <View className="flex-1 items-center justify-center bg-light-background dark:bg-dark-background">
        <LoadingIndicator />
      </View>
    );
  }

  if (currentCardIndex >= profiles.length) {
    return (
      <View className="flex-1 bg-light-background dark:bg-dark-background">
        <SafeAreaView className="flex-1">
          <View
            style={{
              flex: 1,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              paddingHorizontal: 16,
            }}
          >
            <View className="flex-1 justify-center items-center px-6">
              <EmptyIndicator
                picture={HandsIcon}
                title={t("noMatchesTitle")}
                subtitle={t("noMatchesSubtitle")}
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <SafeAreaView className="flex-1">
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <View className="flex-1 justify-center items-center">
            {renderCards()}
          </View>
          <ActionButtons
            onPass={handlePass}
            onLike={handleLike}
            onSuperLike={handleSuperLike}
            onRewind={handleRewind}
          />
          <MatchModal
            visible={showMatch}
            profile={matchedProfile}
            onClose={() => setShowMatch(false)}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
