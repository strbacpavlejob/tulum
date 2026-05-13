import { AvatarList } from "@/components/AvatarList";
import { DateCard } from "@/components/DateCard";
import FavoriteButton from "@/components/FavoriteButton";
import GuestListModal from "@/components/GuestListModal";
import { MiniMap } from "@/components/MiniMap";
import Tags from "@/components/Tags";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { attendEvent, trackEventSeen, unattendEvent } from "@/lib/api";
import useStore from "@/store/useStore";
import { useAuth } from "@clerk/expo";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { format, parseISO } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowLeft, MapPin, UserPlus } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Image, Alert, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const EventDetailsScreen = () => {
  const { getSelectedEvent, updateEventSeen, updateEventAttending } =
    useStore();
  const event = getSelectedEvent();
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const guestListRef = useRef<BottomSheetModal>(null);
  const [attending, setAttending] = useState(false);

  useEffect(() => {
    if (event?.isAttending) setAttending(true);
  }, [event?.isAttending]);

  const handleAttend = async () => {
    if (!userId || !event?.id) return;
    const next = !attending;
    setAttending(next);
    try {
      if (next) {
        await attendEvent(userId, event.id);
      } else {
        await unattendEvent(userId, event.id);
      }
      updateEventAttending(String(event.id), next);
    } catch (err) {
      setAttending(!next);
      if (next) {
        const message =
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.";
        Alert.alert("Can't attend", message);
      }
    }
  };

  const openGuestList = useCallback(() => {
    guestListRef.current?.present();
  }, []);

  useEffect(() => {
    if (userId && event?.id && !event.isSeen) {
      trackEventSeen(userId, event.id)
        .then(() => updateEventSeen(String(event.id)))
        .catch(() => {});
    }
  }, [userId, event?.id, event?.isSeen]);

  if (!event) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: theme.background }}
      >
        <Text style={{ color: theme.gray10 }}>No event selected</Text>
      </View>
    );
  }

  const capacity = 120;
  const goingCount = event.guests.length;
  const freeSpots = Math.max(0, capacity - goingCount);
  const progressValue = Math.min((goingCount / capacity) * 100, 100);

  console.log("Event details for event ID:", event.id, JSON.stringify(event));

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      {/* Hero */}
      <View style={{ height: "32%" }} className="overflow-hidden">
        <Image
          source={{ uri: event.image }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.6)"]}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />

        {/* Back button — top left */}
        <Pressable
          onPress={() => router.back()}
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 16,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(0,0,0,0.45)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={20} color="#fff" />
        </Pressable>

        {/* Favorite button — top right */}
        <View
          style={{
            position: "absolute",
            top: insets.top + 8,
            right: 16,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(0,0,0,0.45)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FavoriteButton
            isFavorite={event.isFavorite}
            userId={userId ?? undefined}
            eventId={event.id}
          />
        </View>

        <View className="absolute bottom-0 left-0 right-0 p-4">
          <View className="flex-row items-center gap-4">
            <View
              className="w-16 h-16 rounded-full overflow-hidden border-2"
              style={{ borderColor: "rgba(255,255,255,0.3)" }}
            >
              <Image
                source={{ uri: event.venue_picture }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>

            <View className="flex-1 pb-1">
              <Text
                style={{ fontSize: 22, fontWeight: "700", color: "#fff" }}
                numberOfLines={1}
              >
                {event.title}
              </Text>
              <View className="flex-row flex-wrap gap-2 mt-2">
                <Tags tags={event.tags} />
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 16,
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Description + Date */}
        <View className="flex-row items-center gap-4">
          <View className="flex-1">
            <Text
              style={{ fontSize: 14, lineHeight: 22, color: theme.gray6 }}
              numberOfLines={3}
            >
              {event.description}
            </Text>
          </View>
          <View className="shrink-0">
            <DateCard dateString={event.date} />
          </View>
        </View>

        {/* Map */}
        <View
          className="w-full overflow-hidden rounded-2xl"
          style={{
            height: 160,
            borderWidth: 1,
            borderColor: theme.gray3,
            backgroundColor: theme.backgroundStrong,
          }}
        >
          <MiniMap
            latitude={event.location.latitude}
            longitude={event.location.longitude}
            address={event.location.address}
            height={160}
          />
        </View>

        {/* Address */}
        <View className="flex-row items-center gap-2">
          <MapPin size={16} color={theme.gray12} />
          <Text style={{ fontSize: 14, color: theme.gray6 }}>
            {event.location.address || "Tulum, Mexico"}
          </Text>
        </View>

        {/* Guests */}
        <Pressable onPress={openGuestList}>
          <View>
            <View className="flex-row items-center justify-between mb-2">
              <Text style={{ fontSize: 12, color: theme.gray5 }}>Going</Text>
              <Text style={{ fontSize: 12, color: theme.gray5 }}>
                {goingCount}/{capacity}
              </Text>
            </View>

            <View className="mb-3">
              <AvatarList avatars={event.guests} />
            </View>

            {/* Progress bar */}
            <View
              className="w-full rounded-full overflow-hidden"
              style={{ height: 6, backgroundColor: theme.gray3 }}
            >
              <View
                style={{
                  width: `${progressValue}%`,
                  height: "100%",
                  backgroundColor: theme.color,
                  borderRadius: 999,
                }}
              />
            </View>

            <Text style={{ fontSize: 12, color: theme.gray5, marginTop: 4 }}>
              {freeSpots > 0 ? `${freeSpots} spots left` : "Full"}
            </Text>
          </View>
        </Pressable>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="px-5 pb-5">
        <Pressable
          className="flex-row items-center justify-center gap-2 w-full py-4 rounded-full"
          style={{
            backgroundColor: attending ? theme.gray3 : theme.color,
          }}
          onPress={handleAttend}
        >
          <Text
            style={{
              color: attending ? theme.gray6 : theme.background,
              fontWeight: "600",
              fontSize: 18,
            }}
          >
            {attending ? "Cancel attendance" : "Attend"}
          </Text>
          <UserPlus
            size={20}
            color={attending ? theme.gray6 : theme.background}
          />
        </Pressable>
      </View>

      <GuestListModal
        ref={guestListRef}
        eventTitle={event.title}
        eventDate={format(parseISO(event.date), "EEEE · h:mm a")}
        guests={event.guests}
        capacity={capacity}
      />
    </View>
  );
};

export default EventDetailsScreen;
