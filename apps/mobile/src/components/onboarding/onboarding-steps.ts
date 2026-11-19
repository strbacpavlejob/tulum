import { LookingForGender } from "@/types/user";

export const FIRST_NAME_MAX_LENGTH = 50;

export const GENDER_OPTIONS: {
  labelKey: string;
  value: "male" | "female" | "other";
}[] = [
  { labelKey: "onboardingGenderMan", value: "male" },
  { labelKey: "onboardingGenderWoman", value: "female" },
  { labelKey: "onboardingGenderOther", value: "other" },
];

export const LOOKING_FOR_GENDER_OPTIONS: {
  labelKey: string;
  value: LookingForGender;
}[] = [
  { labelKey: "onboardingInterestedMen", value: "male" },
  { labelKey: "onboardingInterestedWomen", value: "female" },
  { labelKey: "onboardingInterestedEveryone", value: "everyone" },
];

export const STEP_IDS = [
  "name",
  "birthday",
  "gender",
  "lookingForGender",
  "photo",
] as const;

export const TOTAL_STEPS = STEP_IDS.length;

export const STEP_CONTENT_STYLE = {
  paddingHorizontal: 20,
  paddingTop: 20,
  paddingBottom: 20,
};
