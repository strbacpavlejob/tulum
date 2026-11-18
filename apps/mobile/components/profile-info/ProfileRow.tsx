import React from "react";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react-native";

export function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

export function formatList(arr?: string[]) {
  return arr && arr.length > 0 ? arr.map(capitalize).join(", ") : undefined;
}

export function ProfileRow({
  icon: Icon,
  label,
  value,
  onPress,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center justify-between py-3"
    >
      <View className="flex-row items-center gap-3 flex-1">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-light-backgroundMuted dark:bg-dark-backgroundMuted">
          <Icon size={16} color={theme.color} />
        </View>
        <View className="flex-1">
          <Text className="text-xs text-light-colorMuted dark:text-dark-colorMuted">
            {label}
          </Text>
          <Text
            className={cn(
              "mt-0.5 text-[15px]",
              value
                ? "text-light-colorStrong dark:text-dark-colorStrong"
                : "text-light-colorMuted dark:text-dark-colorMuted",
            )}
          >
            {value ?? "—"}
          </Text>
        </View>
      </View>
      {onPress && <ChevronRight size={16} color={theme.gray5} />}
    </Pressable>
  );
}
