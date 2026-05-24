import { useAppTheme } from "@/hooks/useAppTheme";
import useStore from "@/store/useStore";
import { CircleX, Search, SlidersHorizontal } from "lucide-react-native";
import React, { useRef } from "react";
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

  return (
    <>
      <View className="flex-row items-center gap-3">
        <View
          className="flex-1 flex-row items-center gap-2 rounded-full px-4"
          style={{
            height: 48,
            backgroundColor: theme.background075,
            borderWidth: 1,
            borderColor: theme.gray4,
          }}
        >
          {filter.title.length > 0 ? (
            <Pressable
              onPress={() => {
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
            placeholderTextColor={theme.gray10}
            value={filter.title}
            onChangeText={(text) => setFilter({ ...filter, title: text })}
            onSubmitEditing={() => applyEventsFilter()}
            returnKeyType="search"
            style={{ flex: 1, fontSize: 14, color: theme.gray12 }}
          />
        </View>

        <Pressable
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: theme.background075,
            borderWidth: 1,
            borderColor: theme.gray4,
            alignItems: "center",
            justifyContent: "center",
          }}
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
