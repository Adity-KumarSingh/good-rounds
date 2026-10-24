"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { uuid } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Winner uploads a screenshot of their scores from their golf platform (PRD §09). */
export async function uploadProof(_: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser();
  const winnerId = uuid.safeParse(formData.get("winner_id"));
  const file = formData.get("proof");
  if (!winnerId.success) return { error: "Unknown prize." };
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a screenshot to upload." };
  if (file.size > MAX_PROOF_BYTES) return { error: "File is too large (max 5 MB)." };
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return { error: "Upload a PNG, JPG, WEBP or PDF." };

  const db = createAdminClient();
  const { data: winner } = await db
    .from("winners")
    .select("id, user_id, verification_status, proof_path")
    .eq("id", winnerId.data)
    .single();
  if (!winner || winner.user_id !== session.userId) return { error: "Prize not found." };
  if (!["awaiting_proof", "rejected"].includes(winner.verification_status))
    return { error: "Your proof has already been submitted." };

  const path = `${session.userId}/${winner.id}-${Date.now()}.${ext}`;
  const { error: uploadError } = await db.storage
    .from("winner-proofs")
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

  // Replace any previously rejected proof.
  if (winner.proof_path) await db.storage.from("winner-proofs").remove([winner.proof_path]);

  const { error } = await db
    .from("winners")
    .update({
      proof_path: path,
      proof_uploaded_at: new Date().toISOString(),
      verification_status: "pending_review",
      review_note: null,
    })
    .eq("id", winner.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Proof submitted. We'll review it shortly." };
}
