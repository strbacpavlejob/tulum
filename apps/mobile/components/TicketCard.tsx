import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Heart } from "lucide-react-native";
import { Image, View } from "react-native";
import IndicatorIcon from "./IndicatorIcon";
import { InfoSection } from "./InforSection";
import Tags from "./Tags";

interface TicketProps {
  id: string;
  title: string;
  description: string;
  date: Date;
  tags: string[];
  favorite: boolean;
  imgUrl?: string;
}

export const TicketCard = ({
  id,
  title,
  date,
  description,
  tags,
  favorite,
  imgUrl,
}: TicketProps) => {
  const theme = useAppTheme();
  return (
    <View
      key={id}
      className="rounded-xl overflow-hidden bg-white shadow-sm"
      style={{ elevation: 3 }}
    >
      {/* Heart icon in the top-right corner if favorite */}
      <View className="absolute top-2.5 right-2.5 z-10">
        <IndicatorIcon
          icon={Heart}
          isActive={favorite}
          customTheme={{ color: theme.color }}
        />
      </View>

      <View className="flex-row gap-2">
        {/* Image section */}
        <View className="w-1/3 bg-gray-200 rounded-xl overflow-hidden">
          {imgUrl ? (
            <Image
              source={{ uri: imgUrl }}
              style={{
                width: "100%",
                height: "100%",
              }}
              resizeMode="cover"
            />
          ) : (
            <Text className="text-gray-400 text-lg">Imgzz</Text>
          )}
        </View>
        {/* Ticket details */}
        <View className="gap-1 p-2 flex-1">
          <Text className="font-bold text-lg">{title}</Text>
          <Text className="text-gray-500 text-sm">
            {description.length > 20
              ? description.slice(0, 20) + "..."
              : description}
          </Text>
          <View className="flex-row items-center justify-between mt-1">
            <InfoSection date={date} capacity={100} />
          </View>
          <Tags tags={tags} />
        </View>
      </View>
    </View>
  );
};
