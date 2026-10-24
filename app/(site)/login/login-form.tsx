"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions/auth";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, null);
  return (
    <form action={action} className="mt-8 space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Email" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </Field>
      <Field label="Password" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full py-3" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
