import { Star } from "lucide-react-native";
import React, { useState } from "react";
import { View } from "react-native";

type Props = {
  rating: number;
  size?: number;
  isInteractive?: boolean;
};

export const Rating = ({ rating, size = 24, isInteractive = false }: Props) => {
  const [currentRating, setCurrentRating] = useState(rating);

  const handleRatingChange = (newRating: number) => {
    if (isInteractive) setCurrentRating(newRating);
  };

  return (
    <View className="flex-row items-center gap-2">
      {Array.from({ length: 5 }, (_, i) => i + 1).map((index) => (
        <Star
          key={index}
          size={size}
          color={isInteractive ? "#7c3aed" : "#6b7280"}
          fill={
            index <= currentRating
              ? isInteractive
                ? "#7c3aed"
                : "#6b7280"
              : "transparent"
          }
          onPress={isInteractive ? () => handleRatingChange(index) : undefined}
        />
      ))}
    </View>
  );
};
