import useStore from "@/store/useStore";
import { Redirect, Stack } from "expo-router";

export default function AuthLayout() {
  const { user } = useStore();
  if (user) return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false, animation: "fade" }} />;
}
