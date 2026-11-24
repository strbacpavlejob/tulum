/*
 * Pure rules for filling in venue pictures: reading Instagram handles out of
 * URLs, telling Instagram's blank avatar from a real picture, and deciding
 * which Google Maps place, if any, is the venue that was looked up.
 */
import {
  calculateDistanceMeters,
  calculateTextSimilarity,
  coreName,
  isNearbySameName,
} from '../duplicate-checker/venue-similarity';

export interface InstagramProfile {
  username: string;
  fullName: string | null;
  profilePicUrl: string | null;
  profilePicUrlHD: string | null;
}

export interface GoogleMapsPlace {
  title: string;
  latitude: number | null;
  longitude: number | null;
  /** The website on the place's listing; small bars often list Instagram. */
  website: string | null;
  /** Instagram profiles linked from the place's website. */
  instagramUrls: string[];
  permanentlyClosed: boolean;
}

export interface VenueLocation {
  name: string;
  latitude: number;
  longitude: number;
}

/** A Google Maps place farther than this from the venue is another place. */
export const MAX_PLACE_DISTANCE_METERS = 300;

/*
 * Closer than this, one name inside the other is enough: a branch
 * ("Smokvica" listed as "Smokvica Kralja Petra"), or a name with a word the
 * other leaves out.
 */
const CONTAINED_NAME_MAX_DISTANCE_METERS = 150;

/* How alike a handle linked from a website and the venue's name must be. */
const HANDLE_NAME_MIN_SCORE = 60;

/* Names shorter than this are too common to look for inside another. */
const MIN_CONTAINED_NAME_LENGTH = 4;

const INSTAGRAM_HOSTS = new Set([
  'instagram.com',
  'www.instagram.com',
  'm.instagram.com',
  'instagr.am',
  'www.instagr.am',
]);

/* First path segments of instagram.com pages that aren't profiles. */
const INSTAGRAM_NON_PROFILE_PATHS = new Set([
  'p',
  'reel',
  'reels',
  'tv',
  'explore',
  'stories',
  'accounts',
  'direct',
  'about',
  'developer',
  'legal',
  'web',
  'share',
  's',
  'challenge',
  'privacy',
  'session',
  'emails',
  'locations',
]);

const INSTAGRAM_HANDLE = /^[a-z0-9._]{1,30}$/;

/*
 * File names Instagram serves its grey silhouette under, as the picture of
 * an account that has none.
 */
const INSTAGRAM_BLANK_AVATARS = [
  '44884218_345707102882519_2446069589734326272_n',
  '464760996_1254146839119862_3605321457742435801_n',
];

/** A bare Instagram username from "name", "@name" or a profile URL. */
export function normalizeInstagramHandle(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (/^(https?:\/\/)?([a-z]+\.)?instagr(am\.com|\.am)\//i.test(trimmed)) {
    return instagramHandleFromUrl(trimmed);
  }

  return toHandle(trimmed.replace(/^@+/, ''));
}

/**
 * The username an Instagram profile URL points at, or null for any other
 * URL, including Instagram posts, reels and stories.
 */
export function instagramHandleFromUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }

  if (!INSTAGRAM_HOSTS.has(url.hostname.toLowerCase())) return null;

  const segments = url.pathname.split('/').filter(Boolean);
  // instagram.com/_u/<name> is the app's deep link to a profile.
  const first = segments[0] === '_u' ? segments[1] : segments[0];
  if (!first || INSTAGRAM_NON_PROFILE_PATHS.has(first.toLowerCase())) {
    return null;
  }

  return toHandle(first);
}

export function isInstagramBlankAvatar(url: string): boolean {
  return INSTAGRAM_BLANK_AVATARS.some((name) => url.includes(name));
}

/**
 * The picture to show for an Instagram profile: the larger one when there
 * is one, and null when the account has no picture of its own.
 */
export function profilePictureUrl(profile: InstagramProfile): string | null {
  const url = profile.profilePicUrlHD ?? profile.profilePicUrl;
  return url && !isInstagramBlankAvatar(url) ? url : null;
}

/**
 * The Instagram handle of the Google Maps place that is this venue, or null.
 *
 * A place is the venue when it is open, within MAX_PLACE_DISTANCE_METERS
 * and has the venue's name (see isSamePlaceName). The nearest such place
 * with a handle wins: the Instagram profile its listing gives
 * as its website, or else a profile its website links to whose handle is
 * like the venue's name, since a website's footer can also link the agency
 * that built it or a sister venue.
 */
export function findVenueInstagramHandle(
  venue: VenueLocation,
  places: GoogleMapsPlace[],
): string | null {
  const nearby = places
    .filter((place) => !place.permanentlyClosed)
    .map((place) => ({
      place,
      distance: calculateDistanceMeters(
        venue.latitude,
        venue.longitude,
        place.latitude,
        place.longitude,
      ),
    }))
    .filter(
      (candidate): candidate is { place: GoogleMapsPlace; distance: number } =>
        candidate.distance !== null &&
        candidate.distance <= MAX_PLACE_DISTANCE_METERS &&
        isSamePlaceName(venue.name, candidate.place.title, candidate.distance),
    )
    .sort((first, second) => first.distance - second.distance);

  for (const { place } of nearby) {
    const handle = placeInstagramHandle(venue.name, place);
    if (handle) return handle;
  }

  return null;
}

/*
 * The same name as the duplicate checker compares them, also when only the
 * spacing differs ("Akademija 28", "Akademija28"), or, closer than
 * CONTAINED_NAME_MAX_DISTANCE_METERS, every word of one name in the other.
 */
function isSamePlaceName(
  venueName: string,
  placeTitle: string,
  distanceMeters: number,
): boolean {
  if (isNearbySameName([venueName], [placeTitle], distanceMeters)) return true;

  const venueCore = coreName(venueName);
  const placeCore = coreName(placeTitle);
  if (venueCore.length >= 3 && compact(venueCore) === compact(placeCore)) {
    return true;
  }

  if (distanceMeters > CONTAINED_NAME_MAX_DISTANCE_METERS) return false;

  const [shorter, longer] = [venueCore, placeCore]
    .map((name) => name.split(' ').filter(Boolean))
    .sort((first, second) => first.length - second.length);
  return (
    shorter.join('').length >= MIN_CONTAINED_NAME_LENGTH &&
    shorter.every((word) => longer.includes(word))
  );
}

function placeInstagramHandle(
  venueName: string,
  place: GoogleMapsPlace,
): string | null {
  const listed = place.website ? instagramHandleFromUrl(place.website) : null;
  if (listed) return listed;

  const linked = [
    ...new Set(
      place.instagramUrls
        .map((url) => instagramHandleFromUrl(url))
        .filter((handle): handle is string => handle !== null),
    ),
  ];

  const [best] = linked
    .map((handle) => ({ handle, score: handleNameScore(handle, venueName) }))
    .filter(({ score }) => score >= HANDLE_NAME_MIN_SCORE)
    .sort((first, second) => second.score - first.score);

  return best?.handle ?? null;
}

/**
 * How much a handle looks like the venue's name, from 0 to 100. Handles
 * run words together ("sipajnepitaj") and add the city ("hype.belgrade"),
 * so a name inside the handle, or the handle inside the name, counts fully.
 */
function handleNameScore(handle: string, venueName: string): number {
  const compactHandle = compact(handle);
  const names = [venueName, coreName(venueName)]
    .map(compact)
    .filter((name) => name.length >= MIN_CONTAINED_NAME_LENGTH);

  const contained = names.some(
    (name) =>
      compactHandle.includes(name) ||
      (compactHandle.length >= MIN_CONTAINED_NAME_LENGTH &&
        name.includes(compactHandle)),
  );
  if (contained) return 100;

  return calculateTextSimilarity(handle.replace(/[._]+/g, ' '), venueName);
}

function compact(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function toHandle(value: string): string | null {
  const handle = value.toLowerCase();
  return INSTAGRAM_HANDLE.test(handle) ? handle : null;
}
