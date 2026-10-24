/**
 * Draw engine — pure, deterministic-given-an-RNG functions.
 * No I/O here so every rule (number generation, matching, pool maths,
 * prize splitting, jackpot rollover) is unit-tested in tests/draw-engine.test.ts.
 */
import {
  NUMBERS_PER_DRAW,
  PLANS,
  PRIZE_POOL_PERCENT,
  SCORE_MAX,
  SCORE_MIN,
  TIER_SHARES,
  type PlanId,
  type Tier,
} from "./config";

export type Rng = () => number; // returns [0, 1)
export type DrawLogic = "random" | "algorithmic";
export type AlgoBias = "hot" | "cold";

export interface DrawEntryInput {
  userId: string;
  numbers: number[]; // the subscriber's 5 retained scores
}

/** Cryptographically secure RNG for production draws. */
export const secureRng: Rng = () => {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
};

const ALL_NUMBERS = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => SCORE_MIN + i);

/** Standard lottery-style draw: 5 distinct numbers in 1–45, uniformly. */
export function generateRandomNumbers(rng: Rng = secureRng): number[] {
  const pool = [...ALL_NUMBERS];
  // Partial Fisher–Yates shuffle.
  for (let i = 0; i < NUMBERS_PER_DRAW; i++) {
    const j = i + Math.floor(rng() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, NUMBERS_PER_DRAW).sort((a, b) => a - b);
}

/** How often each number 1–45 appears across all entrants' scores. */
export function numberFrequencies(entries: DrawEntryInput[]): Map<number, number> {
  const freq = new Map<number, number>(ALL_NUMBERS.map((n) => [n, 0]));
  for (const e of entries) for (const n of e.numbers) freq.set(n, (freq.get(n) ?? 0) + 1);
  return freq;
}

/**
 * Algorithmic draw: 5 distinct numbers sampled without replacement, weighted
 * by how often players scored them.
 *  - "hot":  weight = frequency + 1 → commonly scored numbers are favoured (more winners).
 *  - "cold": weight = (maxFrequency − frequency) + 1 → rare numbers are favoured (bigger rollovers).
 * The +1 keeps every number possible, so the draw is never fully predictable.
 */
export function generateWeightedNumbers(entries: DrawEntryInput[], bias: AlgoBias, rng: Rng = secureRng): number[] {
  const freq = numberFrequencies(entries);
  const maxFreq = Math.max(...freq.values());
  const candidates = ALL_NUMBERS.map((n) => {
    const f = freq.get(n) ?? 0;
    return { n, w: bias === "hot" ? f + 1 : maxFreq - f + 1 };
  });

  const picked: number[] = [];
  while (picked.length < NUMBERS_PER_DRAW) {
    const total = candidates.reduce((s, c) => s + c.w, 0);
    let r = rng() * total;
    let idx = candidates.length - 1;
    for (let i = 0; i < candidates.length; i++) {
      r -= candidates[i].w;
      if (r < 0) {
        idx = i;
        break;
      }
    }
    picked.push(candidates[idx].n);
    candidates.splice(idx, 1);
  }
  return picked.sort((a, b) => a - b);
}

export function generateWinningNumbers(
  logic: DrawLogic,
  entries: DrawEntryInput[],
  bias: AlgoBias = "hot",
  rng: Rng = secureRng,
): number[] {
  return logic === "algorithmic" ? generateWeightedNumbers(entries, bias, rng) : generateRandomNumbers(rng);
}

/**
 * Number of winning numbers present in a player's scores.
 * A player's scores may repeat (e.g. 36 twice); a repeated score still
 * only matches one winning number, so duplicates never inflate the count.
 */
export function countMatches(entryNumbers: number[], winning: number[]): number {
  const mine = new Set(entryNumbers);
  return winning.filter((n) => mine.has(n)).length;
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/**
 * Split a single charge into charity / prize pool / platform.
 * Charity and pool are rounded down; the platform takes the rounding remainder,
 * so the three parts always sum exactly to the amount charged.
 */
export function splitFee(amountCents: number, charityPercent: number) {
  const charity = Math.floor((amountCents * charityPercent) / 100);
  const prizePool = Math.floor((amountCents * PRIZE_POOL_PERCENT) / 100);
  const platform = amountCents - charity - prizePool;
  if (platform < 0) throw new Error("Charity + prize pool shares exceed 100%");
  return { charity, prizePool, platform };
}

/**
 * Monthly prize-pool contribution of one active subscriber.
 * Yearly subscribers contribute 1/12 of their annual pool share each month,
 * so every monthly draw is funded evenly regardless of when people paid.
 */
export function monthlyPoolContribution(plan: PlanId): number {
  const p = PLANS[plan];
  return Math.floor((p.priceCents * PRIZE_POOL_PERCENT) / 100 / p.months);
}

export interface PoolBreakdown {
  activeSubscribers: number;
  contributionCents: number; // this month's new money
  rolloverInCents: number; // carried jackpot from last draw
  totalCents: number;
  tiers: Record<Tier, number>; // total available per tier (tier 5 includes rollover)
}

/** PRD §07: pool auto-calculated from the active subscriber base, split 40/35/25. */
export function computePool(activePlans: PlanId[], rolloverInCents: number): PoolBreakdown {
  const contribution = activePlans.reduce((s, plan) => s + monthlyPoolContribution(plan), 0);
  const t5 = Math.floor((contribution * TIER_SHARES[5]) / 100);
  const t4 = Math.floor((contribution * TIER_SHARES[4]) / 100);
  const t3 = contribution - t5 - t4; // remainder → tier 3, so tiers sum exactly
  return {
    activeSubscribers: activePlans.length,
    contributionCents: contribution,
    rolloverInCents,
    totalCents: contribution + rolloverInCents,
    tiers: { 5: t5 + rolloverInCents, 4: t4, 3: t3 },
  };
}

export interface SettledEntry extends DrawEntryInput {
  matchCount: number;
}

export interface TierResult {
  tier: Tier;
  poolCents: number;
  winners: string[]; // user ids
  prizeEachCents: number;
}

export interface Settlement {
  winningNumbers: number[];
  entries: SettledEntry[];
  tiers: Record<Tier, TierResult>;
  rolloverOutCents: number;
  unallocatedCents: number;
}

/**
 * Match every entry and split each tier equally among its winners.
 *  - 5-match tier unclaimed → whole tier (incl. rollover) carries to next draw (jackpot).
 *  - 4/3-match tiers unclaimed → not rolled over (PRD); reported as unallocated.
 *  - Pennies left over from equal splitting are also reported as unallocated.
 */
export function settleDraw(entries: DrawEntryInput[], winningNumbers: number[], pool: PoolBreakdown): Settlement {
  const settled: SettledEntry[] = entries.map((e) => ({ ...e, matchCount: countMatches(e.numbers, winningNumbers) }));

  let rolloverOut = 0;
  let unallocated = 0;
  const tiers = {} as Record<Tier, TierResult>;

  for (const tier of [5, 4, 3] as Tier[]) {
    const winners = settled.filter((e) => e.matchCount === tier).map((e) => e.userId);
    const poolCents = pool.tiers[tier];
    const prizeEach = winners.length ? Math.floor(poolCents / winners.length) : 0;

    if (!winners.length) {
      if (tier === 5) rolloverOut += poolCents;
      else unallocated += poolCents;
    } else {
      unallocated += poolCents - prizeEach * winners.length;
    }
    tiers[tier] = { tier, poolCents, winners, prizeEachCents: prizeEach };
  }

  return { winningNumbers, entries: settled, tiers, rolloverOutCents: rolloverOut, unallocatedCents: unallocated };
}
