// FiltersBottomSheet.tsx

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import Slider from "@react-native-community/slider";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CalendarRangePicker from "./CalendarRangePicker";

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

const VENUE_TYPE_OPTIONS: { value: VenueType; label: string }[] = [
  { value: "bar", label: "Bar" },
  { value: "pub", label: "Pub" },
  { value: "nightclub", label: "Nightclub" },
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Cafe" },
  { value: "cocktail_bar", label: "Cocktail Bar" },
  { value: "wine_bar", label: "Wine Bar" },
  { value: "brewery", label: "Brewery" },
  { value: "tavern", label: "Tavern" },
  { value: "raft", label: "Raft" },
];

const defaultFilters: Filter = {
  title: "",
  tags: [],
  venueType: null,
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
    const insets = useSafeAreaInsets();
    const contentInsets = {
      top: insets.top,
      bottom: insets.bottom,
      left: 12,
      right: 12,
    };
    const modalRef = useRef<BottomSheetModal>(null);
    const points = useMemo(() => snapPoints ?? ["60%", "95%"], [snapPoints]);

    const getFilterFromStore = useStore((s) => s.getFilter);
    const setFilterInStore = useStore((s) => s.setFilter);

    const [filters, setFilters] = useState<Filter>(() => ({
      ...defaultFilters,
      ...getFilterFromStore(),
      dateRange: {
        ...defaultFilters.dateRange,
        ...(getFilterFromStore()?.dateRange ?? {}),
      },
      capacityRange: {
        ...defaultFilters.capacityRange,
        ...(getFilterFromStore()?.capacityRange ?? {}),
      },
    }));

    const rehydrateFromStore = () => {
      const current = getFilterFromStore();
      const merged: Filter = {
        ...defaultFilters,
        ...current,
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

    const reset = () => {
      const cleared = { ...defaultFilters };
      setFilters(cleared);
      setFilterInStore(cleared);
      onReset?.();
    };

    const apply = () => {
      setFilterInStore(filters);
      onApply?.(filters);
      modalRef.current?.close();
    };

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
      [reset, apply],
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Pressable
                        className="flex-row items-center justify-between h-10 rounded-md px-3 border"
                        style={{
                          backgroundColor: theme.background,
                          borderColor: theme.gray4,
                        }}
                      >
                        <Text
                          className="text-sm"
                          style={{
                            color: filters.venueType
                              ? theme.gray11
                              : theme.gray9,
                          }}
                        >
                          {filters.venueType
                            ? VENUE_TYPE_OPTIONS.find(
                                (o) => o.value === filters.venueType,
                              )?.label
                            : t("selectVenueType")}
                        </Text>
                        <Text style={{ color: theme.gray9 }}>▾</Text>
                      </Pressable>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      insets={contentInsets}
                      sideOffset={4}
                      className="w-56"
                      align="start"
                    >
                      <DropdownMenuGroup>
                        {VENUE_TYPE_OPTIONS.map((opt) => (
                          <DropdownMenuItem
                            key={opt.value}
                            onPress={() => patch("venueType", opt.value)}
                          >
                            <Text
                              style={{
                                fontWeight:
                                  filters.venueType === opt.value
                                    ? "700"
                                    : "400",
                              }}
                            >
                              {opt.label}
                            </Text>
                            {filters.venueType === opt.value && (
                              <Text style={{ color: theme.color }}>✓</Text>
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                      {filters.capacityRange.min ?? 0} –{" "}
                      {filters.capacityRange.max ?? 1000}
                    </Text>
                  </View>
                  <View className="gap-1">
                    <Text className="text-xs" style={{ color: theme.gray9 }}>
                      {t("min")}
                    </Text>
                    <Slider
                      minimumValue={0}
                      maximumValue={1000}
                      step={10}
                      value={filters.capacityRange.min ?? 0}
                      onValueChange={(val) =>
                        patchNested(["capacityRange", "min"], Math.round(val))
                      }
                      minimumTrackTintColor={theme.color}
                      maximumTrackTintColor={theme.gray3}
                      thumbTintColor={theme.color}
                    />
                  </View>
                  <View className="gap-1">
                    <Text className="text-xs" style={{ color: theme.gray9 }}>
                      {t("max")}
                    </Text>
                    <Slider
                      minimumValue={0}
                      maximumValue={1000}
                      step={10}
                      value={filters.capacityRange.max ?? 1000}
                      onValueChange={(val) =>
                        patchNested(["capacityRange", "max"], Math.round(val))
                      }
                      minimumTrackTintColor={theme.color}
                      maximumTrackTintColor={theme.gray3}
                      thumbTintColor={theme.color}
                    />
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
