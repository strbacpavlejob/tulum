"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { ImageUpload } from "@/components/common/image-upload";
import { LocationPicker } from "@/components/common/location-picker";
import { validateVenueImage, processVenueImage } from "@/lib/image-utils";
import { getNewDarkMapStyle } from "@/public/map-styles/dark";
import { getNewLightMapStyle } from "@/public/map-styles/light";
import type MapLibreGL from "maplibre-gl";
import * as api from "@/lib/api-client";
import type { VenueType } from "@/lib/types/database";
import "../i18n";

// Venue type options for the select dropdown
const VENUE_TYPE_OPTIONS: { value: VenueType; key: string }[] = [
  { value: "bar", key: "bar" },
  { value: "pub", key: "pub" },
  { value: "nightclub", key: "nightclub" },
  { value: "restaurant", key: "restaurant" },
  { value: "cafe", key: "cafe" },
  { value: "cocktail_bar", key: "cocktail_bar" },
  { value: "wine_bar", key: "wine_bar" },
  { value: "brewery", key: "brewery" },
  { value: "tavern", key: "tavern" },
  { value: "raft", key: "raft" },
];

// Form validation schema factory
const createVenueFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z
      .string()
      .min(1, t("venueDialog.validation.nameRequired") || "Name is required"),
    description: z.string().optional(),
    venue_type: z
      .string()
      .min(
        1,
        t("venueDialog.validation.typeRequired") || "Venue type is required",
      ),
    latitude: z
      .string()
      .min(
        1,
        t("venueDialog.validation.latitudeRequired") || "Latitude is required",
      ),
    longitude: z
      .string()
      .min(
        1,
        t("venueDialog.validation.longitudeRequired") ||
          "Longitude is required",
      ),
    address: z
      .string()
      .min(
        1,
        t("venueDialog.validation.addressRequired") || "Address is required",
      ),
    capacity: z
      .string()
      .min(
        1,
        t("venueDialog.validation.capacityRequired") || "Capacity is required",
      ),
    picture_url: z.string().optional(),
  });

export type VenueFormData = z.infer<ReturnType<typeof createVenueFormSchema>>;

interface Venue {
  id: number;
  name: string;
  longitude: number;
  latitude: number;
  type: string;
  capacity: number;
  address?: string;
  description?: string;
  picture_url?: string;
  picture_urls?: string[];
}

interface CreateVenueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  venue?: Venue | null;
}

export function CreateVenueDialog({
  isOpen,
  onClose,
  venue,
}: CreateVenueDialogProps) {
  const { t } = useTranslation();
  const { userId } = useAuth();
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mapPosition, setMapPosition] = useState<[number, number]>([
    20.4489, 44.8125,
  ]);
  const [detectedTheme, setDetectedTheme] = useState<"light" | "dark">(
    typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
      ? "dark"
      : "light",
  );
  const [dark, setDark] = useState<
    string | MapLibreGL.StyleSpecification | null
  >(null);
  const [light, setLight] = useState<
    string | MapLibreGL.StyleSpecification | null
  >(null);
  const isEditing = !!venue;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<VenueFormData>({
    resolver: zodResolver(createVenueFormSchema(t)),
    defaultValues: {
      name: "",
      description: "",
      venue_type: "nightclub",
      latitude: "",
      longitude: "",
      address: "",
      capacity: "100",
      picture_url: "",
    },
  });

  // Load map styles
  useEffect(() => {
    (async () => {
      const darkStyle = await getNewDarkMapStyle();
      const lightStyle = await getNewLightMapStyle();
      setDark(darkStyle);
      setLight(lightStyle);
    })();
  }, []);

  // Detect theme changes
  useEffect(() => {
    const updateTheme = () => {
      setDetectedTheme(
        document.documentElement.classList.contains("dark") ? "dark" : "light",
      );
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Reset form when venue changes or dialog opens
  useEffect(() => {
    if (!isOpen) return;

    if (venue) {
      // Editing mode - pre-fill with venue data
      const lng = venue.longitude;
      const lat = venue.latitude;

      reset({
        name: venue.name,
        description: venue.description || "",
        venue_type: venue.type,
        latitude: lat.toString(),
        longitude: lng.toString(),
        address: venue.address || "",
        capacity: venue.capacity.toString(),
        picture_url: venue.picture_urls?.[0] || "",
      });
    } else {
      // Create mode - reset to defaults
      const defaultLng = 20.4489;
      const defaultLat = 44.8125;

      reset({
        name: "",
        description: "",
        venue_type: "nightclub",
        latitude: defaultLat.toString(),
        longitude: defaultLng.toString(),
        address: "",
        capacity: "100",
        picture_url: "",
      });
    }
  }, [isOpen, venue, reset]);

  // Sync UI state when dialog opens or venue changes
  useLayoutEffect(() => {
    if (!isOpen) return;

    // Batch all state updates together using queueMicrotask
    // This ensures they happen in a single render cycle
    queueMicrotask(() => {
      if (venue) {
        const pictureUrl = venue.picture_urls?.[0] || venue.picture_url || null;
        const lng = venue.longitude;
        const lat = venue.latitude;

        setPicturePreview(pictureUrl);
        setMapPosition([lng, lat]);
      } else {
        setPicturePreview(null);
        setMapPosition([20.4489, 44.8125]);
      }
    });
  }, [isOpen, venue]);

  const handleFileChange = async (file: File | null) => {
    if (!file) {
      setImageFile(null);
      setPicturePreview(null);
      return;
    }

    // Validate image
    const validation = validateVenueImage(file);
    if (!validation.valid) {
      alert(validation.error);
      setImageFile(null);
      setPicturePreview(null);
      return;
    }

    // Store the file for later upload
    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPicturePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = async (data: VenueFormData) => {
    if (!userId) {
      toast.error(
        t("dashboard.venuesPage.toast.noAuth") || "You must be logged in",
      );
      return;
    }

    try {
      let processedFile: File | undefined;

      // Process image before upload
      if (imageFile) {
        const processedBlob = await processVenueImage(imageFile);
        processedFile = new File([processedBlob], "venue-image.webp", {
          type: "image/webp",
        });
      }

      if (venue?.id) {
        // Update existing venue
        const updates = {
          name: data.name,
          description: data.description,
          venue_type: data.venue_type as VenueType,
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          address: data.address,
          capacity: parseInt(data.capacity),
          picture_url: data.picture_url,
        };

        await api.updateVenue(venue.id, updates, processedFile);

        toast.success(
          t("dashboard.venuesPage.toast.updated") ||
            "Venue updated successfully",
        );
      } else {
        // Create new venue
        const newVenueData = {
          host_id: userId,
          name: data.name,
          description: data.description,
          venue_type: data.venue_type as VenueType,
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          address: data.address,
          capacity: parseInt(data.capacity),
        };

        await api.createVenue(newVenueData, processedFile);

        toast.success(
          t("dashboard.venuesPage.toast.created") ||
            "Venue created successfully",
        );
      }

      onClose();
    } catch (error) {
      console.error("Error saving venue:", error);

      // Provide more specific error messages
      let errorMessage = venue?.id
        ? t("dashboard.venuesPage.toast.updateError") ||
          "Failed to update venue"
        : t("dashboard.venuesPage.toast.createError") ||
          "Failed to create venue";

      // Type guard for Supabase errors
      interface SupabaseError {
        message?: string;
        details?: string;
        hint?: string;
        code?: string;
      }

      const isSupabaseError = (err: unknown): err is SupabaseError => {
        return typeof err === "object" && err !== null && "message" in err;
      };

      if (isSupabaseError(error)) {
        if (error.code === "23503") {
          errorMessage =
            "Foreign key constraint failed. Please ensure you have a valid user and host profile.";
        } else if (error.message) {
          errorMessage += `: ${error.message}`;
        }
      }

      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t("venueDialog.editTitle") || "Edit Venue"
              : t("venueDialog.createTitle") || "Create New Venue"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t("venueDialog.editDescription") ||
                "Update the venue details below"
              : t("venueDialog.createDescription") ||
                "Fill in the venue details below"}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="grid gap-4 py-4 overflow-y-auto flex-1 px-1">
            {/* Picture Upload */}
            <ImageUpload
              type="venue"
              label={t("venueDialog.fields.picture") || "Picture"}
              description={
                t("venueDialog.fields.pictureDescription") ||
                "Upload a picture of the venue (optional)"
              }
              onFileChange={handleFileChange}
              preview={picturePreview}
            />

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
                            t("venueDialog.placeholders.type") ||
                            "Select venue type"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {VENUE_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {t(`venueDialog.types.${option.key}`) ||
                              option.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.venue_type && (
                  <p className="text-sm text-red-500">
                    {errors.venue_type.message}
                  </p>
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
                <p className="text-sm text-red-500">
                  {errors.description.message}
                </p>
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
                <p className="text-sm text-red-500">
                  {errors.capacity.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              {t("venueDialog.buttons.cancel") || "Cancel"}
            </Button>
            <Button type="submit">
              {isEditing
                ? t("venueDialog.buttons.update") || "Update"
                : t("venueDialog.buttons.create") || "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
