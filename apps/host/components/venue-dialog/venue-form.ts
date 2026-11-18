import * as z from "zod";
import type { VenueType } from "@/lib/types/database";

// Venue type options for the select dropdown
export const VENUE_TYPE_OPTIONS: { value: VenueType; key: string }[] = [
  { value: "bar", key: "bar" },
  { value: "club", key: "club" },
  { value: "restaurant", key: "restaurant" },
  { value: "tavern", key: "tavern" },
  { value: "cafe", key: "cafe" },
  { value: "event_venue", key: "event_venue" },
];

/** Where a new venue's pin starts: central Belgrade, as [longitude, latitude]. */
export const DEFAULT_MAP_POSITION: [number, number] = [20.4489, 44.8125];

// Form validation schema factory
export const createVenueFormSchema = (t: (key: string) => string) =>
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

/** The form's values for a new venue, before its pin is placed. */
export const EMPTY_VENUE_FORM: VenueFormData = {
  name: "",
  description: "",
  venue_type: "club",
  latitude: "",
  longitude: "",
  address: "",
  capacity: "100",
  picture_url: "",
};

/** A venue as the venues page hands it to the dialog for editing. */
export interface EditableVenue {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  type: string;
  capacity: number;
  address?: string;
  description?: string;
  picture_url?: string;
  picture_urls?: string[];
  requires_reservation?: boolean;
}

/** The contact fields the dialog edits, as the venue contact API takes them. */
export interface VenueContactForm {
  phone_number: string;
  is_phone: boolean;
  is_viber: boolean;
  is_sms: boolean;
  is_whatsapp: boolean;
  instagram_handle: string;
  is_instagram: boolean;
}

export const EMPTY_CONTACT_FORM: VenueContactForm = {
  phone_number: "",
  is_phone: false,
  is_viber: false,
  is_sms: false,
  is_whatsapp: false,
  instagram_handle: "",
  is_instagram: false,
};
