/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { differenceInMinutes } from 'date-fns';

import { ScrapedEvent, ScrapedVenue } from '../scrape/domain/scraper.interface';
import { ScraperLogs } from '../scrape/shared/scraper-logs';
import {
  bestNameSimilarity,
  calculateDistanceMeters,
  calculateGeoSimilarity,
  calculateTextSimilarity,
  calculateVenueContactSimilarity,
  ExistingVenueContact,
  INSTAGRAM_MATCH_SCORE,
  isNearbySameName,
  MAX_VENUE_DISTANCE_METERS,
  PHONE_MATCH_SCORE,
} from './venue-similarity';

interface ExistingVenue {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  min_age_male: number | null;
  min_age_female: number | null;
  contact: ExistingVenueContact | null;
}

interface ExistingEvent {
  id: string;
  venueId: string;
  title: string;
  description: string | null;
  startDateTime: Date;
  endDateTime: Date;
}

interface VenueMatchCandidate {
  venue: ExistingVenue;
  score: number;
  distanceMeters: number | null;
  geoScore: number;
  nameScore: number;
  addressScore: number;
  contactScore: number;
}

interface EventMatchCandidate {
  event: ExistingEvent;
  score: number;
  titleScore: number;
  timeScore: number;
  timeDeltaMinutes: number;
}

@Injectable()
export class DuplicateCheckerService {
  /*
   * Venue matching
   */

  private readonly VENUE_GEO_WEIGHT = 0.3;
  private readonly VENUE_NAME_WEIGHT = 0.3;
  private readonly VENUE_ADDRESS_WEIGHT = 0.15;
  private readonly VENUE_CONTACT_WEIGHT = 0.25;

  private readonly VENUE_MATCH_THRESHOLD = 72;

  /*
   * Event matching
   *
   * Same real venue + similar title + start time within 2 hours.
   */
  private readonly MAX_EVENT_TIME_DELTA_HOURS = 2;

  private readonly EVENT_TITLE_WEIGHT = 0.7;
  private readonly EVENT_TIME_WEIGHT = 0.3;

  private readonly EVENT_MATCH_THRESHOLD = 75;
  private readonly MIN_EVENT_TITLE_SIMILARITY = 60;

  constructor(private readonly logs: ScraperLogs) {}

  filterDuplicateVenues(
    scrapedVenues: ScrapedVenue[],
    existingVenues: ExistingVenue[],
  ): ScrapedVenue[] {
    const filteredScrapedVenues: ScrapedVenue[] = [];

    for (const scrapedVenue of scrapedVenues) {
      const existingDuplicate = this.findBestVenueMatch(
        scrapedVenue,
        existingVenues,
      );

      if (existingDuplicate) {
        this.logs.debug(
          `Skipping scraped venue "${scrapedVenue.name}" because it ` +
            `matches existing venue "${existingDuplicate.venue.name}" ` +
            `with score ${existingDuplicate.score.toFixed(1)}%`,
        );

        continue;
      }

      /*
       * Also prevent duplicates inside the current scrape.
       */
      const scrapedDuplicate = filteredScrapedVenues.find((venue) =>
        this.areVenuesDuplicates(scrapedVenue, venue),
      );

      if (scrapedDuplicate) {
        this.logs.debug(
          `Skipping scraped venue "${scrapedVenue.name}" because it ` +
            `matches another scraped venue "${scrapedDuplicate.name}"`,
        );

        continue;
      }

      filteredScrapedVenues.push(scrapedVenue);
    }

    return filteredScrapedVenues;
  }

  filterDuplicateEvents(
    scrapedEvents: ScrapedEvent[],
    existingEvents: ExistingEvent[],
    existingVenues: ExistingVenue[],
  ): ScrapedEvent[] {
    const filteredScrapedEvents: ScrapedEvent[] = [];

    for (const scrapedEvent of scrapedEvents) {
      /*
       * Resolve the scraped venue to the real venue
       * already stored in the database.
       */
      const venueMatch = this.findBestVenueMatch(
        scrapedEvent.venue,
        existingVenues,
      );

      /*
       * If the venue does not exist in the DB,
       * the event cannot already exist in the DB
       * for that venue.
       */
      if (venueMatch) {
        const eventsAtSameVenue = existingEvents.filter(
          (event) => event.venueId === venueMatch.venue.id,
        );

        const existingDuplicate = this.findBestExistingEventMatch(
          scrapedEvent,
          eventsAtSameVenue,
        );

        if (existingDuplicate) {
          this.logs.debug(
            `Skipping scraped event "${scrapedEvent.title}" because it ` +
              `matches existing event "${existingDuplicate.event.title}" ` +
              `at venue "${venueMatch.venue.name}" ` +
              `with score ${existingDuplicate.score.toFixed(1)}% ` +
              `(title ${existingDuplicate.titleScore.toFixed(1)}%, ` +
              `time ${existingDuplicate.timeScore.toFixed(1)}%, ` +
              `delta ${existingDuplicate.timeDeltaMinutes} minutes)`,
          );

          continue;
        }
      }

      /*
       * Also check duplicates inside the current scrape.
       *
       * We compare the actual scraped venue objects using
       * the same venue matching logic.
       */
      const scrapedDuplicate = filteredScrapedEvents.find((event) => {
        const sameVenue = this.areVenuesDuplicates(
          scrapedEvent.venue,
          event.venue,
        );

        if (!sameVenue) {
          return false;
        }

        return this.areEventsDuplicates(scrapedEvent, event);
      });

      if (scrapedDuplicate) {
        this.logs.debug(
          `Skipping scraped event "${scrapedEvent.title}" because it ` +
            `matches another scraped event "${scrapedDuplicate.title}" ` +
            `at venue "${scrapedEvent.venue.name}"`,
        );

        continue;
      }

      /*
       * The event is at a venue already in the DB, which may go by
       * another name there: point it at that venue by id, since the
       * save step looks venues up by name.
       */
      filteredScrapedEvents.push(
        venueMatch
          ? { ...scrapedEvent, venueId: venueMatch.venue.id }
          : scrapedEvent,
      );
    }

    return filteredScrapedEvents;
  }

  findBestVenueMatch(
    scrapedVenue: ScrapedVenue,
    existingVenues: ExistingVenue[],
  ): VenueMatchCandidate | null {
    let bestMatch: VenueMatchCandidate | null = null;

    for (const venue of existingVenues) {
      const distanceMeters = calculateDistanceMeters(
        scrapedVenue.latitude ?? null,
        scrapedVenue.longitude ?? null,
        venue.latitude,
        venue.longitude,
      );

      const nameScore = bestNameSimilarity(this.namesOf(scrapedVenue), [
        venue.name,
      ]);

      const addressScore = calculateTextSimilarity(
        scrapedVenue.address ?? '',
        venue.address ?? '',
      );

      const contactScore = calculateVenueContactSimilarity(
        scrapedVenue.venueContacts
          ? {
              phoneNumber: scrapedVenue.venueContacts.phoneNumber ?? null,
              instagramHandle:
                scrapedVenue.venueContacts.instagramHandle ?? null,
            }
          : null,
        venue.contact,
      );

      const hasInstagramMatch = contactScore === INSTAGRAM_MATCH_SCORE;

      const hasPhoneMatch = contactScore === PHONE_MATCH_SCORE;

      const hasNearbySameName = isNearbySameName(
        this.namesOf(scrapedVenue),
        [venue.name],
        distanceMeters,
      );

      /*
       * When both records have coordinates and are too far apart,
       * discard them unless a strong contact identifier matches.
       */
      if (
        distanceMeters != null &&
        distanceMeters > MAX_VENUE_DISTANCE_METERS &&
        !hasInstagramMatch &&
        !hasPhoneMatch &&
        !hasNearbySameName
      ) {
        continue;
      }

      const geoScore = calculateGeoSimilarity(distanceMeters);

      const totalScore =
        geoScore * this.VENUE_GEO_WEIGHT +
        nameScore * this.VENUE_NAME_WEIGHT +
        addressScore * this.VENUE_ADDRESS_WEIGHT +
        contactScore * this.VENUE_CONTACT_WEIGHT;

      /*
       * Exact Instagram match is considered strong enough
       * to identify the same venue, and so is the same name nearby.
       */
      const candidateScore =
        hasInstagramMatch || hasNearbySameName
          ? Math.max(totalScore, this.VENUE_MATCH_THRESHOLD)
          : totalScore;

      if (!bestMatch || candidateScore > bestMatch.score) {
        bestMatch = {
          venue,
          score: candidateScore,
          distanceMeters,
          geoScore,
          nameScore,
          addressScore,
          contactScore,
        };
      }
    }

    if (!bestMatch || bestMatch.score < this.VENUE_MATCH_THRESHOLD) {
      return null;
    }

    this.logs.debug(
      `Matched venue "${scrapedVenue.name}" to ` +
        `"${bestMatch.venue.name}" with score ` +
        `${bestMatch.score.toFixed(1)}% ` +
        `(distance ${
          bestMatch.distanceMeters != null
            ? `${bestMatch.distanceMeters.toFixed(0)}m`
            : 'N/A'
        }, ` +
        `geo ${bestMatch.geoScore.toFixed(1)}%, ` +
        `name ${bestMatch.nameScore.toFixed(1)}%, ` +
        `address ${bestMatch.addressScore.toFixed(1)}%, ` +
        `contact ${bestMatch.contactScore.toFixed(1)}%)`,
    );

    return bestMatch;
  }

  private findBestExistingEventMatch(
    scrapedEvent: ScrapedEvent,
    existingEvents: ExistingEvent[],
  ): EventMatchCandidate | null {
    let bestMatch: EventMatchCandidate | null = null;

    const maxTimeDeltaMinutes = this.MAX_EVENT_TIME_DELTA_HOURS * 60;

    for (const existingEvent of existingEvents) {
      const timeDeltaMinutes = Math.abs(
        differenceInMinutes(
          scrapedEvent.startDateTime,
          existingEvent.startDateTime,
        ),
      );

      /*
       * More than ±2 hours means it is treated as
       * a different event.
       */
      if (timeDeltaMinutes > maxTimeDeltaMinutes) {
        continue;
      }

      const titleScore = calculateTextSimilarity(
        scrapedEvent.title,
        existingEvent.title,
      );

      /*
       * Being at the same venue and around the same
       * time is not sufficient when titles are unrelated.
       */
      if (titleScore < this.MIN_EVENT_TITLE_SIMILARITY) {
        continue;
      }

      const timeScore = this.calculateEventTimeScore(timeDeltaMinutes);

      const totalScore =
        titleScore * this.EVENT_TITLE_WEIGHT +
        timeScore * this.EVENT_TIME_WEIGHT;

      if (!bestMatch || totalScore > bestMatch.score) {
        bestMatch = {
          event: existingEvent,
          score: totalScore,
          titleScore,
          timeScore,
          timeDeltaMinutes,
        };
      }
    }

    if (!bestMatch || bestMatch.score < this.EVENT_MATCH_THRESHOLD) {
      return null;
    }

    return bestMatch;
  }

  private areEventsDuplicates(
    firstEvent: ScrapedEvent,
    secondEvent: ScrapedEvent,
  ): boolean {
    const timeDeltaMinutes = Math.abs(
      differenceInMinutes(firstEvent.startDateTime, secondEvent.startDateTime),
    );

    const maxTimeDeltaMinutes = this.MAX_EVENT_TIME_DELTA_HOURS * 60;

    if (timeDeltaMinutes > maxTimeDeltaMinutes) {
      return false;
    }

    const titleScore = calculateTextSimilarity(
      firstEvent.title,
      secondEvent.title,
    );

    if (titleScore < this.MIN_EVENT_TITLE_SIMILARITY) {
      return false;
    }

    const timeScore = this.calculateEventTimeScore(timeDeltaMinutes);

    const totalScore =
      titleScore * this.EVENT_TITLE_WEIGHT + timeScore * this.EVENT_TIME_WEIGHT;

    return totalScore >= this.EVENT_MATCH_THRESHOLD;
  }

  private areVenuesDuplicates(
    firstVenue: ScrapedVenue,
    secondVenue: ScrapedVenue,
  ): boolean {
    const distanceMeters = calculateDistanceMeters(
      firstVenue.latitude ?? null,
      firstVenue.longitude ?? null,
      secondVenue.latitude ?? null,
      secondVenue.longitude ?? null,
    );

    const nameScore = bestNameSimilarity(
      this.namesOf(firstVenue),
      this.namesOf(secondVenue),
    );

    const addressScore = calculateTextSimilarity(
      firstVenue.address ?? '',
      secondVenue.address ?? '',
    );

    const contactScore = calculateVenueContactSimilarity(
      firstVenue.venueContacts
        ? {
            phoneNumber: firstVenue.venueContacts.phoneNumber ?? null,
            instagramHandle: firstVenue.venueContacts.instagramHandle ?? null,
          }
        : null,
      secondVenue.venueContacts
        ? {
            phoneNumber: secondVenue.venueContacts.phoneNumber ?? null,
            instagramHandle: secondVenue.venueContacts.instagramHandle ?? null,
          }
        : null,
    );

    const hasInstagramMatch = contactScore === INSTAGRAM_MATCH_SCORE;

    const hasPhoneMatch = contactScore === PHONE_MATCH_SCORE;

    const hasNearbySameName = isNearbySameName(
      this.namesOf(firstVenue),
      this.namesOf(secondVenue),
      distanceMeters,
    );

    if (
      distanceMeters != null &&
      distanceMeters > MAX_VENUE_DISTANCE_METERS &&
      !hasInstagramMatch &&
      !hasPhoneMatch &&
      !hasNearbySameName
    ) {
      return false;
    }

    const geoScore = calculateGeoSimilarity(distanceMeters);

    const totalScore =
      geoScore * this.VENUE_GEO_WEIGHT +
      nameScore * this.VENUE_NAME_WEIGHT +
      addressScore * this.VENUE_ADDRESS_WEIGHT +
      contactScore * this.VENUE_CONTACT_WEIGHT;

    const candidateScore =
      hasInstagramMatch || hasNearbySameName
        ? Math.max(totalScore, this.VENUE_MATCH_THRESHOLD)
        : totalScore;

    return candidateScore >= this.VENUE_MATCH_THRESHOLD;
  }

  /** A venue's name, then the other names its source gives it. */
  private namesOf(venue: Pick<ScrapedVenue, 'name' | 'aliases'>): string[] {
    return [venue.name, ...(venue.aliases ?? [])];
  }

  private calculateEventTimeScore(timeDeltaMinutes: number): number {
    const maxTimeDeltaMinutes = this.MAX_EVENT_TIME_DELTA_HOURS * 60;

    return Math.max(0, 1 - timeDeltaMinutes / maxTimeDeltaMinutes) * 100;
  }
}
