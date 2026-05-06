"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { enUS, ru, srLatn } from "date-fns/locale";
import { ChevronDownIcon } from "lucide-react";
import { InputTags } from "@/components/common/input-tags";
import { ImageUpload } from "@/components/common/image-upload";
import { useTranslation } from "react-i18next";
import { validateEventImage, processEventImage } from "@/lib/image-utils";
import * as api from "@/lib/api-client";
import { useVenuesStore } from "@/store/venues";
import "../i18n";

// Form validation schema factory
const createEventFormSchema = (t: (key: string) => string) =>
  z
    .object({
      venue_id: z.string().min(1, t("eventDialog.validation.venueRequired")),
      title: z.string().min(1, t("eventDialog.validation.titleRequired")),
      description: z
        .string()
        .min(1, t("eventDialog.validation.descriptionRequired")),
      start_date_time: z
        .string()
        .min(1, t("eventDialog.validation.startDateTimeRequired")),
      end_date_time: z
        .string()
        .min(1, t("eventDialog.validation.endDateTimeRequired")),
      tags: z
        .array(z.string())
        .min(1, t("eventDialog.validation.tagsRequired")),
      picture_url: z.string().optional(),
      status: z.enum(["draft", "active", "cancelled"]),
    })
    .refine(
      (data) => {
        if (data.start_date_time && data.end_date_time) {
          return new Date(data.end_date_time) > new Date(data.start_date_time);
        }
        return true;
      },
      {
        message: t("eventDialog.validation.endAfterStart"),
        path: ["end_date_time"],
      },
    );

export type EventFormData = z.infer<ReturnType<typeof createEventFormSchema>>;

interface Event {
  id: number;
  venue_id: number;
  title: string;
  description: string;
  start_date_time: string;
  end_date_time: string;
  tags: string[];
  picture_url?: string;
  status: "draft" | "active" | "cancelled";
  tickets_sold?: number;
  venue_name?: string;
}

interface CreateEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Event | null;
}

export function CreateEventDialog({
  isOpen,
  onClose,
  event,
}: CreateEventDialogProps) {
  const { t, i18n } = useTranslation();
  const { userId } = useAuth();
  const { venues: storeVenues, fetchVenues } = useVenuesStore();
  const venues = useMemo(
    () =>
      storeVenues.map((v) => ({
        id: v.id,
        name: v.name,
        longitude: v.longitude,
        latitude: v.latitude,
        type: v.type,
        capacity: v.capacity,
      })),
    [storeVenues],
  );
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const isEditing = !!event;

  // Get date-fns locale based on current language
  const getDateLocale = () => {
    switch (i18n.language) {
      case "ru":
        return ru;
      case "sr":
        return srLatn;
      default:
        return enUS;
    }
  };

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(createEventFormSchema(t)),
    defaultValues: {
      venue_id: "",
      title: "",
      description: "",
      start_date_time: "",
      end_date_time: "",
      tags: [],
      picture_url: "",
      status: "draft",
    },
  });

  const startDateTime = watch("start_date_time");

  // Ensure venues are loaded from store cache when dialog opens
  useEffect(() => {
    if (isOpen && userId) {
      fetchVenues(userId);
    }
  }, [userId, isOpen, fetchVenues]);

  // Reset form when event changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      if (event) {
        // Editing mode - pre-fill with event data
        reset({
          venue_id: event.venue_id.toString(),
          title: event.title,
          description: event.description,
          start_date_time: event.start_date_time,
          end_date_time: event.end_date_time,
          tags: event.tags,
          picture_url: event.picture_url || "",
          status: event.status,
        });
        setPicturePreview(event.picture_url || null);
        setImageFile(null); // Can't re-edit existing image
      } else {
        // Create mode - reset to defaults
        reset({
          venue_id: venues.length > 0 ? venues[0].id.toString() : "",
          title: "",
          description: "",
          start_date_time: "",
          end_date_time: "",
          tags: [],
          picture_url: "",
          status: "draft",
        });
        setPicturePreview(null);
        setImageFile(null);
      }
    }
  }, [isOpen, event, reset, venues]);

  const handleFileChange = async (file: File | null) => {
    if (!file) {
      setImageFile(null);
      setPicturePreview(null);
      return;
    }

    // Validate image
    const validation = validateEventImage(file);
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

  const handleFormSubmit = async (data: EventFormData) => {
    if (!userId) {
      toast.error(
        t("dashboard.eventsPage.toast.noAuth") || "You must be logged in",
      );
      return;
    }

    try {
      let processedFile: File | undefined;

      // Process image before upload
      if (imageFile) {
        const processedBlob = await processEventImage(imageFile);
        processedFile = new File([processedBlob], "event-image.webp", {
          type: "image/webp",
        });
      }

      if (event?.id) {
        // Update existing event
        const updates = {
          venue_id: parseInt(data.venue_id),
          title: data.title,
          description: data.description,
          start_date_time: data.start_date_time,
          end_date_time: data.end_date_time,
          tags: data.tags,
          status: data.status,
        };

        await api.updateEvent(event.id, updates, processedFile);

        toast.success(
          t("dashboard.eventsPage.toast.updated") ||
            "Event updated successfully",
        );
      } else {
        // Create new event
        const newEventData = {
          host_id: userId,
          venue_id: parseInt(data.venue_id),
          title: data.title,
          description: data.description,
          start_date_time: data.start_date_time,
          end_date_time: data.end_date_time,
          tags: data.tags,
          status: data.status,
        };

        await api.createEvent(newEventData, processedFile);

        toast.success(
          t("dashboard.eventsPage.toast.created") ||
            "Event created successfully",
        );
      }

      onClose();
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error(
        event?.id
          ? t("dashboard.eventsPage.toast.updateError") ||
              "Failed to update event"
          : t("dashboard.eventsPage.toast.createError") ||
              "Failed to create event",
      );
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t("eventDialog.editTitle")
              : t("eventDialog.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t("eventDialog.editDescription")
              : t("eventDialog.createDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="grid gap-4 py-4">
            {/* Picture Upload */}
            <ImageUpload
              type="event"
              label={t("eventDialog.fields.picture")}
              description={`${t("eventDialog.fields.pictureDescription")} (Auto-resized to 500×375px WebP, max 5MB)`}
              onFileChange={handleFileChange}
              preview={picturePreview}
            />

            {/* Venue Selection */}
            <div className="grid gap-2">
              <Label htmlFor="venue_id">
                {t("eventDialog.fields.venue")} *
              </Label>
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
                <p className="text-sm text-red-500">
                  {errors.venue_id.message}
                </p>
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
                <p className="text-sm text-red-500">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid gap-4">
              {/* Start Date & Time */}
              <div className="grid gap-2">
                <Label>{t("eventDialog.fields.startDateTime")} *</Label>
                <Controller
                  name="start_date_time"
                  control={control}
                  render={({ field }) => {
                    const dateValue = field.value
                      ? new Date(field.value)
                      : undefined;
                    const timeValue = field.value
                      ? format(new Date(field.value), "HH:mm")
                      : "";

                    return (
                      <div className="flex gap-2">
                        <Popover
                          open={startDateOpen}
                          onOpenChange={setStartDateOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="flex-1 justify-between font-normal"
                            >
                              {dateValue
                                ? format(dateValue, "PPP (EEEE)", {
                                    locale: getDateLocale(),
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
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                              }
                              onSelect={(date) => {
                                if (date) {
                                  const time = timeValue || "00:00";
                                  const [hours, minutes] = time.split(":");
                                  date.setHours(
                                    parseInt(hours),
                                    parseInt(minutes),
                                  );
                                  field.onChange(date.toISOString());

                                  // Automatically set end date/time to +5 hours
                                  const endDate = new Date(date);
                                  endDate.setHours(endDate.getHours() + 5);
                                  setValue(
                                    "end_date_time",
                                    endDate.toISOString(),
                                  );
                                }
                                setStartDateOpen(false);
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

                            // Automatically set end date/time to +5 hours
                            const endDate = new Date(date);
                            endDate.setHours(endDate.getHours() + 5);
                            setValue("end_date_time", endDate.toISOString());
                          }}
                          className="w-32 bg-background"
                        />
                      </div>
                    );
                  }}
                />
                {errors.start_date_time && (
                  <p className="text-sm text-red-500">
                    {errors.start_date_time.message}
                  </p>
                )}
              </div>

              {/* End Date & Time */}
              <div className="grid gap-2">
                <Label>{t("eventDialog.fields.endDateTime")} *</Label>
                <Controller
                  name="end_date_time"
                  control={control}
                  render={({ field }) => {
                    const dateValue = field.value
                      ? new Date(field.value)
                      : undefined;
                    const timeValue = field.value
                      ? format(new Date(field.value), "HH:mm")
                      : "";

                    return (
                      <div className="flex gap-2">
                        <Popover
                          open={endDateOpen}
                          onOpenChange={setEndDateOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="flex-1 justify-between font-normal"
                            >
                              {dateValue
                                ? format(dateValue, "PPP (EEEE)", {
                                    locale: getDateLocale(),
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
                              disabled={(date) => {
                                const today = new Date(
                                  new Date().setHours(0, 0, 0, 0),
                                );
                                if (date < today) return true;

                                if (startDateTime) {
                                  const startDate = new Date(startDateTime);
                                  startDate.setHours(0, 0, 0, 0);
                                  return date < startDate;
                                }

                                return false;
                              }}
                              onSelect={(date) => {
                                if (date) {
                                  const time = timeValue || "00:00";
                                  const [hours, minutes] = time.split(":");
                                  date.setHours(
                                    parseInt(hours),
                                    parseInt(minutes),
                                  );
                                  field.onChange(date.toISOString());
                                }
                                setEndDateOpen(false);
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
                          }}
                          className="w-32 bg-background"
                        />
                      </div>
                    );
                  }}
                />
                {errors.end_date_time && (
                  <p className="text-sm text-red-500">
                    {errors.end_date_time.message}
                  </p>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label htmlFor="status">{t("eventDialog.fields.status")} *</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">
                        {t("eventDialog.statuses.draft")}
                      </SelectItem>
                      <SelectItem value="active">
                        {t("eventDialog.statuses.active")}
                      </SelectItem>
                      <SelectItem value="cancelled">
                        {t("eventDialog.statuses.cancelled")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && (
                <p className="text-sm text-red-500">{errors.status.message}</p>
              )}
            </div>

            {/* Tags */}
            <div className="grid gap-2">
              <Label htmlFor="tags">{t("eventDialog.fields.tags")} *</Label>
              <Controller
                name="tags"
                control={control}
                render={({ field }) => (
                  <InputTags
                    {...field}
                    placeholder={t("eventDialog.placeholders.tags")}
                  />
                )}
              />
              {errors.tags && (
                <p className="text-sm text-red-500">{errors.tags.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              {t("eventDialog.buttons.cancel")}
            </Button>
            <Button type="submit">
              {isEditing
                ? t("eventDialog.buttons.update")
                : t("eventDialog.buttons.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
