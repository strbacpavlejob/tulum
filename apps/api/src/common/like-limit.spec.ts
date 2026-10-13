import { describe, expect, it } from '@jest/globals';
import {
  calculateEffectiveLikeLimit,
  calculateRawLikeLimit,
  MAX_LIKE_PERCENTAGE,
  normalizeLikeFilters,
} from './like-limit';

describe('like-limit helpers', () => {
  it('calculates percentage-based limits for requested event sizes', () => {
    expect(calculateRawLikeLimit(10, MAX_LIKE_PERCENTAGE)).toBe(3);
    expect(calculateRawLikeLimit(20, MAX_LIKE_PERCENTAGE)).toBe(4);
    expect(calculateRawLikeLimit(50, MAX_LIKE_PERCENTAGE)).toBe(10);
    expect(calculateRawLikeLimit(100, MAX_LIKE_PERCENTAGE)).toBe(20);
    expect(calculateRawLikeLimit(300, MAX_LIKE_PERCENTAGE)).toBe(60);
  });

  it('enforces minimum 3 likes without exceeding eligible guest count', () => {
    expect(calculateRawLikeLimit(0)).toBe(0);
    expect(calculateRawLikeLimit(1)).toBe(1);
    expect(calculateRawLikeLimit(2)).toBe(2);
    expect(calculateRawLikeLimit(3)).toBe(3);
  });

  it('never drops effective limit below likes already used', () => {
    expect(calculateEffectiveLikeLimit(10, 5)).toBe(5);
    expect(calculateEffectiveLikeLimit(2, 4)).toBe(4);
  });

  it('increases effective limit when eligible guest count grows', () => {
    expect(calculateEffectiveLikeLimit(10, 3)).toBe(3);
    expect(calculateEffectiveLikeLimit(50, 3)).toBe(10);
  });

  it('normalizes filter payloads', () => {
    expect(
      normalizeLikeFilters({
        genderFilter: 'invalid',
        ageMin: 40,
        ageMax: 20,
        selectedInterests: [' techno ', 'techno', '', 'house'],
      }),
    ).toEqual({
      genderFilter: 'everyone',
      ageMin: 20,
      ageMax: 40,
      selectedInterests: ['techno', 'house'],
    });
  });
});
