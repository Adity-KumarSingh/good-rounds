"use client";

import { Check, X } from "lucide-react";
import { useActionState, useRef } from "react";
import { reviewWinner } from "@/app/actions/admin-winners";
import { FormMessage } from "@/components/ui/form";

export function ReviewForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(reviewWinner, null);
  // The clicked button writes its decision here before submit; submitter
  // name/value pairs are not reliably forwarded to server actions.
  const decision = useRef<HTMLInputElement>(null);
  const choose = (value: "approve" | "reject") => () => {
    if (decision.current) decision.current.value = value;
  };

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="decision" ref={decision} defaultValue="approve" />
      <input name="note" placeholder="Note (required to reject)" className="input" />
      <div className="flex gap-2">
        <button type="submit" onClick={choose("approve")} disabled={pending} className="btn-primary flex-1">
          <Check className="h-4 w-4" /> Approve
        </button>
        <button type="submit" onClick={choose("reject")} disabled={pending} className="btn-danger flex-1">
          <X className="h-4 w-4" /> Reject
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
