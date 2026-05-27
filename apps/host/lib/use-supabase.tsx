"use client";

import { createContext, useContext, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "./supabase-client";
import { useAuth } from "@clerk/nextjs";
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
import type {
  RealtimePostgresChangesPayload,
  RealtimeChannel,
} from "@supabase/supabase-js";

// Table names
export const USERS_TABLE = "users";
export const GUESTS_TABLE = "guests";
export const HOSTS_TABLE = "hosts";
export const SETTINGS_TABLE = "settings";
export const VENUES_TABLE = "venues";
export const EVENTS_TABLE = "events";
export const FAVORITES_TABLE = "favorites";
export const TICKETS_TABLE = "tickets";
export const MATCHES_TABLE = "matches";
export const CHATS_TABLE = "chats";
export const CHAT_MESSAGES_TABLE = "chat_messages";

type ProviderProps = {
  userId: string | null;

  // User operations
  createUser: (user: Omit<User, "id">) => Promise<User>;
  getUser: (userId: string) => Promise<User | null>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  findUsersByEmail: (search: string) => Promise<User[]>;

  // Guest operations
  createGuest: (guest: Guest) => Promise<Guest>;
  getGuest: (userId: string) => Promise<Guest | null>;
  updateGuest: (userId: string, updates: Partial<Guest>) => Promise<Guest>;
  deleteGuest: (userId: string) => Promise<void>;

  // Host operations
  createHost: (host: Host) => Promise<Host>;
  getHost: (userId: string) => Promise<Host | null>;
  deleteHost: (userId: string) => Promise<void>;

  // Settings operations
  getUserSettings: (userId: string) => Promise<Settings | null>;
  updateUserSettings: (
    userId: string,
    settings: Partial<Settings>,
  ) => Promise<Settings>;

  // Venue operations
  createVenue: (
    venue: Omit<Venue, "id" | "created_at" | "updated_at">,
  ) => Promise<Venue>;
  getVenues: (hostId?: string) => Promise<Venue[]>;
  getVenue: (venueId: string) => Promise<Venue | null>;
  updateVenue: (venueId: string, updates: Partial<Venue>) => Promise<Venue>;
  deleteVenue: (venueId: string) => Promise<void>;

  // Event operations
  createEvent: (
    event: Omit<Event, "id" | "created_at" | "updated_at">,
  ) => Promise<Event>;
  getEvents: (venueId?: string) => Promise<Event[]>;
  getEvent: (eventId: string) => Promise<Event | null>;
  updateEvent: (eventId: string, updates: Partial<Event>) => Promise<Event>;
  deleteEvent: (eventId: string) => Promise<void>;
  getEventsByStatus: (status: Event["status"]) => Promise<Event[]>;

  // Favorite operations
  addFavorite: (userId: string, eventId: string) => Promise<Favorite>;
  removeFavorite: (favoriteId: string) => Promise<void>;
  getUserFavorites: (userId: string) => Promise<Favorite[]>;
  isFavorite: (userId: string, eventId: string) => Promise<boolean>;

  // Ticket operations
  createTicket: (
    ticket: Omit<Ticket, "id" | "created_at" | "updated_at">,
  ) => Promise<Ticket>;
  getTicket: (ticketId: string) => Promise<Ticket | null>;
  getUserTickets: (guestId: string) => Promise<Ticket[]>;
  getEventTickets: (eventId: string) => Promise<Ticket[]>;
  deleteTicket: (ticketId: string) => Promise<void>;

  // Match operations
  createMatch: (match: Omit<Match, "id" | "matched_at">) => Promise<Match>;
  getMatch: (matchId: number) => Promise<Match | null>;
  getGuestMatches: (guestId: string) => Promise<Match[]>;
  getEventMatches: (eventId: string) => Promise<Match[]>;
  deleteMatch: (matchId: number) => Promise<void>;

  // Chat operations
  createChat: (chat: Omit<Chat, "id" | "created_at">) => Promise<Chat>;
  getChat: (chatId: string) => Promise<Chat | null>;
  getChatByMatch: (matchId: number) => Promise<Chat | null>;
  deleteChat: (chatId: string) => Promise<void>;

  // Chat message operations
  sendMessage: (
    message: Omit<ChatMessage, "id" | "sent_at">,
  ) => Promise<ChatMessage>;
  getChatMessages: (chatId: string) => Promise<ChatMessage[]>;
  markMessageAsRead: (messageId: string) => Promise<ChatMessage>;
  deleteMessage: (messageId: string) => Promise<void>;

  // Realtime subscriptions
  subscribeToChat: (
    chatId: string,
    callback: (payload: RealtimePostgresChangesPayload<ChatMessage>) => void,
  ) => RealtimeChannel;
  subscribeToEvent: (
    eventId: string,
    callback: (payload: RealtimePostgresChangesPayload<Event>) => void,
  ) => RealtimeChannel;

  // Push token
  setUserPushToken: (token: string) => Promise<User>;
};

const SupabaseContext = createContext<Partial<ProviderProps>>({});

export function useSupabase() {
  return useContext(SupabaseContext);
}

export const SupabaseProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { userId, getToken } = useAuth();

  // Helper to get authenticated Supabase client
  const getAuthenticatedClient = useCallback(async () => {
    const token = await getToken({ template: "supabase" });
    if (!token) {
      throw new Error("No authentication token available");
    }

    // Create a fresh Supabase client with the Clerk JWT in the Authorization header
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
      },
    });

    return authenticatedClient;
  }, [getToken]);

  // Set auth for realtime on mount
  useEffect(() => {
    const setRealtimeAuth = async () => {
      const clerkToken = await getToken({ template: "supabase" });
      if (clerkToken) {
        supabase.realtime.setAuth(clerkToken);
      }
    };
    setRealtimeAuth();
  }, [getToken]);

  // ============================================
  // USER OPERATIONS
  // ============================================

  const createUser = async (user: Omit<User, "id">) => {
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .insert(user)
      .select()
      .single();

    if (error) {
      console.error("Error creating user:", error);
      throw error;
    }
    return data;
  };

  const getUser = async (userId: string) => {
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error getting user:", error);
      return null;
    }
    return data;
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating user:", error);
      throw error;
    }
    return data;
  };

  const deleteUser = async (userId: string) => {
    const { error } = await supabase
      .from(USERS_TABLE)
      .delete()
      .eq("id", userId);

    if (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  };

  const findUsersByEmail = async (search: string) => {
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .select("*")
      .ilike("email", `%${search}%`);

    if (error) {
      console.error("Error finding users:", error);
      return [];
    }
    return data || [];
  };

  // ============================================
  // GUEST OPERATIONS
  // ============================================

  const createGuest = async (guest: Guest) => {
    const { data, error } = await supabase
      .from(GUESTS_TABLE)
      .insert(guest)
      .select()
      .single();

    if (error) {
      console.error("Error creating guest:", error);
      throw error;
    }
    return data;
  };

  const getGuest = async (userId: string) => {
    const { data, error } = await supabase
      .from(GUESTS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error getting guest:", error);
      return null;
    }
    return data;
  };

  const updateGuest = async (userId: string, updates: Partial<Guest>) => {
    const { data, error } = await supabase
      .from(GUESTS_TABLE)
      .update(updates)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating guest:", error);
      throw error;
    }
    return data;
  };

  const deleteGuest = async (userId: string) => {
    const { error } = await supabase
      .from(GUESTS_TABLE)
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting guest:", error);
      throw error;
    }
  };

  // ============================================
  // HOST OPERATIONS
  // ============================================

  const createHost = async (host: Host) => {
    const { data, error } = await supabase
      .from(HOSTS_TABLE)
      .insert(host)
      .select()
      .single();

    if (error) {
      console.error("Error creating host:", error);
      throw error;
    }
    return data;
  };

  const getHost = async (userId: string) => {
    const { data, error } = await supabase
      .from(HOSTS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error getting host:", error);
      return null;
    }
    return data;
  };

  const deleteHost = async (userId: string) => {
    const { error } = await supabase
      .from(HOSTS_TABLE)
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting host:", error);
      throw error;
    }
  };

  // ============================================
  // SETTINGS OPERATIONS
  // ============================================

  const getUserSettings = async (userId: string) => {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error getting settings:", error);
      return null;
    }
    return data;
  };

  const updateUserSettings = async (
    userId: string,
    settings: Partial<Settings>,
  ) => {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .upsert({ user_id: userId, ...settings })
      .select()
      .single();

    if (error) {
      console.error("Error updating settings:", error);
      throw error;
    }
    return data;
  };

  // ============================================
  // VENUE OPERATIONS
  // ============================================

  const createVenue = async (
    venue: Omit<Venue, "id" | "created_at" | "updated_at">,
  ) => {
    console.log("createVenue called with:", venue);

    // Get authenticated client with Clerk JWT
    const client = await getAuthenticatedClient();

    const { data, error } = await client
      .from(VENUES_TABLE)
      .insert(venue)
      .select()
      .single();

    console.log("Supabase response - data:", data, "error:", error);

    if (error) {
      console.error("Error creating venue:", error);
      throw error;
    }

    if (!data) {
      console.error("No data returned from Supabase insert");
      throw new Error("Failed to create venue - no data returned");
    }

    return data;
  };

  const getVenues = async (hostId?: string) => {
    let query = supabase.from(VENUES_TABLE).select("*");

    if (hostId) {
      query = query.eq("host_id", hostId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error getting venues:", error);
      return [];
    }
    return data || [];
  };

  const getVenue = async (venueId: string) => {
    const { data, error } = await supabase
      .from(VENUES_TABLE)
      .select("*")
      .eq("id", venueId)
      .single();

    if (error) {
      console.error("Error getting venue:", error);
      return null;
    }
    return data;
  };

  const updateVenue = async (venueId: string, updates: Partial<Venue>) => {
    const { data, error } = await supabase
      .from(VENUES_TABLE)
      .update(updates)
      .eq("id", venueId)
      .select()
      .single();

    if (error) {
      console.error("Error updating venue:", error);
      throw error;
    }
    return data;
  };

  const deleteVenue = async (venueId: string) => {
    const { error } = await supabase
      .from(VENUES_TABLE)
      .delete()
      .eq("id", venueId);

    if (error) {
      console.error("Error deleting venue:", error);
      throw error;
    }
  };

  // ============================================
  // EVENT OPERATIONS
  // ============================================

  const createEvent = async (
    event: Omit<Event, "id" | "created_at" | "updated_at">,
  ) => {
    const { data, error } = await supabase
      .from(EVENTS_TABLE)
      .insert(event)
      .select()
      .single();

    if (error) {
      console.error("Error creating event:", error);
      throw error;
    }
    return data;
  };

  const getEvents = async (venueId?: string) => {
    let query = supabase.from(EVENTS_TABLE).select("*");

    if (venueId) {
      query = query.eq("venue_id", venueId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error getting events:", error);
      return [];
    }
    return data || [];
  };

  const getEvent = async (eventId: string) => {
    const { data, error } = await supabase
      .from(EVENTS_TABLE)
      .select("*")
      .eq("id", eventId)
      .single();

    if (error) {
      console.error("Error getting event:", error);
      return null;
    }
    return data;
  };

  const updateEvent = async (eventId: string, updates: Partial<Event>) => {
    const { data, error } = await supabase
      .from(EVENTS_TABLE)
      .update(updates)
      .eq("id", eventId)
      .select()
      .single();

    if (error) {
      console.error("Error updating event:", error);
      throw error;
    }
    return data;
  };

  const deleteEvent = async (eventId: string) => {
    const { error } = await supabase
      .from(EVENTS_TABLE)
      .delete()
      .eq("id", eventId);

    if (error) {
      console.error("Error deleting event:", error);
      throw error;
    }
  };

  const getEventsByStatus = async (status: Event["status"]) => {
    const { data, error } = await supabase
      .from(EVENTS_TABLE)
      .select("*")
      .eq("status", status);

    if (error) {
      console.error("Error getting events by status:", error);
      return [];
    }
    return data || [];
  };

  // ============================================
  // FAVORITE OPERATIONS
  // ============================================

  const addFavorite = async (userId: string, eventId: string) => {
    const { data, error } = await supabase
      .from(FAVORITES_TABLE)
      .insert({ user_id: userId, event_id: eventId })
      .select()
      .single();

    if (error) {
      console.error("Error adding favorite:", error);
      throw error;
    }
    return data;
  };

  const removeFavorite = async (favoriteId: string) => {
    const { error } = await supabase
      .from(FAVORITES_TABLE)
      .delete()
      .eq("id", favoriteId);

    if (error) {
      console.error("Error removing favorite:", error);
      throw error;
    }
  };

  const getUserFavorites = async (userId: string) => {
    const { data, error } = await supabase
      .from(FAVORITES_TABLE)
      .select("*, events(*)")
      .eq("user_id", userId);

    if (error) {
      console.error("Error getting favorites:", error);
      return [];
    }
    return data || [];
  };

  const isFavorite = async (userId: string, eventId: string) => {
    const { data, error } = await supabase
      .from(FAVORITES_TABLE)
      .select("id")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .single();

    return !error && data !== null;
  };

  // ============================================
  // TICKET OPERATIONS
  // ============================================

  const createTicket = async (
    ticket: Omit<Ticket, "id" | "created_at" | "updated_at">,
  ) => {
    const { data, error } = await supabase
      .from(TICKETS_TABLE)
      .insert(ticket)
      .select()
      .single();

    if (error) {
      console.error("Error creating ticket:", error);
      throw error;
    }
    return data;
  };

  const getTicket = async (ticketId: string) => {
    const { data, error } = await supabase
      .from(TICKETS_TABLE)
      .select("*")
      .eq("id", ticketId)
      .single();

    if (error) {
      console.error("Error getting ticket:", error);
      return null;
    }
    return data;
  };

  const getUserTickets = async (guestId: string) => {
    const { data, error } = await supabase
      .from(TICKETS_TABLE)
      .select("*, events(*)")
      .eq("guest_id", guestId);

    if (error) {
      console.error("Error getting user tickets:", error);
      return [];
    }
    return data || [];
  };

  const getEventTickets = async (eventId: string) => {
    const { data, error } = await supabase
      .from(TICKETS_TABLE)
      .select("*")
      .eq("event_id", eventId);

    if (error) {
      console.error("Error getting event tickets:", error);
      return [];
    }
    return data || [];
  };

  const deleteTicket = async (ticketId: string) => {
    const { error } = await supabase
      .from(TICKETS_TABLE)
      .delete()
      .eq("id", ticketId);

    if (error) {
      console.error("Error deleting ticket:", error);
      throw error;
    }
  };

  // ============================================
  // MATCH OPERATIONS
  // ============================================

  const createMatch = async (match: Omit<Match, "id" | "matched_at">) => {
    const { data, error } = await supabase
      .from(MATCHES_TABLE)
      .insert(match)
      .select()
      .single();

    if (error) {
      console.error("Error creating match:", error);
      throw error;
    }
    return data;
  };

  const getMatch = async (matchId: number) => {
    const { data, error } = await supabase
      .from(MATCHES_TABLE)
      .select("*")
      .eq("id", matchId)
      .single();

    if (error) {
      console.error("Error getting match:", error);
      return null;
    }
    return data;
  };

  const getGuestMatches = async (guestId: string) => {
    const { data, error } = await supabase
      .from(MATCHES_TABLE)
      .select("*")
      .or(`guest_id_1.eq.${guestId},guest_id_2.eq.${guestId}`);

    if (error) {
      console.error("Error getting guest matches:", error);
      return [];
    }
    return data || [];
  };

  const getEventMatches = async (eventId: string) => {
    const { data, error } = await supabase
      .from(MATCHES_TABLE)
      .select("*")
      .eq("event_id", eventId);

    if (error) {
      console.error("Error getting event matches:", error);
      return [];
    }
    return data || [];
  };

  const deleteMatch = async (matchId: number) => {
    const { error } = await supabase
      .from(MATCHES_TABLE)
      .delete()
      .eq("id", matchId);

    if (error) {
      console.error("Error deleting match:", error);
      throw error;
    }
  };

  // ============================================
  // CHAT OPERATIONS
  // ============================================

  const createChat = async (chat: Omit<Chat, "id" | "created_at">) => {
    const { data, error } = await supabase
      .from(CHATS_TABLE)
      .insert(chat)
      .select()
      .single();

    if (error) {
      console.error("Error creating chat:", error);
      throw error;
    }
    return data;
  };

  const getChat = async (chatId: string) => {
    const { data, error } = await supabase
      .from(CHATS_TABLE)
      .select("*")
      .eq("id", chatId)
      .single();

    if (error) {
      console.error("Error getting chat:", error);
      return null;
    }
    return data;
  };

  const getChatByMatch = async (matchId: number) => {
    const { data, error } = await supabase
      .from(CHATS_TABLE)
      .select("*")
      .eq("match_id", matchId)
      .single();

    if (error) {
      console.error("Error getting chat by match:", error);
      return null;
    }
    return data;
  };

  const deleteChat = async (chatId: string) => {
    const { error } = await supabase
      .from(CHATS_TABLE)
      .delete()
      .eq("id", chatId);

    if (error) {
      console.error("Error deleting chat:", error);
      throw error;
    }
  };

  // ============================================
  // CHAT MESSAGE OPERATIONS
  // ============================================

  const sendMessage = async (message: Omit<ChatMessage, "id" | "sent_at">) => {
    const { data, error } = await supabase
      .from(CHAT_MESSAGES_TABLE)
      .insert(message)
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      throw error;
    }
    return data;
  };

  const getChatMessages = async (chatId: string) => {
    const { data, error } = await supabase
      .from(CHAT_MESSAGES_TABLE)
      .select("*")
      .eq("chat_id", chatId)
      .order("sent_at", { ascending: true });

    if (error) {
      console.error("Error getting chat messages:", error);
      return [];
    }
    return data || [];
  };

  const markMessageAsRead = async (messageId: string) => {
    const { data, error } = await supabase
      .from(CHAT_MESSAGES_TABLE)
      .update({ is_read: true })
      .eq("id", messageId)
      .select()
      .single();

    if (error) {
      console.error("Error marking message as read:", error);
      throw error;
    }
    return data;
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase
      .from(CHAT_MESSAGES_TABLE)
      .delete()
      .eq("id", messageId);

    if (error) {
      console.error("Error deleting message:", error);
      throw error;
    }
  };

  // ============================================
  // REALTIME SUBSCRIPTIONS
  // ============================================

  const subscribeToChat = (
    chatId: string,
    callback: (payload: RealtimePostgresChangesPayload<ChatMessage>) => void,
  ) => {
    console.log("Creating realtime chat connection...");

    return supabase
      .channel(`chat-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: CHAT_MESSAGES_TABLE,
          filter: `chat_id=eq.${chatId}`,
        },
        callback,
      )
      .subscribe();
  };

  const subscribeToEvent = (
    eventId: string,
    callback: (payload: RealtimePostgresChangesPayload<Event>) => void,
  ) => {
    console.log("Creating realtime event connection...");

    return supabase
      .channel(`event-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: EVENTS_TABLE,
          filter: `id=eq.${eventId}`,
        },
        callback,
      )
      .subscribe();
  };

  // ============================================
  // PUSH TOKEN
  // ============================================

  const setUserPushToken = async (token: string) => {
    if (!userId) {
      console.error("No user ID available");
      return;
    }

    const { data, error } = await supabase
      .from(USERS_TABLE)
      .update({ push_token: token })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error setting push token:", error);
      throw error;
    }
    return data;
  };

  // ============================================
  // PROVIDER VALUE
  // ============================================

  const value = {
    userId,
    // Users
    createUser,
    getUser,
    updateUser,
    deleteUser,
    findUsersByEmail,
    // Guests
    createGuest,
    getGuest,
    updateGuest,
    deleteGuest,
    // Hosts
    createHost,
    getHost,
    deleteHost,
    // Settings
    getUserSettings,
    updateUserSettings,
    // Venues
    createVenue,
    getVenues,
    getVenue,
    updateVenue,
    deleteVenue,
    // Events
    createEvent,
    getEvents,
    getEvent,
    updateEvent,
    deleteEvent,
    getEventsByStatus,
    // Favorites
    addFavorite,
    removeFavorite,
    getUserFavorites,
    isFavorite,
    // Tickets
    createTicket,
    getTicket,
    getUserTickets,
    getEventTickets,
    deleteTicket,
    // Matches
    createMatch,
    getMatch,
    getGuestMatches,
    getEventMatches,
    deleteMatch,
    // Chats
    createChat,
    getChat,
    getChatByMatch,
    deleteChat,
    // Chat Messages
    sendMessage,
    getChatMessages,
    markMessageAsRead,
    deleteMessage,
    // Realtime
    subscribeToChat,
    subscribeToEvent,
    // Push token
    setUserPushToken,
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
};
