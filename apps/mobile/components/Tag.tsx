import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import React from "react";
import { View } from "react-native";

interface TagProps {
  title: string;
  size?: "ssm" | "sm" | "md" | "lg";
}

const sizeClasses = {
  ssm: "text-xs px-1.5 py-0.5 rounded-full",
  sm: "text-xs px-2.5 py-1 rounded-full",
  md: "text-sm px-3 py-1 rounded-full",
  lg: "text-base px-4 py-1.5 rounded-full",
};

export const Tag = ({ title, size = "sm" }: TagProps) => {
  const theme = useAppTheme();
  return (
    <View
      className={`rounded-full ${sizeClasses[size]}`}
      style={{ backgroundColor: theme.gray4 }}
    >
      <Text
        style={{
          fontSize:
            size === "ssm" ? 10 : size === "sm" ? 12 : size === "md" ? 14 : 16,
          color: theme.gray11,
        }}
      >
        {title}
      </Text>
    </View>
  );
};
