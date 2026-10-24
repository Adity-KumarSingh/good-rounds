"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useActionState, useState } from "react";
import { signUp } from "@/app/actions/auth";
import { ContributionSlider } from "@/components/contribution-slider";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import { CHARITY_MIN_PERCENT, PLANS, type PlanId } from "@/lib/config";
import { formatMoney } from "@/lib/format";
import type { Charity } from "@/lib/types";

type CharityOption = Pick<Charity, "id" | "name" | "tagline" | "category" | "slug">;

const STEPS = ["Your cause", "Your plan", "Your account"];

/**
 * Three-step signup: charity → plan & contribution → account details.
 * All values are submitted in one request at the end.
 */
export function SignupForm({ charities, initialPlan, initialCharity }: { charities: CharityOption[]; initialPlan: PlanId; initialCharity?: string }) {
  const [state, action] = useActionState(signUp, null);
  const [step, setStep] = useState(0);
  const [charityId, setCharityId] = useState(charities.some((c) => c.id === initialCharity) ? initialCharity! : "");
  const [plan, setPlan] = useState<PlanId>(initialPlan);
  const [percent, setPercent] = useState(CHARITY_MIN_PERCENT);
  // Controlled so values survive React resetting the form after a failed submit.
  const [account, setAccount] = useState({ full_name: "", email: "" });

  const canNext = step === 0 ? !!charityId : true;
  const chosen = charities.find((c) => c.id === charityId);

  if (state?.ok) {
    return (
      <div className="card p-10 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint/15 text-mint">
          <Check className="h-7 w-7" />
        </span>
        <h2 className="mt-5 font-display text-2xl font-semibold">Almost there</h2>
        <p className="mt-2 text-cream-muted">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="card overflow-hidden">
      {/* progress */}
      <ol className="flex border-b border-white/[0.07]">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={clsx(
              "flex flex-1 items-center justify-center gap-2 py-4 text-xs font-medium sm:text-sm",
              i === step ? "text-cream" : i < step ? "text-mint" : "text-cream-dim",
            )}
          >
            <span
              className={clsx(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                i === step ? "bg-ember text-ink" : i < step ? "bg-mint/20 text-mint" : "bg-white/5",
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </li>
        ))}
      </ol>

      <input type="hidden" name="charity_id" value={charityId} />
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="charity_percent" value={percent} />

      <div className="p-6 sm:p-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
            {step === 0 && (
              <div>
                <p className="text-cream-muted">Pick the charity your membership supports. You can change it later.</p>
                <div className="mt-5 grid max-h-[420px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                  {charities.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setCharityId(c.id)}
                      aria-pressed={charityId === c.id}
                      className={clsx(
                        "rounded-2xl border p-4 text-left transition",
                        charityId === c.id ? "border-mint bg-mint/10" : "border-white/10 hover:border-white/25 hover:bg-white/[0.03]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">{c.name}</p>
                        {charityId === c.id && <Check className="h-5 w-5 shrink-0 text-mint" />}
                      </div>
                      <p className="mt-0.5 text-xs text-cream-dim">{c.category}</p>
                      <p className="mt-2 line-clamp-2 text-sm text-cream-muted">{c.tagline}</p>
                    </button>
                  ))}
                </div>
                {!charities.length && <p className="text-sm text-red-300">No charities are available yet. Ask an admin to add one.</p>}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-8">
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["monthly", "yearly"] as const).map((id) => (
                    <button
                      type="button"
                      key={id}
                      onClick={() => setPlan(id)}
                      aria-pressed={plan === id}
                      className={clsx(
                        "rounded-2xl border p-5 text-left transition",
                        plan === id ? "border-ember bg-ember/10" : "border-white/10 hover:border-white/25",
                      )}
                    >
                      <p className="text-sm font-semibold">{PLANS[id].label}</p>
                      <p className="mt-1 font-display text-3xl font-semibold">{formatMoney(PLANS[id].priceCents)}</p>
                      <p className="mt-1 text-xs text-cream-dim">{PLANS[id].blurb}</p>
                    </button>
                  ))}
                </div>
                <ContributionSlider value={percent} onChange={setPercent} plan={plan} name="charity_percent_display" />
                {chosen && (
                  <p className="text-center text-sm text-cream-muted">
                    Supporting <span className="text-cream">{chosen.name}</span>
                  </p>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <Field label="Full name" htmlFor="full_name">
                  <input id="full_name" name="full_name" value={account.full_name} onChange={(e) => setAccount({ ...account, full_name: e.target.value })} autoComplete="name" required minLength={2} className="input" />
                </Field>
                <Field label="Email" htmlFor="email">
                  <input id="email" name="email" type="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} autoComplete="email" required className="input" />
                </Field>
                <Field label="Password" htmlFor="password" hint="At least 8 characters.">
                  <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="input" />
                </Field>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <FormMessage state={state} className="mt-5" />

        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <button type="button" onClick={() => setStep(step - 1)} className="btn-ghost">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" disabled={!canNext} onClick={() => setStep(step + 1)} className="btn-primary">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <SubmitButton pendingText="Creating account…">
              Continue to payment <ArrowRight className="h-4 w-4" />
            </SubmitButton>
          )}
        </div>
      </div>
    </form>
  );
}
