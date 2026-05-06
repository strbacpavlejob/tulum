import EmptyIndicator from "@/components/EmptyIndicator";
import MapIcon from "@/components/illustrations/Map";
import { TicketCard } from "@/components/TicketCard";
import { useAppTheme } from "@/hooks/useAppTheme";
import useStore from "@/store/useStore";
import React from "react";
import { ScrollView, View } from "react-native";

export default function TicketsScreen() {
  const { tickets } = useStore();
  const theme = useAppTheme();

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
            price={ticket.price}
            date={new Date(ticket.date)}
            tags={ticket.tags}
            favorite={ticket.isFavorite}
            imgUrl={ticket.image}
          />
        ))}
      </View>
    </ScrollView>
  );
}
