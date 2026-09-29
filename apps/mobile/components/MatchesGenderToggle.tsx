import { LookingForGender } from "@/types/user";
import React from "react";
import { useTranslation } from "react-i18next";
import { TouchableOpacity, View } from "react-native";
import { Circle, Mars, Venus } from "lucide-react-native";

type MatchesGenderToggleProps = {
  value: LookingForGender;
  onChange: (value: LookingForGender) => void;
};

const OPTIONS: {
  value: LookingForGender;
  labelKey: string;
  icon: React.ElementType;
}[] = [
  { value: "male", labelKey: "onboardingInterestedMen", icon: Mars },
  { value: "female", labelKey: "onboardingInterestedWomen", icon: Venus },
  { value: "everyone", labelKey: "onboardingInterestedEveryone", icon: Circle },
];

export default function MatchesGenderToggle({
  value,
  onChange,
}: MatchesGenderToggleProps) {
  const { t } = useTranslation();

  return (
    <View className="items-center px-4 py-3">
      <View className="rounded-full bg-light-backgroundStrong p-1 dark:bg-dark-backgroundStrong">
        <View className="flex-row">
          {OPTIONS.map((opt) => {
            const selected = value === opt.value;
            const Icon = opt.icon;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => onChange(opt.value)}
                accessibilityRole="button"
                accessibilityLabel={t(opt.labelKey)}
                className={selected ? "bg-light-color dark:bg-dark-color" : ""}
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  marginHorizontal: 2,
                  minWidth: 56,
                  alignItems: "center",
                }}
              >
                <Icon
                  size={18}
                  className={
                    selected
                      ? "text-light-background dark:text-dark-background"
                      : "text-light-gray10 dark:text-dark-gray10"
                  }
                  strokeWidth={selected ? 2.6 : 2.2}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}
