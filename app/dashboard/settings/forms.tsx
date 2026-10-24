"use client";

import { useActionState, useState } from "react";
import { updateCharity, updateProfile } from "@/app/actions/profile";
import { ContributionSlider } from "@/components/contribution-slider";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import type { PlanId } from "@/lib/config";
import type { Charity } from "@/lib/types";

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const [state, action] = useActionState(updateProfile, null);
  return (
    <form action={action} className="mt-4 space-y-4">
      <Field label="Full name" htmlFor="full_name">
        <input id="full_name" name="full_name" defaultValue={fullName} required minLength={2} className="input" />
      </Field>
      <Field label="Email" hint="Contact support to change your email.">
        <input value={email} disabled className="input opacity-60" aria-label="Email" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}

export function CharityForm({
  charities,
  charityId,
  percent: initialPercent,
  plan,
}: {
  charities: Pick<Charity, "id" | "name" | "category">[];
  charityId: string | null;
  percent: number;
  plan: PlanId;
}) {
  const [state, action] = useActionState(updateCharity, null);
  const [percent, setPercent] = useState(initialPercent);
  const [selected, setSelected] = useState(charityId ?? "");

  return (
    <form action={action} className="mt-4 space-y-5">
      <Field label="Charity" htmlFor="charity_id">
        <select id="charity_id" name="charity_id" value={selected} onChange={(e) => setSelected(e.target.value)} required className="input">
          <option value="" disabled>
            Choose a charity
          </option>
          {charities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.category}
            </option>
          ))}
        </select>
      </Field>
      <ContributionSlider value={percent} onChange={setPercent} plan={plan} />
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">Save charity preferences</SubmitButton>
    </form>
  );
}
