import type { VenueType } from "@/types/filter";

export type SelectOption = {
  name: string;
  value: string;
  /** An i18n key the picker shows under the name. */
  description?: string;
};

export type EditConfig = {
  title: string;
  type: "single" | "multi" | "text";
  options?: SelectOption[];
  onSave: (value: string | string[]) => void;
};

export const lookingForOptions: SelectOption[] = [
  {
    name: "toDate",
    value: "to date",
  },
  {
    name: "toParty",
    value: "to party",
  },
  {
    name: "openToChat",
    value: "open to chat",
  },
  {
    name: "readyForRelationship",
    value: "ready for a relationship",
  },
];

export const lifestyleOptions: SelectOption[] = [
  {
    name: "never",
    value: "never",
  },
  {
    name: "socially",
    value: "socially",
  },
  {
    name: "regularly",
    value: "regularly",
  },
  {
    name: "preferNotToSay",
    value: "prefer not to say",
  },
];

export const drinkingOptions = lifestyleOptions;
export const smokingOptions = lifestyleOptions;

export const childrenOptions: SelectOption[] = [
  {
    name: "no",
    value: "no",
  },
  {
    name: "yes",
    value: "yes",
  },
  {
    name: "preferNotToSay",
    value: "prefer not to say",
  },
];

export const relationshipOptions: SelectOption[] = [
  {
    name: "single",
    value: "single",
  },
  {
    name: "divorced",
    value: "divorced",
  },
  {
    name: "separated",
    value: "separated",
  },
  {
    name: "preferNotToSay",
    value: "prefer not to say",
  },
];

export const sexualityOptions: SelectOption[] = [
  {
    name: "straight",
    value: "straight",
  },
  {
    name: "gay",
    value: "gay",
  },
  {
    name: "bisexual",
    value: "bisexual",
  },
  {
    name: "preferNotToSay",
    value: "prefer not to say",
  },
];

export const starSignOptions: SelectOption[] = [
  {
    name: "aries",
    value: "Aries",
  },
  {
    name: "taurus",
    value: "Taurus",
  },
  {
    name: "gemini",
    value: "Gemini",
  },
  {
    name: "cancer",
    value: "Cancer",
  },
  {
    name: "leo",
    value: "Leo",
  },
  {
    name: "virgo",
    value: "Virgo",
  },
  {
    name: "libra",
    value: "Libra",
  },
  {
    name: "scorpio",
    value: "Scorpio",
  },
  {
    name: "sagittarius",
    value: "Sagittarius",
  },
  {
    name: "capricorn",
    value: "Capricorn",
  },
  {
    name: "aquarius",
    value: "Aquarius",
  },
  {
    name: "pisces",
    value: "Pisces",
  },
];

export const religionOptions: SelectOption[] = [
  {
    name: "atheist",
    value: "atheist",
  },
  {
    name: "agnostic",
    value: "agnostic",
  },
  {
    name: "christian",
    value: "christian",
  },
  {
    name: "muslim",
    value: "muslim",
  },
  {
    name: "jewish",
    value: "jewish",
  },
  {
    name: "buddhist",
    value: "buddhist",
  },
  {
    name: "hindu",
    value: "hindu",
  },
  {
    name: "other",
    value: "other",
  },
  {
    name: "preferNotToSay",
    value: "prefer not to say",
  },
];

export const petsOptions: SelectOption[] = [
  {
    name: "cat",
    value: "cat",
  },
  {
    name: "dog",
    value: "dog",
  },
  {
    name: "fish",
    value: "fish",
  },
  {
    name: "bird",
    value: "bird",
  },
  {
    name: "none",
    value: "none",
  },
];

export const languageOptions: SelectOption[] = [
  {
    name: "english",
    value: "English",
  },
  {
    name: "serbian",
    value: "Serbian",
  },
  {
    name: "russian",
    value: "Russian",
  },
  {
    name: "spanish",
    value: "Spanish",
  },
  {
    name: "french",
    value: "French",
  },
  {
    name: "german",
    value: "German",
  },
];

export const tagsOptions: SelectOption[] = [
  {
    name: "photography",
    value: "Photography",
  },
  {
    name: "travel",
    value: "Travel",
  },
  {
    name: "yoga",
    value: "Yoga",
  },
  {
    name: "music",
    value: "Music",
  },
  {
    name: "coffee",
    value: "Coffee",
  },
  {
    name: "art",
    value: "Art",
  },
  {
    name: "dancing",
    value: "Dancing",
  },
  {
    name: "hiking",
    value: "Hiking",
  },
  {
    name: "food",
    value: "Food",
  },
  {
    name: "tech",
    value: "Tech",
  },
  {
    name: "fitness",
    value: "Fitness",
  },
  {
    name: "reading",
    value: "Reading",
  },
  {
    name: "movies",
    value: "Movies",
  },
  {
    name: "gaming",
    value: "Gaming",
  },
  {
    name: "fashion",
    value: "Fashion",
  },
];

export const VENUE_TYPES: {
  emoji: string;
  labelKey: string;
  value: VenueType;
}[] = [
  { emoji: "🍺", labelKey: "bar", value: "bar" },
  { emoji: "🕺", labelKey: "club", value: "club" },
  { emoji: "🍽️", labelKey: "restaurant", value: "restaurant" },
  { emoji: "🏮", labelKey: "tavern", value: "tavern" },
  { emoji: "☕", labelKey: "cafe", value: "cafe" },
  { emoji: "🎉", labelKey: "eventVenue", value: "event_venue" },
];

export const venueOptions = VENUE_TYPES.map(({ labelKey, value }) => ({
  name: labelKey,
  value,
}));

export const themeOptions: SelectOption[] = [
  {
    name: "light",
    value: "light",
  },
  {
    name: "dark",
    value: "dark",
  },
  {
    name: "system",
    value: "system",
  },
];

export const appLanguageOptions: SelectOption[] = [
  {
    name: "english",
    value: "EN",
  },
  {
    name: "serbian",
    value: "RS",
  },
  {
    name: "russian",
    value: "RU",
  },
];

// Who sees you on event guest lists and in Matches (guests.visibility). The
// API accepts these values (apps/api/src/guest-safety/guest-visibility.ts).
export const visibilityOptions: SelectOption[] = [
  {
    name: "visibilityEveryone",
    value: "everyone",
    description: "visibilityEveryoneDescription",
  },
  {
    name: "visibilityLiked",
    value: "liked",
    description: "visibilityLikedDescription",
  },
  {
    name: "visibilityHidden",
    value: "hidden",
    description: "visibilityHiddenDescription",
  },
];

export const EMOJIS = [
  "🔥",
  "❤️",
  "🖤",
  "💖",
  "💕",
  "💘",
  "💝",
  "💋",
  "😘",
  "😍",
  "😏",
  "😉",
  "🥵",
  "😈",
  "😜",
  "🤭",
  "🫦",
  "👀",
  "🍒",
  "🍑",
  "🍓",
  "🌹",
  "✨",
  "💫",
  "⚡️",
  "🌙",
  "🪩",
  "🎉",
  "🥳",
  "🎊",
  "🎈",
  "🎶",
  "🎵",
  "🎧",
  "🎤",
  "💃",
  "🕺",
  "🥂",
  "🍾",
  "🍸",
  "🍷",
  "🍺",
  "🍹",
  "🥃",
  "🎲",
  "🎰",
  "🎯",
  "👑",
  "💎",
  "🚀",
  "⭐",
  "🌟",
  "🎆",
  "🎇",
  "🌃",
  "🌆",
  "🫶",
  "🤍",
  "💯",
];
