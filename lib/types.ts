/** Row types mirroring supabase/migrations/0001_schema.sql. */
import type { PlanId } from "./config";

export type Role = "subscriber" | "admin";
export type SubscriptionStatus = "active" | "cancelled" | "lapsed";
export type DrawStatus = "draft" | "simulated" | "published";
export type VerificationStatus = "awaiting_proof" | "pending_review" | "approved" | "rejected";
export type PayoutStatus = "pending" | "paid";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  charity_id: string | null;
  charity_percent: number;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: PlanId;
  status: SubscriptionStatus;
  amount_cents: number;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  provider: string;
  provider_ref: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  kind: "new" | "renewal";
  plan: PlanId;
  amount_cents: number;
  charity_id: string | null;
  charity_percent: number;
  charity_cents: number;
  prize_pool_cents: number;
  platform_cents: number;
  created_at: string;
}

export interface Charity {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  location: string;
  website: string | null;
  image_url: string | null;
  featured: boolean;
  active: boolean;
  created_at: string;
}

export interface CharityEvent {
  id: string;
  charity_id: string;
  title: string;
  event_date: string;
  location: string;
  description: string;
}

export interface Score {
  id: string;
  user_id: string;
  score: number;
  played_on: string;
  created_at: string;
}

export interface Draw {
  id: string;
  period: string;
  logic: "random" | "algorithmic";
  algo_bias: "hot" | "cold";
  status: DrawStatus;
  winning_numbers: number[] | null;
  simulation: DrawSimulation | null;
  simulated_at: string | null;
  active_subscribers: number;
  pool_contribution_cents: number;
  rollover_in_cents: number;
  pool_total_cents: number;
  tier5_cents: number;
  tier4_cents: number;
  tier3_cents: number;
  rollover_out_cents: number;
  unallocated_cents: number;
  entries_count: number;
  winners5: number;
  winners4: number;
  winners3: number;
  published_at: string | null;
  created_at: string;
}

/** Snapshot stored on draws.simulation; publishing persists it verbatim. */
export interface DrawSimulation {
  winningNumbers: number[];
  logic: "random" | "algorithmic";
  bias: "hot" | "cold";
  pool: {
    activeSubscribers: number;
    contributionCents: number;
    rolloverInCents: number;
    totalCents: number;
    tiers: Record<"3" | "4" | "5", number>;
  };
  entries: { userId: string; name: string; numbers: number[]; matchCount: number }[];
  tiers: Record<"3" | "4" | "5", { poolCents: number; winners: string[]; prizeEachCents: number }>;
  rolloverOutCents: number;
  unallocatedCents: number;
  ineligible: { noSubscription: number; notEnoughScores: number };
}

export interface Winner {
  id: string;
  draw_id: string;
  user_id: string;
  entry_id: string;
  tier: 3 | 4 | 5;
  prize_cents: number;
  verification_status: VerificationStatus;
  proof_path: string | null;
  proof_uploaded_at: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  payout_status: PayoutStatus;
  paid_at: string | null;
  created_at: string;
}

/** Result shape returned by every server action used with useActionState. */
export type ActionState = { ok?: boolean; error?: string; message?: string } | null;
