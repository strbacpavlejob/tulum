import { useAppTheme } from "@/hooks/useAppTheme";
import { Heart } from "lucide-react-native";
import React, { useEffect, useState } from "react";

type IconComponent = React.ComponentType<React.ComponentProps<typeof Heart>>;

interface IndicatorIconProps {
  icon: IconComponent;
  isActive?: boolean;
  size?: number;
  onPress?: () => void;
  customTheme?: {
    color: string;
  };
}

const IndicatorIcon = ({
  isActive = false,
  onPress,
  size = 24,
  icon: Icon,
  customTheme,
}: IndicatorIconProps) => {
  const [active, setActive] = useState(isActive);
  const theme = useAppTheme();
  const defaultColor = customTheme ? customTheme.color : theme.color;

  useEffect(() => {
    setActive(isActive);
  }, [isActive]);

  return (
    <Icon
      color={defaultColor}
      fill={active ? defaultColor : "transparent"}
      size={size}
      onPress={() => {
        setActive(!active);
        if (onPress) onPress();
      }}
    />
  );
};

export default IndicatorIcon;
