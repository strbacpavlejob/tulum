import { MatchListItem, mapGuestDetails } from "@/lib/api";
import { Match } from "@/types/chat";

export const CHAT_AVATAR_SIZE = 54;

export const CHAT_RING_SIZE = 68;

export const MATCH_AVATAR_SIZE = 52;

export const MATCH_RING_SIZE = 66;

export const STROKE_WIDTH = 3;

export const TOTAL_WINDOW_MS = 6 * 60 * 60 * 1000;

export function ringColor(expiresAt: Date): string {
  const ms = expiresAt.getTime() - Date.now();
  if (ms < 60 * 60 * 1000) return "#ef4444";
  if (ms < 2 * 60 * 60 * 1000) return "#f97316";
  return "#22c55e";
}

/** The six-hour chat window after the match has closed. */
export function isChatExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now();
}

export function formatTimeRemaining(expiresAt: Date): string {
  const diff = expiresAt.getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatLastMessageTime(timestamp: Date): string {
  const diff = Date.now() - timestamp.getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (d > 0) return `${d}d`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return "now";
}

export function mapToMatch(item: MatchListItem): Match {
  const matchedAt = new Date(item.matched_at);
  const expiresAt = new Date(matchedAt.getTime() + 6 * 60 * 60 * 1000);
  const photo =
    item.other_guest.picture_urls[0] ?? item.other_guest.avatar_url ?? "";
  const firstName = item.other_guest.first_name ?? "Unknown";
  const birthday = item.other_guest.birthday
    ? new Date(item.other_guest.birthday)
    : null;
  const age = birthday
    ? Math.floor(
        (Date.now() - birthday.getTime()) / (365.25 * 24 * 3600 * 1000),
      )
    : 0;
  return {
    id: String(item.id),
    otherUserId: item.other_guest.user_id ?? undefined,
    chatId: item.chat_id ?? undefined,
    eventId: item.event?.id ?? undefined,
    venueLat: item.event?.venue_lat ?? null,
    venueLng: item.event?.venue_lng ?? null,
    name: firstName,
    age,
    photo,
    venue: item.event?.venue_name ?? item.event?.title ?? "Unknown venue",
    lastMessage: item.last_message?.text ?? "",
    lastMessageTime: item.last_message
      ? new Date(item.last_message.sent_at)
      : matchedAt,
    expiresAt,
    messages: [],
    // For the profile sheet in the chat.
    profile: {
      photos: item.other_guest.picture_urls,
      tags: item.other_guest.interests,
      ...mapGuestDetails(item.other_guest),
    },
  };
}
