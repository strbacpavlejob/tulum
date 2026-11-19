import React from "react";
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";
import { Linking, Text, View } from "react-native";
import { CarTaxiFront, LocateFixed } from "lucide-react-native";
import { Button } from "@/components/ui/button";

type MatchesTaxiButtonProps = {
  eventId: string;
  venueLat: number;
  venueLng: number;
  bottomInset: number;
  onCheckLocation: () => void;
  userCoords: { lat: number; lng: number } | null;
  setUserCoords: React.Dispatch<
    React.SetStateAction<{ lat: number; lng: number } | null>
  >;
};

export default function MatchesTaxiButton({
  eventId,
  venueLat,
  venueLng,
  bottomInset,
  onCheckLocation,
  userCoords,
  setUserCoords,
}: MatchesTaxiButtonProps) {
  const { t } = useTranslation();

  return (
    <View
      className="flex-row gap-4 rounded-[14px]"
      style={{
        position: "absolute",
        bottom: bottomInset + 24,
        left: 16,
        right: 16,
        alignItems: "center",
        zIndex: 20,
        elevation: 20,
      }}
    >
      <Button
        onPress={async () => {
          let startLatNum = userCoords?.lat;
          let startLonNum = userCoords?.lng;

          if (startLatNum == null || startLonNum == null) {
            try {
              const { status } =
                await Location.requestForegroundPermissionsAsync();
              if (status === "granted") {
                const pos = await Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.Balanced,
                });
                startLatNum = pos.coords.latitude;
                startLonNum = pos.coords.longitude;
                setUserCoords({ lat: startLatNum, lng: startLonNum });
              } else {
                // Permission denied — don't open route.
                return;
              }
            } catch {
              return;
            }
          }

          const startLat = (startLatNum ?? venueLat).toFixed(6);
          const startLon = (startLonNum ?? venueLng).toFixed(6);
          const endLat = venueLat.toFixed(6);
          const endLon = venueLng.toFixed(6);

          const url =
            `https://3.redirect.appmetrica.yandex.com/route` +
            `?start-lat=${startLat}` +
            `&start-lon=${startLon}` +
            `&end-lat=${endLat}` +
            `&end-lon=${endLon}` +
            `&ref=${encodeURIComponent(`tulum_${eventId}`)}` +
            `&appmetrica_tracking_id=25395763362139037`;

          try {
            await Linking.openURL(url);
          } catch (err) {
            console.warn("Failed to open Yandex Go link", err);
          }
        }}
        className="h-auto w-full flex-row items-center justify-center gap-2 rounded-[14px] bg-yellow-500 px-4 py-[14px]"
        style={{ flex: 1 }}
      >
        <CarTaxiFront size={20} style={{ marginBottom: 2 }} />
        <Text style={{ fontWeight: "700", fontSize: 16 }}>
          {t("callYandexTaxi")}
        </Text>
      </Button>

      <Button
        variant="filled"
        onPress={onCheckLocation}
        className="h-auto rounded-[14px] px-4 py-[14px]"
        accessibilityLabel={t("matchesCheckLocation")}
      >
        <LocateFixed size={32} />
      </Button>
    </View>
  );
}
