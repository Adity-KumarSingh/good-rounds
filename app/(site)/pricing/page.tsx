import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/ui/motion";
import { getSession } from "@/lib/auth";
import { CHARITY_MIN_PERCENT, PLANS, PRIZE_POOL_PERCENT, type PlanId } from "@/lib/config";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Pricing" };

const FEATURES = [
  `At least ${CHARITY_MIN_PERCENT}% to the charity you choose`,
  "Entry into every monthly draw",
  "Track your latest 5 Stableford rounds",
  `${PRIZE_POOL_PERCENT}% of your fee funds the prize pool`,
  "Cancel any time from your dashboard",
];

export default async function PricingPage() {
  const session = await getSession();
  const href = (plan: PlanId) => (session ? `/checkout?plan=${plan}` : `/signup?plan=${plan}`);
  const yearlySaving = PLANS.monthly.priceCents * 12 - PLANS.yearly.priceCents;

  return (
    <div className="container-page py-16 sm:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Membership</p>
        <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight">One membership. Real impact.</h1>
        <p className="mt-4 text-lg text-cream-muted">Both plans include everything. Yearly members save {formatMoney(yearlySaving)}.</p>
      </Reveal>

      <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
        {(["monthly", "yearly"] as const).map((id, i) => {
          const plan = PLANS[id];
          const featured = id === "yearly";
          return (
            <Reveal
              key={id}
              delay={i * 0.1}
              className={`card relative flex flex-col p-8 ${featured ? "border-ember/40 shadow-[0_0_80px_-30px_rgba(255,107,74,0.6)]" : ""}`}
            >
              {featured && (
                <span className="absolute -top-3 left-8 rounded-full bg-ember px-3 py-1 text-xs font-semibold text-ink">Best value</span>
              )}
              <p className="text-sm font-semibold uppercase tracking-wider text-cream-muted">{plan.label}</p>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-5xl font-semibold">{formatMoney(plan.priceCents)}</span>
                <span className="text-cream-dim">/{id === "monthly" ? "month" : "year"}</span>
              </p>
              <p className="mt-2 text-sm text-cream-muted">{plan.blurb}</p>
              <ul className="mt-8 flex-1 space-y-3 text-sm">
                {FEATURES.map((f) => (
                  <li key={f} className="flex gap-3">
                    <Check className="h-5 w-5 shrink-0 text-mint" /> {f}
                  </li>
                ))}
              </ul>
              <Link href={href(id)} className={`${featured ? "btn-primary" : "btn-secondary"} mt-8 w-full py-3`}>
                {session?.isSubscriber ? "You're a member" : `Choose ${plan.label.toLowerCase()}`}
              </Link>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
