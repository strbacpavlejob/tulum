import type { Match, NewMatch } from "@/types/chat";
import type { User } from "@/types/user";
import { faker } from "@faker-js/faker";

function generateMatchProfile(firstName: string, photo: string): Partial<User> {
  const gender = faker.helpers.arrayElement([
    "male",
    "female",
    "other",
  ] as const);
  return {
    firstName,
    age: faker.number.int({ min: 20, max: 40 }),
    gender,
    location: faker.location.city(),
    photos: [photo, faker.image.personPortrait(), faker.image.personPortrait()],
    tags: faker.helpers.arrayElements(
      [
        "Photography",
        "Travel",
        "Yoga",
        "Music",
        "Coffee",
        "Art",
        "Dancing",
        "Hiking",
        "Food",
        "Tech",
        "Fitness",
        "Reading",
        "Movies",
        "Gaming",
        "Fashion",
      ],
      faker.number.int({ min: 2, max: 5 }),
    ),
    work: `${faker.person.jobTitle()} at ${faker.company.name()}`,
    education: faker.helpers.arrayElement([
      "University of Belgrade",
      "ETH Zurich",
      "Oxford University",
      "Self-taught",
    ]),
    info: faker.lorem.sentences(2),
    lookingFor: faker.helpers.arrayElements(
      [
        "to date",
        "to party",
        "open to chat",
        "ready for a relationship",
      ] as const,
      faker.number.int({ min: 1, max: 2 }),
    ),
    height: faker.number.int({ min: 158, max: 198 }),
    hasChildren: faker.helpers.arrayElement([
      "no",
      "yes",
      "prefer not to say",
    ] as const),
    drinking: faker.helpers.arrayElement([
      "never",
      "socially",
      "regularly",
      "prefer not to say",
    ] as const),
    languages: faker.helpers.arrayElements(
      ["English", "Serbian", "Russian", "Spanish", "French", "German"],
      faker.number.int({ min: 1, max: 3 }),
    ),
    relationship: faker.helpers.arrayElement([
      "single",
      "divorced",
      "separated",
      "prefer not to say",
    ] as const),
    sexuality: faker.helpers.arrayElement([
      "straight",
      "gay",
      "bisexual",
      "prefer not to say",
    ] as const),
    smoking: faker.helpers.arrayElement([
      "never",
      "socially",
      "regularly",
      "prefer not to say",
    ] as const),
    starSign: faker.helpers.arrayElement([
      "Aries",
      "Taurus",
      "Gemini",
      "Cancer",
      "Leo",
      "Virgo",
      "Libra",
      "Scorpio",
      "Sagittarius",
      "Capricorn",
      "Aquarius",
      "Pisces",
    ] as const),
    pets: faker.helpers.arrayElements(
      ["cat", "dog", "fish", "bird", "none"],
      faker.number.int({ min: 0, max: 2 }),
    ),
    religion: faker.helpers.arrayElement([
      "atheist",
      "agnostic",
      "christian",
      "muslim",
      "jewish",
      "buddhist",
      "hindu",
      "other",
      "prefer not to say",
    ] as const),
  };
}

function minutesAgo(mins: number) {
  return new Date(Date.now() - mins * 60 * 1000);
}

function minutesFromNow(mins: number) {
  return new Date(Date.now() + mins * 60 * 1000);
}

const VENUES = [
  "Ben Akiba",
  "Freestyler",
  "Sipaj ne pitaj",
  "Zappa bar",
  "Dragstor",
  "Mladost i Ludost",
  "Lasta",
  "Meduza",
];

function generateMessages(): Match["messages"] {
  const count = faker.number.int({ min: 3, max: 6 });
  const startAgo = faker.number.int({ min: 15, max: 180 }); // 15–180 mins ago
  const gap = faker.number.int({ min: 3, max: 12 }); // 3–12 mins between

  const textsFromUser = [
    "Hey! Your profile caught my eye 👋",
    "Love your travel photos—what’s your favorite city?",
    "Hiking buddy? I’m in! 🥾",
    "That looks awesome—how was it?",
  ];
  const textsFromMatch = [
    "Hey! Thanks for the match 😊",
    "I just got back from a trip—do you like Iceland?",
    "Nice! I’m a coffee nerd too ☕",
    "That sounds like fun!",
  ];

  const msgs: Match["messages"] = [];
  let t = minutesAgo(startAgo).getTime();
  for (let i = 0; i < count; i++) {
    const isFromUser = i % 2 === 1; // alternate: match starts
    msgs.push({
      id: faker.string.uuid(),
      text: isFromUser
        ? faker.helpers.arrayElement(textsFromUser)
        : faker.helpers.arrayElement(textsFromMatch),
      timestamp: new Date(t),
      isFromUser,
    });
    t += gap * 60 * 1000;
  }
  return msgs;
}

function generateMatch(): Match {
  const firstName = faker.person.firstName();
  const photo = faker.image.avatar();
  const messages = generateMessages();
  const last = messages[messages.length - 1];

  const expiresInMins = faker.number.int({ min: 60, max: 6 * 60 }); // 1–6h

  return {
    id: faker.string.uuid(),
    name: firstName,
    age: faker.number.int({ min: 20, max: 40 }),
    photo,
    venue: faker.helpers.arrayElement(VENUES),
    lastMessage: last.text,
    lastMessageTime: last.timestamp,
    expiresAt: minutesFromNow(expiresInMins),
    messages,
    profile: generateMatchProfile(firstName, photo),
  };
}

function generateNewMatch(): NewMatch {
  return {
    id: faker.string.uuid(),
    name: faker.person.firstName(),
    age: faker.number.int({ min: 20, max: 40 }),
    photo: faker.image.avatar(),
    venue: faker.helpers.arrayElement(VENUES),
    expiresAt: minutesFromNow(faker.number.int({ min: 120, max: 6 * 60 })),
  };
}

export const mockedMatch: Match = generateMatch();

export const mockMatches: Match[] = Array.from({ length: 12 }, generateMatch);

export const mockNewMatches: NewMatch[] = Array.from(
  { length: 7 },
  generateNewMatch,
);
