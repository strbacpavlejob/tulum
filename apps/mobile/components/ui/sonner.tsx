import { useAppTheme } from "@/hooks/useAppTheme";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react-native";
import { Toaster as Sonner, type ToasterProps } from "sonner-native";

const ICON_SIZE = 16;
// On native, above AlertDialog's z-50 backdrop: a failed action keeps its dialog
// open. Web's dialog is portaled to <body>, so this can't lift toasts above it.
const POSITIONER_STYLE = { zIndex: 100 };

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useAppTheme();

  const iconColor = theme.colorStrong;

  return (
    <Sonner
      positionerStyle={POSITIONER_STYLE}
      icons={{
        success: <CircleCheckIcon size={ICON_SIZE} color={"green"} />,
        info: <InfoIcon size={ICON_SIZE} color={"yellow"} />,
        warning: <TriangleAlertIcon size={ICON_SIZE} color={"orange"} />,
        error: <OctagonXIcon size={ICON_SIZE} color={theme.destructive} />,
        loading: <Loader2Icon size={ICON_SIZE} color={iconColor} />,
      }}
      toastOptions={{
        style: {
          backgroundColor: theme.background,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: 12,
        },
        titleStyle: {
          color: theme.colorStrong,
          fontSize: 14,
          fontWeight: "600",
        },
        descriptionStyle: {
          color: theme.colorMuted,
          fontSize: 13,
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
