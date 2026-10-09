import MatchModal from "@/components/MatchModal";
import { Profile } from "@/types/profile";
import { LookingForGender } from "@/types/user";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Heart, Minus, Plus, Settings2, Sparkles } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
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
  genderFilter: LookingForGender;
  onGenderChange: (value: LookingForGender) => void;
  ageMin: number;
  ageMax: number;
  onAgeChange: (next: { min: number; max: number }) => void;
  selectedInterests: string[];
  availableInterests: string[];
  onToggleInterest: (interest: string) => void;
  onClearInterests: () => void;
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
  onCloseMatch: () => void;
};

const LIKE_HOLD_MS = 650;
const MIN_AGE = 18;
const MAX_AGE = 60;

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
  selectedInterests,
  availableInterests,
  onToggleInterest,
  onClearInterests,
  profiles,
  currentCardIndex,
  onChangeCardIndex,
  onLike,
  likedProfileIds,
  likesUsed,
  likeLimit,
  likeLimitReached,
  likeDisabled,
  showMatch,
  matchedProfile,
  onCloseMatch,
}: MatchesDeckProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHoldingLike, setIsHoldingLike] = useState(false);

  const holdStartTsRef = useRef<number | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTriggeredRef = useRef(false);
  const dragStartOffsetYRef = useRef(0);
  const wrapInProgressRef = useRef(false);
  const listRef = useRef<FlatList<SwipeCandidate>>(null);

  const currentProfile = profiles[currentCardIndex]?.profile ?? null;
  const currentProfileLiked =
    currentProfile != null && likedProfileIds.has(currentProfile.id);

  useEffect(() => {
    if (!profiles.length) return;
    listRef.current?.scrollToIndex({
      index: currentCardIndex,
      animated: true,
    });
  }, [currentCardIndex, profiles.length]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
      }
    };
  }, []);

  const resetHoldState = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdStartTsRef.current = null;
    holdTriggeredRef.current = false;
    setIsHoldingLike(false);
    setHoldProgress(0);
  };

  const triggerLikeFromHold = () => {
    if (
      !currentProfile ||
      likeDisabled ||
      currentProfileLiked ||
      holdTriggeredRef.current
    ) {
      return;
    }
    holdTriggeredRef.current = true;
    onLike(currentProfile);
    resetHoldState();
  };

  const startHoldLike = () => {
    if (likeDisabled || !currentProfile || currentProfileLiked) {
      return;
    }
    setIsHoldingLike(true);
    holdTriggeredRef.current = false;
    holdStartTsRef.current = Date.now();

    holdTimerRef.current = setInterval(() => {
      if (holdStartTsRef.current == null) return;
      const elapsed = Date.now() - holdStartTsRef.current;
      const progress = Math.min(elapsed / LIKE_HOLD_MS, 1);
      setHoldProgress(progress);
      if (progress >= 1) {
        triggerLikeFromHold();
      }
    }, 16);
  };

  const stopHoldLike = () => {
    if (holdTriggeredRef.current) {
      return;
    }
    resetHoldState();
  };

  const adjustMinAge = (delta: number) => {
    const nextMin = Math.max(MIN_AGE, Math.min(ageMin + delta, ageMax));
    onAgeChange({ min: nextMin, max: ageMax });
  };

  const adjustMaxAge = (delta: number) => {
    const nextMax = Math.min(MAX_AGE, Math.max(ageMax + delta, ageMin));
    onAgeChange({ min: ageMin, max: nextMax });
  };

  const onScrollEnd = (offsetY: number, height: number) => {
    if (!height) return;
    const nextIndex = Math.max(
      0,
      Math.min(Math.round(offsetY / height), profiles.length - 1),
    );
    if (nextIndex !== currentCardIndex) {
      onChangeCardIndex(nextIndex);
    }
  };

  const handleEdgeWrap = (
    offsetY: number,
    dragDelta: number,
    velocityY: number,
  ) => {
    if (profiles.length < 2 || wrapInProgressRef.current) {
      return;
    }

    const maxOffset = Math.max((profiles.length - 1) * windowHeight, 0);
    const triedForward = dragDelta > 18 || velocityY < -0.4;
    const triedBackward = dragDelta < -18 || velocityY > 0.4;

    if (
      currentCardIndex === profiles.length - 1 &&
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

    if (currentCardIndex === 0 && triedBackward && offsetY <= 2) {
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
    handleEdgeWrap(endOffsetY, dragDelta, velocityY);
  };

  const likeCounterLabel = `${likesUsed} / ${likeLimit} Likes used`;
  const likeHint = currentProfileLiked
    ? "Already liked"
    : likeLimitReached
      ? "You have used all Likes for these filters."
      : "Hold heart to like";

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <SafeAreaView className="flex-1">
        <View style={{ flex: 1 }}>
          <FlatList
            ref={listRef}
            data={profiles}
            keyExtractor={(item) => item.profile.id}
            pagingEnabled
            bounces={false}
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            getItemLayout={(_, index) => ({
              length: windowHeight,
              offset: windowHeight * index,
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
              <View style={{ height: windowHeight }}>
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
                    "rgba(0,0,0,0.55)",
                    "rgba(0,0,0,0.08)",
                    "rgba(0,0,0,0.8)",
                  ]}
                  locations={[0, 0.4, 1]}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                  }}
                />

                <View
                  style={{
                    position: "absolute",
                    left: 18,
                    right: 18,
                    bottom: 160,
                    gap: 8,
                  }}
                >
                  {likedProfileIds.has(item.profile.id) ? (
                    <View className="self-start rounded-full border border-rose-300/40 bg-rose-500/35 px-3 py-1">
                      <Text className="text-xs font-semibold text-white">
                        Liked
                      </Text>
                    </View>
                  ) : null}

                  <Text className="text-4xl font-black text-white">
                    {item.profile.name}, {item.profile.age}
                  </Text>

                  <View className="flex-row flex-wrap gap-2">
                    {item.profile.hobbies.slice(0, 3).map((hobby) => (
                      <View
                        key={`${item.profile.id}-${hobby}`}
                        className="rounded-full border border-white/30 bg-black/35 px-3 py-1"
                      >
                        <Text className="text-xs font-semibold text-white/90">
                          {hobby}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <Text className="text-sm leading-5 text-white/90">
                    {item.profile.bio}
                  </Text>
                </View>
              </View>
            )}
            onMomentumScrollEnd={(event) =>
              onScrollEnd(
                event.nativeEvent.contentOffset.y,
                event.nativeEvent.layoutMeasurement.height,
              )
            }
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEndDrag}
          />

          <View
            className="absolute left-0 right-0 flex-row items-start justify-between px-4"
            style={{ top: Math.max(12, topInset) }}
          >
            <View>
              <Text className="text-2xl font-black text-white">
                {venueName || eventTitle || "Event"}
              </Text>
              <View className="mt-1 flex-row items-center gap-2">
                <Sparkles size={12} color="rgba(255,255,255,0.85)" />
                <Text className="text-xs text-white/85">
                  {Math.max(venuePeopleCount, profiles.length)} people here
                </Text>
              </View>
              <View className="mt-2 self-start rounded-full border border-white/25 bg-black/30 px-3 py-1">
                <Text className="text-[11px] font-semibold text-white/80">
                  {likeCounterLabel}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setIsFilterOpen(true)}
              className="h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/35"
            >
              <Settings2 size={20} color="#fff" />
            </Pressable>
          </View>

          <View
            className="absolute left-0 right-0 items-center"
            style={{ bottom: Math.max(bottomInset + 24, 34) }}
          >
            <View className="flex-row items-center justify-center w-full gap-5 px-4">
              <Pressable
                onPressIn={startHoldLike}
                onPressOut={stopHoldLike}
                disabled={
                  likeDisabled || !currentProfile || currentProfileLiked
                }
                className={`h-[74px] w-[74px] items-center justify-center overflow-hidden rounded-full border border-white/25 ${likeDisabled || currentProfileLiked ? "bg-black/45" : "bg-black/35"}`}
              >
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: holdProgress * 74,
                    backgroundColor: "rgba(244,63,94,0.85)",
                  }}
                />
                <Heart
                  size={30}
                  color={
                    likeDisabled || currentProfileLiked
                      ? "rgba(255,255,255,0.6)"
                      : "#fff"
                  }
                  fill={
                    currentProfileLiked || (isHoldingLike && !likeDisabled)
                      ? "#fff"
                      : "transparent"
                  }
                />
              </Pressable>
            </View>

            <Text className="mt-2 text-[11px] text-white/70">{likeHint}</Text>
          </View>

          <MatchModal
            visible={showMatch}
            profile={matchedProfile}
            onClose={onCloseMatch}
          />

          <Modal
            visible={isFilterOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setIsFilterOpen(false)}
          >
            <Pressable
              className="flex-1 bg-black/70 px-4"
              onPress={() => setIsFilterOpen(false)}
            >
              <Pressable
                onPress={(event) => event.stopPropagation()}
                className="mt-auto rounded-t-3xl bg-[#111114] px-5 pb-8 pt-6"
              >
                <Text className="mb-4 text-xl font-black text-white">
                  Filters
                </Text>

                <Text className="mb-2 text-xs font-semibold uppercase tracking-[1px] text-white/70">
                  Show me
                </Text>
                <View className="mb-5 flex-row gap-2">
                  {[
                    { label: "Everyone", value: "everyone" as const },
                    { label: "Women", value: "female" as const },
                    { label: "Men", value: "male" as const },
                  ].map((option) => {
                    const active = genderFilter === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => onGenderChange(option.value)}
                        className={`rounded-full px-4 py-2 ${active ? "bg-white" : "bg-white/10"}`}
                      >
                        <Text
                          className={`text-xs font-semibold ${active ? "text-black" : "text-white/85"}`}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text className="mb-2 text-xs font-semibold uppercase tracking-[1px] text-white/70">
                  Age range
                </Text>
                <View className="mb-5 rounded-2xl border border-white/10 bg-black/30 p-3">
                  <View className="mb-3 flex-row items-center justify-center gap-3">
                    <Text className="rounded-lg bg-white/10 px-3 py-1 text-sm font-bold text-white">
                      {ageMin}
                    </Text>
                    <Text className="text-xs uppercase text-white/60">to</Text>
                    <Text className="rounded-lg bg-white/10 px-3 py-1 text-sm font-bold text-white">
                      {ageMax}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-xs text-white/70">Min</Text>
                      <Pressable
                        onPress={() => adjustMinAge(-1)}
                        className="h-8 w-8 items-center justify-center rounded-full bg-white/10"
                      >
                        <Minus size={16} color="#fff" />
                      </Pressable>
                      <Pressable
                        onPress={() => adjustMinAge(1)}
                        className="h-8 w-8 items-center justify-center rounded-full bg-white/10"
                      >
                        <Plus size={16} color="#fff" />
                      </Pressable>
                    </View>

                    <View className="flex-row items-center gap-2">
                      <Text className="text-xs text-white/70">Max</Text>
                      <Pressable
                        onPress={() => adjustMaxAge(-1)}
                        className="h-8 w-8 items-center justify-center rounded-full bg-white/10"
                      >
                        <Minus size={16} color="#fff" />
                      </Pressable>
                      <Pressable
                        onPress={() => adjustMaxAge(1)}
                        className="h-8 w-8 items-center justify-center rounded-full bg-white/10"
                      >
                        <Plus size={16} color="#fff" />
                      </Pressable>
                    </View>
                  </View>
                </View>

                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-xs font-semibold uppercase tracking-[1px] text-white/70">
                    Interests
                  </Text>
                  <Pressable onPress={onClearInterests}>
                    <Text className="text-xs font-semibold text-white/70">
                      Clear
                    </Text>
                  </Pressable>
                </View>

                <View className="mb-5 flex-row flex-wrap gap-2">
                  {availableInterests.map((interest) => {
                    const active = selectedInterests.includes(interest);
                    return (
                      <Pressable
                        key={interest}
                        onPress={() => onToggleInterest(interest)}
                        className={`rounded-full border px-3 py-2 ${active ? "border-white bg-white" : "border-white/20 bg-white/5"}`}
                      >
                        <Text
                          className={`text-xs font-semibold ${active ? "text-black" : "text-white/85"}`}
                        >
                          {interest}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  onPress={() => setIsFilterOpen(false)}
                  className="items-center rounded-2xl bg-white py-3"
                >
                  <Text className="text-sm font-black text-black">
                    Apply filters
                  </Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      </SafeAreaView>
    </View>
  );
}
