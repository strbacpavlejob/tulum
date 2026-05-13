import { Text } from "@/components/ui/text";
import React from "react";
import { Image, View } from "react-native";

interface AvatarListProps {
  avatars: { name: string; uri: string | null }[];
}

export const AvatarList = ({ avatars }: AvatarListProps) => {
  const maxVisible = 3;
  const visibleAvatars = avatars.slice(0, maxVisible);
  const extraCount = avatars.length - maxVisible;

  return (
    <View className="flex-row">
      {visibleAvatars.map((user, idx) => (
        <View
          key={user.name}
          className="w-10 h-10 rounded-full border-2 border-white overflow-hidden"
          style={{ marginLeft: idx === 0 ? 0 : -20 }}
        >
          <Image
            source={{ uri: user.uri }}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>
      ))}
      {extraCount > 0 && (
        <View
          className="w-10 h-10 rounded-full border-2 border-gray-400 items-center justify-center bg-gray-200 overflow-hidden"
          style={{ marginLeft: -20 }}
        >
          <Text className="text-gray-700">{`+${extraCount}`}</Text>
        </View>
      )}
    </View>
  );
};
