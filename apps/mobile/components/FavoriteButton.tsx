import { toggleFavorite } from "@/lib/api";
import { useAppTheme } from "@/hooks/useAppTheme";
import useStore from "@/store/useStore";
import { Heart } from "lucide-react-native";
import React, { useState, useEffect } from "react";
import { TouchableOpacity } from "react-native";

interface FavoriteButtonProps {
  isFavorite: boolean;
  userId?: string;
  eventId?: string | number;
  size?: number;
  onPress?: () => void;
  customTheme?: any;
}

const FavoriteButton = ({
  isFavorite,
  userId,
  eventId,
  size = 24,
  onPress,
  customTheme,
}: FavoriteButtonProps) => {
  const theme = useAppTheme();
  const { updateEventFavorite } = useStore();
  const [favorite, setFavorite] = useState(isFavorite);

  useEffect(() => {
    setFavorite(isFavorite);
  }, [isFavorite]);
  const defaultColor = customTheme ? customTheme.color : theme.color;

  const handlePress = async () => {
    const next = !favorite;
    setFavorite(next);
    if (userId && eventId != null) {
      try {
        const result = await toggleFavorite(userId, eventId);
        setFavorite(result.isFavorite);
        updateEventFavorite(String(eventId), result.isFavorite);
      } catch {
        // revert on error
        setFavorite(!next);
      }
    }
    if (onPress) onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7} hitSlop={4}>
      <Heart
        color={defaultColor}
        fill={favorite ? defaultColor : "transparent"}
        size={size}
      />
    </TouchableOpacity>
  );
};

export default FavoriteButton;
