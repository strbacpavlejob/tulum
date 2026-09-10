// /* eslint-disable @typescript-eslint/no-unsafe-call */
// import { Injectable } from '@nestjs/common';
// const VENUE_GEO_WEIGHT = 0.4;
// const VENUE_NAME_WEIGHT = 0.4;
// const VENUE_ADDRESS_WEIGHT = 0.2;
// const VENUE_MATCH_THRESHOLD = 72;
// const EVENT_TITLE_WEIGHT = 0.65;
// const EVENT_TIME_WEIGHT = 0.35;
// const EVENT_MATCH_THRESHOLD = 78;
// const MAX_EVENT_TIME_DELTA_HOURS = 12;

// type ExistingVenue = {
//   id: string;
//   name: string;
//   address: string | null;
//   latitude: number | null;
//   longitude: number | null;
//   min_age_male: number | null;
//   min_age_female: number | null;
// };

// type ExistingEvent = {
//   title: string;
//   start_date_time: string;
// };

// type VenueMatchCandidate = {
//   venue: ExistingVenue;
//   score: number;
//   geoScore: number;
//   nameScore: number;
//   addressScore: number;
// };

// type ParsedEventDetails = {
//   title: string;
//   description: string;
//   startDateTime: string;
//   venueName: string;
//   address: string;
//   venueDescription: string;
//   tags: string[];
//   imageUrl?: string;
//   latitude: number;
//   longitude: number;
//   minAgeMale: number;
//   minAgeFemale: number;
// };

// @Injectable()
// export class DuplicateCheckerService {
//   private normalizeText(value: string): string {
//     return value
//       .toLowerCase()
//       .normalize('NFD')
//       .replace(/[\u0300-\u036f]/g, '')
//       .replace(/[^a-z0-9\s]/g, ' ')
//       .replace(/\s+/g, ' ')
//       .trim();
//   }
//   private toBigrams(value: string): string[] {
//     const compact = value.replace(/\s+/g, ' ').trim();
//     if (compact.length < 2) return [];

//     const grams: string[] = [];
//     for (let i = 0; i < compact.length - 1; i += 1) {
//       grams.push(compact.slice(i, i + 2));
//     }
//     return grams;
//   }

//   private calculateTextSimilarity(a: string, b: string): number {
//     const normalizedA = this.normalizeText(a);
//     const normalizedB = this.normalizeText(b);

//     if (!normalizedA || !normalizedB) return 0;
//     if (normalizedA === normalizedB) return 100;

//     const tokenScore = this.calculateTokenSimilarity(normalizedA, normalizedB);
//     const bigramScore = this.calculateBigramSimilarity(
//       normalizedA,
//       normalizedB,
//     );

//     const shorter =
//       normalizedA.length <= normalizedB.length ? normalizedA : normalizedB;
//     const longer =
//       normalizedA.length > normalizedB.length ? normalizedA : normalizedB;
//     const containmentScore = longer.includes(shorter) ? 100 : 0;

//     return tokenScore * 0.45 + bigramScore * 0.45 + containmentScore * 0.1;
//   }

//   private calculateTokenSimilarity(a: string, b: string): number {
//     const tokensA = new Set(a.split(' ').filter(Boolean));
//     const tokensB = new Set(b.split(' ').filter(Boolean));
//     const union = new Set([...tokensA, ...tokensB]).size;
//     if (union === 0) return 0;

//     const intersection = Array.from(tokensA).filter((token) =>
//       tokensB.has(token),
//     ).length;

//     return (intersection / union) * 100;
//   }

//   private calculateBigramSimilarity(a: string, b: string): number {
//     const bigramsA = this.toBigrams(a);
//     const bigramsB = this.toBigrams(b);
//     if (bigramsA.length === 0 || bigramsB.length === 0) return 0;

//     const counts = new Map<string, number>();
//     for (const gram of bigramsA) {
//       counts.set(gram, (counts.get(gram) ?? 0) + 1);
//     }

//     let overlap = 0;
//     for (const gram of bigramsB) {
//       const count = counts.get(gram) ?? 0;
//       if (count > 0) {
//         overlap += 1;
//         counts.set(gram, count - 1);
//       }
//     }

//     return (2 * overlap * 100) / (bigramsA.length + bigramsB.length);
//   }
//   checkVenue(
//     parsedVenue: ParsedEventDetails,
//     existingVenues: ExistingVenue[],
//   ): VenueMatchCandidate | null {
//     let bestMatch: VenueMatchCandidate | null = null;

//     for (const venue of existingVenues) {
//       const geoScore = this.calculateGeoSimilarity(
//         parsedVenue.latitude,
//         parsedVenue.longitude,
//         venue.latitude,
//         venue.longitude,
//       );
//       const nameScore = this.calculateTextSimilarity(
//         parsedVenue.venueName,
//         venue.name,
//       );
//       const addressScore = this.calculateTextSimilarity(
//         parsedVenue.address,
//         venue.address ?? '',
//       );

//       const totalScore =
//         geoScore * VENUE_GEO_WEIGHT +
//         nameScore * VENUE_NAME_WEIGHT +
//         addressScore * VENUE_ADDRESS_WEIGHT;

//       if (!bestMatch || totalScore > bestMatch.score) {
//         bestMatch = {
//           venue,
//           score: totalScore,
//           geoScore,
//           nameScore,
//           addressScore,
//         };
//       }
//     }

//     if (!bestMatch || bestMatch.score < VENUE_MATCH_THRESHOLD) {
//       console.log(
//         `'Scrapped venue' "${parsedVenue.venueName}" did not match any existing venue (best score: ${bestMatch?.score.toFixed(1) ?? 'N/A'}%)`,
//       );
//       return null;
//     }

//     this.logger.debug(
//       `Matched scraped venue "${parsedVenue.venueName}" to existing venue "${bestMatch.venue.name}" with score ${bestMatch.score.toFixed(1)}% (geo ${bestMatch.geoScore.toFixed(1)}%, name ${bestMatch.nameScore.toFixed(1)}%, address ${bestMatch.addressScore.toFixed(1)}%)`,
//     );

//     return bestMatch;
//   }

//   private isSameUtcDay(a: Date, b: Date): boolean {
//     return (
//       a.getUTCFullYear() === b.getUTCFullYear() &&
//       a.getUTCMonth() === b.getUTCMonth() &&
//       a.getUTCDate() === b.getUTCDate()
//     );
//   }

//   checkEvent(args: {
//     title: string;
//     startDateTime: string;
//     venueReference: string;
//     events: (Omit<Event, 'id'> & { id?: string })[];
//     existingEvents: ExistingEvent[];
//   }): boolean {
//     const candidateStart = new Date(args.startDateTime);
//     const normalizedTitle = this.normalizeText(args.title);

//     const inMemoryEvents = args.events
//       .filter(
//         (event) =>
//           event.venue_id === args.venueReference &&
//           this.isSameUtcDay(new Date(event.start_date_time), candidateStart),
//       )
//       .map((event) => ({
//         title: event.title,
//         start_date_time: event.start_date_time,
//       }));

//     const allCandidates = [...args.existingEvents, ...inMemoryEvents];

//     for (const existingEvent of allCandidates) {
//       const eventStart = new Date(existingEvent.start_date_time);
//       if (!this.isSameUtcDay(candidateStart, eventStart)) {
//         continue;
//       }

//       const titleScore = this.calculateTextSimilarity(
//         normalizedTitle,
//         existingEvent.title,
//       );
//       const hourDelta =
//         Math.abs(candidateStart.getTime() - eventStart.getTime()) /
//         (60 * 60 * 1000);
//       const timeScore =
//         Math.max(0, 1 - hourDelta / MAX_EVENT_TIME_DELTA_HOURS) * 100;
//       const totalScore =
//         titleScore * EVENT_TITLE_WEIGHT + timeScore * EVENT_TIME_WEIGHT;

//       if (totalScore >= EVENT_MATCH_THRESHOLD) {
//         return true;
//       }
//     }

//     return false;
//   }
// }
