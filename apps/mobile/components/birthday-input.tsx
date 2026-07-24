import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { enUS, ru, srLatn } from "date-fns/locale";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  View,
  useColorScheme,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

type BirthdayPickerModalProps = {
  value?: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onChange?: (value: string) => void;
  columnWidths?: [number, number, number];
  cardWidth?: number;
};

type PickerType = "year" | "month" | "day";

type PickerIndexes = {
  year: number;
  month: number;
  day: number;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const LIST_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const LIST_VERTICAL_PADDING = (LIST_HEIGHT - ITEM_HEIGHT) / 2;
const DEFAULT_CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 360);
const SCROLL_SETTLE_DELAY = 120;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function createLocalDate(year: number, month: number, day: number) {
  return new Date(year, month, day, 12, 0, 0, 0);
}

function normalizeDate(date: Date) {
  return createLocalDate(date.getFullYear(), date.getMonth(), date.getDate());
}

function areDatesEqual(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function clampDate(date: Date, minimumDate: Date, maximumDate: Date) {
  const normalizedDate = normalizeDate(date);
  const normalizedMinimumDate = normalizeDate(minimumDate);
  const normalizedMaximumDate = normalizeDate(maximumDate);

  if (normalizedDate.getTime() < normalizedMinimumDate.getTime()) {
    return normalizedMinimumDate;
  }

  if (normalizedDate.getTime() > normalizedMaximumDate.getTime()) {
    return normalizedMaximumDate;
  }

  return normalizedDate;
}

function getDateLocale(language: string) {
  const normalizedLanguage = language.toLowerCase();

  if (normalizedLanguage.startsWith("ru")) {
    return ru;
  }

  if (normalizedLanguage.startsWith("sr")) {
    return srLatn;
  }

  return enUS;
}

const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList,
) as unknown as typeof FlatList;

export default function BirthdayPickerModal({
  value,
  minimumDate = new Date(1900, 0, 1),
  maximumDate = new Date(),
  onChange,
  columnWidths,
  cardWidth,
}: BirthdayPickerModalProps) {
  const { i18n } = useTranslation();
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";

  const minimumTimestamp = normalizeDate(minimumDate).getTime();
  const maximumTimestamp = normalizeDate(maximumDate).getTime();

  const normalizedMinimumDate = useMemo(
    () => normalizeDate(minimumDate),
    [minimumTimestamp],
  );

  const normalizedMaximumDate = useMemo(
    () => normalizeDate(maximumDate),
    [maximumTimestamp],
  );

  const initialDate = useMemo(
    () =>
      clampDate(
        value ?? normalizedMaximumDate,
        normalizedMinimumDate,
        normalizedMaximumDate,
      ),
    [],
  );

  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);

  const selectedDateRef = useRef<Date>(initialDate);

  const yearRef = useRef<FlatList<number> | null>(null);
  const monthRef = useRef<FlatList<string> | null>(null);
  const dayRef = useRef<FlatList<number> | null>(null);

  const yearScroll = useRef(new Animated.Value(0)).current;
  const monthScroll = useRef(new Animated.Value(0)).current;
  const dayScroll = useRef(new Animated.Value(0)).current;

  const initializedRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const scrollSettleTimeoutsRef = useRef<
    Partial<Record<PickerType, ReturnType<typeof setTimeout>>>
  >({});

  const latestOffsetsRef = useRef<Record<PickerType, number>>({
    year: 0,
    month: 0,
    day: 0,
  });

  const latestIndexesRef = useRef<PickerIndexes>({
    year: 0,
    month: initialDate.getMonth(),
    day: initialDate.getDate() - 1,
  });

  const dateLocale = useMemo(
    () => getDateLocale(i18n.language),
    [i18n.language],
  );

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, monthIndex) =>
        format(createLocalDate(2000, monthIndex, 1), "MMM", {
          locale: dateLocale,
        }),
      ),
    [dateLocale],
  );

  const years = useMemo(() => {
    const result: number[] = [];

    for (
      let year = normalizedMaximumDate.getFullYear();
      year >= normalizedMinimumDate.getFullYear();
      year -= 1
    ) {
      result.push(year);
    }

    return result;
  }, [minimumTimestamp, maximumTimestamp]);

  const days = useMemo(() => {
    const numberOfDays = daysInMonth(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
    );

    return Array.from({ length: numberOfDays }, (_, index) => index + 1);
  }, [selectedDate.getFullYear(), selectedDate.getMonth()]);

  const effectiveCardWidth = cardWidth ?? DEFAULT_CARD_WIDTH;

  const fractions = useMemo(() => {
    if (
      columnWidths?.length === 3 &&
      columnWidths.every(
        (width) =>
          typeof width === "number" && Number.isFinite(width) && width > 0,
      )
    ) {
      const total = columnWidths.reduce((sum, width) => sum + width, 0);

      return columnWidths.map((width) => width / total) as [
        number,
        number,
        number,
      ];
    }

    return [0.34, 0.33, 0.33] as [number, number, number];
  }, [columnWidths]);

  const clearSettleTimeout = useCallback((type: PickerType) => {
    const timeout = scrollSettleTimeoutsRef.current[type];

    if (timeout) {
      clearTimeout(timeout);
      delete scrollSettleTimeoutsRef.current[type];
    }
  }, []);

  const markProgrammaticScroll = useCallback(() => {
    isProgrammaticScrollRef.current = true;

    if (programmaticScrollTimeoutRef.current) {
      clearTimeout(programmaticScrollTimeoutRef.current);
    }

    programmaticScrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
      programmaticScrollTimeoutRef.current = null;
    }, 300);
  }, []);

  const scrollToOffset = useCallback(
    (
      ref: React.RefObject<FlatList<unknown> | null>,
      index: number,
      animated: boolean,
    ) => {
      if (!ref.current || index < 0) {
        return;
      }

      ref.current.scrollToOffset({
        offset: index * ITEM_HEIGHT,
        animated,
      });
    },
    [],
  );

  const getIndexesForDate = useCallback(
    (date: Date): PickerIndexes => ({
      year: Math.max(0, years.indexOf(date.getFullYear())),
      month: date.getMonth(),
      day: date.getDate() - 1,
    }),
    [years],
  );

  const scrollPickersToDate = useCallback(
    (date: Date, animated: boolean) => {
      if (!years.length) {
        return;
      }

      const indexes = getIndexesForDate(date);

      latestIndexesRef.current = indexes;
      latestOffsetsRef.current = {
        year: indexes.year * ITEM_HEIGHT,
        month: indexes.month * ITEM_HEIGHT,
        day: indexes.day * ITEM_HEIGHT,
      };

      markProgrammaticScroll();

      requestAnimationFrame(() => {
        scrollToOffset(
          yearRef as React.RefObject<FlatList<unknown> | null>,
          indexes.year,
          animated,
        );

        scrollToOffset(
          monthRef as React.RefObject<FlatList<unknown> | null>,
          indexes.month,
          animated,
        );

        scrollToOffset(
          dayRef as React.RefObject<FlatList<unknown> | null>,
          indexes.day,
          animated,
        );
      });
    },
    [years, getIndexesForDate, markProgrammaticScroll, scrollToOffset],
  );

  const setDate = useCallback(
    (
      nextDate: Date,
      options?: {
        emitChange?: boolean;
        scroll?: boolean;
        animated?: boolean;
      },
    ) => {
      const {
        emitChange = true,
        scroll = true,
        animated = true,
      } = options ?? {};

      const validatedDate = clampDate(
        nextDate,
        normalizedMinimumDate,
        normalizedMaximumDate,
      );

      const previousDate = selectedDateRef.current;
      const hasChanged = !areDatesEqual(previousDate, validatedDate);

      selectedDateRef.current = validatedDate;

      if (hasChanged) {
        setSelectedDate(validatedDate);

        if (emitChange) {
          onChange?.(format(validatedDate, "yyyy-MM-dd"));
        }
      }

      if (scroll) {
        scrollPickersToDate(validatedDate, animated);
      }
    },
    [minimumTimestamp, maximumTimestamp, onChange, scrollPickersToDate],
  );

  const createDateFromIndexes = useCallback(
    (indexes: PickerIndexes) => {
      const yearIndex = clamp(indexes.year, 0, Math.max(years.length - 1, 0));

      const year = years[yearIndex] ?? selectedDateRef.current.getFullYear();

      const month = clamp(indexes.month, 0, 11);

      const maximumDay = daysInMonth(year, month);
      const day = clamp(indexes.day + 1, 1, maximumDay);

      return createLocalDate(year, month, day);
    },
    [years],
  );

  const commitCurrentIndexes = useCallback(
    (changedPicker: PickerType) => {
      if (!initializedRef.current || isProgrammaticScrollRef.current) {
        return;
      }

      const nextDate = createDateFromIndexes(latestIndexesRef.current);

      const validatedDate = clampDate(
        nextDate,
        normalizedMinimumDate,
        normalizedMaximumDate,
      );

      const selectedIndexes = getIndexesForDate(validatedDate);

      latestIndexesRef.current = selectedIndexes;

      const changedIndex = selectedIndexes[changedPicker];

      const currentIndex = Math.round(
        latestOffsetsRef.current[changedPicker] / ITEM_HEIGHT,
      );

      const requiresCorrection =
        changedIndex !== currentIndex ||
        !areDatesEqual(nextDate, validatedDate);

      setDate(validatedDate, {
        emitChange: true,
        scroll: requiresCorrection,
        animated: true,
      });
    },
    [
      createDateFromIndexes,
      minimumTimestamp,
      maximumTimestamp,
      getIndexesForDate,
      setDate,
    ],
  );

  const scheduleCommit = useCallback(
    (type: PickerType) => {
      clearSettleTimeout(type);

      scrollSettleTimeoutsRef.current[type] = setTimeout(() => {
        delete scrollSettleTimeoutsRef.current[type];
        commitCurrentIndexes(type);
      }, SCROLL_SETTLE_DELAY);
    },
    [clearSettleTimeout, commitCurrentIndexes],
  );

  const updatePickerOffset = useCallback(
    (type: PickerType, offset: number) => {
      latestOffsetsRef.current[type] = offset;

      const rawIndex = Math.round(offset / ITEM_HEIGHT);

      if (type === "year") {
        latestIndexesRef.current.year = clamp(
          rawIndex,
          0,
          Math.max(years.length - 1, 0),
        );
      } else if (type === "month") {
        latestIndexesRef.current.month = clamp(rawIndex, 0, months.length - 1);
      } else {
        const currentIndexes = latestIndexesRef.current;

        const currentYear =
          years[currentIndexes.year] ?? selectedDateRef.current.getFullYear();

        const currentMonth = clamp(currentIndexes.month, 0, 11);

        const maximumDay = daysInMonth(currentYear, currentMonth);

        latestIndexesRef.current.day = clamp(rawIndex, 0, maximumDay - 1);
      }
    },
    [years, months.length],
  );

  const createScrollHandler = useCallback(
    (type: PickerType, animatedValue: Animated.Value) =>
      Animated.event(
        [
          {
            nativeEvent: {
              contentOffset: {
                y: animatedValue,
              },
            },
          },
        ],
        {
          useNativeDriver: true,
          listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            const offset = event.nativeEvent.contentOffset.y;

            updatePickerOffset(type, offset);

            if (!isProgrammaticScrollRef.current) {
              scheduleCommit(type);
            }
          },
        },
      ),
    [updatePickerOffset, scheduleCommit],
  );

  const onYearScroll = useMemo(
    () => createScrollHandler("year", yearScroll),
    [createScrollHandler, yearScroll],
  );

  const onMonthScroll = useMemo(
    () => createScrollHandler("month", monthScroll),
    [createScrollHandler, monthScroll],
  );

  const onDayScroll = useMemo(
    () => createScrollHandler("day", dayScroll),
    [createScrollHandler, dayScroll],
  );

  const handleScrollBeginDrag = useCallback(
    (type: PickerType) => {
      clearSettleTimeout(type);
      isProgrammaticScrollRef.current = false;
    },
    [clearSettleTimeout],
  );

  const handleScrollEnd = useCallback(
    (type: PickerType) => (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = event.nativeEvent.contentOffset.y;

      updatePickerOffset(type, offset);
      scheduleCommit(type);
    },
    [updatePickerOffset, scheduleCommit],
  );

  useEffect(() => {
    if (!years.length || initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    scrollPickersToDate(selectedDateRef.current, false);
  }, [years, scrollPickersToDate]);

  useEffect(() => {
    if (!value || !years.length) {
      return;
    }

    const nextDate = clampDate(
      value,
      normalizedMinimumDate,
      normalizedMaximumDate,
    );

    setDate(nextDate, {
      emitChange: false,
      scroll: true,
      animated: false,
    });
  }, [
    value?.getFullYear(),
    value?.getMonth(),
    value?.getDate(),
    minimumTimestamp,
    maximumTimestamp,
    years,
    setDate,
  ]);

  useEffect(() => {
    if (!years.length) {
      return;
    }

    const validatedDate = clampDate(
      selectedDateRef.current,
      normalizedMinimumDate,
      normalizedMaximumDate,
    );

    setDate(validatedDate, {
      emitChange: false,
      scroll: true,
      animated: false,
    });
  }, [minimumTimestamp, maximumTimestamp, years, setDate]);

  useEffect(() => {
    console.log("selectedDate", selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    return () => {
      Object.values(scrollSettleTimeoutsRef.current).forEach((timeout) => {
        if (timeout) {
          clearTimeout(timeout);
        }
      });

      if (programmaticScrollTimeoutRef.current) {
        clearTimeout(programmaticScrollTimeoutRef.current);
      }
    };
  }, []);

  const renderAnimatedItem = useCallback(
    (index: number, label: string | number, scrollValue: Animated.Value) => {
      const inputRange = [
        (index - 2) * ITEM_HEIGHT,
        (index - 1) * ITEM_HEIGHT,
        index * ITEM_HEIGHT,
        (index + 1) * ITEM_HEIGHT,
        (index + 2) * ITEM_HEIGHT,
      ];

      const opacity = scrollValue.interpolate({
        inputRange,
        outputRange: [0.25, 0.6, 1, 0.6, 0.25],
        extrapolate: "clamp",
      });

      const scale = scrollValue.interpolate({
        inputRange,
        outputRange: [0.92, 0.98, 1.05, 0.98, 0.92],
        extrapolate: "clamp",
      });

      const translateY = scrollValue.interpolate({
        inputRange,
        outputRange: [10, 5, 0, -2, -6],
        extrapolate: "clamp",
      });

      return (
        <Animated.View style={styles.itemContainer}>
          <Animated.Text
            accessible={false}
            style={{
              color: dark ? "#fff" : "#000",
              fontSize: 18,
              fontWeight: "600",
              opacity,
              transform: [{ translateY }, { scale }],
            }}
          >
            {label}
          </Animated.Text>
        </Animated.View>
      );
    },
    [dark],
  );

  const sharedListProps = {
    showsVerticalScrollIndicator: false,
    snapToInterval: ITEM_HEIGHT,
    snapToAlignment: "start" as const,
    disableIntervalMomentum: true,
    decelerationRate: "fast" as const,
    bounces: false,
    overScrollMode: "never" as const,
    scrollEventThrottle: 16,
    contentContainerStyle: {
      paddingTop: LIST_VERTICAL_PADDING,
      paddingBottom: LIST_VERTICAL_PADDING,
    },
  };

  return (
    <View className="flex-1 items-center justify-center">
      <View
        className={cn(
          "border-transparent bg-light-backgroundMuted dark:bg-dark-backgroundMuted",
        )}
        style={{
          width: effectiveCardWidth,
          borderRadius: 18,
          overflow: "hidden",
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: 4,
              },
              shadowOpacity: 0.12,
              shadowRadius: 12,
            },
            android: {
              elevation: 6,
            },
          }),
        }}
      >
        <View className="px-3 py-4" style={styles.pickerContent}>
          <View style={styles.columnsContainer}>
            <View
              style={{
                width: effectiveCardWidth * fractions[0],
                alignItems: "center",
              }}
            >
              <View style={styles.listContainer}>
                <AnimatedFlatList
                  {...sharedListProps}
                  ref={(ref) => {
                    yearRef.current = ref;
                  }}
                  data={years}
                  keyExtractor={(item) => String(item)}
                  onScroll={onYearScroll}
                  onScrollBeginDrag={() => handleScrollBeginDrag("year")}
                  onScrollEndDrag={handleScrollEnd("year")}
                  onMomentumScrollEnd={handleScrollEnd("year")}
                  getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT,
                    offset: ITEM_HEIGHT * index,
                    index,
                  })}
                  renderItem={({ item, index }) =>
                    renderAnimatedItem(index, item, yearScroll)
                  }
                  initialNumToRender={Math.min(years.length, 20)}
                  windowSize={11}
                />
              </View>
            </View>

            <View
              style={{
                width: effectiveCardWidth * fractions[1],
                alignItems: "center",
              }}
            >
              <View style={styles.listContainer}>
                <AnimatedFlatList
                  {...sharedListProps}
                  ref={(ref) => {
                    monthRef.current = ref;
                  }}
                  data={months}
                  extraData={dateLocale}
                  keyExtractor={(_, index) => String(index)}
                  onScroll={onMonthScroll}
                  onScrollBeginDrag={() => handleScrollBeginDrag("month")}
                  onScrollEndDrag={handleScrollEnd("month")}
                  onMomentumScrollEnd={handleScrollEnd("month")}
                  getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT,
                    offset: ITEM_HEIGHT * index,
                    index,
                  })}
                  renderItem={({ item, index }) =>
                    renderAnimatedItem(index, item, monthScroll)
                  }
                  initialNumToRender={months.length}
                  windowSize={6}
                />
              </View>
            </View>

            <View
              style={{
                width: effectiveCardWidth * fractions[2],
                alignItems: "center",
              }}
            >
              <View style={styles.listContainer}>
                <AnimatedFlatList
                  {...sharedListProps}
                  ref={(ref) => {
                    dayRef.current = ref;
                  }}
                  data={days}
                  extraData={`${selectedDate.getFullYear()}-${selectedDate.getMonth()}`}
                  keyExtractor={(item) => String(item)}
                  onScroll={onDayScroll}
                  onScrollBeginDrag={() => handleScrollBeginDrag("day")}
                  onScrollEndDrag={handleScrollEnd("day")}
                  onMomentumScrollEnd={handleScrollEnd("day")}
                  getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT,
                    offset: ITEM_HEIGHT * index,
                    index,
                  })}
                  renderItem={({ item, index }) =>
                    renderAnimatedItem(index, item, dayScroll)
                  }
                  initialNumToRender={Math.min(days.length, 31)}
                  windowSize={6}
                />
              </View>
            </View>
          </View>

          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.highlightContainer]}
          >
            <View
              className="border-light-color bg-light-color025 dark:border-dark-color dark:bg-dark-color025"
              style={{
                height: ITEM_HEIGHT + 6,
                width: effectiveCardWidth - 32,
                borderRadius: 12,
              }}
            />
          </View>
        </View>

        <View
          className="h-px"
          style={{
            backgroundColor: dark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.06)",
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pickerContent: {
    alignItems: "center",
  },
  columnsContainer: {
    width: "100%",
    height: LIST_HEIGHT,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listContainer: {
    height: LIST_HEIGHT,
    overflow: "hidden",
  },
  itemContainer: {
    width: "100%",
    height: ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  highlightContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
});
