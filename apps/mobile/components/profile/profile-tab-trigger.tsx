import { TabsTrigger } from "@/components/ui/tabs";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface ProfileTabTriggerProps {
  value: string;
  label: string;
  active: boolean;
}

/** One of the profile screen's two tabs, underlined while it is open. */
export function ProfileTabTrigger({
  value,
  label,
  active,
}: ProfileTabTriggerProps) {
  return (
    <TabsTrigger
      value={value}
      className={`h-full flex-1 rounded-none ${active ? "border-b-2 border-b-light-color dark:border-b-dark-color" : ""}`}
    >
      <Text
        className={cn(
          "text-sm",
          active
            ? "font-semibold text-light-color dark:text-dark-color"
            : "font-normal text-light-colorMuted dark:text-dark-colorMuted",
        )}
      >
        {label}
      </Text>
    </TabsTrigger>
  );
}
