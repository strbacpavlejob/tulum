import EmptyIndicator from "@/components/EmptyIndicator";
import MapIcon from "@/components/illustrations/Map";
import { TicketCard } from "@/components/TicketCard";
import { useAppTheme } from "@/hooks/useAppTheme";
import { fetchMyTickets } from "@/lib/api";
import useStore from "@/store/useStore";
import { useAuth } from "@clerk/expo";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";

export default function TicketsScreen() {
  const { tickets, setTickets } = useStore();
  const theme = useAppTheme();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetchMyTickets(userId)
      .then(setTickets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: theme.background }}
      >
        <ActivityIndicator color={theme.color} />
      </View>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: theme.background }}
      >
        <EmptyIndicator
          title="Gosh darn!"
          subtitle="No tickets available at the moment!"
          picture={({ color, ...rest }) => (
            <MapIcon {...rest} color={theme.color} />
          )}
        />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, backgroundColor: theme.background }}
    >
      <View className="gap-4">
        {tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            id={ticket.id}
            title={ticket.title}
            description={ticket.description}
            date={new Date(ticket.date)}
            tags={ticket.tags}
            favorite={false}
            imgUrl={ticket.image ?? undefined}
          />
        ))}
      </View>
    </ScrollView>
  );
}
