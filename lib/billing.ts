import "server-only";
import { PLANS, type PlanId } from "./config";
import { splitFee } from "./draw-engine";
import { createAdminClient } from "./supabase/admin";
import { addPlanPeriod, paymentProvider } from "./subscription";
import type { Profile, Subscription } from "./types";

type Admin = ReturnType<typeof createAdminClient>;

/** Write a ledger row with the fee split frozen at charge time. */
async function recordPayment(
  db: Admin,
  args: { profile: Pick<Profile, "id" | "charity_id" | "charity_percent">; subscriptionId: string; plan: PlanId; kind: "new" | "renewal"; reference?: string },
) {
  const amount = PLANS[args.plan].priceCents;
  const split = splitFee(amount, args.profile.charity_percent);
  const { error } = await db.from("payments").insert({
    user_id: args.profile.id,
    subscription_id: args.subscriptionId,
    kind: args.kind,
    plan: args.plan,
    amount_cents: amount,
    charity_id: args.profile.charity_id,
    charity_percent: args.profile.charity_percent,
    charity_cents: split.charity,
    prize_pool_cents: split.prizePool,
    platform_cents: split.platform,
    provider_ref: args.reference ?? null,
  });
  if (error) throw new Error(`Failed to record payment: ${error.message}`);
}

/** Charge and (re)start a subscription. Used by checkout and re-subscribe. */
export async function startSubscription(userId: string, plan: PlanId, cardNumber?: string) {
  const db = createAdminClient();
  const { data: profile } = await db.from("profiles").select("id, charity_id, charity_percent").eq("id", userId).single();
  if (!profile) return { ok: false as const, error: "Profile not found." };
  if (!profile.charity_id) return { ok: false as const, error: "Choose a charity before subscribing." };

  const charge = await paymentProvider.charge({
    amountCents: PLANS[plan].priceCents,
    description: `${PLANS[plan].label} subscription`,
    cardNumber,
  });
  if (!charge.ok) return { ok: false as const, error: charge.error ?? "Payment failed." };

  const start = new Date();
  const { data: sub, error } = await db
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        plan,
        status: "active",
        amount_cents: PLANS[plan].priceCents,
        current_period_start: start.toISOString(),
        current_period_end: addPlanPeriod(start, plan).toISOString(),
        cancel_at_period_end: false,
        provider: paymentProvider.name,
        provider_ref: charge.reference,
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();
  if (error || !sub) return { ok: false as const, error: error?.message ?? "Could not create subscription." };

  await recordPayment(db, { profile, subscriptionId: sub.id, plan, kind: "new", reference: charge.reference });
  return { ok: true as const, subscription: sub as Subscription };
}

/**
 * Bring a subscription up to date if its period has ended:
 *  - cancel_at_period_end → becomes "cancelled"
 *  - otherwise the provider is charged for each missed period → stays "active"
 *  - a failed charge → "lapsed" (user must re-subscribe)
 * Called lazily on each request for the signed-in user, and by the daily cron for everyone.
 */
export async function reconcileSubscription(sub: Subscription): Promise<Subscription> {
  if (sub.status !== "active" || new Date(sub.current_period_end).getTime() > Date.now()) return sub;
  const db = createAdminClient();

  if (sub.cancel_at_period_end) {
    const { data } = await db.from("subscriptions").update({ status: "cancelled" }).eq("id", sub.id).select().single();
    return (data as Subscription) ?? sub;
  }

  const { data: profile } = await db.from("profiles").select("id, charity_id, charity_percent").eq("id", sub.user_id).single();
  let periodStart = new Date(sub.current_period_start);
  let periodEnd = new Date(sub.current_period_end);
  let renewals = 0;

  while (periodEnd.getTime() <= Date.now() && renewals < 24) {
    const charge = await paymentProvider.charge({ amountCents: PLANS[sub.plan].priceCents, description: "Renewal" });
    if (!charge.ok || !profile) {
      const { data } = await db.from("subscriptions").update({ status: "lapsed" }).eq("id", sub.id).select().single();
      return (data as Subscription) ?? sub;
    }
    await recordPayment(db, { profile, subscriptionId: sub.id, plan: sub.plan, kind: "renewal", reference: charge.reference });
    periodStart = periodEnd;
    periodEnd = addPlanPeriod(periodEnd, sub.plan);
    renewals++;
  }

  const { data } = await db
    .from("subscriptions")
    .update({ current_period_start: periodStart.toISOString(), current_period_end: periodEnd.toISOString() })
    .eq("id", sub.id)
    .select()
    .single();
  return (data as Subscription) ?? sub;
}
