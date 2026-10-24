import "server-only";
import type { PlanId } from "./config";
import { computePool, generateWinningNumbers, settleDraw, type DrawEntryInput } from "./draw-engine";
import { createAdminClient } from "./supabase/admin";
import type { Draw, DrawSimulation } from "./types";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * PostgREST caps responses (1000 rows by default), so large tables are read
 * page by page. Without this a big subscriber base would be silently truncated.
 */
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

/** Jackpot carried from the most recent published draw before this one. */
export async function rolloverFor(db: Admin, period: string) {
  const { data } = await db
    .from("draws")
    .select("rollover_out_cents")
    .eq("status", "published")
    .lt("period", period)
    .order("period", { ascending: false })
    .limit(1)
    .maybeSingle();
  return Number(data?.rollover_out_cents ?? 0);
}

/**
 * Build the full preview of a draw from live data:
 *  1. Active subscribers fund the pool (PRD §07).
 *  2. Subscribers with a full set of 5 scores are entered; their 5 scores are their numbers.
 *  3. Winning numbers are generated (random or algorithmic) and every entry is matched.
 */
export async function buildSimulation(db: Admin, draw: Pick<Draw, "period" | "logic" | "algo_bias">): Promise<DrawSimulation> {
  const now = new Date().toISOString();

  const subs = await fetchAll<{ user_id: string; plan: PlanId }>((from, to) =>
    db.from("subscriptions").select("user_id, plan").eq("status", "active").gt("current_period_end", now).order("user_id").range(from, to),
  );
  const activeIds = new Set(subs.map((s) => s.user_id));

  const scores = await fetchAll<{ user_id: string; score: number; played_on: string }>((from, to) =>
    db.from("scores").select("user_id, score, played_on").order("user_id").order("played_on", { ascending: false }).range(from, to),
  );
  const profiles = await fetchAll<{ id: string; full_name: string; email: string }>((from, to) =>
    db.from("profiles").select("id, full_name, email").order("id").range(from, to),
  );
  const nameOf = new Map(profiles.map((p) => [p.id, p.full_name || p.email]));

  const byUser = new Map<string, number[]>();
  for (const s of scores) {
    if (!activeIds.has(s.user_id)) continue;
    const list = byUser.get(s.user_id) ?? [];
    list.push(s.score);
    byUser.set(s.user_id, list);
  }

  const entries: DrawEntryInput[] = [];
  let notEnoughScores = 0;
  for (const id of activeIds) {
    const nums = byUser.get(id) ?? [];
    if (nums.length >= 5) entries.push({ userId: id, numbers: nums.slice(0, 5) });
    else notEnoughScores++;
  }

  const { count: totalProfiles } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "subscriber");

  const pool = computePool(
    subs.map((s) => s.plan),
    await rolloverFor(db, draw.period),
  );
  const winning = generateWinningNumbers(draw.logic, entries, draw.algo_bias);
  const result = settleDraw(entries, winning, pool);

  return {
    winningNumbers: winning,
    logic: draw.logic,
    bias: draw.algo_bias,
    pool: {
      activeSubscribers: pool.activeSubscribers,
      contributionCents: pool.contributionCents,
      rolloverInCents: pool.rolloverInCents,
      totalCents: pool.totalCents,
      tiers: { 5: pool.tiers[5], 4: pool.tiers[4], 3: pool.tiers[3] },
    },
    entries: result.entries
      .map((e) => ({ userId: e.userId, name: nameOf.get(e.userId) ?? "Unknown", numbers: e.numbers, matchCount: e.matchCount }))
      .sort((a, b) => b.matchCount - a.matchCount || a.name.localeCompare(b.name)),
    tiers: {
      5: { poolCents: result.tiers[5].poolCents, winners: result.tiers[5].winners, prizeEachCents: result.tiers[5].prizeEachCents },
      4: { poolCents: result.tiers[4].poolCents, winners: result.tiers[4].winners, prizeEachCents: result.tiers[4].prizeEachCents },
      3: { poolCents: result.tiers[3].poolCents, winners: result.tiers[3].winners, prizeEachCents: result.tiers[3].prizeEachCents },
    },
    rolloverOutCents: result.rolloverOutCents,
    unallocatedCents: result.unallocatedCents,
    ineligible: {
      noSubscription: Math.max(0, (totalProfiles ?? 0) - activeIds.size),
      notEnoughScores,
    },
  };
}

/** Live estimate of this month's pool, for the homepage and dashboards. */
export async function currentPoolEstimate(db: Admin, period: string) {
  const now = new Date().toISOString();
  const subs = await fetchAll<{ plan: PlanId }>((from, to) =>
    db.from("subscriptions").select("plan").eq("status", "active").gt("current_period_end", now).order("id").range(from, to),
  );
  return computePool(
    subs.map((s) => s.plan),
    await rolloverFor(db, period),
  );
}
