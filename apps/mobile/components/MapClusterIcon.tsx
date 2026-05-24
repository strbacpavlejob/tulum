import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import React from "react";
import { View } from "react-native";

interface MapClusterIconProps {
  count: number;
}

const MapClusterIcon = ({ count }: MapClusterIconProps) => {
  const theme = useAppTheme();

  let diameter = 40;
  let opacity = 0.35;

  if (count >= 750) {
    diameter = 80;
    opacity = 1;
  } else if (count >= 100) {
    diameter = 64;
    opacity = 0.9;
  } else if (count >= 50) {
    diameter = 56;
    opacity = 0.75;
  } else if (count >= 25) {
    diameter = 48;
    opacity = 0.65;
  } else if (count >= 10) {
    diameter = 44;
    opacity = 0.55;
  } else if (count >= 5) {
    diameter = 40;
    opacity = 0.45;
  }

  return (
    <View
      style={{
        width: diameter,
        height: diameter,
        borderRadius: diameter / 2,
        backgroundColor: theme.color,
        borderWidth: 2,
        borderColor: theme.background,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      }}
    >
      <Text
        style={{
          color: theme.background,
          fontWeight: "bold",
          fontSize: diameter * 0.32,
          textAlign: "center",
        }}
      >
        {count}
      </Text>
    </View>
  );
};

export default MapClusterIcon;
