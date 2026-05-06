import { Text } from "@/components/ui/text";
import { EventComment } from "@/types/event";
import { formatDistanceToNow } from "date-fns";
import React, { useState } from "react";
import { Image, Pressable, View } from "react-native";
import { Rating } from "./Rating";

type Props = {
  comment: EventComment;
};

export const Comment = ({ comment }: Props) => {
  const [isExpand, setIsExpand] = useState(false);

  return (
    <View className="w-full items-center justify-center bg-gray-100 rounded-lg">
      <Pressable
        className="w-full p-2 border border-gray-200 rounded-lg"
        onPress={() => setIsExpand((old) => !old)}
      >
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 shrink">
              <View className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                <Image
                  source={{ uri: comment.host.avatar }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
              <View className="gap-1 shrink">
                <Text className="font-bold">
                  {`${comment.host.firstName} ${comment.host.lastName}`}
                </Text>
                <Text className="text-xs text-gray-500">
                  {formatDistanceToNow(comment.date, { addSuffix: true })}
                </Text>
              </View>
            </View>
            <Rating rating={comment.rating} size={16} />
          </View>
          <Text className="text-sm" numberOfLines={isExpand ? undefined : 2}>
            {comment.text}
          </Text>
        </View>
      </Pressable>
    </View>
  );
};
