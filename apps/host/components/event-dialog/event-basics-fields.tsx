"use client";

import { Label } from "@/components/ui/label";
import { Controller } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import type { EventFormData } from "./event-form";

interface EventBasicsFieldsProps {
  control: Control<EventFormData>;
  venues: { id: string; name: string }[];
  errors: FieldErrors<EventFormData>;
  register: UseFormRegister<EventFormData>;
}

export function EventBasicsFields({
  control,
  venues,
  errors,
  register,
}: EventBasicsFieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      {/* Venue Selection */}
      <div className="grid gap-2">
        <Label htmlFor="venue_id">{t("eventDialog.fields.venue")} *</Label>
        <Controller
          name="venue_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("eventDialog.placeholders.venue")}
                />
              </SelectTrigger>
              <SelectContent>
                {venues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id.toString()}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.venue_id && (
          <p className="text-sm text-red-500">{errors.venue_id.message}</p>
        )}
      </div>

      {/* Title */}
      <div className="grid gap-2">
        <Label htmlFor="title">{t("eventDialog.fields.title")} *</Label>
        <Input
          id="title"
          placeholder={t("eventDialog.placeholders.title")}
          {...register("title")}
        />
        {errors.title && (
          <p className="text-sm text-red-500">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="grid gap-2">
        <Label htmlFor="description">
          {t("eventDialog.fields.description")} *
        </Label>
        <Textarea
          id="description"
          placeholder={t("eventDialog.placeholders.description")}
          rows={4}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>
    </>
  );
}
