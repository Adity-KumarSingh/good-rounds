"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import type { ActionState } from "@/lib/types";
import { FormMessage } from "./form";

/**
 * Button that runs a server action directly (no form fields), with an
 * optional confirmation prompt and inline result message.
 */
export function ActionButton({
  action,
  children,
  confirm,
  className = "btn-secondary",
  showMessage = true,
}: {
  action: () => Promise<ActionState | void>;
  children: React.ReactNode;
  confirm?: string;
  className?: string;
  showMessage?: boolean;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>(null);

  return (
    <div className="inline-flex flex-col gap-2">
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => setState((await action()) ?? null));
        }}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
      {showMessage && <FormMessage state={state} />}
    </div>
  );
}
