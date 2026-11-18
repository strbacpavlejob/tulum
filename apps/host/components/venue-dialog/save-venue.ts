import * as api from "@/lib/api-client";
import { processVenueImage } from "@/lib/image-utils";
import type { VenueType } from "@/lib/types/database";
import type { VenueContactForm, VenueFormData } from "./venue-form";

interface SaveVenueInput {
  data: VenueFormData;
  userId: string;
  /** The venue being edited; a new venue is created without one. */
  venueId?: string;
  imageFile: File | null;
  requiresReservation: boolean;
  contactForm: VenueContactForm;
}

/**
 * Creates the venue or saves the edited one, with its picture as WebP. An
 * edited venue's contact is saved too when it has a phone number.
 */
export async function saveVenue({
  data,
  userId,
  venueId,
  imageFile,
  requiresReservation,
  contactForm,
}: SaveVenueInput): Promise<void> {
  let processedFile: File | undefined;

  // Process image before upload
  if (imageFile) {
    const processedBlob = await processVenueImage(imageFile);
    processedFile = new File([processedBlob], "venue-image.webp", {
      type: "image/webp",
    });
  }

  if (venueId) {
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
      requires_reservation: requiresReservation,
    };

    await api.updateVenue(venueId, updates, processedFile);

    // Save contact if phone number provided
    if (contactForm.phone_number.trim()) {
      await api.upsertVenueContact(venueId, {
        phone_number: contactForm.phone_number.trim(),
        is_phone: contactForm.is_phone,
        is_viber: contactForm.is_viber,
        is_sms: contactForm.is_sms,
        is_whatsapp: contactForm.is_whatsapp,
        instagram_handle: contactForm.is_instagram
          ? contactForm.instagram_handle || null
          : null,
        is_instagram: contactForm.is_instagram,
      });
    }
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
      requires_reservation: requiresReservation,
    };

    await api.createVenue(newVenueData, processedFile);
  }
}

/** What the toast says when saving failed. */
export function saveVenueErrorMessage(
  error: unknown,
  isUpdate: boolean,
  t: (key: string) => string,
): string {
  // Provide more specific error messages
  let errorMessage = isUpdate
    ? t("dashboard.venuesPage.toast.updateError") || "Failed to update venue"
    : t("dashboard.venuesPage.toast.createError") || "Failed to create venue";

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

  return errorMessage;
}
