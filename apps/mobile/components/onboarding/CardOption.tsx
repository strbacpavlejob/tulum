import { Pressable, View } from "react-native";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/text";
import { Check } from "lucide-react-native";

export function CardOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "mb-3 flex-row items-center justify-between rounded-2xl border-[1.5px] px-5 py-4",
        selected
          ? "border-light-color bg-light-color025 dark:border-dark-color dark:bg-dark-color025"
          : "border-transparent bg-light-backgroundMuted dark:bg-dark-backgroundMuted",
      )}
    >
      <Text
        className={cn(
          "text-base",
          selected
            ? "font-semibold text-light-color dark:text-dark-color"
            : "font-normal text-light-colorStrong dark:text-dark-colorStrong",
        )}
      >
        {label}
      </Text>
      {selected && (
        <View className="h-6 w-6 items-center justify-center rounded-full bg-light-color dark:bg-dark-color">
          <Check size={13} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}
