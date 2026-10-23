import { Settings } from "@/types/settings";
import { faker } from "@faker-js/faker";

export const mockedSettings: Settings = {
  theme: faker.helpers.arrayElement(["light", "dark", "system"]),
  language: faker.helpers.arrayElement(["EN", "RS", "RU"]),
  notificationsEnabled: faker.datatype.boolean(),
  lookingFor: faker.helpers.arrayElement(["friends", "dates", "both", "none"]),
  defaultVenueType: faker.helpers.arrayElement([
    "bar",
    "club",
    "restaurant",
    "tavern",
    "cafe",
    "event_venue",
  ]),
};
