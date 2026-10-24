"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { startSubscription } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/lib/types";

const checkoutSchema = z.object({
  plan: z.enum(["monthly", "yearly"]),
  card_number: z.string().optional(),
  charity_id: z.string().uuid().optional(),
});

export async function checkout(_: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser("/checkout");
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Choose a plan." };
  if (session.isSubscriber) redirect("/dashboard");

  // Users who signed up before choosing a charity pick one at checkout.
  if (!session.profile.charity_id) {
    if (!parsed.data.charity_id) return { error: "Choose a charity to support." };
    await createAdminClient().from("profiles").update({ charity_id: parsed.data.charity_id }).eq("id", session.userId);
  }

  const result = await startSubscription(session.userId, parsed.data.plan, parsed.data.card_number);
  if (!result.ok) return { error: result.error };

  revalidatePath("/", "layout");
  redirect("/dashboard?welcome=1");
}

/** Cancel at period end: access continues until the paid period runs out. */
export async function cancelSubscription(): Promise<ActionState> {
  const session = await requireUser();
  if (!session.subscription || !session.isSubscriber) return { error: "No active subscription." };
  const { error } = await createAdminClient()
    .from("subscriptions")
    .update({ cancel_at_period_end: true })
    .eq("id", session.subscription.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Your subscription will end at the close of this period." };
}

export async function resumeSubscription(): Promise<ActionState> {
  const session = await requireUser();
  if (!session.subscription || !session.isSubscriber) return { error: "No active subscription to resume." };
  const { error } = await createAdminClient()
    .from("subscriptions")
    .update({ cancel_at_period_end: false })
    .eq("id", session.subscription.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Welcome back — your subscription will renew automatically." };
}
