import { DiscoverCard } from "@/components/DiscoverCard";
import EmptyIndicator from "@/components/EmptyIndicator";
import CalendarIcon from "@/components/illustrations/Map";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { fetchMyTickets } from "@/lib/api";
import useStore from "@/store/useStore";
import { Ticket } from "@/types/ticket";
import { EventSummary } from "@/types/event";
import { useAuth } from "@clerk/expo";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, RefreshControl, ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import LoadingIndicator from "@/components/loading-indicator";

const LIVE_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours before start = still "live"
const SOON_WINDOW_MS = 3 * 60 * 60 * 1000; // within 3 hours from now = "starting soon"

function ticketToEvent(ticket: Ticket): EventSummary {
  return {
    id: ticket.event_id,
    image: ticket.image ?? "",
    title: ticket.title,
    venueName: ticket.venue_name,
    address: ticket.location.address ?? "",
    date: ticket.date,
    tags: ticket.tags,
    location: ticket.location,
    isFavorite: false,
    guestCount: 0,
  };
}

function LiveDot() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#ef4444",
        opacity,
      }}
    />
  );
}

function Section({
  title,
  events,
  onPress,
  live,
}: {
  title: string;
  events: EventSummary[];
  onPress: (event: EventSummary) => void;
  live?: boolean;
}) {
  const theme = useAppTheme();
  if (events.length === 0) return null;
  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2">
        {live && <LiveDot />}
        <Text className="text-[13px] font-bold uppercase tracking-[0.8px] text-light-gray5 dark:text-dark-gray5">
          {title}
        </Text>
      </View>
      {events.map((event) => (
        <DiscoverCard
          key={event.id}
          event={event}
          isSelected={false}
          onPress={() => onPress(event)}
          style={{ width: "100%" }}
        />
      ))}
    </View>
  );
}

export default function TicketsScreen() {
  const { tickets, setTickets } = useStore();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { userId, getToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadTickets = (isRefresh = false) => {
    if (!userId) return;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    getToken()
      .then((token) => {
        if (!token) throw new Error("No token");
        return fetchMyTickets(token, userId);
      })
      .then(setTickets)
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    loadTickets();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const { live, soon, rest } = useMemo(() => {
    const now = Date.now();
    const live: EventSummary[] = [];
    const soon: EventSummary[] = [];
    const rest: EventSummary[] = [];

    (tickets ?? []).forEach((ticket: Ticket) => {
      const start = new Date(ticket.date).getTime();
      if (start < now - LIVE_WINDOW_MS) return; // expired — skip
      const event = ticketToEvent(ticket);
      if (start <= now) {
        live.push(event);
      } else if (start <= now + SOON_WINDOW_MS) {
        soon.push(event);
      } else {
        rest.push(event);
      }
    });

    return { live, soon, rest };
  }, [tickets]);

  const handlePress = (event: EventSummary) => {
    router.push(`/event-details/${event.id}`);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-light-background dark:bg-dark-background">
        <LoadingIndicator />
      </View>
    );
  }

  if (live.length === 0 && soon.length === 0 && rest.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-light-background dark:bg-dark-background">
        <EmptyIndicator
          title={t("noTicketsTitle")}
          subtitle={t("noTicketsSubtitle")}
          picture={({ color, ...rest }) => (
            <CalendarIcon {...rest} color={theme.color} />
          )}
          onPress={() => router.push("/")}
          buttonText={t("goToMap")}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-light-background dark:bg-dark-background">
      <ScrollView
        className="p-4 w-full"
        contentContainerStyle={{ gap: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadTickets(true)}
            tintColor={theme.color}
            colors={[theme.color]}
          />
        }
      >
        <Section
          title={t("liveNow")}
          events={live}
          onPress={handlePress}
          live
        />
        <Section
          title={t("startingSoon")}
          events={soon}
          onPress={handlePress}
        />
        <Section title={t("upcoming")} events={rest} onPress={handlePress} />
      </ScrollView>
    </View>
  );
}
