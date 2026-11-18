import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { MatchListItem } from "@/lib/api";

const SEEN_MATCH_MESSAGES_KEY = "inbox_seen_match_messages_v1";

type SeenMap = Record<string, string>;

let seenMapCache: SeenMap | null = null;

async function readStoredSeenMap(): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof window === "undefined"
      ? null
      : window.localStorage.getItem(SEEN_MATCH_MESSAGES_KEY);
  }

  return SecureStore.getItemAsync(SEEN_MATCH_MESSAGES_KEY);
}

async function writeStoredSeenMap(value: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SEEN_MATCH_MESSAGES_KEY, value);
    }
    return;
  }

  await SecureStore.setItemAsync(SEEN_MATCH_MESSAGES_KEY, value);
}

async function readSeenMap(): Promise<SeenMap> {
  if (seenMapCache) return seenMapCache;
  try {
    const raw = await readStoredSeenMap();
    if (!raw) {
      seenMapCache = {};
      return seenMapCache;
    }
    const parsed = JSON.parse(raw) as SeenMap;
    seenMapCache = parsed ?? {};
    return seenMapCache;
  } catch (error) {
    console.warn("Failed to read inbox read state from storage.", error);
    seenMapCache = {};
    return seenMapCache;
  }
}

async function writeSeenMap(nextMap: SeenMap): Promise<void> {
  seenMapCache = nextMap;
  try {
    await writeStoredSeenMap(JSON.stringify(nextMap));
  } catch (error) {
    console.warn("Failed to persist inbox read state.", error);
  }
}

export async function getUnreadChatsCount(
  items: MatchListItem[],
  userId: string,
): Promise<number> {
  const seenMap = await readSeenMap();
  let count = 0;

  for (const item of items) {
    const lastMessage = item.last_message;
    if (!lastMessage) continue;
    if (lastMessage.sender_id === userId) continue;

    const seenAt = seenMap[String(item.id)];
    if (!seenAt) {
      count += 1;
      continue;
    }

    const seenTs = new Date(seenAt).getTime();
    const lastTs = new Date(lastMessage.sent_at).getTime();
    if (!Number.isFinite(seenTs) || lastTs > seenTs) {
      count += 1;
    }
  }

  return count;
}

export async function markMatchAsRead(
  matchId: string,
  seenAtIso?: string,
): Promise<void> {
  const seenMap = await readSeenMap();
  const nextMap: SeenMap = {
    ...seenMap,
    [matchId]: seenAtIso ?? new Date().toISOString(),
  };
  await writeSeenMap(nextMap);
}
