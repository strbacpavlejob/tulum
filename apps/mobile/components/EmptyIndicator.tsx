import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import React from "react";
import { View } from "react-native";

interface EmptyIndicatorProps {
  title: string;
  subtitle: string;
  picture: React.ComponentType<{
    width: string;
    color: string;
    [key: string]: any;
  }>;
}

const EmptyIndicator: React.FC<EmptyIndicatorProps> = ({
  title,
  subtitle,
  picture: Picture,
}) => {
  const theme = useAppTheme();
  return (
    <View className="items-center justify-center p-4 flex-1 w-full gap-2">
      <Picture width="100%" height={"50%"} color={theme.color} />
      <Text className="text-lg" style={{ color: theme.color050 }}>
        {title}
      </Text>
      <Text style={{ color: theme.color075 }}>{subtitle}</Text>
    </View>
  );
};

export default EmptyIndicator;
