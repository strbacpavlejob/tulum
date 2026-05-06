import { Text } from "@/components/ui/text";
import React from "react";
import { View } from "react-native";

interface TagProps {
  title: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-xs px-2.5 py-1 rounded-full",
  md: "text-sm px-3 py-1 rounded-full",
  lg: "text-base px-4 py-1.5 rounded-full",
};

export const Tag = ({ title, size = "sm" }: TagProps) => {
  return (
    <View
      className={`rounded-full ${sizeClasses[size]}`}
      style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
    >
      <Text
        style={{
          fontSize: size === "sm" ? 12 : size === "md" ? 14 : 16,
          color: "rgba(255,255,255,0.9)",
        }}
      >
        {title}
      </Text>
    </View>
  );
};
