import { VenueType } from "./filter";

export interface Settings {
  language: "EN" | "RS" | "RU";
  theme: "light" | "dark" | "system";
  notificationsEnabled: boolean;
  lookingFor?: "friends" | "dates" | "both" | "none";
  defaultVenueType?: VenueType;
}
