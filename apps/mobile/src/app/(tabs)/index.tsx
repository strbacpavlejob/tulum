import ListingsMap from "@/components/listings-map/listings-map";
import { View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <ListingsMap />
    </View>
  );
}
