"use client";

import { useActionState, useState } from "react";
import { createDraw } from "@/app/actions/admin-draws";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";

export function LogicFields({ logic, setLogic, bias }: { logic: string; setLogic: (v: string) => void; bias?: string }) {
  return (
    <>
      <Field label="Draw logic" htmlFor="logic">
        <select id="logic" name="logic" value={logic} onChange={(e) => setLogic(e.target.value)} className="input">
          <option value="random">Random (lottery-style)</option>
          <option value="algorithmic">Algorithmic (weighted by score frequency)</option>
        </select>
      </Field>
      {logic === "algorithmic" && (
        <Field
          label="Weighting"
          htmlFor="algo_bias"
          hint="Hot favours numbers members score most often (more winners). Cold favours the rarest (bigger rollovers)."
        >
          <select id="algo_bias" name="algo_bias" defaultValue={bias ?? "hot"} className="input">
            <option value="hot">Hot: most frequent scores</option>
            <option value="cold">Cold: least frequent scores</option>
          </select>
        </Field>
      )}
    </>
  );
}

export function CreateDrawForm({ defaultPeriod, hasCurrent }: { defaultPeriod: string; hasCurrent: boolean }) {
  const [state, action] = useActionState(createDraw, null);
  const [logic, setLogic] = useState("random");
  return (
    <form action={action} className="mt-4 space-y-4">
      <Field label="Month" htmlFor="period" hint={hasCurrent ? "This month's draw already exists." : undefined}>
        <input id="period" name="period" type="month" defaultValue={defaultPeriod} required className="input" />
      </Field>
      <LogicFields logic={logic} setLogic={setLogic} />
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full" pendingText="Creating…">
        Create draw
      </SubmitButton>
    </form>
  );
}
