import { AvatarList } from "@/components/AvatarList";
import { useTranslation } from "react-i18next";
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
  fetchEventDetails,
  trackEventSeen,
  unattendEvent,
} from "@/lib/api";
import useStore from "@/store/useStore";
import { Event, VenueContact } from "@/types/event";
import { useAuth } from "@clerk/expo";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { format, parseISO } from "date-fns";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  ActivityIndicator,
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
  const { t } = useTranslation();
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
      label: t("call"),
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
      label: t("sms"),
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
      label: t("viber"),
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
      label: t("whatsapp"),
      icon: <MessageCircle size={20} color="#25d366" />,
      onPress: () => {
        openWhatsapp(contact.phoneNumber);
        setContacted(true);
      },
    });
  }
  if (contact.isInstagram && contact.instagramHandle) {
    const handle = contact.instagramHandle;
    contactMethods.push({
      key: "instagram",
      label: t("instagramDm"),
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
            {t("reservationRequired")}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.gray6,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            {t("reservationDescription", { methods: methodLabels })}
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
              {contacted ? t("madeReservationAttend") : t("contactVenueFirst")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 14, color: theme.gray6 }}>
              {t("cancel")}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────

const EventDetailsScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addTicket, removeTicketByEventId } = useStore();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, getToken } = useAuth();
  const guestListRef = useRef<BottomSheetModal>(null);

  const [event, setEvent] = useState<Event | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [attending, setAttending] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [titleExpanded, setTitleExpanded] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [attendeesData, setAttendeesData] = useState<EventAttendeesData>({
    maxSpots: 0,
    averageAge: null,
    females: 0,
    males: 0,
    guestList: [],
  });

  // Fetch full event details on mount
  useEffect(() => {
    if (!id) return;
    getToken()
      .then((token) => fetchEventDetails(id, token ?? undefined))
      .then((data) => {
        setEvent(data);
        if (data.isAttending) setAttending(true);
      })
      .catch(() => setLoadingEvent(false))
      .finally(() => setLoadingEvent(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch attendees
  useEffect(() => {
    if (!id || !userId) return;
    getToken()
      .then((token) => {
        if (!token) return;
        return fetchEventAttendees(id, token);
      })
      .then((data) => {
        if (data) setAttendeesData(data);
      })
      .catch(() => {});
  }, [id, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track event seen
  useEffect(() => {
    if (!event || !userId || event.isSeen) return;
    getToken()
      .then((token) => {
        if (!token) return;
        return trackEventSeen(token, event.id);
      })
      .then(() => setEvent((e) => (e ? { ...e, isSeen: true } : e)))
      .catch(() => {});
  }, [event?.id, event?.isSeen, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAttend = async () => {
    if (!userId || !event?.id) return;
    const token = await getToken();
    if (!token) return;

    // If already attending — just cancel
    if (attending) {
      setAttending(false);
      try {
        await unattendEvent(token, event.id);
        removeTicketByEventId(event.id);
      } catch {
        setAttending(true);
      }
      return;
    }

    // Show reservation/contact modal before attending
    if (event.venueContact && event.requiresReservation) {
      setShowReservationModal(true);
      return;
    }

    await confirmAttend();
  };

  const confirmAttend = async () => {
    if (!userId || !event?.id) return;
    const token = await getToken();
    if (!token) return;
    setShowReservationModal(false);
    setAttending(true);
    try {
      const { ticket: raw } = await attendEvent(token, event.id);
      addTicket({
        id: String(raw.id ?? ""),
        event_id: event.id,
        image: event.image ?? null,
        title: event.title,
        description: event.description,
        date: event.date,
        tags: event.tags,
        venue_name: String(raw.venue_name ?? ""),
        location: event.location,
      });
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

  if (loadingEvent) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: theme.background }}
      >
        <ActivityIndicator color={theme.color} />
      </View>
    );
  }

  if (!event) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: theme.background }}
      >
        <Text style={{ color: theme.gray10 }}>{t("noEventSelected")}</Text>
      </View>
    );
  }

  const { maxSpots, averageAge, females, males, guestList } = attendeesData;
  const goingCount = guestList.length;
  const freeSpots = Math.max(0, maxSpots - goingCount);
  const progressValue =
    maxSpots > 0 ? Math.min((goingCount / maxSpots) * 100, 100) : 0;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      {/* Hero */}
      <View style={{ height: "32%" }} className="overflow-hidden">
        <Image
          source={{ uri: event.image || undefined }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: `${theme.background}99`,
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
                source={{ uri: event.venue_picture ?? undefined }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>

            <View className="flex-1 pb-1">
              <Pressable onPress={() => setTitleExpanded((v) => !v)}>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "700",
                    color: theme.colorStrong,
                  }}
                  numberOfLines={titleExpanded ? undefined : 1}
                >
                  {event.title}
                </Text>
              </Pressable>
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
        <View className="flex-row items-start gap-4">
          <View className="flex-1">
            <Pressable onPress={() => setDescExpanded((v) => !v)}>
              <Text
                style={{ fontSize: 14, lineHeight: 22, color: theme.gray6 }}
                numberOfLines={descExpanded ? undefined : 3}
              >
                {event.description}
              </Text>
            </Pressable>
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
              <Text style={{ fontSize: 12, color: theme.gray5 }}>
                {t("goingLabel")}
              </Text>
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
              {freeSpots > 0
                ? t("spotsLeft", { count: freeSpots })
                : t("eventIsFull")}
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
            {attending ? t("cancelAttendance") : t("attend")}
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

      {/* Reservation modal — shown when attending requires reservation */}
      {event.venueContact && event.requiresReservation && (
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
