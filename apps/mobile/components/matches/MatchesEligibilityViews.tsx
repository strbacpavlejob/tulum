import EmptyIndicator from "@/components/EmptyIndicator";
import HandsIcon from "@/components/illustrations/Hands";
import LoadingIndicator from "@/components/loading-indicator";
import { MatchLocationMap } from "@/components/MatchLocationMap";
import MatchesLocationGateCard from "@/components/MatchesLocationGateCard";
import MatchesTaxiButton from "@/components/MatchesTaxiButton";
import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
const matchesLockIllustration = require("@/assets/images/tulum-matches-lock.webp");

function MatchesLockIllustration() {
  const { width, height } = useWindowDimensions();

  return (
    <Image
      source={matchesLockIllustration}
      style={{
        width: width * 0.8,
        height: height * 0.42,
        alignSelf: "center",
      }}
      contentFit="contain"
      accessibilityLabel="Tulum capybara waiting for matching to unlock"
    />
  );
}

type UserCoords = {
  lat: number;
  lng: number;
} | null;

type LiveTicket = {
  event_id: string;
  venue_lat: number;
  venue_lng: number;
};

type LoadingStateViewProps = {
  centered?: boolean;
};

export function LoadingStateView({ centered = true }: LoadingStateViewProps) {
  return (
    <View
      className={`flex-1 bg-light-background dark:bg-dark-background ${centered ? "items-center justify-center" : ""}`}
    >
      <LoadingIndicator />
    </View>
  );
}

type LockedStateViewProps = {
  topInset: number;
  bottomInset: number;
  title: string;
  subtitle: string;
  buttonText: string;
  onUnlock: () => void;
};

export function LockedStateView({
  topInset,
  bottomInset,
  title,
  subtitle,
  buttonText,
  onUnlock,
}: LockedStateViewProps) {
  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <SafeAreaView className="flex-1">
        <View
          style={{
            flex: 1,
            paddingTop: topInset,
            paddingBottom: bottomInset,
            paddingHorizontal: 24,
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <EmptyIndicator
            title={title}
            subtitle={subtitle}
            picture={() => <MatchesLockIllustration />}
            onPress={onUnlock}
            buttonText={buttonText}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
type LocationRequiredViewProps = {
  liveTicket: LiveTicket;
  userCoords: UserCoords;
  setUserCoords: (coords: UserCoords) => void;
  topInset: number;
  bottomInset: number;
  onCheckLocation: () => void;
  onBypass: () => void;
};

export function LocationRequiredView({
  liveTicket,
  userCoords,
  setUserCoords,
  topInset,
  bottomInset,
  onCheckLocation,
  onBypass,
}: LocationRequiredViewProps) {
  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <MatchLocationMap
        venueLat={liveTicket.venue_lat}
        venueLng={liveTicket.venue_lng}
        userLat={userCoords?.lat ?? liveTicket.venue_lat + 0.003}
        userLng={userCoords?.lng ?? liveTicket.venue_lng + 0.003}
      />

      <View
        pointerEvents="box-none"
        style={[
          StyleSheet.absoluteFillObject,
          { zIndex: 2000, elevation: 2000 },
        ]}
      >
        <MatchesLocationGateCard topInset={topInset} onBypass={onBypass} />

        <MatchesTaxiButton
          eventId={liveTicket.event_id}
          venueLat={liveTicket.venue_lat}
          venueLng={liveTicket.venue_lng}
          bottomInset={bottomInset}
          onCheckLocation={onCheckLocation}
          userCoords={userCoords}
          setUserCoords={setUserCoords}
        />
      </View>
    </View>
  );
}

type EmptyMatchesViewProps = {
  topInset: number;
  bottomInset: number;
  title: string;
  subtitle: string;
};

export function EmptyMatchesView({
  topInset,
  bottomInset,
  title,
  subtitle,
}: EmptyMatchesViewProps) {
  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <SafeAreaView className="flex-1">
        <View
          style={{
            flex: 1,
            paddingTop: topInset,
            paddingBottom: bottomInset,
            paddingHorizontal: 16,
          }}
        >
          <View className="flex-1 justify-center items-center px-6">
            <EmptyIndicator
              picture={HandsIcon}
              title={title}
              subtitle={subtitle}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
