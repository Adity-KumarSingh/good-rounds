/**
 * Platform-wide business configuration.
 * Centralised so that pricing or pool rules can change in one place
 * (and later move to a DB-backed settings table without touching callers).
 */

export const SITE_NAME = "Good Rounds";

export const CURRENCY = "GBP";
export const LOCALE = "en-GB";

export type PlanId = "monthly" | "yearly";

export const PLANS: Record<PlanId, { id: PlanId; label: string; priceCents: number; months: number; blurb: string }> = {
  monthly: { id: "monthly", label: "Monthly", priceCents: 999, months: 1, blurb: "Flexible. Cancel any time." },
  // ~17% cheaper than 12 x monthly.
  yearly: { id: "yearly", label: "Yearly", priceCents: 9999, months: 12, blurb: "Two months free, every year." },
};

/** Fixed share of every subscription fee that funds the monthly prize pool (PRD §07). */
export const PRIZE_POOL_PERCENT = 40;

/** Charity share bounds (PRD §08.1: minimum 10%, user may increase). Mirrors the DB check constraint. */
export const CHARITY_MIN_PERCENT = 10;
export const CHARITY_MAX_PERCENT = 50;

/** Prize pool split per match tier (PRD §07). Must sum to 100. */
export const TIER_SHARES = { 5: 40, 4: 35, 3: 25 } as const;
export type Tier = keyof typeof TIER_SHARES;

/** Draw numbers mirror the Stableford score range. */
export const SCORE_MIN = 1;
export const SCORE_MAX = 45;
export const NUMBERS_PER_DRAW = 5;
export const SCORE_WINDOW = 5;
