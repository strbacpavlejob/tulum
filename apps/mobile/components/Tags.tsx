import React from "react";
import { View } from "react-native";
import { Tag } from "./Tag";

interface TagsProps {
  tags: string[];
  size?: "sm" | "md" | "lg";
}

const Tags = ({ tags, size }: TagsProps) => {
  return (
    <View className="flex-row gap-2 mt-2 flex-nowrap">
      {tags.map((tag, index) => (
        <Tag key={tag + index} title={tag} size={size} />
      ))}
    </View>
  );
};

export default Tags;
