import { useAppTheme } from "@/hooks/useAppTheme";
import useStore from "@/store/useStore";
import { CircleX, Search, SlidersHorizontal } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, TextInput, View } from "react-native";
import {
  FiltersBottomSheet,
  FiltersBottomSheetRef,
} from "./FiltersBottomSheet";

const SearchBox: React.FC = () => {
  const {
    filter,
    setFilter,
    applyEventsFilter,
    resetEventsFilter,
    refreshEvents,
  } = useStore();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const ref = useRef<FiltersBottomSheetRef>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <>
      <View className="flex-row items-center gap-3">
        <View
          className="h-12 flex-1 flex-row items-center gap-2 rounded-full border border-light-gray4 bg-light-background075 px-4 dark:border-dark-gray4 dark:bg-dark-background075"
          style={{}}
        >
          {filter.title.length > 0 ? (
            <Pressable
              onPress={() => {
                if (debounceRef.current) {
                  clearTimeout(debounceRef.current);
                }
                setFilter({ ...filter, title: "" });
                applyEventsFilter();
              }}
              hitSlop={8}
            >
              <CircleX size={20} color={theme.gray10} />
            </Pressable>
          ) : (
            <Search size={20} color={theme.gray10} />
          )}
          <TextInput
            placeholder={t("searchEvents")}
            value={filter.title}
            onChangeText={(text) => {
              setFilter({ ...filter, title: text });

              if (debounceRef.current) {
                clearTimeout(debounceRef.current);
              }

              debounceRef.current = setTimeout(() => {
                applyEventsFilter();
              }, 300);
            }}
            onSubmitEditing={() => {
              if (debounceRef.current) {
                clearTimeout(debounceRef.current);
              }
              applyEventsFilter();
            }}
            returnKeyType="search"
            className="flex-1 text-sm text-light-gray12 dark:text-dark-gray12 focus:border-transparent *:focus:outline-none"
          />
        </View>

        <Pressable
          className="h-12 w-12 items-center justify-center rounded-full border border-light-gray4 bg-light-background075 dark:border-dark-gray4 dark:bg-dark-background075"
          onPress={() => ref.current?.open()}
        >
          <SlidersHorizontal size={20} color={theme.gray10} />
        </Pressable>
      </View>

      <FiltersBottomSheet
        ref={ref}
        onApply={() => refreshEvents()}
        onReset={() => resetEventsFilter()}
      />
    </>
  );
};

export default SearchBox;
