"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { buildSimulation } from "@/lib/draws";
import { friendlyDbError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState, Draw } from "@/lib/types";

const configSchema = z.object({
  logic: z.enum(["random", "algorithmic"]),
  algo_bias: z.enum(["hot", "cold"]).default("hot"),
});

export async function createDraw(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const period = z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Pick a month.")
    .safeParse(formData.get("period"));
  const config = configSchema.safeParse(Object.fromEntries(formData));
  if (!period.success) return { error: period.error.issues[0].message };
  if (!config.success) return { error: "Choose the draw logic." };

  const { data, error } = await createAdminClient()
    .from("draws")
    .insert({ period: period.data, ...config.data })
    .select("id")
    .single();
  if (error) return { error: error.code === "23505" ? "A draw for that month already exists." : error.message };
  redirect(`/admin/draws/${data.id}`);
}

/** Changing the logic invalidates any previous simulation. */
export async function updateDrawConfig(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = z.string().uuid().safeParse(formData.get("id"));
  const config = configSchema.safeParse(Object.fromEntries(formData));
  if (!id.success || !config.success) return { error: "Invalid request." };

  const { data, error } = await createAdminClient()
    .from("draws")
    .update({ ...config.data, status: "draft", simulation: null, simulated_at: null, winning_numbers: null })
    .eq("id", id.data)
    .neq("status", "published")
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Published draws can't be changed." };
  revalidatePath(`/admin/draws/${id.data}`);
  return { ok: true, message: "Draw settings saved. Run a new simulation to preview results." };
}

/** Run (or re-run) a simulation. Nothing is visible to users until publish. */
export async function simulateDraw(id: string): Promise<ActionState> {
  await requireAdmin();
  const db = createAdminClient();
  const { data: draw } = await db.from("draws").select("*").eq("id", id).single<Draw>();
  if (!draw) return { error: "Draw not found." };
  if (draw.status === "published") return { error: "This draw is already published." };

  const simulation = await buildSimulation(db, draw);
  const { error } = await db
    .from("draws")
    .update({
      status: "simulated",
      simulation,
      simulated_at: new Date().toISOString(),
      winning_numbers: simulation.winningNumbers,
    })
    .eq("id", id)
    .neq("status", "published");
  if (error) return { error: error.message };

  revalidatePath(`/admin/draws/${id}`);
  return {
    ok: true,
    message: `Simulated: ${simulation.entries.length} entries, ${
      simulation.tiers[5].winners.length + simulation.tiers[4].winners.length + simulation.tiers[3].winners.length
    } winners.`,
  };
}

export async function publishDraw(id: string): Promise<ActionState> {
  await requireAdmin();
  const { error } = await createAdminClient().rpc("publish_draw", { p_draw_id: id });
  if (error) return { error: friendlyDbError(error) };
  revalidatePath("/admin/draws");
  revalidatePath(`/admin/draws/${id}`);
  revalidatePath("/draws");
  revalidatePath("/");
  return { ok: true, message: "Results published. Winners can now see their prizes." };
}

export async function deleteDraw(id: string): Promise<ActionState> {
  await requireAdmin();
  const { data, error } = await createAdminClient().from("draws").delete().eq("id", id).neq("status", "published").select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Published draws can't be deleted." };
  redirect("/admin/draws");
}
