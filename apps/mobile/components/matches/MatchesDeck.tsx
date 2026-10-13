import MatchModal from "@/components/MatchModal";
import { Profile } from "@/types/profile";
import { LookingForGender } from "@/types/user";
import Slider from "@react-native-community/slider";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronDown,
  ChevronUp,
  Heart,
  MapPin,
  Minus,
  Plus,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Modal,
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
  likeDisabled,
  showMatch,
  matchedProfile,
  onCloseMatch,
}: MatchesDeckProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
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
  const handleLikePress = () => {
    if (!currentProfile || likeDisabled || currentProfileLiked) {
      return;
    }
    onLike(currentProfile);
  };
  const cardHeight = windowHeight;
  const headerTop = Math.max(topInset + 6, 18);
  const detailsBottomOffset = Math.max(bottomInset + 12, 16);
  const activePeopleCount = Math.max(venuePeopleCount, profiles.length);
  const likeBudgetLabel = `${likesUsed} / ${likeLimit}`;
  const likesRemaining = Math.max(0, likeLimit - likesUsed);
  const likeButtonLabel = currentProfileLiked
    ? "Liked"
    : likeDisabled
      ? "No Likes left"
      : "Like";
  const ageValueLabel = `${ageMin} - ${ageMax}`;
  return (
    <View className="flex-1 bg-[#111015]">
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
              onScrollEnd(
                event.nativeEvent.contentOffset.y,
                event.nativeEvent.layoutMeasurement.height,
              )
            }
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEndDrag}
          />
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(53,44,78,0.25)", "rgba(16,14,22,0)"]}
            style={StyleSheet.absoluteFillObject}
          />
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
              onPress={() => setIsFilterOpen(true)}
              className="h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/25 bg-white/15"
            >
              <BlurView
                intensity={30}
                tint="dark"
                style={StyleSheet.absoluteFillObject}
              />
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
                <Text className="mt-3 max-w-[340px] text-[13px] leading-5 text-[#eee9f0]">
                  {currentProfile.bio}
                </Text>
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
            {profiles.length > 1 && (
              <View className="mt-5 flex-row items-center justify-center gap-2">
                <View className="items-center justify-center">
                  <ChevronUp size={14} color="#d7c6fa" />
                  <ChevronDown size={14} color="#d7c6fa" />
                </View>
                <Text className="text-xs font-medium text-[#d7cfdc]">
                  Swipe to explore everyone here
                </Text>
              </View>
            )}
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
              className="flex-1 justify-end bg-[#09070bb0]"
              onPress={() => setIsFilterOpen(false)}
            >
              <Pressable
                onPress={(event) => event.stopPropagation()}
                className="rounded-t-[30px] border-t border-white/10 bg-[#24202e] px-6 pb-8 pt-6"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-2xl font-black text-white">
                    Discovery filters
                  </Text>
                  <Sparkles size={18} color="#d2b8ff" />
                </View>
                <Text className="mt-2 text-sm text-[#bcb3c6]">
                  Fine-tune who you meet at this event.
                </Text>
                <Text className="mt-5 text-xs font-bold uppercase tracking-[1px] text-white/70">
                  Show me
                </Text>
                <View className="mt-2 flex-row gap-2">
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
                        className={`rounded-full border px-4 py-2 ${
                          active
                            ? "border-[#b58cff] bg-[#b58cff]"
                            : "border-white/20 bg-white/10"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${active ? "text-[#1b102f]" : "text-white/90"}`}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View className="mt-5 rounded-2xl border border-white/15 bg-[#1b1624] px-4 py-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-bold uppercase tracking-[1px] text-white/70">
                      Age range
                    </Text>
                    <Text className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
                      {ageValueLabel}
                    </Text>
                  </View>
                  <Slider
                    minimumValue={MIN_AGE}
                    maximumValue={MAX_AGE}
                    step={1}
                    minimumTrackTintColor="#b58cff"
                    maximumTrackTintColor="#5a506b"
                    thumbTintColor="#a77aff"
                    value={ageMax}
                    onValueChange={(value) => {
                      const nextMax = Math.max(ageMin, Math.round(value));
                      onAgeChange({ min: ageMin, max: nextMax });
                    }}
                  />
                  <View className="mt-2 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-xs text-white/70">Min</Text>
                      <Pressable
                        onPress={() => adjustMinAge(-1)}
                        className="h-8 w-8 items-center justify-center rounded-full bg-white/10"
                      >
                        <Minus size={14} color="#fff" />
                      </Pressable>
                      <Pressable
                        onPress={() => adjustMinAge(1)}
                        className="h-8 w-8 items-center justify-center rounded-full bg-white/10"
                      >
                        <Plus size={14} color="#fff" />
                      </Pressable>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-xs text-white/70">Max</Text>
                      <Pressable
                        onPress={() => adjustMaxAge(-1)}
                        className="h-8 w-8 items-center justify-center rounded-full bg-white/10"
                      >
                        <Minus size={14} color="#fff" />
                      </Pressable>
                      <Pressable
                        onPress={() => adjustMaxAge(1)}
                        className="h-8 w-8 items-center justify-center rounded-full bg-white/10"
                      >
                        <Plus size={14} color="#fff" />
                      </Pressable>
                    </View>
                  </View>
                </View>
                <View className="mt-5 flex-row items-center justify-between">
                  <Text className="text-xs font-bold uppercase tracking-[1px] text-white/70">
                    Interests
                  </Text>
                  <Pressable onPress={onClearInterests}>
                    <Text className="text-xs font-semibold text-white/75">
                      Clear
                    </Text>
                  </Pressable>
                </View>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {availableInterests.length ? (
                    availableInterests.map((interest) => {
                      const active = selectedInterests.includes(interest);
                      return (
                        <Pressable
                          key={interest}
                          onPress={() => onToggleInterest(interest)}
                          className={`rounded-full border px-3 py-2 ${
                            active
                              ? "border-[#b58cff] bg-[#b58cff]"
                              : "border-white/20 bg-white/5"
                          }`}
                        >
                          <Text
                            className={`text-xs font-semibold ${active ? "text-[#1b102f]" : "text-white/90"}`}
                          >
                            {interest}
                          </Text>
                        </Pressable>
                      );
                    })
                  ) : (
                    <Text className="text-xs text-white/65">
                      Interests will appear as profiles load.
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={() => setIsFilterOpen(false)}
                  className="mt-7 items-center rounded-2xl bg-[#a77aff] py-3.5"
                >
                  <View className="flex-row items-center">
                    <MapPin size={15} color="#180e29" />
                    <Text className="ml-2 text-sm font-extrabold text-[#180e29]">
                      Apply filters
                    </Text>
                  </View>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      </SafeAreaView>
    </View>
  );
}
