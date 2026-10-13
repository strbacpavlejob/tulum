export const MAX_LIKE_PERCENTAGE = 0.2;
export const MIN_LIKE_LIMIT = 3;

export type LikeGenderFilter = 'male' | 'female' | 'other' | 'everyone';

export interface LikeFilters {
  genderFilter: LikeGenderFilter;
  ageMin: number | null;
  ageMax: number | null;
  selectedInterests: string[];
}

export function normalizeLikeFilters(input?: {
  genderFilter?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  selectedInterests?: string[] | null;
}): LikeFilters {
  const genderFilter =
    input?.genderFilter === 'male' ||
    input?.genderFilter === 'female' ||
    input?.genderFilter === 'other'
      ? input.genderFilter
      : 'everyone';

  const ageMin =
    typeof input?.ageMin === 'number' && Number.isFinite(input.ageMin)
      ? Math.max(0, Math.floor(input.ageMin))
      : null;
  const ageMax =
    typeof input?.ageMax === 'number' && Number.isFinite(input.ageMax)
      ? Math.max(0, Math.floor(input.ageMax))
      : null;

  const normalizedAgeMin =
    ageMin !== null && ageMax !== null ? Math.min(ageMin, ageMax) : ageMin;
  const normalizedAgeMax =
    ageMin !== null && ageMax !== null ? Math.max(ageMin, ageMax) : ageMax;

  const selectedInterests = Array.from(
    new Set(
      (input?.selectedInterests ?? [])
        .map((interest) => interest.trim())
        .filter(Boolean),
    ),
  );

  return {
    genderFilter,
    ageMin: normalizedAgeMin,
    ageMax: normalizedAgeMax,
    selectedInterests,
  };
}

export function calculateRawLikeLimit(
  eligibleGuestCount: number,
  maxLikePercentage = MAX_LIKE_PERCENTAGE,
  minLikeLimit = MIN_LIKE_LIMIT,
): number {
  const normalizedEligibleCount = Math.max(0, Math.floor(eligibleGuestCount));

  if (normalizedEligibleCount === 0) {
    return 0;
  }

  const percentageLimit = Math.floor(
    normalizedEligibleCount * maxLikePercentage,
  );

  return Math.min(
    normalizedEligibleCount,
    Math.max(minLikeLimit, percentageLimit),
  );
}

export function calculateEffectiveLikeLimit(
  eligibleGuestCount: number,
  likesUsed: number,
  maxLikePercentage = MAX_LIKE_PERCENTAGE,
  minLikeLimit = MIN_LIKE_LIMIT,
): number {
  return Math.max(
    Math.max(0, Math.floor(likesUsed)),
    calculateRawLikeLimit(eligibleGuestCount, maxLikePercentage, minLikeLimit),
  );
}
