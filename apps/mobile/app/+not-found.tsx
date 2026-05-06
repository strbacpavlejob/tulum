import { Text } from "@/components/ui/text";
import { Link, Stack } from "expo-router";
import { Pressable, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="m-1 justify-center p-4">
        <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 8 }}>
          This screen does not exist.
        </Text>
        <Link href="/" asChild>
          <Pressable className="mt-3 py-3 px-6 bg-gray-200 rounded-lg items-center">
            <Text>Go to home screen!</Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}
