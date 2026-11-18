"use client";

import type { Dispatch, SetStateAction } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VENUE_TYPE_OPTIONS, type VenueFormData } from "./venue-form";
import type { MapStyle } from "./use-map-styles";
import { Textarea } from "@/components/ui/textarea";
import { LocationPicker } from "@/components/common/location-picker";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";

interface VenueFormFieldsProps {
  register: UseFormRegister<VenueFormData>;
  errors: FieldErrors<VenueFormData>;
  control: Control<VenueFormData>;
  setValue: UseFormSetValue<VenueFormData>;
  mapPosition: [number, number];
  setMapPosition: Dispatch<SetStateAction<[number, number]>>;
  detectedTheme: "light" | "dark";
  dark: MapStyle;
  light: MapStyle;
  requiresReservation: boolean;
  setRequiresReservation: Dispatch<SetStateAction<boolean>>;
}

export function VenueFormFields({
  register,
  errors,
  control,
  setValue,
  mapPosition,
  setMapPosition,
  detectedTheme,
  dark,
  light,
  requiresReservation,
  setRequiresReservation,
}: VenueFormFieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      {/* Name and Venue Type Row */}
      <div className="flex gap-3">
        {/* Name */}
        <div className="grid gap-2 flex-2">
          <Label htmlFor="name">
            {t("venueDialog.fields.name") || "Name"} *
          </Label>
          <Input
            id="name"
            placeholder={
              t("venueDialog.placeholders.name") || "Enter venue name"
            }
            {...register("name")}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Venue Type */}
        <div className="grid gap-2 flex-1">
          <Label htmlFor="venue_type">
            {t("venueDialog.fields.type") || "Type"} *
          </Label>
          <Controller
            name="venue_type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      t("venueDialog.placeholders.type") || "Select venue type"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {VENUE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(`venueDialog.types.${option.key}`) || option.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.venue_type && (
            <p className="text-sm text-red-500">{errors.venue_type.message}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="grid gap-2">
        <Label htmlFor="description">
          {t("venueDialog.fields.description") || "Description"}
        </Label>
        <Textarea
          id="description"
          placeholder={
            t("venueDialog.placeholders.description") ||
            "Enter venue description"
          }
          rows={4}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      {/* Location Picker (Address + Map) */}
      <LocationPicker
        register={register}
        setValue={setValue}
        errors={errors}
        mapPosition={mapPosition}
        onMapPositionChange={setMapPosition}
        theme={detectedTheme}
        darkStyle={dark}
        lightStyle={light}
        t={t}
      />

      {/* Capacity */}
      <div className="grid gap-2">
        <Label htmlFor="capacity">
          {t("venueDialog.fields.capacity") || "Capacity"} *
        </Label>
        <Input
          id="capacity"
          type="number"
          placeholder={t("venueDialog.placeholders.capacity") || "100"}
          min="1"
          {...register("capacity")}
        />
        {errors.capacity && (
          <p className="text-sm text-red-500">{errors.capacity.message}</p>
        )}
      </div>

      {/* Requires Reservation */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="grid gap-0.5">
          <Label htmlFor="requires_reservation">
            {t("venueDialog.fields.requiresReservation") ||
              "Requires Reservation"}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("venueDialog.fields.requiresReservationDescription") ||
              "Guests must make a reservation to attend"}
          </p>
        </div>
        <Switch
          id="requires_reservation"
          checked={requiresReservation}
          onCheckedChange={setRequiresReservation}
        />
      </div>
    </>
  );
}
