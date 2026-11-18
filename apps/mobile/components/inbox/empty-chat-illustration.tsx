import { useWindowDimensions } from "react-native";
import { Image } from "expo-image";

export const emptyChatIllustration = require("@/assets/images/tulum-empty-chat.webp");

export function EmptyChatIllustration() {
  const { width, height } = useWindowDimensions();

  return (
    <Image
      source={emptyChatIllustration}
      style={{
        width: width * 0.8,
        height: height * 0.42,
        alignSelf: "center",
      }}
      contentFit="contain"
      accessibilityLabel="Tulum capybara relaxing and waiting for messages"
    />
  );
}
