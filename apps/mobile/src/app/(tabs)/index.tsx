import ListingsMap from "@/components/listings-map/listings-map";
import { NearbyEventPrompt } from "@/components/nearby-event/nearby-event-prompt";
import { View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <ListingsMap />
      <NearbyEventPrompt />
    </View>
  );
}
