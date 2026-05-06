import { useAppTheme } from "@/hooks/useAppTheme";
import { Heart } from "lucide-react-native";
import React, { useState } from "react";

interface FavoriteButtonProps {
  isFavorite: boolean;
  onPress?: () => void;
  customTheme?: any;
}

const FavoriteButton = ({
  isFavorite,
  onPress,
  customTheme,
}: FavoriteButtonProps) => {
  const theme = useAppTheme();
  const [favorite, setFavorite] = useState(isFavorite);
  const defaultColor = customTheme ? customTheme.color : theme.color;
  return (
    <Heart
      color={defaultColor}
      fill={favorite ? defaultColor : "transparent"}
      size={24}
      onPress={() => {
        setFavorite(!favorite);
        if (onPress) onPress();
      }}
    />
  );
};

export default FavoriteButton;
