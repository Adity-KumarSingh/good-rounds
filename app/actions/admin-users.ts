"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { PLANS } from "@/lib/config";
import { friendlyDbError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { addPlanPeriod } from "@/lib/subscription";
import { charityChoiceSchema, scoreSchema, uuid } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

const profileSchema = z
  .object({
    id: z.string().uuid(),
    full_name: z.string().trim().min(1, "Name is required.").max(80),
    role: z.enum(["subscriber", "admin"]),
  })
  .and(charityChoiceSchema);

export async function adminUpdateUser(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, ...fields } = parsed.data;
  if (id === admin.userId && fields.role !== "admin") return { error: "You can't remove your own admin role." };

  const { error } = await createAdminClient().from("profiles").update(fields).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/users/${id}`);
  return { ok: true, message: "User saved." };
}

/** Admins can add or correct any user's scores; DB triggers still enforce the rules. */
export async function adminSaveScore(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const userId = uuid.safeParse(formData.get("user_id"));
  const parsed = scoreSchema.safeParse(Object.fromEntries(formData));
  if (!userId.success) return { error: "Unknown user." };
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const db = createAdminClient();
  const id = formData.get("id");
  const { error } =
    typeof id === "string" && id
      ? await db.from("scores").update(parsed.data).eq("id", id).eq("user_id", userId.data)
      : await db.from("scores").insert({ ...parsed.data, user_id: userId.data });
  if (error) return { error: friendlyDbError(error) };

  revalidatePath(`/admin/users/${userId.data}`);
  return { ok: true, message: "Score saved." };
}

/** Bound with the user id in the page: adminDeleteScore.bind(null, userId). */
export async function adminDeleteScore(userId: string, id: string): Promise<ActionState> {
  await requireAdmin();
  const { error } = await createAdminClient().from("scores").delete().eq("id", id).eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true, message: "Score deleted." };
}

const subActionSchema = z.object({
  user_id: z.string().uuid(),
  op: z.enum(["grant", "extend", "cancel_now", "cancel_at_end", "resume", "lapse"]),
  plan: z.enum(["monthly", "yearly"]).default("monthly"),
});

/**
 * Manual subscription management for support cases.
 * "grant" creates a complimentary subscription (no payment row, so it never
 * inflates charity totals); the prize pool still counts the subscriber.
 */
export async function adminManageSubscription(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = subActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request." };
  const { user_id, op, plan } = parsed.data;
  const db = createAdminClient();
  const { data: sub } = await db.from("subscriptions").select("*").eq("user_id", user_id).maybeSingle();

  let result;
  if (op === "grant") {
    const start = new Date();
    result = await db.from("subscriptions").upsert(
      {
        user_id,
        plan,
        status: "active",
        amount_cents: PLANS[plan].priceCents,
        current_period_start: start.toISOString(),
        current_period_end: addPlanPeriod(start, plan).toISOString(),
        cancel_at_period_end: false,
        provider: "admin",
        provider_ref: null,
      },
      { onConflict: "user_id" },
    );
  } else {
    if (!sub) return { error: "This user has no subscription yet. Grant one first." };
    const updates: Record<string, unknown> = {
      extend: {
        status: "active",
        current_period_end: addPlanPeriod(
          new Date(Math.max(Date.now(), new Date(sub.current_period_end).getTime())),
          sub.plan,
        ).toISOString(),
      },
      cancel_now: { status: "cancelled", cancel_at_period_end: false, current_period_end: new Date().toISOString() },
      cancel_at_end: { cancel_at_period_end: true },
      resume: { cancel_at_period_end: false },
      lapse: { status: "lapsed" },
    }[op] as Record<string, unknown>;
    // Keep the period-end > period-start constraint valid when ending immediately.
    if (op === "cancel_now" && new Date(sub.current_period_start).getTime() >= Date.now()) {
      updates.current_period_start = new Date(Date.now() - 1000).toISOString();
    }
    result = await db.from("subscriptions").update(updates).eq("id", sub.id);
  }
  if (result.error) return { error: result.error.message };

  revalidatePath(`/admin/users/${user_id}`);
  revalidatePath("/admin/users");
  return { ok: true, message: "Subscription updated." };
}
