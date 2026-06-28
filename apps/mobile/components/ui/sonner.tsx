import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react-native";
import { useColorScheme } from "react-native";
import { Toaster as Sonner, type ToasterProps } from "sonner-native";

const ICON_SIZE = 16;

const Toaster = ({ ...props }: ToasterProps) => {
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#FAFAFA" : "#09090B";

  return (
    <Sonner
      icons={{
        success: <CircleCheckIcon size={ICON_SIZE} color={iconColor} />,
        info: <InfoIcon size={ICON_SIZE} color={iconColor} />,
        warning: <TriangleAlertIcon size={ICON_SIZE} color={iconColor} />,
        error: <OctagonXIcon size={ICON_SIZE} color={iconColor} />,
        loading: <Loader2Icon size={ICON_SIZE} color={iconColor} />,
      }}
      toastOptions={{
        style: {
          backgroundColor: colorScheme === "dark" ? "#18181B" : "#FFFFFF",
          borderColor: colorScheme === "dark" ? "#27272A" : "#E4E4E7",
          borderWidth: 1,
          borderRadius: 12,
        },
        titleStyle: {
          color: colorScheme === "dark" ? "#FAFAFA" : "#09090B",
          fontSize: 14,
          fontWeight: "600",
        },
        descriptionStyle: {
          color: colorScheme === "dark" ? "#A1A1AA" : "#71717A",
          fontSize: 13,
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
