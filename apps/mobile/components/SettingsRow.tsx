import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { ChevronRight } from "lucide-react-native";
import React from "react";
import { Pressable, View, type PressableProps } from "react-native";

type SettingsRowProps = {
  icon: React.ComponentType<{
    size?: number;
    color?: string;
  }>;

  title: string;
  subtitle?: string;
  onPress?: PressableProps["onPress"];
  right?: React.ReactNode;
  disabled?: boolean;
  hidden?: boolean;
};

export default function SettingsRow({
  icon: Icon,
  title,
  subtitle,
  onPress,
  right,
  disabled = false,
  hidden = false,
}: SettingsRowProps) {
  const theme = useAppTheme();

  if (hidden) {
    return null;
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      className="flex-row items-center justify-between py-[14px]"
      style={({ pressed }) => ({
        opacity: disabled ? 0.5 : pressed && onPress ? 0.7 : 1,
      })}
    >
      <View className="flex-1 flex-row items-center gap-[14px]">
        <Icon size={20} color={theme.color} />

        <View className="flex-1">
          <Text
            style={{
              fontSize: 16,
              color: theme.colorStrong,
            }}
          >
            {title}
          </Text>

          {subtitle ? (
            <Text
              style={{
                marginTop: 1,
                fontSize: 13,
                color: theme.colorMuted,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {right !== undefined ? (
        right
      ) : onPress ? (
        <ChevronRight size={18} color={theme.gray5} />
      ) : null}
    </Pressable>
  );
}
