import * as Haptics from "expo-haptics";
import { Heart, Star, X } from "lucide-react-native";
import React from "react";
import { Platform, TouchableOpacity, View } from "react-native";

const shadowStyle = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
};

interface ActionButtonsProps {
  onPass: () => void;
  onLike: () => void;
  onSuperLike: () => void;
  onRewind: () => void;
}

export default function ActionButtons({
  onPass,
  onLike,
  onSuperLike,
  onRewind,
}: ActionButtonsProps) {
  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePress = (action: () => void) => {
    triggerHaptic();
    action();
  };

  return (
    <View className="flex-row justify-center items-center px-5 py-5 gap-5">
      {/* <TouchableOpacity
        className="w-11 h-11 rounded-full justify-center items-center bg-white"
        style={shadowStyle}
        onPress={() => handlePress(onRewind)}
        activeOpacity={0.8}
      >
        <RotateCcw size={24} color="#FFC107" />
      </TouchableOpacity> */}

      <TouchableOpacity
        className="w-[60px] h-[60px] rounded-full justify-center bg-white/10 items-center"
        style={shadowStyle}
        onPress={() => handlePress(onPass)}
        activeOpacity={0.8}
      >
        <X size={30} color="#FF4458" />
      </TouchableOpacity>

      <TouchableOpacity
        className="w-14 h-14 rounded-full justify-center items-center bg-white/10 p-0 overflow-hidden"
        style={shadowStyle}
        onPress={() => handlePress(onSuperLike)}
        activeOpacity={0.8}
      >
        <Star size={24} color="#29B6F6" fill="#29B6F6" />
      </TouchableOpacity>

      <TouchableOpacity
        className="w-[60px] h-[60px] rounded-full justify-center items-center bg-white/10 "
        style={shadowStyle}
        onPress={() => handlePress(onLike)}
        activeOpacity={0.8}
      >
        <Heart size={30} color="#4ECDC4" fill="#4ECDC4" />
      </TouchableOpacity>

      {/* <TouchableOpacity
        className="w-11 h-11 rounded-full justify-center items-center bg-white p-0 overflow-hidden"
        style={shadowStyle}
        onPress={() => handlePress(() => {})}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["#AB47BC", "#8E24AA"]}
          style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }}
        >
          <View className="w-4 h-5 justify-center items-center">
            <View style={{ width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 4, borderBottomWidth: 12, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#fff", transform: [{ rotate: "15deg" }] }} />
          </View>
        </LinearGradient>
      </TouchableOpacity> */}
    </View>
  );
}
