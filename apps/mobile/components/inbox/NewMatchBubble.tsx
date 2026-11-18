import { NewMatch } from "@/types/chat";
import {
  MATCH_AVATAR_SIZE,
  MATCH_RING_SIZE,
  isChatExpired,
} from "./inboxModel";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { TimerRing } from "./TimerRing";
import { Text } from "@/components/ui/text";

export function NewMatchBubble({
  match,
  textColor,
  onPress,
}: {
  match: NewMatch;
  textColor: string;
  onPress: () => void;
}) {
  const avatarMargin = (MATCH_RING_SIZE - MATCH_AVATAR_SIZE) / 2;
  // Dimmed like an expired Messages row; the inbox refuses to open it.
  const isExpired = isChatExpired(match.expiresAt);

  return (
    <Pressable
      onPress={onPress}
      style={{
        alignItems: "center",
        marginRight: 20,
        width: MATCH_RING_SIZE,
        opacity: isExpired ? 0.5 : 1,
      }}
    >
      <View style={{ width: MATCH_RING_SIZE, height: MATCH_RING_SIZE }}>
        <Image
          source={{ uri: match.photo }}
          style={{
            width: MATCH_AVATAR_SIZE,
            height: MATCH_AVATAR_SIZE,
            borderRadius: MATCH_AVATAR_SIZE / 2,
            margin: avatarMargin,
          }}
          contentFit="cover"
          cachePolicy="disk"
        />
        <TimerRing expiresAt={match.expiresAt} size={MATCH_RING_SIZE} />
      </View>
      <Text
        style={{ fontSize: 12, marginTop: 5, color: textColor }}
        numberOfLines={1}
      >
        {match.name}
      </Text>
    </Pressable>
  );
}
