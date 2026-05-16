import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { EventGuests } from "@/types/event";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Mars, UserPlus, Venus } from "lucide-react-native";
import React, { forwardRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, View } from "react-native";

interface GuestListModalProps {
  eventTitle: string;
  eventDate: string;
  guestList: EventGuests[];
  maxSpots: number;
  averageAge: number | null;
  females: number;
  males: number;
}

const GuestListModal = forwardRef<BottomSheetModal, GuestListModalProps>(
  (
    { eventTitle, eventDate, guestList, maxSpots, averageAge, females, males },
    ref,
  ) => {
    const theme = useAppTheme();
    const { t } = useTranslation();
    const snapPoints = useMemo(() => ["85%"], []);

    const goingCount = guestList.length;
    const freeSpots = Math.max(0, maxSpots - goingCount);
    const progressValue =
      maxSpots > 0 ? Math.min((goingCount / maxSpots) * 100, 100) : 0;

    const visibleGuests = guestList.slice(0, 6);
    const moreCount = Math.max(0, goingCount - visibleGuests.length);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          opacity={0.4}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          {...props}
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.background }}
        handleIndicatorStyle={{ backgroundColor: theme.gray5 }}
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: 20 }}>
          {/* Event info */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: theme.gray12,
              marginBottom: 4,
            }}
          >
            {eventTitle}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.gray6,
              marginBottom: 20,
            }}
          >
            {eventDate}
          </Text>

          <BottomSheetScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16, gap: 16 }}
          >
            {/* Capacity card */}
            <View
              className="rounded-2xl"
              style={{
                padding: 16,
                borderWidth: 1,
                borderColor: theme.gray3,
                backgroundColor: theme.backgroundStrong,
              }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: theme.gray12,
                  }}
                >
                  {t("freeSpaces")}
                </Text>
                <Text style={{ fontSize: 14, color: theme.gray6 }}>
                  {goingCount}/{maxSpots}
                </Text>
              </View>

              {/* Progress bar */}
              <View
                className="w-full rounded-full overflow-hidden"
                style={{ height: 8, backgroundColor: theme.gray3 }}
              >
                <View
                  style={{
                    width: `${progressValue}%`,
                    height: "100%",
                    backgroundColor: theme.color,
                    borderRadius: 999,
                  }}
                />
              </View>

              <Text style={{ fontSize: 12, color: theme.gray5, marginTop: 8 }}>
                {freeSpots > 0
                  ? t("spotsLeft", { count: freeSpots })
                  : t("eventIsFull")}
              </Text>
            </View>

            {/* Gender stats */}
            <View
              className="flex-row items-center justify-between rounded-xl"
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: theme.gray3,
                backgroundColor: theme.backgroundStrong,
              }}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className="flex-row items-center gap-1 rounded-full"
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    backgroundColor: "rgba(236, 72, 153, 0.1)",
                  }}
                >
                  <Venus size={16} color="#f472b6" />
                  <Text style={{ fontSize: 14, color: "#f472b6" }}>
                    {females}
                  </Text>
                </View>
                <View
                  className="flex-row items-center gap-1 rounded-full"
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                  }}
                >
                  <Mars size={16} color="#60a5fa" />
                  <Text style={{ fontSize: 14, color: "#60a5fa" }}>
                    {males}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 14, color: theme.gray6 }}>
                {t("avgAge")}{" "}
                <Text style={{ fontWeight: "500", color: theme.gray12 }}>
                  {averageAge ?? "—"}
                </Text>
              </Text>
            </View>

            {/* Guest list */}
            <View
              className="rounded-2xl"
              style={{
                padding: 16,
                borderWidth: 1,
                borderColor: theme.gray3,
                backgroundColor: theme.backgroundStrong,
              }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <Text
                  style={{
                    fontSize: 12,
                    color: theme.gray5,
                    textTransform: "uppercase",
                    letterSpacing: 2,
                  }}
                >
                  {t("guestList")}
                </Text>
                {moreCount > 0 && (
                  <Text style={{ fontSize: 12, color: theme.gray5 }}>
                    +{moreCount} more
                  </Text>
                )}
              </View>

              <View style={{ gap: 12 }}>
                {visibleGuests.map((guest, i) => {
                  const opacity =
                    i < 3 ? 1 : i === 3 ? 0.7 : i === 4 ? 0.4 : 0.2;

                  return (
                    <View
                      key={`${guest.name}-${i}`}
                      className="flex-row items-center gap-3 rounded-xl"
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        backgroundColor: theme.background,
                        opacity,
                      }}
                    >
                      <View
                        className="w-10 h-10 rounded-full overflow-hidden"
                        style={{
                          borderWidth: 1,
                          borderColor: theme.gray3,
                        }}
                      >
                        {guest.uri ? (
                          <Image
                            source={{ uri: guest.uri }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            className="w-full h-full items-center justify-center"
                            style={{ backgroundColor: theme.gray3 }}
                          />
                        )}
                      </View>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "500",
                          color: theme.gray12,
                        }}
                      >
                        {guest.name.split(" ")[0]}
                        {guest.age != null ? `, ${guest.age}` : ""}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </BottomSheetScrollView>

          {/* Attend button */}
          <View style={{ paddingBottom: 20 }}>
            <Pressable
              className="flex-row items-center justify-center gap-2 w-full py-4 rounded-full"
              style={{ backgroundColor: theme.color }}
              onPress={() => {}}
            >
              <Text
                style={{
                  color: theme.background,
                  fontWeight: "600",
                  fontSize: 18,
                }}
              >
                {t("attend")}
              </Text>
              <UserPlus size={20} color={theme.background} />
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

GuestListModal.displayName = "GuestListModal";
export default GuestListModal;
