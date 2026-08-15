/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { differenceInMinutes } from 'date-fns';

import {
  ScrapedEvent,
  ScrapedVenue,
} from 'src/scrape/domain/scraper.interface';
import { ScraperLogs } from 'src/scrape/shared/scraper-logs';

interface ExistingVenueContact {
  phoneNumber: string | null;
  instagramHandle: string | null;
}

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
  private readonly MAX_VENUE_DISTANCE_METERS = 150;

  private readonly VENUE_GEO_WEIGHT = 0.3;
  private readonly VENUE_NAME_WEIGHT = 0.3;
  private readonly VENUE_ADDRESS_WEIGHT = 0.15;
  private readonly VENUE_CONTACT_WEIGHT = 0.25;

  private readonly VENUE_MATCH_THRESHOLD = 72;

  private readonly INSTAGRAM_MATCH_SCORE = 100;
  private readonly PHONE_MATCH_SCORE = 90;

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

      filteredScrapedEvents.push(scrapedEvent);
    }

    return filteredScrapedEvents;
  }

  findBestVenueMatch(
    scrapedVenue: ScrapedVenue,
    existingVenues: ExistingVenue[],
  ): VenueMatchCandidate | null {
    let bestMatch: VenueMatchCandidate | null = null;

    for (const venue of existingVenues) {
      const distanceMeters = this.calculateDistanceMeters(
        scrapedVenue.latitude ?? null,
        scrapedVenue.longitude ?? null,
        venue.latitude,
        venue.longitude,
      );

      const nameScore = this.calculateTextSimilarity(
        scrapedVenue.name,
        venue.name,
      );

      const addressScore = this.calculateTextSimilarity(
        scrapedVenue.address ?? '',
        venue.address ?? '',
      );

      const contactScore = this.calculateVenueContactSimilarity(
        scrapedVenue.contact
          ? {
              phoneNumber: scrapedVenue.contact.phoneNumber ?? null,
              instagramHandle: scrapedVenue.contact.instagramHandle ?? null,
            }
          : null,
        venue.contact,
      );

      const hasInstagramMatch = contactScore === this.INSTAGRAM_MATCH_SCORE;

      const hasPhoneMatch = contactScore === this.PHONE_MATCH_SCORE;

      /*
       * When both records have coordinates and are too far apart,
       * discard them unless a strong contact identifier matches.
       */
      if (
        distanceMeters != null &&
        distanceMeters > this.MAX_VENUE_DISTANCE_METERS &&
        !hasInstagramMatch &&
        !hasPhoneMatch
      ) {
        continue;
      }

      const geoScore = this.calculateGeoSimilarity(distanceMeters);

      const totalScore =
        geoScore * this.VENUE_GEO_WEIGHT +
        nameScore * this.VENUE_NAME_WEIGHT +
        addressScore * this.VENUE_ADDRESS_WEIGHT +
        contactScore * this.VENUE_CONTACT_WEIGHT;

      /*
       * Exact Instagram match is considered strong enough
       * to identify the same venue.
       */
      const candidateScore = hasInstagramMatch
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

      const titleScore = this.calculateTextSimilarity(
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

    const titleScore = this.calculateTextSimilarity(
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
    const distanceMeters = this.calculateDistanceMeters(
      firstVenue.latitude ?? null,
      firstVenue.longitude ?? null,
      secondVenue.latitude ?? null,
      secondVenue.longitude ?? null,
    );

    const nameScore = this.calculateTextSimilarity(
      firstVenue.name,
      secondVenue.name,
    );

    const addressScore = this.calculateTextSimilarity(
      firstVenue.address ?? '',
      secondVenue.address ?? '',
    );

    const contactScore = this.calculateVenueContactSimilarity(
      firstVenue.contact
        ? {
            phoneNumber: firstVenue.contact.phoneNumber ?? null,
            instagramHandle: firstVenue.contact.instagramHandle ?? null,
          }
        : null,
      secondVenue.contact
        ? {
            phoneNumber: secondVenue.contact.phoneNumber ?? null,
            instagramHandle: secondVenue.contact.instagramHandle ?? null,
          }
        : null,
    );

    const hasInstagramMatch = contactScore === this.INSTAGRAM_MATCH_SCORE;

    const hasPhoneMatch = contactScore === this.PHONE_MATCH_SCORE;

    if (
      distanceMeters != null &&
      distanceMeters > this.MAX_VENUE_DISTANCE_METERS &&
      !hasInstagramMatch &&
      !hasPhoneMatch
    ) {
      return false;
    }

    const geoScore = this.calculateGeoSimilarity(distanceMeters);

    const totalScore =
      geoScore * this.VENUE_GEO_WEIGHT +
      nameScore * this.VENUE_NAME_WEIGHT +
      addressScore * this.VENUE_ADDRESS_WEIGHT +
      contactScore * this.VENUE_CONTACT_WEIGHT;

    const candidateScore = hasInstagramMatch
      ? Math.max(totalScore, this.VENUE_MATCH_THRESHOLD)
      : totalScore;

    return candidateScore >= this.VENUE_MATCH_THRESHOLD;
  }

  private calculateEventTimeScore(timeDeltaMinutes: number): number {
    const maxTimeDeltaMinutes = this.MAX_EVENT_TIME_DELTA_HOURS * 60;

    return Math.max(0, 1 - timeDeltaMinutes / maxTimeDeltaMinutes) * 100;
  }

  calculateDistanceMeters(
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

    const latitudeARadians = this.toRadians(latitudeA);

    const latitudeBRadians = this.toRadians(latitudeB);

    const latitudeDelta = this.toRadians(latitudeB - latitudeA);

    const longitudeDelta = this.toRadians(longitudeB - longitudeA);

    const haversine =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(latitudeARadians) *
        Math.cos(latitudeBRadians) *
        Math.sin(longitudeDelta / 2) ** 2;

    const angularDistance =
      2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

    return earthRadiusMeters * angularDistance;
  }

  calculateGeoSimilarity(distanceMeters: number | null): number {
    if (distanceMeters == null) {
      return 0;
    }

    if (distanceMeters > this.MAX_VENUE_DISTANCE_METERS) {
      return 0;
    }

    return (
      Math.max(0, 1 - distanceMeters / this.MAX_VENUE_DISTANCE_METERS) * 100
    );
  }

  calculateVenueContactSimilarity(
    firstContact: ExistingVenueContact | null,
    secondContact: ExistingVenueContact | null,
  ): number {
    if (!firstContact || !secondContact) {
      return 0;
    }

    const firstInstagram = this.normalizeInstagramHandle(
      firstContact.instagramHandle,
    );

    const secondInstagram = this.normalizeInstagramHandle(
      secondContact.instagramHandle,
    );

    if (
      firstInstagram &&
      secondInstagram &&
      firstInstagram === secondInstagram
    ) {
      return this.INSTAGRAM_MATCH_SCORE;
    }

    const firstPhone = this.normalizePhoneNumber(firstContact.phoneNumber);

    const secondPhone = this.normalizePhoneNumber(secondContact.phoneNumber);

    if (firstPhone && secondPhone && firstPhone === secondPhone) {
      return this.PHONE_MATCH_SCORE;
    }

    return 0;
  }

  calculateTextSimilarity(firstValue: string, secondValue: string): number {
    const normalizedFirst = this.normalizeText(firstValue);

    const normalizedSecond = this.normalizeText(secondValue);

    if (!normalizedFirst || !normalizedSecond) {
      return 0;
    }

    if (normalizedFirst === normalizedSecond) {
      return 100;
    }

    const tokenScore = this.calculateTokenSimilarity(
      normalizedFirst,
      normalizedSecond,
    );

    const bigramScore = this.calculateBigramSimilarity(
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

  calculateTokenSimilarity(firstValue: string, secondValue: string): number {
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

  calculateBigramSimilarity(firstValue: string, secondValue: string): number {
    const firstBigrams = this.toBigrams(firstValue);

    const secondBigrams = this.toBigrams(secondValue);

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

  toBigrams(value: string): string[] {
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

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeInstagramHandle(value?: string | null): string | null {
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

  private normalizePhoneNumber(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const normalized = value.replace(/\D/g, '');

    return normalized || null;
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }
}
