import { Input } from "@/components/ui/input";
import useStore from "@/store/useStore";
import { Filter, Search, XCircle } from "lucide-react-native";
import React, { useRef } from "react";
import type { TextInput } from "react-native";
import { View } from "react-native";
import {
  FiltersBottomSheet,
  FiltersBottomSheetRef,
} from "./FiltersBottomSheet";

const SearchBox: React.FC = () => {
  const { filter, setFilter, applyEventsFilter, resetEventsFilter } =
    useStore();
  const ref = useRef<FiltersBottomSheetRef>(null);
  const inputRef = useRef<TextInput>(null);

  return (
    <>
      <View className="flex-1 h-[50px] w-full flex-row items-center justify-between gap-4">
        {/* Search Field */}
        <View
          className="flex-1 flex-row items-center bg-white rounded-xl px-4 h-[50px]"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          {filter.title.length > 0 ? (
            <XCircle
              color="#6b7280"
              size={20}
              onPress={() => {
                setFilter({ ...filter, title: "" });
                applyEventsFilter();
              }}
            />
          ) : (
            <Search color="#6b7280" size={20} />
          )}
          <Input
            ref={inputRef}
            className="flex-1 h-full ml-2 border-0 shadow-none"
            value={filter.title}
            placeholderTextColor="#6b7280"
            placeholder="Search..."
            returnKeyType="search"
            onChange={(e) =>
              setFilter({ ...filter, title: e.nativeEvent.text })
            }
            onSubmitEditing={() => {
              applyEventsFilter();
            }}
          />
          <Filter
            color="#6b7280"
            size={20}
            onPress={() => ref.current?.open()}
          />
        </View>
      </View>
      <FiltersBottomSheet
        ref={ref}
        initial={{
          isOnlyFavorite: false,
          priceRange: { min: 10, max: 150 },
        }}
        onApply={() => applyEventsFilter()}
        onReset={() => resetEventsFilter()}
        onChange={(f) => {}}
      />
    </>
  );
};

export default SearchBox;
