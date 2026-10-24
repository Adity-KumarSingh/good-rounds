"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/lib/types";

const reviewSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional(),
});

export async function reviewWinner(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request." };
  const { id, decision, note } = parsed.data;
  if (decision === "reject" && !note) return { error: "Tell the winner why their proof was rejected." };

  const { data, error } = await createAdminClient()
    .from("winners")
    .update({
      verification_status: decision === "approve" ? "approved" : "rejected",
      review_note: note || null,
      reviewed_by: admin.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("verification_status", "pending_review")
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "This submission is not awaiting review." };

  revalidatePath("/admin/winners");
  return { ok: true, message: decision === "approve" ? "Proof approved." : "Proof rejected — the winner can re-upload." };
}

/** Pending → Paid. The DB also refuses to mark an unapproved prize as paid. */
export async function markPaid(id: string): Promise<ActionState> {
  await requireAdmin();
  const { data, error } = await createAdminClient()
    .from("winners")
    .update({ payout_status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id)
    .eq("verification_status", "approved")
    .eq("payout_status", "pending")
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Only approved, unpaid prizes can be marked as paid." };
  revalidatePath("/admin/winners");
  return { ok: true, message: "Payout marked as completed." };
}
