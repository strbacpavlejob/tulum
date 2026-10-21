import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { UserMinus, UserPlus } from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";

type AttendButtonProps = {
  isAttending: boolean;
  onPress: () => void;
};

/** The event's RSVP button: Attend, or Cancel attendance once you're going. */
export default function AttendButton({
  isAttending,
  onPress,
}: AttendButtonProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <Button
      variant={isAttending ? "destructive" : "default"}
      size="lg"
      className="w-full h-14 rounded-full"
      style={{
        backgroundColor: isAttending ? theme.destructive : theme.color,
        borderRadius: 999,
      }}
      onPress={onPress}
    >
      <Text
        style={{
          color: "#fff",
          fontWeight: "600",
          fontSize: 18,
        }}
      >
        {isAttending ? t("cancelAttendance") : t("attend")}
      </Text>
      {isAttending ? (
        <UserMinus size={20} color="#fff" />
      ) : (
        <UserPlus size={20} color="#fff" />
      )}
    </Button>
  );
}
