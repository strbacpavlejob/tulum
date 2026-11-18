export const VENUE_TYPE_OPTIONS = [
  { value: "bar", label: "Bar" },
  { value: "club", label: "Club" },
  { value: "restaurant", label: "Restaurant" },
  { value: "tavern", label: "Tavern" },
  { value: "cafe", label: "Cafe" },
  { value: "event_venue", label: "Event Venue" },
] as const;

export type VenueType = (typeof VENUE_TYPE_OPTIONS)[number]["value"];
