"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { charityChoiceSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

export async function updateProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser();
  const name = z.string().trim().min(2, "Please enter your name.").max(80).safeParse(formData.get("full_name"));
  if (!name.success) return { error: name.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: name.data }).eq("id", session.userId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Profile saved." };
}

/** Change charity and/or percentage. Applies from the next charge onwards. */
export async function updateCharity(_: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser();
  const parsed = charityChoiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: charity } = await supabase.from("charities").select("id").eq("id", parsed.data.charity_id).eq("active", true).maybeSingle();
  if (!charity) return { error: "That charity is no longer available." };

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", session.userId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Charity preferences saved. They apply from your next payment." };
}
