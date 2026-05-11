import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { isSignedIn, isLoaded, userId } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isSignedIn) {
    console.log("User is signed in, redirecting to main app...userId:", userId);
    return <Redirect href="/(tabs)" />;
  }

  console.log("User is not signed in, redirecting to login...");
  return <Redirect href="/(auth)/sign-in" />;
}
