import { Text } from "@/components/ui/text";
import { MapPin } from "lucide-react-native";
import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import IndicatorIcon from "./IndicatorIcon";

interface MiniMapProps {
  latitude: number;
  longitude: number;
  address?: string;
  height?: number;
  markerTitle?: string;
}

const LATITUDE_DELTA = 0.1;
const LONGITUDE_DELTA = 0.1;

export const MiniMap = ({
  latitude,
  longitude,
  height = 150,
  address,
  markerTitle = "Location",
}: MiniMapProps) => {
  const mapRef = useRef<MapView>(null);

  const region = {
    latitude,
    longitude,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  };

  return (
    <View className="w-full gap-2">
      <View className="w-full rounded-2xl overflow-hidden" style={{ height }}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={region}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          showsUserLocation={false}
          pointerEvents="none"
        >
          <Marker coordinate={{ latitude, longitude }} title={markerTitle}>
            <IndicatorIcon isActive={true} icon={MapPin} size={24} />
          </Marker>
        </MapView>
      </View>
      <View className="flex-row p-2">
        <Text className="text-sm text-gray-500">{address}</Text>
      </View>
    </View>
  );
};
