"use client";

import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InputTags } from "@/components/common/input-tags";
import { ImageUpload } from "@/components/common/image-upload";
import { useTranslation } from "react-i18next";
import { validateEventImage } from "@/lib/image-utils";
import { useVenuesStore } from "@/store/venues";
import "../i18n";
import { EventStatusButton } from "./event-dialog/event-status-button";
import { DateTimeField } from "./event-dialog/date-time-field";
import { EventAiAssist } from "./event-dialog/event-ai-assist";
import { saveEvent } from "./event-dialog/save-event";
import {
  createEventFormSchema,
  EMPTY_EVENT_FORM,
  type EditableEvent,
  type EventFormData,
} from "./event-dialog/event-form";
import { useImageFile } from "./common/use-image-file";
import { EventBasicsFields } from "./event-dialog/event-basics-fields";

interface CreateEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event?: EditableEvent | null;
}

export function CreateEventDialog({
  isOpen,
  onClose,
  event,
}: CreateEventDialogProps) {
  const { t } = useTranslation();
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
  const {
    picturePreview,
    setPicturePreview,
    imageFile,
    setImageFile,
    handleFileChange,
  } = useImageFile(validateEventImage);
  const isEditing = !!event;

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
    defaultValues: EMPTY_EVENT_FORM,
  });

  const startDateTime = watch("start_date_time");
  const watchedStatus = watch("status") as "draft" | "active" | "cancelled";
  const watchedTitle = watch("title");
  const watchedDescription = watch("description");
  const watchedTags = watch("tags");
  const watchedVenueId = watch("venue_id");
  const venueName = venues.find((v) => v.id === watchedVenueId)?.name ?? "";

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
          ...EMPTY_EVENT_FORM,
          venue_id: venues.length > 0 ? venues[0].id.toString() : "",
          tags: [],
        });
        setPicturePreview(null);
        setImageFile(null);
      }
    }
  }, [isOpen, event, reset, venues, setPicturePreview, setImageFile]);

  const handleFormSubmit = async (data: EventFormData) => {
    if (!userId) {
      toast.error(
        t("dashboard.eventsPage.toast.noAuth") || "You must be logged in",
      );
      return;
    }

    try {
      await saveEvent({ data, userId, eventId: event?.id, imageFile });
      toast.success(
        event?.id
          ? t("dashboard.eventsPage.toast.updated") ||
              "Event updated successfully"
          : t("dashboard.eventsPage.toast.created") ||
              "Event created successfully",
      );
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

            <EventBasicsFields
              control={control}
              venues={venues}
              errors={errors}
              register={register}
            />

            {/* Date and Time */}
            <div className="grid gap-4">
              <DateTimeField
                name="start_date_time"
                label={t("eventDialog.fields.startDateTime")}
                control={control}
                error={errors.start_date_time}
                isDateDisabled={(date) =>
                  date < new Date(new Date().setHours(0, 0, 0, 0))
                }
                onPicked={(date) => {
                  // Automatically set end date/time to +5 hours
                  const endDate = new Date(date);
                  endDate.setHours(endDate.getHours() + 5);
                  setValue("end_date_time", endDate.toISOString());
                }}
              />
              <DateTimeField
                name="end_date_time"
                label={t("eventDialog.fields.endDateTime")}
                control={control}
                error={errors.end_date_time}
                isDateDisabled={(date) => {
                  const today = new Date(new Date().setHours(0, 0, 0, 0));
                  if (date < today) return true;

                  if (startDateTime) {
                    const startDate = new Date(startDateTime);
                    startDate.setHours(0, 0, 0, 0);
                    return date < startDate;
                  }

                  return false;
                }}
              />
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

          {/* AI Enhancement */}
          <EventAiAssist
            title={watchedTitle}
            description={watchedDescription}
            tags={watchedTags}
            venueName={venueName}
            imageUrl={event?.picture_url || null}
            setValue={setValue}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              {t("eventDialog.buttons.cancel")}
            </Button>
            <EventStatusButton
              watchedStatus={watchedStatus}
              setValue={setValue}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
