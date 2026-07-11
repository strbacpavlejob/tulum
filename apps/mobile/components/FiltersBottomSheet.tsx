// FiltersBottomSheet.tsx

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import useStore from "@/store/useStore";
import { Filter, VenueType } from "@/types/filter";
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { PanResponder, Pressable, View } from "react-native";
import CalendarRangePicker from "./CalendarRangePicker";

const CAPACITY_MIN = 0;
const CAPACITY_MAX = 1000;
const CAPACITY_STEP = 10;
const CAPACITY_THUMB_SIZE = 20;

export type FiltersBottomSheetRef = {
  open: () => void;
  close: () => void;
  getValue: () => Filter;
};

type Props = {
  initial?: Partial<Filter>;
  onChange?: (f: Filter) => void;
  onApply?: (f: Filter) => void;
  onReset?: () => void;
  snapPoints?: (string | number)[];
};

const VENUE_OPTIONS: { emoji: string; labelKey: string; value: string }[] = [
  { emoji: "🍺", labelKey: "bar", value: "bar" },
  { emoji: "🍻", labelKey: "pub", value: "pub" },
  { emoji: "🕺", labelKey: "nightclub", value: "nightclub" },
  { emoji: "🍽️", labelKey: "restaurant", value: "restaurant" },
  { emoji: "☕", labelKey: "cafe", value: "cafe" },
  { emoji: "🍸", labelKey: "cocktailBar", value: "cocktail_bar" },
  { emoji: "🍷", labelKey: "wineBar", value: "wine_bar" },
  { emoji: "🍺", labelKey: "brewery", value: "brewery" },
  { emoji: "🏮", labelKey: "tavern", value: "tavern" },
  { emoji: "⛵", labelKey: "raft", value: "raft" },
];

const defaultFilters: Filter = {
  title: "",
  tags: [],
  venueType: [],
  dateRange: { start: null, end: null },
  guestsLimit: null,
  isOnlyFavorite: false,
  priceRange: { min: null, max: null },
  capacityRange: { min: null, max: null },
};

export const FiltersBottomSheet = forwardRef<FiltersBottomSheetRef, Props>(
  ({ onChange, onApply, onReset, snapPoints }, ref) => {
    const theme = useAppTheme();
    const { t } = useTranslation();
    const modalRef = useRef<BottomSheetModal>(null);
    const points = useMemo(() => snapPoints ?? ["60%", "95%"], [snapPoints]);

    const getFilterFromStore = useStore((s) => s.getFilter);
    const setFilterInStore = useStore((s) => s.setFilter);

    const [filters, setFilters] = useState<Filter>(() => ({
      ...defaultFilters,
      ...getFilterFromStore(),
      venueType: getFilterFromStore()?.venueType ?? [],
      dateRange: {
        ...defaultFilters.dateRange,
        ...(getFilterFromStore()?.dateRange ?? {}),
      },
      capacityRange: {
        ...defaultFilters.capacityRange,
        ...(getFilterFromStore()?.capacityRange ?? {}),
      },
    }));

    // Keep a ref so stable callbacks always read the latest filters
    const filtersRef = useRef(filters);
    filtersRef.current = filters;

    const rehydrateFromStore = () => {
      const current = getFilterFromStore();
      const merged: Filter = {
        ...defaultFilters,
        ...current,
        venueType: current?.venueType ?? [],
        dateRange: {
          ...defaultFilters.dateRange,
          ...(current?.dateRange ?? {}),
        },
        capacityRange: {
          ...defaultFilters.capacityRange,
          ...(current?.capacityRange ?? {}),
        },
      };
      setFilters(merged);
      onChange?.(merged);
    };

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          opacity={0.4}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          {...props}
          onPress={() => modalRef.current?.close()}
        />
      ),
      [],
    );

    useImperativeHandle(
      ref,
      () => ({
        open: () => {
          rehydrateFromStore();
          modalRef.current?.present();
        },
        close: () => modalRef.current?.close(),
        getValue: () => filters,
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [filters],
    );

    const patch = <K extends keyof Filter>(key: K, value: Filter[K]) => {
      setFilters((prev) => {
        const next = { ...prev, [key]: value };
        onChange?.(next);
        return next;
      });
    };

    const patchNested = (path: string[], value: any) => {
      setFilters((prev) => {
        const next: Filter = JSON.parse(JSON.stringify(prev));
        let r: any = next;
        for (let i = 0; i < path.length - 1; i++) r = r[path[i]];
        r[path[path.length - 1]] = value;
        onChange?.(next);
        return next;
      });
    };

    const patchCapacityRange = useCallback(
      (min: number, max: number) => {
        setFilters((prev) => {
          const next: Filter = {
            ...prev,
            capacityRange: {
              ...prev.capacityRange,
              min,
              max,
            },
          };
          onChange?.(next);
          return next;
        });
      },
      [onChange],
    );

    const capacityMin = filters.capacityRange.min ?? CAPACITY_MIN;
    const capacityMax = filters.capacityRange.max ?? CAPACITY_MAX;
    const [capacityTrackWidth, setCapacityTrackWidth] = useState(1);
    const capacityUsableTrackWidth = Math.max(
      1,
      capacityTrackWidth - CAPACITY_THUMB_SIZE,
    );

    const minDragStartRef = useRef(capacityMin);
    const maxDragStartRef = useRef(capacityMax);
    const capacityMinRef = useRef(capacityMin);
    const capacityMaxRef = useRef(capacityMax);
    const capacityUsableTrackWidthRef = useRef(capacityUsableTrackWidth);

    capacityMinRef.current = capacityMin;
    capacityMaxRef.current = capacityMax;
    capacityUsableTrackWidthRef.current = capacityUsableTrackWidth;

    const clampCapacity = (value: number) =>
      Math.max(CAPACITY_MIN, Math.min(CAPACITY_MAX, value));

    const snapCapacity = (value: number) =>
      Math.round(value / CAPACITY_STEP) * CAPACITY_STEP;

    const minThumbPanResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          minDragStartRef.current = capacityMinRef.current;
        },
        onPanResponderMove: (_, gestureState) => {
          const deltaValue =
            (gestureState.dx / capacityUsableTrackWidthRef.current) *
            (CAPACITY_MAX - CAPACITY_MIN);
          const nextMin = Math.min(
            capacityMaxRef.current,
            clampCapacity(snapCapacity(minDragStartRef.current + deltaValue)),
          );
          patchCapacityRange(nextMin, capacityMaxRef.current);
        },
      }),
    ).current;

    const maxThumbPanResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          maxDragStartRef.current = capacityMaxRef.current;
        },
        onPanResponderMove: (_, gestureState) => {
          const deltaValue =
            (gestureState.dx / capacityUsableTrackWidthRef.current) *
            (CAPACITY_MAX - CAPACITY_MIN);
          const nextMax = Math.max(
            capacityMinRef.current,
            clampCapacity(snapCapacity(maxDragStartRef.current + deltaValue)),
          );
          patchCapacityRange(capacityMinRef.current, nextMax);
        },
      }),
    ).current;

    const capacityRangePercent = CAPACITY_MAX - CAPACITY_MIN;
    const capacityLeft =
      ((capacityMin - CAPACITY_MIN) / capacityRangePercent) * 100;
    const capacityRight =
      100 - ((capacityMax - CAPACITY_MIN) / capacityRangePercent) * 100;

    const capacityMinThumbLeft =
      (capacityMin / CAPACITY_MAX) * capacityUsableTrackWidth;
    const capacityMaxThumbLeft =
      (capacityMax / CAPACITY_MAX) * capacityUsableTrackWidth;

    const toggleVenueType = (value: VenueType) => {
      setFilters((prev) => {
        const alreadySelected = prev.venueType.includes(value);
        const nextVenueTypes = alreadySelected
          ? prev.venueType.filter((v) => v !== value)
          : [...prev.venueType, value];
        const next = { ...prev, venueType: nextVenueTypes };
        onChange?.(next);
        return next;
      });
    };

    const reset = useCallback(() => {
      const cleared = { ...defaultFilters };
      setFilters(cleared);
      setFilterInStore(cleared);
      onApply?.(cleared);
      onReset?.();
      modalRef.current?.close();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const apply = useCallback(() => {
      const current = filtersRef.current;
      setFilterInStore(current);
      onApply?.(current);
      modalRef.current?.close();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const renderFooter = useCallback(
      (props: any) => (
        <BottomSheetFooter {...props} bottomInset={8}>
          <View className="flex-row gap-3 p-3">
            <Pressable
              className="flex-1 h-12 rounded-xl items-center justify-center"
              style={{ backgroundColor: theme.gray3 }}
              onPress={reset}
            >
              <Text className="font-semibold" style={{ color: theme.gray11 }}>
                {t("reset")}
              </Text>
            </Pressable>
            <Pressable
              className="flex-1 h-12 rounded-xl items-center justify-center"
              style={{ backgroundColor: theme.color }}
              onPress={apply}
            >
              <Text className="font-semibold text-white">{t("apply")}</Text>
            </Pressable>
          </View>
        </BottomSheetFooter>
      ),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );

    return (
      <BottomSheetModal
        ref={modalRef}
        enablePanDownToClose
        snapPoints={points}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.background }}
        handleIndicatorStyle={{ backgroundColor: theme.gray5 }}
        footerComponent={renderFooter}
      >
        <BottomSheetView
          style={{ flex: 1, paddingHorizontal: 20, paddingVertical: 10 }}
        >
          <View className="flex-1 gap-3">
            <Text className="text-xl font-bold" style={{ color: theme.gray12 }}>
              {t("filters")}
            </Text>

            <BottomSheetScrollView
              contentContainerStyle={{ width: "100%", paddingBottom: 100 }}
            >
              <View className="gap-4 w-full">
                {/* Venue Type */}
                <View
                  className="gap-3 rounded-xl p-4"
                  style={{ backgroundColor: theme.backgroundStrong }}
                >
                  <Text
                    className="font-semibold"
                    style={{ color: theme.gray11 }}
                  >
                    {t("filterVenueType")}
                  </Text>
                  <View className="flex-row flex-wrap">
                    {VENUE_OPTIONS.map((opt) => {
                      const selected = filters.venueType.includes(
                        opt.value as VenueType,
                      );
                      return (
                        <Pressable
                          key={opt.value}
                          onPress={() =>
                            toggleVenueType(opt.value as VenueType)
                          }
                          className="rounded-2xl px-4 py-3 mb-2 mr-2"
                          style={{
                            backgroundColor: selected
                              ? theme.color
                              : theme.background,
                            borderWidth: 1.5,
                            borderColor: selected ? theme.color : theme.gray4,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: selected ? "600" : "400",
                              color: selected ? "#fff" : theme.gray11,
                            }}
                          >
                            {`${opt.emoji} ${t(opt.labelKey)}`}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Capacity Range */}
                <View
                  className="gap-3 rounded-xl p-4"
                  style={{ backgroundColor: theme.backgroundStrong }}
                >
                  <View className="flex-row justify-between items-center">
                    <Text
                      className="font-semibold"
                      style={{ color: theme.gray11 }}
                    >
                      {t("capacity")}
                    </Text>
                    <Text className="text-xs" style={{ color: theme.gray10 }}>
                      {capacityMin} - {capacityMax}
                    </Text>
                  </View>
                  <View className="gap-2">
                    <View className="flex-row justify-between">
                      <Text className="text-xs" style={{ color: theme.gray9 }}>
                        {t("min")}
                      </Text>
                      <Text className="text-xs" style={{ color: theme.gray9 }}>
                        {t("max")}
                      </Text>
                    </View>
                    <View
                      className="h-10 justify-center"
                      onLayout={(event) =>
                        setCapacityTrackWidth(event.nativeEvent.layout.width)
                      }
                    >
                      <View
                        style={{
                          height: 4,
                          borderRadius: 999,
                          backgroundColor: theme.gray3,
                        }}
                      />
                      <View
                        className="absolute"
                        style={{
                          left: `${capacityLeft}%`,
                          right: `${capacityRight}%`,
                          height: 4,
                          borderRadius: 999,
                          backgroundColor: theme.color,
                        }}
                      />
                      <View
                        {...minThumbPanResponder.panHandlers}
                        style={{
                          position: "absolute",
                          left: capacityMinThumbLeft,
                          width: CAPACITY_THUMB_SIZE,
                          height: CAPACITY_THUMB_SIZE,
                          borderRadius: CAPACITY_THUMB_SIZE / 2,
                          backgroundColor: theme.color,
                          borderWidth: 2,
                          borderColor: theme.background,
                          transform: [
                            { translateX: -CAPACITY_THUMB_SIZE / 2 },
                            { translateY: -CAPACITY_THUMB_SIZE / 2 + 2 },
                          ],
                        }}
                      />
                      <View
                        {...maxThumbPanResponder.panHandlers}
                        style={{
                          position: "absolute",
                          left: capacityMaxThumbLeft,
                          width: CAPACITY_THUMB_SIZE,
                          height: CAPACITY_THUMB_SIZE,
                          borderRadius: CAPACITY_THUMB_SIZE / 2,
                          backgroundColor: theme.color,
                          borderWidth: 2,
                          borderColor: theme.background,
                          transform: [
                            { translateX: -CAPACITY_THUMB_SIZE / 2 },
                            { translateY: -CAPACITY_THUMB_SIZE / 2 + 2 },
                          ],
                        }}
                      />
                    </View>
                  </View>
                </View>

                {/* Date Range */}
                <View
                  className="rounded-xl p-4"
                  style={{ backgroundColor: theme.backgroundStrong }}
                >
                  <CalendarRangePicker
                    startDate={filters.dateRange.start}
                    endDate={filters.dateRange.end}
                    onChangeStartDate={(date) =>
                      patchNested(["dateRange", "start"], date)
                    }
                    onChangeEndDate={(date) =>
                      patchNested(["dateRange", "end"], date)
                    }
                  />
                </View>

                {/* Only Favorites */}
                <View
                  className="flex-row items-center justify-between rounded-xl p-4"
                  style={{ backgroundColor: theme.backgroundStrong }}
                >
                  <Text
                    className="font-semibold"
                    style={{ color: theme.gray11 }}
                  >
                    {t("onlyFavorites")}
                  </Text>
                  <Pressable
                    onPress={() =>
                      patch("isOnlyFavorite", !filters.isOnlyFavorite)
                    }
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: filters.isOnlyFavorite
                        ? theme.color
                        : theme.gray4,
                      justifyContent: "center",
                      paddingHorizontal: 2,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: "#ffffff",
                        marginLeft: filters.isOnlyFavorite ? 20 : 0,
                      }}
                    />
                  </Pressable>
                </View>
              </View>
            </BottomSheetScrollView>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

FiltersBottomSheet.displayName = "FiltersBottomSheet";
