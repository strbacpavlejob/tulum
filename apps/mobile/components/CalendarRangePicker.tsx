import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { format } from "date-fns";
import type { Locale } from "date-fns";
import { ArrowLeft, ArrowRight } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, View } from "react-native";
import CalendarPicker, { ChangedDate } from "react-native-calendar-picker";
import { Button } from "./ui/button";
import { enUS, ru, srLatn } from "date-fns/locale";

interface CalendarRangePickerProps {
  startDate?: Date | null;
  endDate?: Date | null;
  onChangeStartDate: (date: Date | null) => void;
  onChangeEndDate: (date: Date | null) => void;
  minDate?: Date;
}

const CalendarRangePicker = ({
  startDate = null,
  endDate = null,
  onChangeStartDate,
  onChangeEndDate,
  minDate,
}: CalendarRangePickerProps) => {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const [tempStart, setTempStart] = useState<Date | null>(startDate);
  const [tempEnd, setTempEnd] = useState<Date | null>(endDate);

  const handleOpen = () => {
    setTempStart(startDate ?? null);
    setTempEnd(endDate ?? null);
    setOpen(true);
  };

  const handleCancel = () => setOpen(false);

  const handleApply = () => {
    onChangeStartDate(tempStart ?? null);
    onChangeEndDate(tempEnd ?? null);
    setOpen(false);
  };

  const onDateChange = (date: Date, type: ChangedDate) => {
    if (type === "END_DATE") {
      setTempEnd(date);
    } else {
      setTempStart(date);
      setTempEnd(null);
    }
  };

  const dateLocale = useMemo<Locale>(() => {
    switch (i18n.language) {
      case "RU":
        return ru;
      case "RS":
        return srLatn;
      default:
        return enUS;
    }
  }, [i18n.language]);

  const weekdays = useMemo(
    () =>
      Array.from(
        { length: 7 },
        (_, dayIndex) =>
          dateLocale.localize?.day(dayIndex as 0 | 1 | 2 | 3 | 4 | 5 | 6, {
            width: "abbreviated",
          }) ?? "",
      ),
    [dateLocale],
  );

  const label = useMemo(() => {
    const s = tempStart ?? startDate;
    const e = tempEnd ?? endDate;
    const fmt = (d?: Date | null) =>
      d ? format(d, "iii - MMM d", { locale: dateLocale }) : "—";
    return `${fmt(s)} - ${fmt(e)}`;
  }, [tempStart, tempEnd, startDate, endDate, dateLocale]);

  const months = useMemo(
    () =>
      Array.from(
        { length: 12 },
        (_, monthIndex) =>
          dateLocale.localize?.month(
            monthIndex as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11,
            { width: "abbreviated" },
          ) ?? "",
      ),
    [dateLocale],
  );

  return (
    <View className="flex-row gap-3 justify-between items-center">
      <Text className="font-bold text-light-gray11 dark:text-dark-gray11">
        {t("dateRange")}
      </Text>
      <Pressable onPress={handleOpen}>
        <Text className="text-xs text-light-gray10 dark:text-dark-gray10">
          {label}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50">
          <View
            className="w-[90%] rounded-xl bg-light-background p-4 dark:bg-dark-background"
            style={{
              maxWidth: 520,
              elevation: 5,
            }}
          >
            <View className="gap-3">
              <CalendarPicker
                height={320}
                startFromMonday
                allowRangeSelection
                previousComponent={
                  <ArrowLeft size={20} color={theme.gray11} className="ml-8" />
                }
                nextComponent={
                  <ArrowRight size={20} color={theme.gray11} className="mr-8" />
                }
                minDate={minDate ?? new Date()}
                todayBackgroundColor={theme.backgroundStrong}
                selectedDayColor={theme.color}
                selectedDayTextColor={theme.colorStrong}
                textStyle={{ color: theme.gray11 }}
                monthTitleStyle={{
                  color: theme.gray11,
                  textTransform: "capitalize",
                }}
                onDateChange={onDateChange}
                weekdays={weekdays}
                months={months}
              />
              <View className="flex-row gap-3 justify-end mt-2">
                <Button
                  variant="outline"
                  className="border-light-gray4 bg-light-gray3 dark:border-dark-gray4 dark:bg-dark-gray3"
                  onPress={handleCancel}
                >
                  <Text className="font-semibold text-light-gray11 dark:text-dark-gray11">
                    {t("cancel")}
                  </Text>
                </Button>
                <Button
                  variant="outline"
                  style={{
                    backgroundColor: theme.color,
                    opacity: !tempStart || !tempEnd ? 0.5 : 1,
                  }}
                  disabled={!tempStart || !tempEnd}
                  onPress={handleApply}
                >
                  <Text className="text-white">{t("apply")}</Text>
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default CalendarRangePicker;
