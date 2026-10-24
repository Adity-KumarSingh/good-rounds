"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { friendlyDbError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { scoreSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

/**
 * Scores are written with the user's own session so RLS enforces ownership
 * and the active-subscription requirement; DB triggers enforce the 5-score window.
 */
export async function addScore(_: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser();
  if (!session.isSubscriber) return { error: "Subscribe to start entering scores." };
  const parsed = scoreSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("scores").insert({ ...parsed.data, user_id: session.userId });
  if (error) return { error: friendlyDbError(error) };

  revalidatePath("/dashboard");
  return { ok: true, message: "Score saved." };
}

export async function updateScore(_: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser();
  if (!session.isSubscriber) return { error: "Subscribe to edit scores." };
  const id = z.string().uuid().safeParse(formData.get("id"));
  const parsed = scoreSchema.safeParse(Object.fromEntries(formData));
  if (!id.success) return { error: "Unknown score." };
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .update(parsed.data)
    .eq("id", id.data)
    .eq("user_id", session.userId)
    .select("id");
  if (error) return { error: friendlyDbError(error) };
  if (!data?.length) return { error: "Score not found." };

  revalidatePath("/dashboard");
  return { ok: true, message: "Score updated." };
}

export async function deleteScore(id: string): Promise<ActionState> {
  const session = await requireUser();
  if (!session.isSubscriber) return { error: "Subscribe to manage scores." };
  const supabase = await createClient();
  const { error } = await supabase.from("scores").delete().eq("id", id).eq("user_id", session.userId);
  if (error) return { error: friendlyDbError(error) };
  revalidatePath("/dashboard");
  return { ok: true, message: "Score removed." };
}
