import ProfileInfoView from "@/components/ProfileInfoView";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useTranslation } from "react-i18next";
import { Match } from "@/types/chat";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useMemo } from "react";
import { Image, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  match: Match;
  sheetRef: React.RefObject<BottomSheetModal>;
};

export default function MatchProfileSheet({ match, sheetRef }: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const snapPoints = useMemo(() => ["85%"], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  // Merge Match fields with any richer profile data we have
  const userForView = {
    ...match.profile,
    firstName: match.name,
    age: match.profile?.age ?? match.age,
    photos:
      match.profile?.photos && match.profile.photos.length > 0
        ? match.profile.photos
        : [match.photo],
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.backgroundPopover }}
      handleIndicatorStyle={{ backgroundColor: theme.gray5 }}
    >
      {/* Compact header */}
      <View
        className="flex-row items-center gap-3 px-4 py-3"
        style={{ borderBottomWidth: 1, borderColor: theme.border }}
      >
        <Image
          source={{ uri: match.photo }}
          style={{ width: 44, height: 44, borderRadius: 22 }}
          resizeMode="cover"
        />
        <View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: theme.colorStrong,
            }}
          >
            {match.name}
            {match.age ? `, ${match.age}` : ""}
          </Text>
          <Text style={{ fontSize: 13, color: theme.colorMuted }}>
            {t("atVenue", { venue: match.venue })}
          </Text>
        </View>
      </View>

      {/* Scrollable profile info (read-only) */}
      <BottomSheetScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <ProfileInfoView user={userForView} />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
