import AttendButton from "@/components/AttendButton";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { EventGuests } from "@/types/event";
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetFooter,
  BottomSheetModal,
  type BottomSheetFooterProps,
} from "@gorhom/bottom-sheet";
import { Mars, Venus } from "lucide-react-native";
import React, { forwardRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";
import { View } from "react-native";

interface GuestListModalProps {
  eventTitle: string;
  eventDate: string;
  guestList: EventGuests[];
  maxSpots: number;
  averageAge: number | null;
  females: number;
  males: number;
  isAttending: boolean;
  onAttend: () => void;
}

/** Room under the list for the pinned Attend button (88 px) and a 16 px gap */
const FOOTER_SPACE = 104;

// The guest list card is drawn in pieces (the top with its heading, each
// guest, the gaps between them, the bottom) so that the guests can be a
// virtualized list: a big event doesn't render every row at once.
const CARD_SIDES =
  "border-x border-light-gray3 bg-light-backgroundStrong dark:border-dark-gray3 dark:bg-dark-backgroundStrong";

function GuestGap() {
  return <View className={`h-3 ${CARD_SIDES}`} />;
}

const GuestListModal = forwardRef<BottomSheetModal, GuestListModalProps>(
  (
    {
      eventTitle,
      eventDate,
      guestList,
      maxSpots,
      averageAge,
      females,
      males,
      isAttending,
      onAttend,
    },
    ref,
  ) => {
    const theme = useAppTheme();
    const { t } = useTranslation();
    const snapPoints = useMemo(() => ["85%"], []);

    const goingCount = guestList.length;
    const freeSpots = Math.max(0, maxSpots - goingCount);
    const progressValue =
      maxSpots > 0 ? Math.min((goingCount / maxSpots) * 100, 100) : 0;

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

    // Pinned to the bottom of the sheet, so it stays on screen while the list
    // scrolls. It is the same button as the one on the event screen.
    const renderFooter = useCallback(
      (props: BottomSheetFooterProps) => (
        <BottomSheetFooter {...props}>
          <View className="bg-light-background px-5 pb-5 pt-3 dark:bg-dark-background">
            <AttendButton isAttending={isAttending} onPress={onAttend} />
          </View>
        </BottomSheetFooter>
      ),
      [isAttending, onAttend],
    );

    const renderGuest = useCallback(
      ({ item: guest }: { item: EventGuests }) => (
        <View className={`px-4 ${CARD_SIDES}`}>
          <View className="flex-row items-center gap-3 rounded-xl bg-light-background px-3 py-2 dark:bg-dark-background">
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
                  contentFit="cover"
                  cachePolicy="disk"
                />
              ) : (
                <View className="h-full w-full items-center justify-center bg-light-gray3 dark:bg-dark-gray3" />
              )}
            </View>
            <Text className="text-sm font-medium text-light-gray12 dark:text-dark-gray12">
              {guest.name.split(" ")[0]}
              {guest.age != null ? `, ${guest.age}` : ""}
            </Text>
          </View>
        </View>
      ),
      [theme.gray3],
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        // One fixed height. Dynamic sizing would add a second, taller snap
        // point, and the sheet keeps its list from scrolling until it is at
        // the highest one.
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.background }}
        handleIndicatorStyle={{ backgroundColor: theme.gray5 }}
        footerComponent={renderFooter}
      >
        {/* Event info */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text className="mb-1 text-[20px] font-bold text-light-gray12 dark:text-dark-gray12">
            {eventTitle}
          </Text>
          <Text className="mb-5 text-sm text-light-gray6 dark:text-dark-gray6">
            {eventDate}
          </Text>
        </View>

        <BottomSheetFlatList
          data={guestList}
          keyExtractor={(guest, i) => `${guest.name}-${i}`}
          renderItem={renderGuest}
          ItemSeparatorComponent={GuestGap}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: FOOTER_SPACE,
          }}
          ListHeaderComponent={
            <View style={{ gap: 16 }}>
              {/* Capacity card */}
              <View className="rounded-2xl border border-light-gray3 bg-light-backgroundStrong p-4 dark:border-dark-gray3 dark:bg-dark-backgroundStrong">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-semibold text-light-gray12 dark:text-dark-gray12">
                    {t("freeSpaces")}
                  </Text>
                  <Text className="text-sm text-light-gray6 dark:text-dark-gray6">
                    {goingCount}/{maxSpots}
                  </Text>
                </View>

                {/* Progress bar */}
                <View className="h-2 w-full overflow-hidden rounded-full bg-light-gray3 dark:bg-dark-gray3">
                  <View
                    style={{
                      width: `${progressValue}%`,
                      height: "100%",
                      backgroundColor: theme.color,
                    }}
                  />
                </View>

                <Text className="mt-2 text-xs text-light-gray5 dark:text-dark-gray5">
                  {freeSpots > 0
                    ? t("spotsLeft", { count: freeSpots })
                    : t("eventIsFull")}
                </Text>
              </View>

              {/* Gender stats */}
              <View className="flex-row items-center justify-between rounded-xl border border-light-gray3 bg-light-backgroundStrong px-4 py-2.5 dark:border-dark-gray3 dark:bg-dark-backgroundStrong">
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

                <Text className="text-sm text-light-gray6 dark:text-dark-gray6">
                  {t("avgAge")}{" "}
                  <Text className="font-medium text-light-gray12 dark:text-dark-gray12">
                    {averageAge ?? "—"}
                  </Text>
                </Text>
              </View>

              {/* Guest list: top of the card */}
              <View
                className={`rounded-t-2xl border-t px-4 pb-4 pt-4 ${CARD_SIDES}`}
              >
                <Text className="text-xs uppercase tracking-[2px] text-light-gray5 dark:text-dark-gray5">
                  {t("guestList")}
                </Text>
              </View>
            </View>
          }
          ListFooterComponent={
            <View className={`h-4 rounded-b-2xl border-b ${CARD_SIDES}`} />
          }
        />
      </BottomSheetModal>
    );
  },
);

GuestListModal.displayName = "GuestListModal";
export default GuestListModal;
