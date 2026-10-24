"use client";

import { useActionState, useState } from "react";
import { updateDrawConfig } from "@/app/actions/admin-draws";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { LogicFields } from "../create-form";

export function DrawConfigForm({ id, logic: initialLogic, bias }: { id: string; logic: string; bias: string }) {
  const [state, action] = useActionState(updateDrawConfig, null);
  const [logic, setLogic] = useState(initialLogic);
  return (
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="id" value={id} />
      <LogicFields logic={logic} setLogic={setLogic} bias={bias} />
      <FormMessage state={state} />
      <SubmitButton className="btn-secondary w-full" pendingText="Saving…">
        Save configuration
      </SubmitButton>
    </form>
  );
}
