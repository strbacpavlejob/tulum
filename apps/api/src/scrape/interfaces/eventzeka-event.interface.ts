export interface EventZekaTaxonomy {
  categories?: string[];
  formats?: string[];
  genres?: string[];
  primaryCategory?: string;
}

/**
 * An event card from an eventzeka.com day page, as the page's Next.js payload
 * carries it.
 */
export interface EventZekaCard {
  _id: string;
  title: string;
  /** Belgrade calendar date, YYYY-MM-DD. */
  date: string;
  /** "21:00" or "21:00–02:00"; unset while the time isn't announced. */
  time?: string;
  /** "confirmed" when the time comes from the announcement, else "unknown". */
  timeStatus?: string;
  venue: string;
  venueId: string;
  /** Mostly "venue"; also "club", "culture", "restaurant/cafe". */
  venueCategory?: string;
  /** "club", "live", "culture" or "event". */
  category?: string;
  /** "nightlife", "live music", "arts & culture", "event", ... */
  eventType?: string;
  artists?: string[];
  tags?: string[];
  ticketPrice?: string;
  eventTaxonomy?: EventZekaTaxonomy;
}

/**
 * The same event from its own page, which adds the venue's position and
 * Instagram account and the post the event was read from.
 */
export interface EventZekaEvent extends EventZekaCard {
  status?: string;
  sourceCaption?: string;
  sourcePostedAt?: string;
  instagramPostUrl?: string;
  venueLatitude?: number;
  venueLongitude?: number;
  venueInstagramHandle?: string;
  /** Other names the venue goes by, e.g. "Klub Drugstore" for "Drugstore Belgrade". */
  venueAliases?: string[];
}

/** A venue in the site's directory. */
export interface EventZekaListedVenue {
  id: string;
  name: string;
}

/** A venue from its own page's JSON-LD. */
export interface EventZekaVenue extends EventZekaListedVenue {
  /** Only for some venues, e.g. "Makedonska 4, Beograd 11000". */
  streetAddress?: string;
  latitude?: number;
  longitude?: number;
  instagramHandle?: string;
  /** "club", "culture", "restaurant/cafe", or the generic "venue". */
  category?: string;
}
