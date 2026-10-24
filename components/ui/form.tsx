"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/types";

export function SubmitButton({
  children,
  pendingText,
  className = "btn-primary",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || rest.disabled} className={className} {...rest}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

/** Inline success / error message for an action result. */
export function FormMessage({ state, className }: { state: ActionState; className?: string }) {
  const text = state?.error ?? state?.message;
  return (
    <AnimatePresence mode="wait">
      {text && (
        <motion.p
          key={text}
          role={state?.error ? "alert" : "status"}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={clsx(
            "flex items-start gap-2 rounded-xl px-3 py-2 text-sm",
            state?.error ? "bg-red-500/10 text-red-300" : "bg-mint/10 text-mint",
            className,
          )}
        >
          {state?.error ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{text}</span>
        </motion.p>
      )}
    </AnimatePresence>
  );
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-cream-dim">{hint}</p>}
    </div>
  );
}
