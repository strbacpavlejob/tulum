"use client";

import { useState } from "react";
import { Controller, type Control, type FieldError } from "react-hook-form";
import { format } from "date-fns";
import { enUS, ru, srLatn } from "date-fns/locale";
import { ChevronDownIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { EventFormData } from "./event-form";

// Get date-fns locale based on current language
const dateLocaleFor = (language: string) => {
  switch (language) {
    case "ru":
      return ru;
    case "sr":
      return srLatn;
    default:
      return enUS;
  }
};

interface DateTimeFieldProps {
  name: "start_date_time" | "end_date_time";
  label: string;
  control: Control<EventFormData>;
  error?: FieldError;
  /** Days the calendar doesn't offer. */
  isDateDisabled: (date: Date) => boolean;
  /** Called with the new instant after the host picks a date or a time. */
  onPicked?: (date: Date) => void;
}

/** A date picker and a time input that edit one ISO date-time field. */
export function DateTimeField({
  name,
  label,
  control,
  error,
  isDateDisabled,
  onPicked,
}: DateTimeFieldProps) {
  const { t, i18n } = useTranslation();
  const [dateOpen, setDateOpen] = useState(false);

  return (
    <div className="grid gap-2">
      <Label>{label} *</Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          const dateValue = field.value ? new Date(field.value) : undefined;
          const timeValue = field.value
            ? format(new Date(field.value), "HH:mm")
            : "";

          return (
            <div className="flex gap-2">
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 justify-between font-normal"
                  >
                    {dateValue
                      ? format(dateValue, "PPP (EEEE)", {
                          locale: dateLocaleFor(i18n.language),
                        })
                      : t("eventDialog.placeholders.selectDate")}
                    <ChevronDownIcon className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto overflow-hidden p-0"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={dateValue}
                    captionLayout="dropdown"
                    defaultMonth={dateValue}
                    disabled={isDateDisabled}
                    onSelect={(date) => {
                      if (date) {
                        const time = timeValue || "00:00";
                        const [hours, minutes] = time.split(":");
                        date.setHours(parseInt(hours), parseInt(minutes));
                        field.onChange(date.toISOString());
                        onPicked?.(date);
                      }
                      setDateOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                value={timeValue}
                onChange={(e) => {
                  const date = dateValue || new Date();
                  const [hours, minutes] = e.target.value.split(":");
                  date.setHours(parseInt(hours), parseInt(minutes));
                  field.onChange(date.toISOString());
                  onPicked?.(date);
                }}
                className="w-32 bg-background"
              />
            </div>
          );
        }}
      />
      {error && <p className="text-sm text-red-500">{error.message}</p>}
    </div>
  );
}
