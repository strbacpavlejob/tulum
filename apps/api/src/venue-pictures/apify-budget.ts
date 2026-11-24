/*
 * What the venue picture job may spend on Apify, so that the account stays
 * within the free plan's $5 a month: Apify blocks a free account that uses
 * it up until its next billing cycle, the weekly Instagram posts scrape
 * included.
 *
 * Apify's free-plan prices for the two actors, November 2026, per event:
 * $0.0026 per Instagram profile; $0.004 per Google Maps place, plus $0.002
 * for its contacts enrichment and up to $0.002 for place details. The caps
 * below are about twice that, and Apify stops a run at its cap.
 */

export const MAX_USD_PER_PROFILE = 0.005;

/* Three places per search at up to $0.008 each, and the run's start. */
export const MAX_USD_PER_GOOGLE_MAPS_SEARCH = 0.03;

/* The Google Maps actor refuses a run capped below this. */
export const GOOGLE_MAPS_MIN_CHARGE_USD = 0.5;

/*
 * The job spends only while the account has used less than this in its
 * billing cycle, unless VENUE_PICTURES_APIFY_BUDGET_USD says otherwise. It
 * leaves $1.50 of the free $5 for the Instagram posts scrape (about $0.25 a
 * month) and manual runs.
 */
export const DEFAULT_MONTHLY_BUDGET_USD = 3.5;

const MAX_MONTHLY_BUDGET_USD = 10_000;

export interface ApifyBudget {
  /** What the Apify account has used in its current billing cycle. */
  usedUsd: number;
  /**
   * The usage the job lets the account reach: the job's monthly budget or
   * the account's own monthly limit, whichever is lower.
   */
  ceilingUsd: number;
  /** When the billing cycle ends and usage starts again from zero. */
  cycleEndsAt: string;
}

export interface ApifyBatch {
  size: number;
  /** The cap Apify stops the run at. */
  maxChargeUsd: number;
}

/** VENUE_PICTURES_APIFY_BUDGET_USD, or the default; 0 stops all spending. */
export function monthlyBudgetUsd(): number {
  const raw = process.env.VENUE_PICTURES_APIFY_BUDGET_USD?.trim();
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value >= 0 && value <= MAX_MONTHLY_BUDGET_USD
    ? value
    : DEFAULT_MONTHLY_BUDGET_USD;
}

/** The ceiling from the job's budget and the account's own monthly limit. */
export function usageCeilingUsd(accountLimitUsd: number | undefined): number {
  const budget = monthlyBudgetUsd();
  return accountLimitUsd !== undefined &&
    Number.isFinite(accountLimitUsd) &&
    accountLimitUsd > 0
    ? Math.min(budget, accountLimitUsd)
    : budget;
}

export function remainingUsd(budget: ApifyBudget): number {
  return Math.max(0, budget.ceilingUsd - budget.usedUsd);
}

/** The profiles a run may look up, up to wanted; null when none fit. */
export function profileBatch(
  wanted: number,
  allowanceUsd: number,
): ApifyBatch | null {
  const size = Math.min(wanted, affordable(allowanceUsd, MAX_USD_PER_PROFILE));
  return size > 0
    ? { size, maxChargeUsd: roundUsd(size * MAX_USD_PER_PROFILE) }
    : null;
}

/**
 * The Google Maps searches a run may make, up to wanted; null when the
 * allowance can't cover the actor's minimum cap.
 */
export function googleMapsBatch(
  wanted: number,
  allowanceUsd: number,
): ApifyBatch | null {
  if (wanted <= 0 || allowanceUsd < GOOGLE_MAPS_MIN_CHARGE_USD) return null;

  const size = Math.min(
    wanted,
    affordable(allowanceUsd, MAX_USD_PER_GOOGLE_MAPS_SEARCH),
  );
  return {
    size,
    maxChargeUsd: roundUsd(
      Math.max(
        GOOGLE_MAPS_MIN_CHARGE_USD,
        size * MAX_USD_PER_GOOGLE_MAPS_SEARCH,
      ),
    ),
  };
}

function affordable(allowanceUsd: number, priceUsd: number): number {
  // The epsilon keeps 1 / 0.005 from rounding down to 199.
  return Math.max(0, Math.floor(allowanceUsd / priceUsd + 1e-9));
}

function roundUsd(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
