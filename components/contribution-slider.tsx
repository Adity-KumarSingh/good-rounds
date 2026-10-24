"use client";

import { CHARITY_MAX_PERCENT, CHARITY_MIN_PERCENT, PLANS, type PlanId } from "@/lib/config";
import { splitFee } from "@/lib/draw-engine";
import { formatMoney } from "@/lib/format";

/** Charity percentage picker with a live breakdown of where the fee goes. */
export function ContributionSlider({
  value,
  onChange,
  plan,
  name = "charity_percent",
}: {
  value: number;
  onChange: (v: number) => void;
  plan: PlanId;
  name?: string;
}) {
  const price = PLANS[plan].priceCents;
  const split = splitFee(price, value);
  const fill = ((value - CHARITY_MIN_PERCENT) / (CHARITY_MAX_PERCENT - CHARITY_MIN_PERCENT)) * 100;

  return (
    <div>
      <div className="flex items-end justify-between">
        <label htmlFor={name} className="label mb-0">
          Your charity share
        </label>
        <span className="font-display text-3xl font-semibold text-mint">{value}%</span>
      </div>
      <input
        id={name}
        name={name}
        type="range"
        min={CHARITY_MIN_PERCENT}
        max={CHARITY_MAX_PERCENT}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full accent-mint"
        style={{ background: `linear-gradient(to right, #3DDC97 ${fill}%, rgba(255,255,255,0.08) ${fill}%)` }}
      />
      <div className="mt-1 flex justify-between text-xs text-cream-dim">
        <span>{CHARITY_MIN_PERCENT}% minimum</span>
        <span>{CHARITY_MAX_PERCENT}%</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-mint/10 p-2.5">
          <p className="font-semibold text-mint">{formatMoney(split.charity)}</p>
          <p className="text-cream-dim">to charity</p>
        </div>
        <div className="rounded-xl bg-gold/10 p-2.5">
          <p className="font-semibold text-gold">{formatMoney(split.prizePool)}</p>
          <p className="text-cream-dim">prize pool</p>
        </div>
        <div className="rounded-xl bg-white/5 p-2.5">
          <p className="font-semibold">{formatMoney(split.platform)}</p>
          <p className="text-cream-dim">platform</p>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-cream-dim">per {plan === "monthly" ? "month" : "year"}</p>
    </div>
  );
}
