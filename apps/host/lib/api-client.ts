/**
 * API Client - Centralized API calls for cleaner code organization
 * All database operations go through /api routes instead of direct Supabase calls
 */

import type {
  User,
  Guest,
  Host,
  Settings,
  Venue,
  Event,
  Favorite,
  Ticket,
  Match,
  Chat,
  ChatMessage,
} from "./types/database";

// ============================================
// VENUES
// ============================================

export async function getVenues(hostId?: string): Promise<Venue[]> {
  const params = hostId ? `?host_id=${hostId}` : "";
  const response = await fetch(`/api/venues${params}`);
  if (!response.ok) throw new Error("Failed to fetch venues");
  return response.json();
}

export async function getVenue(venueId: string): Promise<Venue> {
  const response = await fetch(`/api/venues/${venueId}`);
  if (!response.ok) throw new Error("Failed to fetch venue");
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

export async function getEvent(eventId: string): Promise<Event> {
  const response = await fetch(`/api/events/${eventId}`);
  if (!response.ok) throw new Error("Failed to fetch event");
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
// USERS
// ============================================

export async function getUser(userId: string): Promise<User> {
  const response = await fetch(`/api/users?id=${userId}`);
  if (!response.ok) throw new Error("Failed to fetch user");
  return response.json();
}

export async function findUsersByEmail(email: string): Promise<User[]> {
  const response = await fetch(`/api/users?email=${encodeURIComponent(email)}`);
  if (!response.ok) throw new Error("Failed to search users");
  return response.json();
}

export async function createUser(user: Omit<User, "id">): Promise<User> {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  if (!response.ok) throw new Error("Failed to create user");
  return response.json();
}

export async function updateUser(
  userId: string,
  updates: Partial<User>,
): Promise<User> {
  const response = await fetch("/api/users", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: userId, updates }),
  });
  if (!response.ok) throw new Error("Failed to update user");
  return response.json();
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(`/api/users?id=${userId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete user");
}

// ============================================
// GUESTS
// ============================================

export async function getGuest(userId: string): Promise<Guest> {
  const response = await fetch(`/api/users/guests?user_id=${userId}`);
  if (!response.ok) throw new Error("Failed to fetch guest");
  return response.json();
}

export async function createGuest(guest: Guest): Promise<Guest> {
  const response = await fetch("/api/users/guests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(guest),
  });
  if (!response.ok) throw new Error("Failed to create guest");
  return response.json();
}

export async function updateGuest(
  userId: string,
  updates: Partial<Guest>,
): Promise<Guest> {
  const response = await fetch("/api/users/guests", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, updates }),
  });
  if (!response.ok) throw new Error("Failed to update guest");
  return response.json();
}

export async function deleteGuest(userId: string): Promise<void> {
  const response = await fetch(`/api/users/guests?user_id=${userId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete guest");
}

// ============================================
// HOSTS
// ============================================

export async function getHost(userId: string): Promise<Host> {
  const response = await fetch(`/api/users/hosts?user_id=${userId}`);
  if (!response.ok) throw new Error("Failed to fetch host");
  return response.json();
}

export async function createHost(host: Host): Promise<Host> {
  const response = await fetch("/api/users/hosts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(host),
  });
  if (!response.ok) throw new Error("Failed to create host");
  return response.json();
}

export async function deleteHost(userId: string): Promise<void> {
  const response = await fetch(`/api/users/hosts?user_id=${userId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete host");
}

// ============================================
// SETTINGS
// ============================================

export async function getUserSettings(userId: string): Promise<Settings> {
  const response = await fetch(`/api/users/settings?user_id=${userId}`);
  if (!response.ok) throw new Error("Failed to fetch settings");
  return response.json();
}

export async function updateUserSettings(
  userId: string,
  settings: Partial<Settings>,
): Promise<Settings> {
  const response = await fetch("/api/users/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, settings }),
  });
  if (!response.ok) throw new Error("Failed to update settings");
  return response.json();
}

// ============================================
// FAVORITES
// ============================================

export async function getUserFavorites(userId: string): Promise<Favorite[]> {
  const response = await fetch(`/api/favorites?user_id=${userId}`);
  if (!response.ok) throw new Error("Failed to fetch favorites");
  return response.json();
}

export async function isFavorite(
  userId: string,
  eventId: string,
): Promise<boolean> {
  const response = await fetch(
    `/api/favorites?user_id=${userId}&event_id=${eventId}`,
  );
  if (!response.ok) return false;
  const data = await response.json();
  return data.isFavorite;
}

export async function addFavorite(
  userId: string,
  eventId: string,
): Promise<Favorite> {
  const response = await fetch("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, event_id: eventId }),
  });
  if (!response.ok) throw new Error("Failed to add favorite");
  return response.json();
}

export async function removeFavorite(favoriteId: string): Promise<void> {
  const response = await fetch(`/api/favorites?id=${favoriteId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to remove favorite");
}

// ============================================
// TICKETS
// ============================================

export async function getTicket(ticketId: string): Promise<Ticket> {
  const response = await fetch(`/api/tickets?id=${ticketId}`);
  if (!response.ok) throw new Error("Failed to fetch ticket");
  return response.json();
}

export async function getUserTickets(guestId: string): Promise<Ticket[]> {
  const response = await fetch(`/api/tickets?guest_id=${guestId}`);
  if (!response.ok) throw new Error("Failed to fetch tickets");
  return response.json();
}

export async function getEventTickets(eventId: string): Promise<Ticket[]> {
  const response = await fetch(`/api/tickets?event_id=${eventId}`);
  if (!response.ok) throw new Error("Failed to fetch tickets");
  return response.json();
}

export async function createTicket(
  ticket: Omit<Ticket, "id" | "created_at" | "updated_at">,
): Promise<Ticket> {
  const response = await fetch("/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ticket),
  });
  if (!response.ok) throw new Error("Failed to create ticket");
  return response.json();
}

export async function deleteTicket(ticketId: string): Promise<void> {
  const response = await fetch(`/api/tickets?id=${ticketId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete ticket");
}

// ============================================
// MATCHES
// ============================================

export async function getMatch(matchId: number): Promise<Match> {
  const response = await fetch(`/api/matches?id=${matchId}`);
  if (!response.ok) throw new Error("Failed to fetch match");
  return response.json();
}

export async function getGuestMatches(guestId: string): Promise<Match[]> {
  const response = await fetch(`/api/matches?guest_id=${guestId}`);
  if (!response.ok) throw new Error("Failed to fetch matches");
  return response.json();
}

export async function getEventMatches(eventId: string): Promise<Match[]> {
  const response = await fetch(`/api/matches?event_id=${eventId}`);
  if (!response.ok) throw new Error("Failed to fetch matches");
  return response.json();
}

export async function createMatch(
  match: Omit<Match, "id" | "matched_at">,
): Promise<Match> {
  const response = await fetch("/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(match),
  });
  if (!response.ok) throw new Error("Failed to create match");
  return response.json();
}

export async function deleteMatch(matchId: number): Promise<void> {
  const response = await fetch(`/api/matches?id=${matchId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete match");
}

// ============================================
// CHATS
// ============================================

export async function getChat(chatId: string): Promise<Chat> {
  const response = await fetch(`/api/chats?id=${chatId}`);
  if (!response.ok) throw new Error("Failed to fetch chat");
  return response.json();
}

export async function getChatByMatch(matchId: number): Promise<Chat> {
  const response = await fetch(`/api/chats?match_id=${matchId}`);
  if (!response.ok) throw new Error("Failed to fetch chat");
  return response.json();
}

export async function createChat(
  chat: Omit<Chat, "id" | "created_at">,
): Promise<Chat> {
  const response = await fetch("/api/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(chat),
  });
  if (!response.ok) throw new Error("Failed to create chat");
  return response.json();
}

export async function deleteChat(chatId: string): Promise<void> {
  const response = await fetch(`/api/chats?id=${chatId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete chat");
}

// ============================================
// CHAT MESSAGES
// ============================================

export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
  const response = await fetch(`/api/chats/messages?chat_id=${chatId}`);
  if (!response.ok) throw new Error("Failed to fetch messages");
  return response.json();
}

export async function sendMessage(
  message: Omit<ChatMessage, "id" | "sent_at">,
): Promise<ChatMessage> {
  const response = await fetch("/api/chats/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
  if (!response.ok) throw new Error("Failed to send message");
  return response.json();
}

export async function markMessageAsRead(
  messageId: string,
): Promise<ChatMessage> {
  const response = await fetch("/api/chats/messages", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message_id: messageId }),
  });
  if (!response.ok) throw new Error("Failed to mark message as read");
  return response.json();
}

export async function deleteMessage(messageId: string): Promise<void> {
  const response = await fetch(`/api/chats/messages?id=${messageId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete message");
}

// ============================================
// GEOCODING
// ============================================

export async function geocodeAddress(address: string): Promise<{
  latitude: number;
  longitude: number;
  display_name: string;
}> {
  const response = await fetch(
    `/api/geocode?address=${encodeURIComponent(address)}`,
  );
  if (!response.ok) throw new Error("Failed to geocode address");
  return response.json();
}
