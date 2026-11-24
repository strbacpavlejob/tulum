import { afterEach, describe, expect, it } from '@jest/globals';
import {
  DEFAULT_MONTHLY_BUDGET_USD,
  googleMapsBatch,
  monthlyBudgetUsd,
  profileBatch,
  remainingUsd,
  usageCeilingUsd,
} from './apify-budget';

afterEach(() => {
  delete process.env.VENUE_PICTURES_APIFY_BUDGET_USD;
});

describe('monthlyBudgetUsd', () => {
  it('leaves part of the free plan’s $5 for other runs by default', () => {
    expect(monthlyBudgetUsd()).toBe(DEFAULT_MONTHLY_BUDGET_USD);
    expect(DEFAULT_MONTHLY_BUDGET_USD).toBeLessThan(5);
  });

  it.each([
    ['2', 2],
    ['0', 0],
    [' 4.25 ', 4.25],
    ['-1', DEFAULT_MONTHLY_BUDGET_USD],
    ['five', DEFAULT_MONTHLY_BUDGET_USD],
    ['', DEFAULT_MONTHLY_BUDGET_USD],
  ])('reads VENUE_PICTURES_APIFY_BUDGET_USD=%p as %p', (value, budget) => {
    process.env.VENUE_PICTURES_APIFY_BUDGET_USD = value;
    expect(monthlyBudgetUsd()).toBe(budget);
  });
});

describe('usageCeilingUsd', () => {
  it("keeps under the account's own monthly limit", () => {
    expect(usageCeilingUsd(5)).toBe(3.5);
    expect(usageCeilingUsd(2)).toBe(2);
  });

  it('uses the budget when the account reports no limit', () => {
    expect(usageCeilingUsd(undefined)).toBe(3.5);
    expect(usageCeilingUsd(0)).toBe(3.5);
  });
});

describe('remainingUsd', () => {
  it('is what the account may still use, never below zero', () => {
    const cycle = { cycleEndsAt: '2026-12-10T00:00:00.000Z' };
    expect(remainingUsd({ usedUsd: 1, ceilingUsd: 3.5, ...cycle })).toBe(2.5);
    expect(remainingUsd({ usedUsd: 4.2, ceilingUsd: 3.5, ...cycle })).toBe(0);
  });
});

describe('profileBatch', () => {
  it('takes every profile wanted when the allowance covers them', () => {
    expect(profileBatch(200, 2.5)).toEqual({ size: 200, maxChargeUsd: 1 });
  });

  it('shrinks to what the allowance covers at $0.005 a profile', () => {
    expect(profileBatch(200, 1)).toEqual({ size: 200, maxChargeUsd: 1 });
    expect(profileBatch(200, 0.0149)).toEqual({ size: 2, maxChargeUsd: 0.01 });
  });

  it('is null when not one profile fits or none is wanted', () => {
    expect(profileBatch(10, 0.004)).toBeNull();
    expect(profileBatch(0, 2)).toBeNull();
  });
});

describe('googleMapsBatch', () => {
  it("caps a small run at the actor's $0.50 minimum", () => {
    expect(googleMapsBatch(3, 2.5)).toEqual({ size: 3, maxChargeUsd: 0.5 });
  });

  it('caps a large run at $0.03 a search', () => {
    expect(googleMapsBatch(25, 2.5)).toEqual({ size: 25, maxChargeUsd: 0.75 });
    expect(googleMapsBatch(25, 0.6)).toEqual({ size: 20, maxChargeUsd: 0.6 });
  });

  it("is null when the allowance can't cover the minimum", () => {
    expect(googleMapsBatch(3, 0.49)).toBeNull();
    expect(googleMapsBatch(0, 2.5)).toBeNull();
  });
});
