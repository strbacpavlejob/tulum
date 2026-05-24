import { toggleFavorite } from "@/lib/api";
import { useAppTheme } from "@/hooks/useAppTheme";
import useStore from "@/store/useStore";
import { useAuth } from "@clerk/expo";
import { Heart } from "lucide-react-native";
import React, { useState, useEffect } from "react";
import { TouchableOpacity } from "react-native";

interface FavoriteButtonProps {
  isFavorite: boolean;
  eventId?: string | number;
  size?: number;
  onPress?: () => void;
  customTheme?: any;
}

const FavoriteButton = ({
  isFavorite,
  eventId,
  size = 24,
  onPress,
  customTheme,
}: FavoriteButtonProps) => {
  const theme = useAppTheme();
  const { updateEventFavorite } = useStore();
  const { getToken } = useAuth();
  const [favorite, setFavorite] = useState(isFavorite);

  useEffect(() => {
    setFavorite(isFavorite);
  }, [isFavorite]);
  const defaultColor = customTheme ? customTheme.color : theme.color;

  const handlePress = async () => {
    const next = !favorite;
    setFavorite(next);
    if (eventId != null) {
      try {
        const token = await getToken();
        if (!token) {
          setFavorite(!next);
          return;
        }
        const result = await toggleFavorite(token, eventId);
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
