import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { format } from "date-fns";
import { ArrowLeft, ArrowRight } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import CalendarPicker, { ChangedDate } from "react-native-calendar-picker";

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

  const label = useMemo(() => {
    const s = tempStart ?? startDate;
    const e = tempEnd ?? endDate;
    const fmt = (d?: Date | null) => (d ? format(d, "iii - MMM d ") : "—");
    return `${fmt(s)} - ${fmt(e)}`;
  }, [tempStart, tempEnd, startDate, endDate]);

  return (
    <View className="flex-row gap-3 justify-between items-center">
      <Text className="font-bold" style={{ color: theme.gray11 }}>
        Date Range
      </Text>
      <Pressable onPress={handleOpen}>
        <Text className="text-xs" style={{ color: theme.gray10 }}>
          {label}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50">
          <View
            className="rounded-xl p-4 w-[90%]"
            style={{
              maxWidth: 520,
              elevation: 5,
              backgroundColor: theme.background,
            }}
          >
            <View className="gap-3">
              <CalendarPicker
                height={320}
                startFromMonday
                allowRangeSelection
                previousComponent={<ArrowLeft size={20} color={theme.gray11} />}
                nextComponent={<ArrowRight size={20} color={theme.gray11} />}
                minDate={minDate ?? new Date()}
                todayBackgroundColor={theme.backgroundStrong}
                selectedDayColor={theme.color}
                selectedDayTextColor={theme.accentBackground}
                textStyle={{ color: theme.gray11 }}
                onDateChange={onDateChange}
              />
              <View className="flex-row gap-3 justify-end mt-2">
                <Pressable
                  className="px-4 py-2 border rounded-lg"
                  style={{ borderColor: theme.gray4 }}
                  onPress={handleCancel}
                >
                  <Text>Cancel</Text>
                </Pressable>
                <Pressable
                  className="px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: theme.color,
                    opacity: !tempStart || !tempEnd ? 0.5 : 1,
                  }}
                  disabled={!tempStart || !tempEnd}
                  onPress={handleApply}
                >
                  <Text className="text-white">Apply</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default CalendarRangePicker;
