import { describe, expect, it } from "vitest";
import {
  computePool,
  countMatches,
  generateRandomNumbers,
  generateWeightedNumbers,
  monthlyPoolContribution,
  numberFrequencies,
  settleDraw,
  splitFee,
  type Rng,
} from "@/lib/draw-engine";

/** Small seeded PRNG (mulberry32) so tests are reproducible. */
function seeded(seed: number): Rng {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("number generation", () => {
  it("random draws give 5 distinct sorted numbers within 1–45", () => {
    const rng = seeded(1);
    for (let i = 0; i < 500; i++) {
      const nums = generateRandomNumbers(rng);
      expect(nums).toHaveLength(5);
      expect(new Set(nums).size).toBe(5);
      expect(nums.every((n) => n >= 1 && n <= 45)).toBe(true);
      expect([...nums].sort((a, b) => a - b)).toEqual(nums);
    }
  });

  it("weighted draws are distinct and in range", () => {
    const entries = [{ userId: "a", numbers: [30, 30, 31, 32, 33] }];
    const rng = seeded(7);
    for (let i = 0; i < 200; i++) {
      const nums = generateWeightedNumbers(entries, "cold", rng);
      expect(new Set(nums).size).toBe(5);
      expect(nums.every((n) => n >= 1 && n <= 45)).toBe(true);
    }
  });

  it("hot bias favours frequently scored numbers", () => {
    const entries = Array.from({ length: 50 }, (_, i) => ({ userId: `u${i}`, numbers: [36, 34, 32, 30, 28] }));
    const rng = seeded(42);
    let hits = 0;
    const runs = 400;
    for (let i = 0; i < runs; i++) if (generateWeightedNumbers(entries, "hot", rng).includes(36)) hits++;
    // Uniform odds of including a given number are 5/45 ≈ 11%.
    expect(hits / runs).toBeGreaterThan(0.5);
  });

  it("counts frequencies across all entries", () => {
    const f = numberFrequencies([
      { userId: "a", numbers: [1, 2, 2] },
      { userId: "b", numbers: [2] },
    ]);
    expect(f.get(2)).toBe(3);
    expect(f.get(1)).toBe(1);
    expect(f.get(45)).toBe(0);
  });
});

describe("matching", () => {
  it("counts distinct matches", () => {
    expect(countMatches([1, 2, 3, 4, 5], [1, 2, 3, 4, 5])).toBe(5);
    expect(countMatches([1, 2, 3, 40, 41], [1, 2, 3, 4, 5])).toBe(3);
    expect(countMatches([10, 11, 12, 13, 14], [1, 2, 3, 4, 5])).toBe(0);
  });

  it("does not let duplicate scores inflate the match count", () => {
    expect(countMatches([36, 36, 36, 36, 36], [36, 1, 2, 3, 4])).toBe(1);
  });
});

describe("money", () => {
  it("splits a fee so parts always sum to the total", () => {
    for (const pct of [10, 17, 33, 50]) {
      const s = splitFee(999, pct);
      expect(s.charity + s.prizePool + s.platform).toBe(999);
      expect(s.charity).toBe(Math.floor((999 * pct) / 100));
    }
  });

  it("yearly subscribers fund 1/12 of their annual pool share per month", () => {
    expect(monthlyPoolContribution("monthly")).toBe(399); // 40% of 999
    expect(monthlyPoolContribution("yearly")).toBe(333); // 40% of 9999 / 12
  });

  it("computes tiers 40/35/25 and adds rollover to the jackpot only", () => {
    const pool = computePool(["monthly", "monthly", "yearly"], 5000);
    expect(pool.contributionCents).toBe(399 + 399 + 333);
    expect(pool.tiers[5] + pool.tiers[4] + pool.tiers[3]).toBe(pool.totalCents);
    expect(pool.tiers[4]).toBe(Math.floor(1131 * 0.35));
    expect(pool.tiers[5]).toBe(Math.floor(1131 * 0.4) + 5000);
  });
});

describe("settlement", () => {
  const pool = computePool(Array(10).fill("monthly"), 0); // 3990 contribution

  it("splits a tier equally among multiple winners", () => {
    const s = settleDraw(
      [
        { userId: "a", numbers: [1, 2, 3, 30, 31] },
        { userId: "b", numbers: [1, 2, 3, 32, 33] },
        { userId: "c", numbers: [20, 21, 22, 23, 24] },
      ],
      [1, 2, 3, 4, 5],
      pool,
    );
    expect(s.tiers[3].winners).toEqual(["a", "b"]);
    expect(s.tiers[3].prizeEachCents).toBe(Math.floor(pool.tiers[3] / 2));
    expect(s.entries.find((e) => e.userId === "c")!.matchCount).toBe(0);
  });

  it("rolls the jackpot over when nobody matches 5, but not lower tiers", () => {
    const s = settleDraw([{ userId: "a", numbers: [1, 2, 3, 4, 40] }], [1, 2, 3, 4, 5], pool);
    expect(s.tiers[4].winners).toEqual(["a"]);
    expect(s.rolloverOutCents).toBe(pool.tiers[5]);
    expect(s.unallocatedCents).toBe(pool.tiers[3]);
  });

  it("pays the jackpot including rollover when claimed", () => {
    const withRollover = computePool(["monthly"], 10_000);
    const s = settleDraw(
      [
        { userId: "a", numbers: [1, 2, 3, 4, 5] },
        { userId: "b", numbers: [5, 4, 3, 2, 1] },
      ],
      [1, 2, 3, 4, 5],
      withRollover,
    );
    expect(s.tiers[5].winners).toHaveLength(2);
    expect(s.tiers[5].prizeEachCents).toBe(Math.floor(withRollover.tiers[5] / 2));
    expect(s.rolloverOutCents).toBe(0);
  });

  it("accounts for every penny", () => {
    const s = settleDraw(
      [
        { userId: "a", numbers: [1, 2, 3, 4, 5] },
        { userId: "b", numbers: [1, 2, 3, 4, 9] },
        { userId: "c", numbers: [1, 2, 3, 8, 9] },
        { userId: "d", numbers: [1, 2, 3, 7, 9] },
        { userId: "e", numbers: [1, 2, 3, 6, 9] },
      ],
      [1, 2, 3, 4, 5],
      pool,
    );
    const paid = ([5, 4, 3] as const).reduce((sum, t) => sum + s.tiers[t].prizeEachCents * s.tiers[t].winners.length, 0);
    expect(paid + s.rolloverOutCents + s.unallocatedCents).toBe(pool.totalCents);
  });
});
