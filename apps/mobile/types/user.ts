export type LookingFor =
  | "to date"
  | "to party"
  | "open to chat"
  | "ready for a relationship";

export type DrinkingHabit =
  | "never"
  | "socially"
  | "regularly"
  | "prefer not to say";

export type SmokingHabit =
  | "never"
  | "socially"
  | "regularly"
  | "prefer not to say";

export type ChildrenStatus = "no" | "yes" | "prefer not to say";

export type RelationshipStatus =
  | "single"
  | "divorced"
  | "separated"
  | "prefer not to say";

export type Sexuality = "straight" | "gay" | "bisexual" | "prefer not to say";

export type StarSign =
  | "Aries"
  | "Taurus"
  | "Gemini"
  | "Cancer"
  | "Leo"
  | "Virgo"
  | "Libra"
  | "Scorpio"
  | "Sagittarius"
  | "Capricorn"
  | "Aquarius"
  | "Pisces";

export type Religion =
  | "atheist"
  | "agnostic"
  | "christian"
  | "muslim"
  | "jewish"
  | "buddhist"
  | "hindu"
  | "other"
  | "prefer not to say";

export type LookingForGender = "male" | "female" | "everyone";

export interface User {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  imgUrl?: string;
  photos?: string[];
  age?: number;
  birthday?: string; // ISO date string YYYY-MM-DD
  gender?: "male" | "female" | "other";
  lookingForGender?: LookingForGender;
  preferredVenueTypes?: string[];
  location?: string;
  info?: string;
  tags?: string[];
  work?: string;
  education?: string;
  lookingFor?: LookingFor[];
  height?: number;
  hasChildren?: ChildrenStatus;
  drinking?: DrinkingHabit;
  languages?: string[];
  relationship?: RelationshipStatus;
  sexuality?: Sexuality;
  smoking?: SmokingHabit;
  starSign?: StarSign;
  pets?: string[];
  religion?: Religion;
}
