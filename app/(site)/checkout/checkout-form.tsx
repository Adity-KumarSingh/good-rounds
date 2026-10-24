"use client";

import clsx from "clsx";
import { CreditCard, Lock } from "lucide-react";
import { useActionState, useState } from "react";
import { checkout } from "@/app/actions/subscription";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import { PLANS, type PlanId } from "@/lib/config";
import { splitFee } from "@/lib/draw-engine";
import { formatMoney } from "@/lib/format";
import type { Charity } from "@/lib/types";

export function CheckoutForm({
  initialPlan,
  charity,
  charities,
  charityPercent,
}: {
  initialPlan: PlanId;
  charity: Pick<Charity, "id" | "name"> | null;
  charities: Pick<Charity, "id" | "name">[];
  charityPercent: number;
}) {
  const [state, action] = useActionState(checkout, null);
  const [plan, setPlan] = useState<PlanId>(initialPlan);
  const [card, setCard] = useState("4242 4242 4242 4242");
  const price = PLANS[plan].priceCents;
  const split = splitFee(price, charityPercent);

  return (
    <form action={action} className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <input type="hidden" name="plan" value={plan} />

      {/* summary */}
      <div className="card h-fit p-6">
        <p className="label">Plan</p>
        <div className="grid grid-cols-2 gap-2">
          {(["monthly", "yearly"] as const).map((id) => (
            <button
              type="button"
              key={id}
              onClick={() => setPlan(id)}
              aria-pressed={plan === id}
              className={clsx("rounded-xl border p-3 text-left transition", plan === id ? "border-ember bg-ember/10" : "border-white/10 hover:border-white/25")}
            >
              <p className="text-sm font-semibold">{PLANS[id].label}</p>
              <p className="text-xs text-cream-dim">{formatMoney(PLANS[id].priceCents)}</p>
            </button>
          ))}
        </div>

        <dl className="mt-6 space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-cream-muted">
              To {charity?.name ?? "your charity"} ({charityPercent}%)
            </dt>
            <dd className="text-mint">{formatMoney(split.charity)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-cream-muted">Prize pool</dt>
            <dd className="text-gold">{formatMoney(split.prizePool)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-cream-muted">Platform</dt>
            <dd>{formatMoney(split.platform)}</dd>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-3 text-base font-semibold">
            <dt>Total today</dt>
            <dd>{formatMoney(price)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-cream-dim">Renews {plan === "monthly" ? "monthly" : "yearly"}. Cancel any time from your dashboard.</p>
      </div>

      {/* payment */}
      <div className="card space-y-4 p-6">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 font-semibold">
            <CreditCard className="h-5 w-5 text-ember" /> Payment
          </p>
          <span className="rounded-full bg-gold/10 px-2.5 py-0.5 text-xs font-semibold text-gold">TEST MODE</span>
        </div>

        {!charity && (
          <Field label="Charity to support" htmlFor="charity_id">
            <select id="charity_id" name="charity_id" required className="input" defaultValue="">
              <option value="" disabled>
                Choose a charity
              </option>
              {charities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Card number" htmlFor="card_number" hint="Any number works. 4000 0000 0000 0002 simulates a decline.">
          <input id="card_number" name="card_number" value={card} onChange={(e) => setCard(e.target.value)} inputMode="numeric" className="input font-mono" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Expiry">
            <input defaultValue="12 / 30" className="input font-mono" aria-label="Expiry" />
          </Field>
          <Field label="CVC">
            <input defaultValue="123" className="input font-mono" aria-label="CVC" />
          </Field>
        </div>

        <FormMessage state={state} />
        <SubmitButton className="btn-primary w-full py-3.5 text-base" pendingText="Processing payment…">
          <Lock className="h-4 w-4" /> Pay {formatMoney(price)} and join
        </SubmitButton>
        <p className="text-center text-xs text-cream-dim">
          This demo uses a mock payment provider behind the same interface a Stripe integration would use.
        </p>
      </div>
    </form>
  );
}
