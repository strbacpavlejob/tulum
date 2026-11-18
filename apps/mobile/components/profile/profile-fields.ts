import type { TFunction } from "i18next";
import {
  Baby,
  Cigarette,
  Globe,
  Heart,
  PawPrint,
  Ruler,
  Star,
  Users,
  Wine,
} from "lucide-react-native";
import type {
  ProfileInfoField,
  ProfileInfoFieldKey,
} from "@/components/profile-info/profile-info-view";
import {
  childrenOptions,
  drinkingOptions,
  languageOptions,
  petsOptions,
  relationshipOptions,
  religionOptions,
  sexualityOptions,
  smokingOptions,
  starSignOptions,
  tagsOptions,
  lookingForOptions,
  type SelectOption,
} from "@/constants/options";
import type { ProfileEditCallbacks } from "@/components/profile-tab";
import type { User } from "@/types/user";

/** The rows of the profile's "about me" list, with their shown values. */
export function buildProfileFields(
  user: User,
  t: TFunction,
): ProfileInfoField[] {
  return [
    {
      key: "height",
      icon: Ruler,
      label: t("height"),
      value: user.height ? `${user.height} cm` : undefined,
    },
    {
      key: "children",
      icon: Baby,
      label: t("children"),
      value: user.hasChildren
        ? user.hasChildren.charAt(0).toUpperCase() + user.hasChildren.slice(1)
        : undefined,
    },
    {
      key: "drinking",
      icon: Wine,
      label: t("drinking"),
      value: user.drinking
        ? user.drinking.charAt(0).toUpperCase() + user.drinking.slice(1)
        : undefined,
    },
    {
      key: "languages",
      icon: Globe,
      label: t("languages"),
      value:
        user.languages && user.languages.length > 0
          ? user.languages
              .map(
                (language) =>
                  language.charAt(0).toUpperCase() + language.slice(1),
              )
              .join(", ")
          : undefined,
    },
    {
      key: "relationship",
      icon: Heart,
      label: t("relationship"),
      value: user.relationship
        ? user.relationship.charAt(0).toUpperCase() + user.relationship.slice(1)
        : undefined,
    },
    {
      key: "sexuality",
      icon: Users,
      label: t("sexuality"),
      value: user.sexuality
        ? user.sexuality.charAt(0).toUpperCase() + user.sexuality.slice(1)
        : undefined,
    },
    {
      key: "smoking",
      icon: Cigarette,
      label: t("smoking"),
      value: user.smoking
        ? user.smoking.charAt(0).toUpperCase() + user.smoking.slice(1)
        : undefined,
    },
    {
      key: "starSign",
      icon: Star,
      label: t("starSign"),
      value: user.starSign,
    },
    {
      key: "pets",
      icon: PawPrint,
      label: t("pets"),
      value:
        user.pets && user.pets.length > 0
          ? user.pets
              .map((pet) => pet.charAt(0).toUpperCase() + pet.slice(1))
              .join(", ")
          : undefined,
    },
    {
      key: "religion",
      icon: Heart,
      label: t("religion"),
      value: user.religion
        ? user.religion.charAt(0).toUpperCase() + user.religion.slice(1)
        : undefined,
    },
  ];
}

interface FieldEditorDeps {
  user: User;
  t: TFunction;
  openTextEdit: (
    title: string,
    current: string,
    onSave: (value: string) => void,
  ) => void;
  openSingleSelect: (
    title: string,
    options: SelectOption[],
    current: string,
    onSave: (value: string) => void,
  ) => void;
  openMultiSelect: (
    title: string,
    options: SelectOption[],
    current: string[],
    onSave: (value: string[]) => void,
  ) => void;
  saveProfile: (patch: Partial<User>) => Promise<boolean>;
}

/** Opens the edit sheet for one row of the list, saving what is chosen. */
export function openProfileFieldEditor(
  fieldKey: ProfileInfoFieldKey,
  {
    user,
    t,
    openTextEdit,
    openSingleSelect,
    openMultiSelect,
    saveProfile,
  }: FieldEditorDeps,
) {
  switch (fieldKey) {
    case "height": {
      openTextEdit(t("heightCm"), user.height?.toString() ?? "", (value) => {
        const parsedHeight = Number.parseInt(value, 10);

        void saveProfile({
          height: Number.isNaN(parsedHeight) ? undefined : parsedHeight,
        });
      });
      break;
    }

    case "children": {
      openSingleSelect(
        t("children"),
        childrenOptions,
        user.hasChildren ?? "",
        (value) => {
          void saveProfile({
            hasChildren: value as User["hasChildren"],
          });
        },
      );
      break;
    }

    case "drinking": {
      openSingleSelect(
        t("drinking"),
        drinkingOptions,
        user.drinking ?? "",
        (value) => {
          void saveProfile({
            drinking: value as User["drinking"],
          });
        },
      );
      break;
    }

    case "languages": {
      openMultiSelect(
        t("languages"),
        languageOptions,
        user.languages ?? [],
        (value) => {
          void saveProfile({
            languages: value,
          });
        },
      );
      break;
    }

    case "relationship": {
      openSingleSelect(
        t("relationshipStatus"),
        relationshipOptions,
        user.relationship ?? "",
        (value) => {
          void saveProfile({
            relationship: value as User["relationship"],
          });
        },
      );
      break;
    }

    case "sexuality": {
      openSingleSelect(
        t("sexuality"),
        sexualityOptions,
        user.sexuality ?? "",
        (value) => {
          void saveProfile({
            sexuality: value as User["sexuality"],
          });
        },
      );
      break;
    }

    case "smoking": {
      openSingleSelect(
        t("smoking"),
        smokingOptions,
        user.smoking ?? "",
        (value) => {
          void saveProfile({
            smoking: value as User["smoking"],
          });
        },
      );
      break;
    }

    case "starSign": {
      openSingleSelect(
        t("starSign"),
        starSignOptions,
        user.starSign ?? "",
        (value) => {
          void saveProfile({
            starSign: value as User["starSign"],
          });
        },
      );
      break;
    }

    case "pets": {
      openMultiSelect(t("pets"), petsOptions, user.pets ?? [], (value) => {
        void saveProfile({
          pets: value,
        });
      });
      break;
    }

    case "religion": {
      openSingleSelect(
        t("religion"),
        religionOptions,
        user.religion ?? "",
        (value) => {
          void saveProfile({
            religion: value as User["religion"],
          });
        },
      );
      break;
    }
  }
}

interface EditCallbackDeps extends FieldEditorDeps {
  handleAddPhoto: () => Promise<void>;
  handleRemovePhoto: (url: string) => Promise<void>;
  handleEditProfileField: (fieldKey: ProfileInfoFieldKey) => void;
}

/** What the profile tab calls when the user edits a photo, a text or a row. */
export function buildProfileEditCallbacks({
  user,
  t,
  openTextEdit,
  openSingleSelect,
  openMultiSelect,
  saveProfile,
  handleAddPhoto,
  handleRemovePhoto,
  handleEditProfileField,
}: EditCallbackDeps): ProfileEditCallbacks {
  return {
    onAddPhoto: () => {
      void handleAddPhoto();
    },

    onRemovePhoto: (url) => {
      void handleRemovePhoto(url);
    },

    onEditTags: () => {
      openMultiSelect(t("tags"), tagsOptions, user.tags ?? [], (value) => {
        void saveProfile({
          tags: value,
        });
      });
    },

    onEditWork: () => {
      openTextEdit(t("work"), user.work ?? "", (value) => {
        void saveProfile({
          work: value.trim() || undefined,
        });
      });
    },

    onEditEducation: () => {
      openTextEdit(t("education"), user.education ?? "", (value) => {
        void saveProfile({
          education: value.trim() || undefined,
        });
      });
    },

    onEditLookingFor: () => {
      // One choice: it is stored as the "seeking" answer from
      // onboarding.
      openSingleSelect(
        t("whyYoureHere"),
        lookingForOptions,
        user.lookingFor?.[0] ?? "",
        (value) => {
          void saveProfile({
            lookingFor: [value] as User["lookingFor"],
          });
        },
      );
    },

    onEditBio: () => {
      openTextEdit(t("bio"), user.info ?? "", (value) => {
        void saveProfile({
          info: value.trim() || undefined,
        });
      });
    },

    onEditField: (fieldKey) => {
      handleEditProfileField(fieldKey);
    },
  };
}
