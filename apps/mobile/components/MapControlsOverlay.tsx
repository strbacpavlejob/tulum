import { useAppTheme } from "@/hooks/useAppTheme";
import { Locate, Minus, Plus } from "lucide-react-native";
import React from "react";
import { Pressable, View } from "react-native";

interface MapControlsProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onLocate?: () => void;
  showZoom?: boolean;
  showLocate?: boolean;
}

const MapControlsOverlay = ({
  onZoomIn,
  onZoomOut,
  onLocate,
  showZoom = true,
  showLocate = true,
}: MapControlsProps) => {
  const theme = useAppTheme();

  const buttonStyle = {
    backgroundColor: theme.background075,
    borderColor: theme.gray4,
  };

  return (
    <View className="absolute bottom-[200px] right-4 gap-2 items-center">
      {showZoom && (
        <View
          style={{ borderColor: theme.gray4 }}
          className="rounded-xl border overflow-hidden"
        >
          <Pressable
            style={buttonStyle}
            className="w-11 h-11 items-center justify-center border rounded-tl-xl rounded-tr-xl border-b-0"
            onPress={onZoomIn}
          >
            <Plus size={18} color={theme.gray12} />
          </Pressable>
          <View
            style={{ backgroundColor: theme.gray4 }}
            className="h-px w-full"
          />
          <Pressable
            style={buttonStyle}
            className="w-11 h-11 items-center justify-center border rounded-bl-xl rounded-br-xl border-t-0"
            onPress={onZoomOut}
          >
            <Minus size={18} color={theme.gray12} />
          </Pressable>
        </View>
      )}

      {showLocate && (
        <Pressable
          style={buttonStyle}
          className="w-11 h-11 border items-center justify-center rounded-[22px]"
          onPress={onLocate}
        >
          <Locate size={18} color={theme.color} />
        </Pressable>
      )}
    </View>
  );
};

export default MapControlsOverlay;
