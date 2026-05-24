import { AvatarList } from "@/components/AvatarList";
import { DateCard } from "@/components/DateCard";
import FavoriteButton from "@/components/FavoriteButton";
import GuestListModal from "@/components/GuestListModal";
import { MiniMap } from "@/components/MiniMap";
import Tags from "@/components/Tags";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  EventAttendeesData,
  attendEvent,
  fetchEventAttendees,
  trackEventSeen,
  unattendEvent,
} from "@/lib/api";
import useStore from "@/store/useStore";
import { VenueContact } from "@/types/event";
import { useAuth } from "@clerk/expo";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { format, parseISO } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  UserPlus,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Helpers for deep-linking to contact apps ────────────────────────────

function normalizePhone(raw: string): string {
  return raw.replace(/[^+0-9]/g, "");
}

function openPhone(phone: string) {
  Linking.openURL(`tel:${normalizePhone(phone)}`);
}

function openSms(phone: string) {
  Linking.openURL(`sms:${normalizePhone(phone)}`);
}

function openViber(phone: string) {
  Linking.openURL(`viber://chat?number=${normalizePhone(phone)}`).catch(() =>
    Linking.openURL(`tel:${normalizePhone(phone)}`),
  );
}

function openWhatsapp(phone: string) {
  const number = normalizePhone(phone).replace(/^\+/, "");
  Linking.openURL(`https://wa.me/${number}`).catch(() =>
    Linking.openURL(`tel:${normalizePhone(phone)}`),
  );
}

function openInstagramDm(handle: string) {
  const username = handle.replace(/^@/, "");
  Linking.openURL(`instagram://user?username=${username}`).catch(() =>
    Linking.openURL(`https://instagram.com/${username}`),
  );
}

// ─── Reservation Modal ───────────────────────────────────────────────────

interface ReservationModalProps {
  visible: boolean;
  contact: VenueContact;
  onClose: () => void;
  onConfirm: () => void;
}

function ReservationModal({
  visible,
  contact,
  onClose,
  onConfirm,
}: ReservationModalProps) {
  const theme = useAppTheme();
  const [contacted, setContacted] = useState(false);

  const contactMethods: {
    key: string;
    label: string;
    icon: React.ReactNode;
    onPress: () => void;
  }[] = [];

  if (contact.isPhone) {
    contactMethods.push({
      key: "phone",
      label: "Call",
      icon: <Phone size={20} color={theme.color} />,
      onPress: () => {
        openPhone(contact.phoneNumber);
        setContacted(true);
      },
    });
  }
  if (contact.isSms) {
    contactMethods.push({
      key: "sms",
      label: "SMS",
      icon: <MessageCircle size={20} color={theme.color} />,
      onPress: () => {
        openSms(contact.phoneNumber);
        setContacted(true);
      },
    });
  }
  if (contact.isViber) {
    contactMethods.push({
      key: "viber",
      label: "Viber",
      icon: <Send size={20} color="#7360f2" />,
      onPress: () => {
        openViber(contact.phoneNumber);
        setContacted(true);
      },
    });
  }
  if (contact.isWhatsapp) {
    contactMethods.push({
      key: "whatsapp",
      label: "WhatsApp",
      icon: <MessageCircle size={20} color="#25d366" />,
      onPress: () => {
        openWhatsapp(contact.phoneNumber);
        setContacted(true);
      },
    });
  }
  if (contact.instagramHandle) {
    const handle = contact.instagramHandle;
    contactMethods.push({
      key: "instagram",
      label: "Instagram DM",
      icon: <Send size={20} color="#e1306c" />,
      onPress: () => {
        openInstagramDm(handle);
        setContacted(true);
      },
    });
  }

  const methodLabels = contactMethods.map((m) => m.label).join(", ");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "flex-end",
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: theme.backgroundStrong,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            gap: 16,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: theme.colorStrong,
              textAlign: "center",
            }}
          >
            Reservation required
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.gray6,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            {`This venue requires a reservation via ${methodLabels}. Contact them first, then confirm below.`}
          </Text>

          {/* Contact method buttons */}
          <View style={{ gap: 10 }}>
            {contactMethods.map((m) => (
              <TouchableOpacity
                key={m.key}
                onPress={m.onPress}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: theme.background,
                  borderWidth: 1,
                  borderColor: theme.gray3,
                }}
              >
                {m.icon}
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: theme.colorStrong,
                  }}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Confirm button — enabled once user has tapped a contact method */}
          <TouchableOpacity
            onPress={contacted ? onConfirm : undefined}
            style={{
              padding: 16,
              borderRadius: 50,
              alignItems: "center",
              backgroundColor: contacted ? theme.color : theme.gray3,
              marginTop: 4,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: contacted ? theme.background : theme.gray6,
              }}
            >
              {contacted
                ? "I made the reservation — Attend"
                : "Contact the venue first"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 14, color: theme.gray6 }}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────

const EventDetailsScreen = () => {
  const { getSelectedEvent, updateEventSeen, updateEventAttending } =
    useStore();
  const event = getSelectedEvent();
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, getToken } = useAuth();
  const guestListRef = useRef<BottomSheetModal>(null);
  const [attending, setAttending] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [attendeesData, setAttendeesData] = useState<EventAttendeesData>({
    maxSpots: 0,
    averageAge: null,
    females: 0,
    males: 0,
    guestList: [],
  });

  useEffect(() => {
    if (!userId || !event?.id) return;
    getToken()
      .then((token) => {
        if (!token) return;
        return fetchEventAttendees(event.id, token);
      })
      .then((data) => {
        if (data) setAttendeesData(data);
      })
      .catch(() => {});
  }, [userId, event?.id]);

  useEffect(() => {
    if (event?.isAttending) setAttending(true);
  }, [event?.isAttending]);

  const handleAttend = async () => {
    if (!userId || !event?.id) return;
    const token = await getToken();
    if (!token) return;

    // If already attending — just cancel (no reservation needed)
    if (attending) {
      setAttending(false);
      try {
        await unattendEvent(token, event.id);
        updateEventAttending(String(event.id), false);
      } catch {
        setAttending(true);
      }
      return;
    }

    // Show reservation/contact modal before attending
    if (event.venueContact) {
      setShowReservationModal(true);
      return;
    }

    // No contact info at all — standard attend
    await confirmAttend();
  };

  const confirmAttend = async () => {
    if (!userId || !event?.id) return;
    const token = await getToken();
    if (!token) return;
    setShowReservationModal(false);
    setAttending(true);
    try {
      await attendEvent(token, event.id);
      updateEventAttending(String(event.id), true);
    } catch (err) {
      setAttending(false);
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      Alert.alert("Can't attend", message);
    }
  };

  const openGuestList = useCallback(() => {
    guestListRef.current?.present();
  }, []);

  useEffect(() => {
    if (userId && event?.id && !event.isSeen) {
      getToken()
        .then((token) => {
          if (!token) return;
          return trackEventSeen(token, event.id);
        })
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

  const { maxSpots, averageAge, females, males, guestList } = attendeesData;
  const goingCount = guestList.length;
  const freeSpots = Math.max(0, maxSpots - goingCount);
  const progressValue =
    maxSpots > 0 ? Math.min((goingCount / maxSpots) * 100, 100) : 0;

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
          <FavoriteButton isFavorite={event.isFavorite} eventId={event.id} />
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
                {goingCount}/{maxSpots}
              </Text>
            </View>

            <View className="mb-3">
              <AvatarList avatars={guestList} />
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
        guestList={guestList}
        maxSpots={maxSpots}
        averageAge={averageAge}
        females={females}
        males={males}
      />

      {/* Reservation modal — always shown when attending */}
      {event.venueContact && (
        <ReservationModal
          visible={showReservationModal}
          contact={event.venueContact}
          onClose={() => setShowReservationModal(false)}
          onConfirm={confirmAttend}
        />
      )}
    </View>
  );
};

export default EventDetailsScreen;
