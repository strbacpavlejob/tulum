import MatchModal from "@/components/MatchModal";
import { MatchesFiltersBottomSheet } from "@/components/matches/MatchesFiltersBottomSheet";
import type { MatchesFiltersBottomSheetRef } from "@/components/matches/MatchesFiltersBottomSheet";
import { Profile } from "@/types/profile";
import type { GenderFilter } from "@/types/user";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Heart, SlidersHorizontal } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
type SwipeCandidate = {
  profile: Profile;
};
type MatchesDeckProps = {
  topInset: number;
  bottomInset: number;
  venueName: string;
  eventTitle: string;
  venuePeopleCount: number;
  genderFilter: GenderFilter;
  onGenderChange: (value: GenderFilter) => void;
  ageMin: number;
  ageMax: number;
  onAgeChange: (next: { min: number; max: number }) => void;
  profiles: SwipeCandidate[];
  currentCardIndex: number;
  onChangeCardIndex: (index: number) => void;
  onLike: (profile: Profile) => void;
  likedProfileIds: ReadonlySet<string>;
  likesUsed: number;
  likeLimit: number;
  likeLimitReached: boolean;
  likeDisabled: boolean;
  showMatch: boolean;
  matchedProfile: Profile | null;
  matchId: number | null;
  onCloseMatch: () => void;
};
export default function MatchesDeck({
  topInset,
  bottomInset,
  venueName,
  eventTitle,
  venuePeopleCount,
  genderFilter,
  onGenderChange,
  ageMin,
  ageMax,
  onAgeChange,
  profiles,
  currentCardIndex,
  onChangeCardIndex,
  onLike,
  likedProfileIds,
  likesUsed,
  likeLimit,
  likeDisabled,
  showMatch,
  matchedProfile,
  matchId,
  onCloseMatch,
}: MatchesDeckProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [measuredListHeight, setMeasuredListHeight] = useState(0);
  const cardHeight =
    measuredListHeight || Math.max(windowHeight - topInset - bottomInset, 1);
  const filterSheetRef = useRef<MatchesFiltersBottomSheetRef>(null);
  const dragStartOffsetYRef = useRef(0);
  const wrapInProgressRef = useRef(false);
  const listRef = useRef<FlatList<SwipeCandidate>>(null);
  const [visibleCardIndex, setVisibleCardIndex] = useState(currentCardIndex);
  const visibleCardIndexRef = useRef(currentCardIndex);
  const scrollDrivenIndexRef = useRef<{
    index: number;
    cardHeight: number;
    profilesLength: number;
  } | null>(null);
  const currentProfile = profiles[visibleCardIndex]?.profile ?? null;
  const currentProfileLiked =
    currentProfile != null && likedProfileIds.has(currentProfile.id);
  useEffect(() => {
    visibleCardIndexRef.current = currentCardIndex;
    setVisibleCardIndex(currentCardIndex);
  }, [currentCardIndex]);
  useEffect(() => {
    if (!profiles.length) return;
    const scrollDrivenIndex = scrollDrivenIndexRef.current;
    scrollDrivenIndexRef.current = null;
    if (
      scrollDrivenIndex?.index === currentCardIndex &&
      scrollDrivenIndex.cardHeight === cardHeight &&
      scrollDrivenIndex.profilesLength === profiles.length
    ) {
      return;
    }
    listRef.current?.scrollToIndex({
      index: currentCardIndex,
      animated: true,
    });
  }, [cardHeight, currentCardIndex, profiles.length]);
  const updateVisibleCardIndex = (offsetY: number) => {
    if (!profiles.length) return;
    const nextIndex = Math.max(
      0,
      Math.min(Math.round(offsetY / cardHeight), profiles.length - 1),
    );
    if (nextIndex !== visibleCardIndexRef.current) {
      visibleCardIndexRef.current = nextIndex;
      scrollDrivenIndexRef.current = {
        index: nextIndex,
        cardHeight,
        profilesLength: profiles.length,
      };
      setVisibleCardIndex(nextIndex);
      onChangeCardIndex(nextIndex);
    }
  };
  const onScrollEnd = (offsetY: number) => {
    updateVisibleCardIndex(offsetY);
  };
  const handleEdgeWrap = (
    offsetY: number,
    dragDelta: number,
    velocityY: number,
  ) => {
    if (profiles.length < 2 || wrapInProgressRef.current) {
      return;
    }
    const maxOffset = Math.max((profiles.length - 1) * cardHeight, 0);
    const triedForward = dragDelta > 18 || velocityY < -0.4;
    const triedBackward = dragDelta < -18 || velocityY > 0.4;
    if (
      visibleCardIndexRef.current === profiles.length - 1 &&
      triedForward &&
      offsetY >= maxOffset - 2
    ) {
      wrapInProgressRef.current = true;
      onChangeCardIndex(0);
      requestAnimationFrame(() => {
        wrapInProgressRef.current = false;
      });
      return;
    }
    if (visibleCardIndexRef.current === 0 && triedBackward && offsetY <= 2) {
      wrapInProgressRef.current = true;
      onChangeCardIndex(profiles.length - 1);
      requestAnimationFrame(() => {
        wrapInProgressRef.current = false;
      });
    }
  };
  const handleScrollBeginDrag = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    dragStartOffsetYRef.current = event.nativeEvent.contentOffset.y;
  };
  const handleScrollEndDrag = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const endOffsetY = event.nativeEvent.contentOffset.y;
    const dragDelta = endOffsetY - dragStartOffsetYRef.current;
    const velocityY = event.nativeEvent.velocity?.y ?? 0;
    onScrollEnd(endOffsetY);
    handleEdgeWrap(endOffsetY, dragDelta, velocityY);
  };
  const handleLikePress = () => {
    if (!currentProfile || likeDisabled || currentProfileLiked) {
      return;
    }
    onLike(currentProfile);
  };
  const headerTop = Math.max(topInset + 6, 18);
  const detailsBottomOffset = Math.max(bottomInset + 12, 16);
  const activePeopleCount = Math.max(venuePeopleCount, profiles.length);
  const likesRemaining = Math.max(0, likeLimit - likesUsed);
  const likeButtonLabel = currentProfileLiked
    ? "Liked"
    : likeDisabled
      ? "No Likes left"
      : "Like";
  return (
    <View className="flex-1 bg-[#111015]">
      <SafeAreaView className="flex-1">
        <View style={{ flex: 1 }}>
          <FlatList
            ref={listRef}
            data={profiles}
            onLayout={(event) => {
              const nextHeight = event.nativeEvent.layout.height;
              setMeasuredListHeight((previousHeight) =>
                previousHeight === nextHeight ? previousHeight : nextHeight,
              );
            }}
            keyExtractor={(item) => item.profile.id}
            pagingEnabled
            bounces={false}
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScroll={(event) =>
              updateVisibleCardIndex(event.nativeEvent.contentOffset.y)
            }
            getItemLayout={(_, index) => ({
              length: cardHeight,
              offset: cardHeight * index,
              index,
            })}
            onScrollToIndexFailed={() => {
              setTimeout(() => {
                listRef.current?.scrollToIndex({
                  index: currentCardIndex,
                  animated: false,
                });
              }, 120);
            }}
            renderItem={({ item }) => (
              <View style={{ height: cardHeight }}>
                <Image
                  source={{ uri: item.profile.images[0] }}
                  style={{
                    width: "100%",
                    height: "100%",
                    position: "absolute",
                  }}
                  contentFit="cover"
                  cachePolicy="disk"
                />
                <LinearGradient
                  colors={[
                    "rgba(10,8,16,0.62)",
                    "rgba(10,8,16,0.12)",
                    "rgba(11,8,18,0.05)",
                    "rgba(9,7,14,0.72)",
                    "rgba(9,7,14,0.9)",
                  ]}
                  locations={[0, 0.26, 0.42, 0.78, 1]}
                  style={StyleSheet.absoluteFillObject}
                />
              </View>
            )}
            onMomentumScrollEnd={(event) =>
              onScrollEnd(event.nativeEvent.contentOffset.y)
            }
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEndDrag}
          />
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(53,44,78,0.25)", "rgba(16,14,22,0)"]}
            style={StyleSheet.absoluteFillObject}
          />
          {profiles.length === 0 ? (
            <View
              pointerEvents="none"
              className="absolute inset-0 items-center justify-center px-8"
            >
              <Text className="text-center text-lg font-bold text-white">
                No profiles match these filters.
              </Text>
            </View>
          ) : null}
          <View
            className="absolute left-0 right-0 flex-row items-start justify-between px-5"
            style={{ top: headerTop, zIndex: 20 }}
          >
            <View className="flex-1 pr-4">
              <Text className="text-[30px] font-black tracking-tight text-white">
                {venueName || eventTitle || "Event Venue"}
              </Text>
              <View className="mt-2 flex-row items-center">
                <View className="h-2 w-2 rounded-full bg-[#a8ffb2]" />
                <Text className="ml-2 text-xs font-medium text-[#efe7fb]">
                  {activePeopleCount} people here | Matching is live
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => filterSheetRef.current?.open()}
              className="h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-light-background/25 bg-light-background/15 dark:border-dark-background/25 dark: bg-dark-background/15"
              accessibilityRole="button"
              accessibilityLabel="Open filters"
            >
              <SlidersHorizontal size={18} color="#ffffff" />
            </Pressable>
          </View>
          <View
            className="absolute left-0 right-0 px-5"
            style={{ bottom: detailsBottomOffset, zIndex: 20 }}
          >
            {currentProfile ? (
              <>
                <View className="flex-row items-center">
                  <Text className="text-[38px] font-black leading-[42px] tracking-tight text-white">
                    {currentProfile.name}, {currentProfile.age}
                  </Text>
                </View>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {currentProfile.hobbies.slice(0, 4).map((interest) => (
                    <View
                      key={`${currentProfile.id}-${interest}`}
                      className="rounded-full border border-white/40 bg-white/15 px-3 py-1.5"
                    >
                      <Text className="text-xs font-semibold text-white/95">
                        {interest}
                      </Text>
                    </View>
                  ))}
                </View>
                {currentProfile.bio ? (
                  <Text
                    numberOfLines={3}
                    className="mt-3 max-w-[340px] text-[13px] leading-5 text-[#eee9f0]"
                  >
                    {currentProfile.bio}
                  </Text>
                ) : null}
                <View className="mt-5 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Heart size={20} color="#d7c6fa" />
                    <Text className="text-sm font-extrabold text-[#d7cfdc]">
                      {likesRemaining} {likesRemaining === 1 ? "like" : "likes"}{" "}
                      left
                    </Text>
                  </View>
                  <Pressable
                    onPress={handleLikePress}
                    disabled={likeDisabled || currentProfileLiked}
                    className={`h-[60px] min-w-[136px] flex-row items-center justify-center rounded-[20px] px-5 ${
                      likeDisabled
                        ? "bg-[#504b58]"
                        : currentProfileLiked
                          ? "bg-[#f7e6ff]"
                          : "bg-[#a77aff]"
                    }`}
                    style={{
                      shadowColor: likeDisabled ? "transparent" : "#9e6eff",
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.45,
                      shadowRadius: 18,
                      elevation: likeDisabled ? 0 : 10,
                    }}
                  >
                    <Heart
                      size={20}
                      color={likeDisabled ? "#c8c1d1" : "#1b122a"}
                      fill={currentProfileLiked ? "#1b122a" : "transparent"}
                    />
                    <Text
                      className="ml-2 text-sm font-extrabold"
                      style={{ color: likeDisabled ? "#bfb9c7" : "#1b122a" }}
                    >
                      {likeButtonLabel}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
          <MatchModal
            visible={showMatch}
            profile={matchedProfile}
            matchId={matchId}
            onClose={onCloseMatch}
          />
          <MatchesFiltersBottomSheet
            ref={filterSheetRef}
            genderFilter={genderFilter}
            onGenderChange={onGenderChange}
            ageMin={ageMin}
            ageMax={ageMax}
            onAgeChange={onAgeChange}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
