/*
 * Pure scoring helpers for DuplicateCheckerService: how alike two names,
 * positions and contacts are, from 0 to 100, and the rules for venues that
 * share a name.
 */

export interface ExistingVenueContact {
  phoneNumber: string | null;
  instagramHandle: string | null;
}

/** Venue points farther apart than this score 0 for position. */
export const MAX_VENUE_DISTANCE_METERS = 150;

/** Contact scores: the same Instagram account, or the same phone number. */
export const INSTAGRAM_MATCH_SCORE = 100;

export const PHONE_MATCH_SCORE = 90;

/*
 * Venues with the same name this close are one place, whatever their
 * addresses say: one source gives the street, another only the city, or
 * puts the pin at the entrance. Venue names are unique in the DB, so the
 * save step would merge them by name anyway, overwriting the stored
 * venue. Farther apart they may be namesakes in another part of town.
 */
const SAME_NAME_MAX_DISTANCE_METERS = 1_000;

/*
 * Names that differ only in words like these ("Klub Drugstore",
 * "Drugstore Belgrade") are the same venue when this close.
 */
const CORE_NAME_MAX_DISTANCE_METERS = 300;

const VENUE_NAME_FILLER_WORDS = new Set([
  'the',
  'bar',
  'club',
  'klub',
  'night',
  'nightclub',
  'pub',
  'kafana',
  'kafe',
  'cafe',
  'caffe',
  'restoran',
  'restaurant',
  'bistro',
  'lounge',
  'splav',
  'official',
  'belgrade',
  'beograd',
]);

export function bestNameSimilarity(
  firstNames: string[],
  secondNames: string[],
): number {
  let best = 0;

  for (const first of firstNames) {
    for (const second of secondNames) {
      best = Math.max(best, calculateTextSimilarity(first, second));
    }
  }

  return best;
}

/** The name without the words that only say what kind of place it is. */
function coreName(value: string): string {
  return normalizeText(value)
    .split(' ')
    .filter((word) => word && !VENUE_NAME_FILLER_WORDS.has(word))
    .join(' ');
}

/**
 * Whether two venues share a name and are close enough to be one place:
 * the same name within SAME_NAME_MAX_DISTANCE_METERS, or the same name
 * without filler words within CORE_NAME_MAX_DISTANCE_METERS.
 */
export function isNearbySameName(
  firstNames: string[],
  secondNames: string[],
  distanceMeters: number | null,
): boolean {
  const within = (meters: number) =>
    distanceMeters == null || distanceMeters <= meters;

  const pairs = firstNames.flatMap((first) =>
    secondNames.map((second) => [first, second] as const),
  );

  const sameName = pairs.some(([first, second]) => {
    const name = normalizeText(first);
    return name !== '' && name === normalizeText(second);
  });
  if (sameName && within(SAME_NAME_MAX_DISTANCE_METERS)) return true;

  const sameCoreName = pairs.some(([first, second]) => {
    const core = coreName(first);
    return core.length >= 3 && core === coreName(second);
  });

  return sameCoreName && within(CORE_NAME_MAX_DISTANCE_METERS);
}

export function calculateDistanceMeters(
  latitudeA: number | null,
  longitudeA: number | null,
  latitudeB: number | null,
  longitudeB: number | null,
): number | null {
  if (
    latitudeA == null ||
    longitudeA == null ||
    latitudeB == null ||
    longitudeB == null
  ) {
    return null;
  }

  const earthRadiusMeters = 6_371_000;

  const latitudeARadians = toRadians(latitudeA);

  const latitudeBRadians = toRadians(latitudeB);

  const latitudeDelta = toRadians(latitudeB - latitudeA);

  const longitudeDelta = toRadians(longitudeB - longitudeA);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeARadians) *
      Math.cos(latitudeBRadians) *
      Math.sin(longitudeDelta / 2) ** 2;

  const angularDistance =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return earthRadiusMeters * angularDistance;
}

export function calculateGeoSimilarity(distanceMeters: number | null): number {
  if (distanceMeters == null) {
    return 0;
  }

  if (distanceMeters > MAX_VENUE_DISTANCE_METERS) {
    return 0;
  }

  return Math.max(0, 1 - distanceMeters / MAX_VENUE_DISTANCE_METERS) * 100;
}

export function calculateVenueContactSimilarity(
  firstContact: ExistingVenueContact | null,
  secondContact: ExistingVenueContact | null,
): number {
  if (!firstContact || !secondContact) {
    return 0;
  }

  const firstInstagram = normalizeInstagramHandle(firstContact.instagramHandle);

  const secondInstagram = normalizeInstagramHandle(
    secondContact.instagramHandle,
  );

  if (firstInstagram && secondInstagram && firstInstagram === secondInstagram) {
    return INSTAGRAM_MATCH_SCORE;
  }

  const firstPhone = normalizePhoneNumber(firstContact.phoneNumber);

  const secondPhone = normalizePhoneNumber(secondContact.phoneNumber);

  if (firstPhone && secondPhone && firstPhone === secondPhone) {
    return PHONE_MATCH_SCORE;
  }

  return 0;
}

export function calculateTextSimilarity(
  firstValue: string,
  secondValue: string,
): number {
  const normalizedFirst = normalizeText(firstValue);

  const normalizedSecond = normalizeText(secondValue);

  if (!normalizedFirst || !normalizedSecond) {
    return 0;
  }

  if (normalizedFirst === normalizedSecond) {
    return 100;
  }

  const tokenScore = calculateTokenSimilarity(
    normalizedFirst,
    normalizedSecond,
  );

  const bigramScore = calculateBigramSimilarity(
    normalizedFirst,
    normalizedSecond,
  );

  const shorter =
    normalizedFirst.length <= normalizedSecond.length
      ? normalizedFirst
      : normalizedSecond;

  const longer =
    normalizedFirst.length > normalizedSecond.length
      ? normalizedFirst
      : normalizedSecond;

  const containmentScore = longer.includes(shorter) ? 100 : 0;

  return tokenScore * 0.45 + bigramScore * 0.45 + containmentScore * 0.1;
}

function calculateTokenSimilarity(
  firstValue: string,
  secondValue: string,
): number {
  const firstTokens = new Set(firstValue.split(' ').filter(Boolean));

  const secondTokens = new Set(secondValue.split(' ').filter(Boolean));

  const unionSize = new Set([...firstTokens, ...secondTokens]).size;

  if (unionSize === 0) {
    return 0;
  }

  const intersectionSize = Array.from(firstTokens).filter((token) =>
    secondTokens.has(token),
  ).length;

  return (intersectionSize / unionSize) * 100;
}

function calculateBigramSimilarity(
  firstValue: string,
  secondValue: string,
): number {
  const firstBigrams = toBigrams(firstValue);

  const secondBigrams = toBigrams(secondValue);

  if (firstBigrams.length === 0 || secondBigrams.length === 0) {
    return 0;
  }

  const counts = new Map<string, number>();

  for (const bigram of firstBigrams) {
    counts.set(bigram, (counts.get(bigram) ?? 0) + 1);
  }

  let overlap = 0;

  for (const bigram of secondBigrams) {
    const count = counts.get(bigram) ?? 0;

    if (count > 0) {
      overlap += 1;
      counts.set(bigram, count - 1);
    }
  }

  return (2 * overlap * 100) / (firstBigrams.length + secondBigrams.length);
}

function toBigrams(value: string): string[] {
  const compactValue = value.replace(/\s+/g, ' ').trim();

  if (compactValue.length < 2) {
    return [];
  }

  const bigrams: string[] = [];

  for (let index = 0; index < compactValue.length - 1; index += 1) {
    bigrams.push(compactValue.slice(index, index + 2));
  }

  return bigrams;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeInstagramHandle(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '')
    .trim();

  return normalized || null;
}

function normalizePhoneNumber(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\D/g, '');

  return normalized || null;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
