/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { differenceInHours, isSameDay, isValid, parseISO } from 'date-fns';
import { ScrapedEvent } from 'src/scrape/domain/scraper.interface';
import { ScraperLogs } from 'src/scrape/shared/scraper-logs';
interface ExistingVenue {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  min_age_male: number | null;
  min_age_female: number | null;
}

interface ExistingEvent {
  title: string;
  start_date_time: string;
}

interface VenueMatchCandidate {
  venue: ExistingVenue;
  score: number;
  geoScore: number;
  nameScore: number;
  addressScore: number;
}

interface ParsedEventDetails {
  title: string;
  description: string;
  startDateTime: string;
  venueName: string;
  address: string;
  venueDescription: string;
  tags: string[];
  imageUrl?: string;
  latitude: number;
  longitude: number;
  minAgeMale: number;
  minAgeFemale: number;
}

@Injectable()
export class DuplicateCheckerService {
  private readonly EVENT_TITLE_WEIGHT = 0.65;
  private readonly EVENT_TIME_WEIGHT = 0.35;
  private readonly EVENT_MATCH_THRESHOLD = 78;
  private readonly MAX_EVENT_TIME_DELTA_HOURS = 12;

  private readonly MAX_LATITUDE_DELTA = 0.03;
  private readonly MAX_LONGITUDE_DELTA = 0.05;

  private readonly VENUE_GEO_WEIGHT = 0.4;
  private readonly VENUE_NAME_WEIGHT = 0.4;
  private readonly VENUE_ADDRESS_WEIGHT = 0.2;
  private readonly VENUE_MATCH_THRESHOLD = 72;

  constructor(private readonly logs: ScraperLogs) {}
  calculateGeoSimilarity(
    latitudeA: number,
    longitudeA: number,
    latitudeB: number | null,
    longitudeB: number | null,
  ): number {
    if (latitudeB == null || longitudeB == null) {
      return 0;
    }

    const latitudeDelta = Math.abs(latitudeA - latitudeB);

    const longitudeDelta = Math.abs(longitudeA - longitudeB);

    const latitudeScore =
      Math.max(0, 1 - latitudeDelta / this.MAX_LATITUDE_DELTA) * 100;

    const longitudeScore =
      Math.max(0, 1 - longitudeDelta / this.MAX_LONGITUDE_DELTA) * 100;

    return (latitudeScore + longitudeScore) / 2;
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

  isLikelyDuplicateEvent(args: {
    title: string;
    startDate: Date;
    venueReference: string;
    events: ScrapedEvent[];
    existingEvents: ExistingEvent[];
  }): boolean {
    const inMemoryEvents = args.events
      .filter(
        (event) =>
          event.venueId === args.venueReference &&
          isSameDay(event.startDateTime, args.startDate),
      )
      .map<ExistingEvent>((event) => ({
        title: event.title,
        start_date_time: event.startDateTime.toISOString(),
      }));

    const candidates = [...args.existingEvents, ...inMemoryEvents];

    for (const existingEvent of candidates) {
      const existingStartDate = parseISO(existingEvent.start_date_time);

      if (
        !isValid(existingStartDate) ||
        !isSameDay(args.startDate, existingStartDate)
      ) {
        continue;
      }

      const titleScore = this.calculateTextSimilarity(
        args.title,
        existingEvent.title,
      );

      const hourDelta = Math.abs(
        differenceInHours(args.startDate, existingStartDate),
      );

      const timeScore =
        Math.max(0, 1 - hourDelta / this.MAX_EVENT_TIME_DELTA_HOURS) * 100;

      const totalScore =
        titleScore * this.EVENT_TITLE_WEIGHT +
        timeScore * this.EVENT_TIME_WEIGHT;

      if (totalScore >= this.EVENT_MATCH_THRESHOLD) {
        return true;
      }
    }

    return false;
  }

  findBestVenueMatch(
    parsedVenue: ParsedEventDetails,
    existingVenues: ExistingVenue[],
  ): VenueMatchCandidate | null {
    let bestMatch: VenueMatchCandidate | null = null;

    for (const venue of existingVenues) {
      const geoScore = this.calculateGeoSimilarity(
        parsedVenue.latitude,
        parsedVenue.longitude,
        venue.latitude,
        venue.longitude,
      );

      const nameScore = this.calculateTextSimilarity(
        parsedVenue.venueName,
        venue.name,
      );

      const addressScore = this.calculateTextSimilarity(
        parsedVenue.address,
        venue.address ?? '',
      );

      const totalScore =
        geoScore * this.VENUE_GEO_WEIGHT +
        nameScore * this.VENUE_NAME_WEIGHT +
        addressScore * this.VENUE_ADDRESS_WEIGHT;

      if (!bestMatch || totalScore > bestMatch.score) {
        bestMatch = {
          venue,
          score: totalScore,
          geoScore,
          nameScore,
          addressScore,
        };
      }
    }

    if (!bestMatch || bestMatch.score < this.VENUE_MATCH_THRESHOLD) {
      this.logs.debug(
        `Venue "${parsedVenue.venueName}" did not match an ` +
          `existing venue. Best score: ` +
          `${bestMatch?.score.toFixed(1) ?? 'N/A'}%`,
      );

      return null;
    }

    this.logs.debug(
      `Matched "${parsedVenue.venueName}" to ` +
        `"${bestMatch.venue.name}" with score ` +
        `${bestMatch.score.toFixed(1)}% ` +
        `(geo ${bestMatch.geoScore.toFixed(1)}%, ` +
        `name ${bestMatch.nameScore.toFixed(1)}%, ` +
        `address ${bestMatch.addressScore.toFixed(1)}%)`,
    );

    return bestMatch;
  }
}
