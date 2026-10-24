"use client";

import { useActionState, useRef, useState } from "react";
import { adminManageSubscription, adminUpdateUser } from "@/app/actions/admin-users";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import { CHARITY_MAX_PERCENT, CHARITY_MIN_PERCENT } from "@/lib/config";
import type { Charity, Profile } from "@/lib/types";

export function ProfileEditor({ profile, charities }: { profile: Profile; charities: Pick<Charity, "id" | "name">[] }) {
  const [state, action] = useActionState(adminUpdateUser, null);
  return (
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="id" value={profile.id} />
      <Field label="Full name" htmlFor="full_name">
        <input id="full_name" name="full_name" defaultValue={profile.full_name} required className="input" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role" htmlFor="role">
          <select id="role" name="role" defaultValue={profile.role} className="input">
            <option value="subscriber">Subscriber</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <Field label="Charity %" htmlFor="charity_percent">
          <input
            id="charity_percent"
            name="charity_percent"
            type="number"
            min={CHARITY_MIN_PERCENT}
            max={CHARITY_MAX_PERCENT}
            defaultValue={profile.charity_percent}
            className="input"
          />
        </Field>
      </div>
      <Field label="Charity" htmlFor="charity_id">
        <select id="charity_id" name="charity_id" defaultValue={profile.charity_id ?? ""} required className="input">
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
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">Save user</SubmitButton>
    </form>
  );
}

export function SubscriptionControls({ userId, hasSub, active, cancelAtEnd }: { userId: string; hasSub: boolean; active: boolean; cancelAtEnd: boolean }) {
  const [state, action] = useActionState(adminManageSubscription, null);
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  // Each button writes its operation here before submit; submitter
  // name/value pairs are not reliably forwarded to server actions.
  const opRef = useRef<HTMLInputElement>(null);

  const Op = ({ op, label, danger, confirm }: { op: string; label: string; danger?: boolean; confirm?: string }) => (
    <button
      type="submit"
      className={danger ? "btn-danger" : "btn-secondary"}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) {
          e.preventDefault();
          return;
        }
        if (opRef.current) opRef.current.value = op;
      }}
    >
      {label}
    </button>
  );

  return (
    <form action={action} className="mt-5 space-y-3 border-t border-white/[0.06] pt-5">
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="op" ref={opRef} defaultValue="" />
      {!active && (
        <div className="flex items-center gap-2">
          <select value={plan} onChange={(e) => setPlan(e.target.value as "monthly" | "yearly")} className="input w-40" aria-label="Plan">
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <Op op="grant" label="Grant complimentary" />
        </div>
      )}
      {hasSub && (
        <div className="flex flex-wrap gap-2">
          <Op op="extend" label="Extend one period" />
          {active && (cancelAtEnd ? <Op op="resume" label="Resume auto-renew" /> : <Op op="cancel_at_end" label="Cancel at period end" />)}
          {active && <Op op="lapse" label="Mark lapsed" danger confirm="Mark this subscription as lapsed? The user loses access immediately." />}
          {active && <Op op="cancel_now" label="Cancel now" danger confirm="End this subscription immediately?" />}
        </div>
      )}
      <FormMessage state={state} />
    </form>
  );
}
