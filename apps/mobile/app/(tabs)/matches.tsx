import ActionButtons from "@/components/ActionButtons";
import EmptyIndicator from "@/components/EmptyIndicator";
import HandsIcon from "@/components/illustrations/Hands";
import MatchModal from "@/components/MatchModal";
import SwipeCard from "@/components/SwipeCard";
import { useAppTheme } from "@/hooks/useAppTheme";
import { mockedProfiles } from "@/mock/profiles";
import { Profile } from "@/types/profile";

import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { SafeAreaView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MatchesScreen() {
  const theme = useAppTheme();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [showMatch, setShowMatch] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSwipeLeft = (profile: Profile) => {
    console.log("Passed on:", profile.name);
    setTimeout(() => setCurrentCardIndex((prev) => prev + 1), 300);
  };

  const handleSwipeRight = (profile: Profile) => {
    console.log("Liked:", profile.name);
    const isMatch = Math.random() > 0.7;
    if (isMatch) {
      setMatchedProfile(profile);
      setShowMatch(true);
    }
    setTimeout(() => setCurrentCardIndex((prev) => prev + 1), 300);
  };

  const handleSuperLike = () => {
    if (currentCardIndex < mockedProfiles.length) {
      handleSwipeRight(mockedProfiles[currentCardIndex]);
    }
  };

  const handlePass = () => {
    if (currentCardIndex < mockedProfiles.length) {
      handleSwipeLeft(mockedProfiles[currentCardIndex]);
    }
  };

  const handleLike = () => {
    if (currentCardIndex < mockedProfiles.length) {
      handleSwipeRight(mockedProfiles[currentCardIndex]);
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
      if (cardIndex >= mockedProfiles.length) break;

      visible.push(
        <SwipeCard
          key={mockedProfiles[cardIndex].id}
          profile={mockedProfiles[cardIndex]}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          index={i}
          totalCards={cardsToShow}
        />,
      );
    }

    return visible.reverse();
  };

  if (currentCardIndex >= mockedProfiles.length) {
    return (
      <LinearGradient
        colors={[theme.colorFocus, theme.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, width: "100%", height: "100%" }}
      >
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
                title="No More Matches"
                subtitle="Find event on map!"
              />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
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
