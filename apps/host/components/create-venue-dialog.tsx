"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import * as api from "@/lib/api-client";
import "../i18n";
import { VenueContactSection } from "./venue-dialog/venue-contact-section";
import { useMapStyles } from "./venue-dialog/use-map-styles";
import { useImageFile } from "./common/use-image-file";
import { validateVenueImage } from "@/lib/image-utils";
import { useVenueContact } from "./venue-dialog/use-venue-contact";
import {
  createVenueFormSchema,
  DEFAULT_MAP_POSITION,
  EMPTY_CONTACT_FORM,
  EMPTY_VENUE_FORM,
  type EditableVenue,
  type VenueFormData,
} from "./venue-dialog/venue-form";
import { VenueFormFields } from "./venue-dialog/venue-form-fields";
import { saveVenue, saveVenueErrorMessage } from "./venue-dialog/save-venue";
import { VenuePictureField } from "./venue-dialog/venue-picture-field";

interface CreateVenueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  venue?: EditableVenue | null;
}

export function CreateVenueDialog({
  isOpen,
  onClose,
  venue,
}: CreateVenueDialogProps) {
  const { t } = useTranslation();
  const { userId } = useAuth();
  const {
    picturePreview,
    setPicturePreview,
    imageFile,
    setImageFile,
    handleFileChange,
  } = useImageFile(validateVenueImage);
  const [isRefreshingInstagram, setIsRefreshingInstagram] = useState(false);
  const [requiresReservation, setRequiresReservation] = useState(false);
  const [mapPosition, setMapPosition] = useState<[number, number]>([
    ...DEFAULT_MAP_POSITION,
  ]);
  const { detectedTheme, dark, light } = useMapStyles();
  const {
    instagramHandle,
    contactForm,
    setContactForm,
    hasExistingContact,
    setHasExistingContact,
    isDeletingContact,
    isImportingContact,
    handleImportContactFromInstagram,
    handleDeleteContact,
  } = useVenueContact(isOpen, venue?.id);
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
    defaultValues: EMPTY_VENUE_FORM,
  });

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
      const [defaultLng, defaultLat] = DEFAULT_MAP_POSITION;

      reset({
        ...EMPTY_VENUE_FORM,
        latitude: defaultLat.toString(),
        longitude: defaultLng.toString(),
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
        setRequiresReservation(
          (venue as { requires_reservation?: boolean }).requires_reservation ??
            false,
        );
      } else {
        setPicturePreview(null);
        setMapPosition([...DEFAULT_MAP_POSITION]);
        setRequiresReservation(false);
        setContactForm({ ...EMPTY_CONTACT_FORM });
        setHasExistingContact(false);
      }
    });
  }, [isOpen, venue, setPicturePreview, setContactForm, setHasExistingContact]);

  const handleFormSubmit = async (data: VenueFormData) => {
    if (!userId) {
      toast.error(
        t("dashboard.venuesPage.toast.noAuth") || "You must be logged in",
      );
      return;
    }

    try {
      await saveVenue({
        data,
        userId,
        venueId: venue?.id,
        imageFile,
        requiresReservation,
        contactForm,
      });
      toast.success(
        venue?.id
          ? t("dashboard.venuesPage.toast.updated") ||
              "Venue updated successfully"
          : t("dashboard.venuesPage.toast.created") ||
              "Venue created successfully",
      );
      onClose();
    } catch (error) {
      console.error("Error saving venue:", error);
      toast.error(saveVenueErrorMessage(error, !!venue?.id, t));
    }
  };

  const handleRefreshInstagramPicture = async () => {
    if (!venue?.id) return;
    setIsRefreshingInstagram(true);
    try {
      const updated = await api.refreshVenueInstagramPicture(venue.id);
      const newUrl = (updated as { picture_url?: string }).picture_url ?? null;
      setPicturePreview(newUrl);
      setValue("picture_url", newUrl ?? "");
      setImageFile(null);
      toast.success(
        t("venueDialog.toast.instagramRefreshed") ??
          "Picture updated from Instagram",
      );
    } catch (err) {
      toast.error(
        (err as Error).message ??
          t("venueDialog.toast.instagramRefreshError") ??
          "Failed to refresh Instagram picture",
      );
    } finally {
      setIsRefreshingInstagram(false);
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
            <VenuePictureField
              handleFileChange={handleFileChange}
              picturePreview={picturePreview}
              isEditing={isEditing}
              instagramHandle={instagramHandle}
              isRefreshingInstagram={isRefreshingInstagram}
              handleRefreshInstagramPicture={handleRefreshInstagramPicture}
            />

            <VenueFormFields
              register={register}
              errors={errors}
              control={control}
              setValue={setValue}
              mapPosition={mapPosition}
              setMapPosition={setMapPosition}
              detectedTheme={detectedTheme}
              dark={dark}
              light={light}
              requiresReservation={requiresReservation}
              setRequiresReservation={setRequiresReservation}
            />

            {/* Contact Information (edit mode only) */}
            {isEditing && (
              <VenueContactSection
                hasExistingContact={hasExistingContact}
                handleDeleteContact={handleDeleteContact}
                isDeletingContact={isDeletingContact}
                contactForm={contactForm}
                setContactForm={setContactForm}
                isImportingContact={isImportingContact}
                handleImportContactFromInstagram={
                  handleImportContactFromInstagram
                }
              />
            )}
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
