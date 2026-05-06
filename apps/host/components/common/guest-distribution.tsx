import { IconGenderFemale, IconGenderMale } from "@tabler/icons-react";

export const GenderDistribution = ({
  genderStats,
}: {
  genderStats: { female: number; male: number };
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 font-medium">
          <IconGenderFemale className="size-4 text-pink-500" />
          <span>Female</span>
        </div>
        <span className="text-muted-foreground">{genderStats.female}%</span>
      </div>

      {/* Custom dual-color progress bar */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-blue-500 dark:bg-blue-300">
        <div
          className="absolute left-0 top-0 h-full  bg-pink-500 dark:bg-pink-300 transition-all"
          style={{ width: `${genderStats.female}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 font-medium">
          <IconGenderMale className="size-4 text-blue-500" />
          <span>Male</span>
        </div>
        <span className="text-muted-foreground">{genderStats.male}%</span>
      </div>
    </div>
  );
};
