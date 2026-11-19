import { Text } from "@/components/ui/text";
import React from "react";
import { View } from "react-native";

interface TagProps {
  title: string;
  size?: "ssm" | "sm" | "md" | "lg";
}

const sizeClasses = {
  ssm: "px-1.5 py-0.5",
  sm: "px-2.5 py-1",
  md: "px-3 py-1",
  lg: "px-4 py-1.5",
};

const textSizeClasses = {
  ssm: "text-[10px]",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export const Tag = ({ title, size = "sm" }: TagProps) => {
  return (
    <View
      className={`rounded-full bg-light-gray4 dark:bg-dark-gray4 ${sizeClasses[size]}`}
    >
      <Text
        className={`text-light-gray11 dark:text-dark-gray11 ${textSizeClasses[size]}`}
      >
        {title}
      </Text>
    </View>
  );
};
