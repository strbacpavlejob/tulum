import { Button } from "@/components/ui/button";
import { RangeSlider } from "@/components/ui/range-slider";
import { Text as UIText } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import type { GenderFilter } from "@/types/user";
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { View } from "react-native";

export type MatchesFiltersBottomSheetRef = {
  open: () => void;
  close: () => void;
};

type MatchesFiltersBottomSheetProps = {
  genderFilter: GenderFilter;
  onGenderChange: (value: GenderFilter) => void;
  ageMin: number;
  ageMax: number;
  onAgeChange: (next: { min: number; max: number }) => void;
};

const MIN_AGE = 18;
const MAX_AGE = 60;
const FILTER_SNAP_POINTS: (string | number)[] = ["58%"];
const GENDER_OPTIONS: { label: string; value: GenderFilter }[] = [
  { label: "Everyone", value: "everyone" },
  { label: "Men", value: "male" },
  { label: "Women", value: "female" },
  { label: "Other", value: "other" },
];

export const MatchesFiltersBottomSheet = forwardRef<
  MatchesFiltersBottomSheetRef,
  MatchesFiltersBottomSheetProps
>(({ genderFilter, onGenderChange, ageMin, ageMax, onAgeChange }, ref) => {
  const modalRef = useRef<BottomSheetModal>(null);
  const ageValueLabel = `${ageMin} - ${ageMax}`;
  const theme = useAppTheme();

  useImperativeHandle(
    ref,
    () => ({
      open: () => modalRef.current?.present(),
      close: () => modalRef.current?.close(),
    }),
    [],
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      enablePanDownToClose
      snapPoints={FILTER_SNAP_POINTS}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          opacity={0.4}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
        />
      )}
      backgroundStyle={{ backgroundColor: theme.background }}
      handleIndicatorStyle={{ backgroundColor: theme.gray5 }}
      footerComponent={(props) => (
        <BottomSheetFooter {...props} bottomInset={8}>
          <View className="px-5 pb-3 pt-2">
            <Button variant="filled" onPress={() => modalRef.current?.close()}>
              <UIText className="font-extrabold">Apply filters</UIText>
            </Button>
          </View>
        </BottomSheetFooter>
      )}
    >
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 96,
        }}
      >
        <View className="gap-4">
          <View>
            <UIText className="text-2xl font-black text-white">Filters</UIText>
          </View>
          <View className="rounded-2xl border border-white/15  p-4">
            <UIText className="text-xs font-bold uppercase tracking-[1px] text-white/70">
              Show me
            </UIText>
            <View className="mt-3 flex-row gap-2">
              {GENDER_OPTIONS.map((option) => {
                const active = genderFilter === option.value;
                return (
                  <Button
                    key={option.value}
                    onPress={() => onGenderChange(option.value)}
                    accessibilityState={{ selected: active }}
                    variant={active ? "filled" : "ghost"}
                  >
                    <UIText
                      className={`text-xs font-bold  ${active ? "text-light-colorInverse dark:text-dark-colorInverse" : "text-light-colorStrong dark:text-dark-colorStrong"}`}
                    >
                      {option.label}
                    </UIText>
                  </Button>
                );
              })}
            </View>
          </View>
          <View className="rounded-2xl border dark:border-dark-colorMuted/15 border-light-colorMuted/15 px-4 py-4">
            <View className="flex-row items-center justify-between">
              <UIText className="text-xs font-bold uppercase tracking-[1px] text-white/70">
                Age range
              </UIText>
              <UIText className="rounded-full bg-white/10 dark:bg-dark-colorMuted/10 px-3 py-1 text-xs font-bold text-white">
                {ageValueLabel}
              </UIText>
            </View>
            <RangeSlider
              minimumValue={MIN_AGE}
              maximumValue={MAX_AGE}
              values={{ min: ageMin, max: ageMax }}
              onValueChange={onAgeChange}
              minimumTrackColor={theme.colorStrong}
              maximumTrackColor={theme.backgroundMuted}
              thumbColor={theme.colorStrong}
              thumbBorderColor={theme.colorStrong}
            />
          </View>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

MatchesFiltersBottomSheet.displayName = "MatchesFiltersBottomSheet";
