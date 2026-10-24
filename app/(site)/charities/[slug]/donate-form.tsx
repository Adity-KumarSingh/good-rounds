"use client";

import clsx from "clsx";
import { Gift } from "lucide-react";
import { useActionState, useState } from "react";
import { donate } from "@/app/actions/donations";
import { FormMessage, SubmitButton } from "@/components/ui/form";

const PRESETS = [10, 25, 50, 100];

/** Independent one-off donation, open to anyone (no subscription needed). */
export function DonateForm({ charityId, charityName, signedIn }: { charityId: string; charityName: string; signedIn: boolean }) {
  const [state, action] = useActionState(donate, null);
  const [amount, setAmount] = useState("25");

  return (
    <form action={action} className="card space-y-4 p-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Gift className="h-5 w-5 text-gold" /> One-off donation
        </h2>
        <p className="mt-1 text-sm text-cream-muted">100% goes to {charityName}. No subscription needed.</p>
      </div>
      <input type="hidden" name="charity_id" value={charityId} />

      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => setAmount(String(p))}
            className={clsx(
              "rounded-xl py-2 text-sm font-semibold transition",
              amount === String(p) ? "bg-gold text-ink" : "bg-white/5 text-cream-muted hover:bg-white/10",
            )}
          >
            £{p}
          </button>
        ))}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cream-dim">£</span>
        <input
          name="amount"
          type="number"
          min={1}
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input pl-8"
          aria-label="Donation amount in pounds"
        />
      </div>
      {!signedIn && (
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="donor_name" placeholder="Your name (optional)" className="input" />
          <input name="donor_email" type="email" placeholder="Email for receipt (optional)" className="input" />
        </div>
      )}
      <input name="card_number" defaultValue="4242 4242 4242 4242" className="input font-mono" aria-label="Card number (test mode)" />
      <p className="-mt-2 text-xs text-cream-dim">Test mode: any card works except 4000 0000 0000 0002.</p>
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full" pendingText="Processing…">
        Donate £{Number(amount || 0).toFixed(2)}
      </SubmitButton>
    </form>
  );
}
