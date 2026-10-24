import "server-only";
import { createAdminClient } from "./supabase/admin";

export interface PlatformStats {
  total_users: number;
  active_subscribers: number;
  monthly_subscribers: number;
  yearly_subscribers: number;
  lapsed_or_cancelled: number;
  revenue_cents: number;
  charity_subscription_cents: number;
  donations_cents: number;
  prize_pool_funded_cents: number;
  prizes_awarded_cents: number;
  prizes_paid_cents: number;
  draws_published: number;
  total_winners: number;
  pending_reviews: number;
  pending_payouts: number;
}

export interface CharityTotal {
  charity_id: string;
  name: string;
  slug: string;
  supporters: number;
  subscription_cents: number;
  donation_cents: number;
  total_cents: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const { data, error } = await createAdminClient().rpc("platform_stats");
  if (error) throw new Error(error.message);
  return data as PlatformStats;
}

export async function getCharityTotals(): Promise<CharityTotal[]> {
  const { data, error } = await createAdminClient().rpc("charity_totals");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: CharityTotal) => ({
    ...r,
    supporters: Number(r.supporters),
    subscription_cents: Number(r.subscription_cents),
    donation_cents: Number(r.donation_cents),
    total_cents: Number(r.total_cents),
  }));
}
