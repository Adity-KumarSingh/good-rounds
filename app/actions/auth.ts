"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CHARITY_MAX_PERCENT, CHARITY_MIN_PERCENT } from "@/lib/config";
import type { ActionState } from "@/lib/types";

/** Only allow same-site relative redirects. */
function safeNext(next: FormDataEntryValue | null, fallback: string) {
  const v = typeof next === "string" ? next : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

const signUpSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  charity_id: z.string().uuid("Choose a charity to support."),
  charity_percent: z.coerce.number().int().min(CHARITY_MIN_PERCENT).max(CHARITY_MAX_PERCENT),
  plan: z.enum(["monthly", "yearly"]),
});

export async function signUp(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password, plan, ...meta } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: meta, // read by the handle_new_user trigger to create the profile
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?next=${encodeURIComponent(`/checkout?plan=${plan}`)}`,
    },
  });
  if (error) return { error: error.message };

  // Email confirmation enabled → no session yet.
  if (!data.session) {
    return { ok: true, message: "Check your inbox to confirm your email, then sign in to finish subscribing." };
  }
  redirect(`/checkout?plan=${plan}`);
}

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function signIn(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message === "Invalid login credentials" ? "Email or password is incorrect." : error.message };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  redirect(safeNext(formData.get("next"), profile?.role === "admin" ? "/admin" : "/dashboard"));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
