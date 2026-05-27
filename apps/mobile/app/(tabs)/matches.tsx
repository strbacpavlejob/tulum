import ActionButtons from "@/components/ActionButtons";
import EmptyIndicator from "@/components/EmptyIndicator";
import HandsIcon from "@/components/illustrations/Hands";
import MatchModal from "@/components/MatchModal";
import SwipeCard from "@/components/SwipeCard";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  createMatchSwipe,
  fetchSwipeableProfiles,
  type SwipeableProfile,
} from "@/lib/api";
import { useTranslation } from "react-i18next";
import { Profile } from "@/types/profile";
import { useAuth } from "@clerk/expo";

import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, SafeAreaView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── Helpers ────────────────────────────────────────────────────────────────────

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
      venue_picture: null,
      title: eventTitle,
      description: "",
      date: "",
      tags: [],
      location: { latitude: 0, longitude: 0 },
      isFavorite: false,
      isSeen: false,
      isAttending: false,
      guests: [],
      price: 0,
      venueContact: null,
      requiresReservation: false,
    },
  };
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function MatchesScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { userId, getToken } = useAuth();
  const insets = useSafeAreaInsets();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [showMatch, setShowMatch] = useState(false);

  // Keep a ref so swipe handlers always see the current eventId
  const eventIdRef = useRef<string | null>(null);
  eventIdRef.current = eventId;

  const loadProfiles = useCallback(async () => {
    if (!userId) return;
    try {
      const token = await getToken();
      if (!token) return;
      const data = await fetchSwipeableProfiles(token);
      setEventId(data.event_id);
      setProfiles(data.profiles.map((p) => mapToProfile(p, data.event_title)));
    } catch {
      // Keep empty state on error
    } finally {
      setLoading(false);
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleSwipeLeft = (profile: Profile) => {
    setTimeout(() => setCurrentCardIndex((prev) => prev + 1), 300);
  };

  const handleSwipeRight = async (profile: Profile) => {
    // Fire-and-forget — create the match in the background
    if (userId && eventIdRef.current != null) {
      const token = await getToken();
      if (token) {
        createMatchSwipe(token, userId, profile.id, eventIdRef.current).catch(
          () => {
            /* swipe failure is non-fatal */
          },
        );
      }
    }
    setMatchedProfile(profile);
    setShowMatch(true);
    setTimeout(() => setCurrentCardIndex((prev) => prev + 1), 300);
  };

  const handleSuperLike = () => {
    if (currentCardIndex < profiles.length) {
      handleSwipeRight(profiles[currentCardIndex]);
    }
  };

  const handlePass = () => {
    if (currentCardIndex < profiles.length) {
      handleSwipeLeft(profiles[currentCardIndex]);
    }
  };

  const handleLike = () => {
    if (currentCardIndex < profiles.length) {
      handleSwipeRight(profiles[currentCardIndex]);
    }
  };

  const handleRewind = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex((prev) => prev - 1);
    }
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

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <ActivityIndicator color={theme.color} />
      </View>
    );
  }

  if (currentCardIndex >= profiles.length) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        <SafeAreaView style={{ flex: 1 }}>
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
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingTop: insets.top }}>
          {/* Card Stack */}
          <View className="flex-1 justify-center items-center">
            {renderCards()}
          </View>

          {/* Action Buttons */}
          <ActionButtons
            onPass={handlePass}
            onLike={handleLike}
            onSuperLike={handleSuperLike}
            onRewind={handleRewind}
          />

          {/* Match Modal */}
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
