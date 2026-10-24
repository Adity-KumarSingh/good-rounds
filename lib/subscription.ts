import { PLANS, type PlanId } from "./config";
import type { Subscription, SubscriptionStatus } from "./types";

/**
 * Status as of *now*. A row can still say "active" for a moment after its
 * period ends (until the renewal job runs), so every request derives the real
 * status from the dates instead of trusting the stored value (PRD §04: real-time
 * subscription check on every authenticated request).
 */
export function effectiveStatus(sub: Pick<Subscription, "status" | "current_period_end"> | null): SubscriptionStatus | "none" {
  if (!sub) return "none";
  if (sub.status === "active" && new Date(sub.current_period_end).getTime() <= Date.now()) return "lapsed";
  return sub.status;
}

export function isActive(sub: Pick<Subscription, "status" | "current_period_end"> | null) {
  return effectiveStatus(sub) === "active";
}

export function addPlanPeriod(start: Date, plan: PlanId) {
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + PLANS[plan].months);
  return end;
}

// ---------------------------------------------------------------------------
// Payment provider abstraction.
// The PRD names Stripe; this build ships a mock provider so the whole flow is
// testable without real cards. A Stripe implementation only needs to satisfy
// this interface (Checkout Session for `charge`, webhooks for renewals).
// ---------------------------------------------------------------------------
export interface ChargeResult {
  ok: boolean;
  reference?: string;
  error?: string;
}

export interface PaymentProvider {
  name: string;
  charge(input: { amountCents: number; description: string; cardNumber?: string }): Promise<ChargeResult>;
}

/** Test-mode provider. Mirrors Stripe's test cards: 4000 0000 0000 0002 declines. */
export const mockProvider: PaymentProvider = {
  name: "mock",
  async charge({ cardNumber }) {
    const digits = (cardNumber ?? "").replace(/\D/g, "");
    if (digits === "4000000000000002") return { ok: false, error: "Your card was declined (test card)." };
    if (digits && digits.length < 12) return { ok: false, error: "Card number looks incomplete." };
    return { ok: true, reference: `mock_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}` };
  },
};

export const paymentProvider: PaymentProvider = mockProvider;
