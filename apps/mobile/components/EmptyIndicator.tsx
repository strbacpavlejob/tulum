import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import React from "react";
import { View } from "react-native";
import { Button } from "./ui/button";

interface EmptyIndicatorProps {
  title: string;
  subtitle: string;
  picture: React.ComponentType<{
    width: string;
    color: string;
    [key: string]: any;
  }>;
  onPress?: () => void;
  buttonText?: string;
}

const EmptyIndicator: React.FC<EmptyIndicatorProps> = ({
  title,
  subtitle,
  picture: Picture,
  onPress,
  buttonText = "Retry",
}) => {
  const theme = useAppTheme();
  return (
    <View className="items-center justify-center p-4 flex-1 w-full gap-2">
      <Picture width="100%" height={"50%"} color={theme.color} />
      <Text className="text-center text-xl font-bold text-light-colorMuted dark:text-dark-colorMuted">
        {title}
      </Text>
      <Text className="text-center text-base font-light text-light-colorMuted dark:text-dark-colorMuted">
        {subtitle}
      </Text>
      {onPress && (
        <Button variant="filled" onPress={onPress} className="mt-4 text-lg">
          <Text>{buttonText}</Text>
        </Button>
      )}
    </View>
  );
};

export default EmptyIndicator;
