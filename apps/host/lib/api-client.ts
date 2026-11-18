/**
 * API Client - Centralized API calls for cleaner code organization
 * All database operations go through /api routes instead of direct Supabase calls
 */

import type { Venue, Event } from "./types/database";

// ============================================
// VENUES
// ============================================

export async function getVenues(hostId?: string): Promise<Venue[]> {
  const params = hostId ? `?host_id=${hostId}` : "";
  const response = await fetch(`/api/venues${params}`);
  if (!response.ok) throw new Error("Failed to fetch venues");
  return response.json();
}

export async function createVenue(
  venue: Omit<Venue, "id" | "created_at" | "updated_at">,
  imageFile?: File,
): Promise<Venue> {
  let response: Response;

  if (imageFile) {
    // Send as FormData with image
    const formData = new FormData();
    formData.append("host_id", venue.host_id);
    formData.append("name", venue.name);
    formData.append("venue_type", venue.venue_type);
    formData.append("latitude", venue.latitude.toString());
    formData.append("longitude", venue.longitude.toString());
    formData.append("address", venue.address);
    formData.append("capacity", (venue.capacity ?? 0).toString());
    if (venue.description) formData.append("description", venue.description);
    formData.append("picture", imageFile);

    response = await fetch("/api/venues", {
      method: "POST",
      body: formData,
    });
  } else {
    // Send as JSON (no image)
    response = await fetch("/api/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(venue),
    });
  }

  if (!response.ok) throw new Error("Failed to create venue");
  return response.json();
}

export async function updateVenue(
  venueId: string,
  updates: Partial<Venue>,
  imageFile?: File,
): Promise<Venue> {
  let response: Response;

  if (imageFile) {
    // Send as FormData with image
    const formData = new FormData();

    // Add all update fields to FormData
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === "object" && !Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    formData.append("picture", imageFile);

    response = await fetch(`/api/venues/${venueId}`, {
      method: "PATCH",
      body: formData,
    });
  } else {
    // Send as JSON (no image)
    response = await fetch(`/api/venues/${venueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  }

  if (!response.ok) throw new Error("Failed to update venue");
  return response.json();
}

export async function deleteVenue(venueId: string): Promise<void> {
  const response = await fetch(`/api/venues/${venueId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete venue");
}

export async function getVenueContact(venueId: string): Promise<unknown> {
  const response = await fetch(`/api/venues/${venueId}/contact`);
  if (!response.ok) throw new Error("Failed to fetch venue contact");
  return response.json();
}

export async function upsertVenueContact(
  venueId: string,
  contact: {
    phone_number: string;
    is_phone: boolean;
    is_viber: boolean;
    is_sms: boolean;
    is_whatsapp: boolean;
    instagram_handle: string | null;
    is_instagram: boolean;
  },
): Promise<unknown> {
  const response = await fetch(`/api/venues/${venueId}/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contact),
  });
  if (!response.ok) throw new Error("Failed to save venue contact");
  return response.json();
}

export async function deleteVenueContact(venueId: string): Promise<void> {
  const response = await fetch(`/api/venues/${venueId}/contact`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete venue contact");
}

export async function importContactFromInstagram(
  venueId: string,
  instagramHandle: string,
): Promise<{
  phone_number: string;
  is_phone: boolean;
  is_viber: boolean;
  is_sms: boolean;
  is_whatsapp: boolean;
  instagram_handle: string | null;
  is_instagram: boolean;
}> {
  const response = await fetch(
    `/api/venues/${venueId}/contact/import-from-instagram`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instagram_handle: instagramHandle }),
    },
  );
  if (!response.ok) throw new Error("Failed to import contact from Instagram");
  return response.json();
}

export async function refreshVenueInstagramPicture(
  venueId: string,
): Promise<Venue> {
  const response = await fetch(
    `/api/venues/${venueId}/refresh-instagram-picture`,
    { method: "POST" },
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ??
        "Failed to refresh Instagram picture",
    );
  }
  return response.json();
}

// ============================================
// EVENTS
// ============================================

export async function getEvents(
  venueId?: string,
  status?: string,
): Promise<Event[]> {
  const params = new URLSearchParams();
  if (venueId) params.set("venue_id", venueId.toString());
  if (status) params.set("status", status);
  const query = params.toString() ? `?${params.toString()}` : "";

  const response = await fetch(`/api/events${query}`);
  if (!response.ok) throw new Error("Failed to fetch events");
  return response.json();
}

export async function createEvent(
  event: Omit<Event, "id" | "created_at" | "updated_at">,
  imageFile?: File,
): Promise<Event> {
  let response: Response;

  if (imageFile) {
    // Send as FormData with image
    const formData = new FormData();
    formData.append("venue_id", event.venue_id.toString());
    formData.append("title", event.title);
    formData.append("description", event.description);
    formData.append("start_date_time", event.start_date_time);
    formData.append("end_date_time", event.end_date_time);
    formData.append("tags", JSON.stringify(event.tags));
    formData.append("status", event.status);
    formData.append("picture", imageFile);

    response = await fetch("/api/events", {
      method: "POST",
      body: formData,
    });
  } else {
    // Send as JSON (no image)
    response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  }

  if (!response.ok) throw new Error("Failed to create event");
  return response.json();
}

export async function updateEvent(
  eventId: string,
  updates: Partial<Event>,
  imageFile?: File,
): Promise<Event> {
  let response: Response;

  if (imageFile) {
    // Send as FormData with image
    const formData = new FormData();

    // Add all update fields to FormData
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (typeof value === "object") {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    formData.append("picture", imageFile);

    response = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      body: formData,
    });
  } else {
    // Send as JSON (no image)
    response = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  }

  if (!response.ok) throw new Error("Failed to update event");
  return response.json();
}

export async function deleteEvent(eventId: string): Promise<void> {
  const response = await fetch(`/api/events/${eventId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete event");
}

// ============================================
// GUEST REPORTS (Tulum admins only)
// ============================================

export type GuestReportStatus =
  | "pending"
  | "in_review"
  | "resolved"
  | "rejected";

/** A guest's report of another guest, as GET /reports/guests sends it. */
export interface GuestReport {
  id: string;
  status: GuestReportStatus;
  reason:
    | "harassment"
    | "inappropriate"
    | "fake_profile"
    | "spam"
    | "underage"
    | "unsafe_meeting"
    | "other";
  source: "profile" | "chat";
  details: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  match_id: number | null;
  reporter: { user_id: string; name: string | null } | null;
  reported: {
    user_id: string;
    name: string | null;
    photos: string[];
    bio: string | null;
    /** Every report of this guest so far, this one included. */
    report_count: number;
  } | null;
  event: {
    id: string;
    title: string | null;
    start_date_time: string | null;
  } | null;
  /** A report from a chat: up to its last 50 messages, oldest first. */
  messages:
    | {
        from: "reporter" | "reported" | "other";
        message: string;
        sent_at: string;
      }[]
    | null;
}

/** The API refused: the signed-in user isn't a Tulum admin. */
export class AdminOnlyError extends Error {
  name = "AdminOnlyError";
}

export async function getGuestReports(
  status?: GuestReportStatus,
): Promise<GuestReport[]> {
  const params = status ? `?status=${status}` : "";
  const response = await fetch(`/api/reports/guests${params}`);
  if (response.status === 403) throw new AdminOnlyError("Admins only");
  if (!response.ok) throw new Error("Failed to fetch guest reports");
  return response.json();
}

/** Reports waiting for a review; null for anyone who isn't an admin. */
export async function getGuestReportsSummary(): Promise<{
  pending: number;
} | null> {
  const response = await fetch("/api/reports/guests/summary");
  if (!response.ok) return null;
  return response.json();
}

export async function updateGuestReportStatus(
  id: string,
  status: GuestReportStatus,
): Promise<{ id: string; status: GuestReportStatus; reviewed_at: string }> {
  const response = await fetch(`/api/reports/guests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error("Failed to update the report");
  return response.json();
}
