import { Platform, View } from "react-native";

export default function ClerkCaptcha() {
  if (Platform.OS !== "web") return null;

  return <View nativeID="clerk-captcha" style={{ marginTop: 12 }} />;
}
