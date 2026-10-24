import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { reconcileSubscription } from "./billing";
import { effectiveStatus } from "./subscription";
import type { Profile, Subscription } from "./types";

export interface Session {
  userId: string;
  email: string;
  profile: Profile;
  subscription: Subscription | null;
  status: ReturnType<typeof effectiveStatus>;
  isSubscriber: boolean;
  isAdmin: boolean;
}

/**
 * Loads the signed-in user, profile and subscription — once per request
 * (React cache). The subscription is reconciled against the clock on every
 * request, so access decisions never use a stale "active" flag.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: sub }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!profile) return null;

  const subscription = sub ? await reconcileSubscription(sub as Subscription) : null;
  const status = effectiveStatus(subscription);

  return {
    userId: user.id,
    email: user.email ?? profile.email,
    profile: profile as Profile,
    subscription,
    status,
    isSubscriber: status === "active",
    isAdmin: profile.role === "admin",
  };
});

export async function requireUser(next = "/dashboard") {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  return session;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (!session.isAdmin) redirect("/dashboard");
  return session;
}
