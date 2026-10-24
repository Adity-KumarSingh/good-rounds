"use client";

import { UploadCloud } from "lucide-react";
import { useActionState, useState } from "react";
import { uploadProof } from "@/app/actions/winners";
import { FormMessage, SubmitButton } from "@/components/ui/form";

export function ProofUpload({ winnerId }: { winnerId: string }) {
  const [state, action] = useActionState(uploadProof, null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <form action={action} className="mt-5 space-y-3">
      <input type="hidden" name="winner_id" value={winnerId} />
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 p-6 text-center transition hover:border-ember/60 hover:bg-ember/5">
        <UploadCloud className="h-7 w-7 text-ember" />
        <span className="text-sm font-semibold">{fileName ?? "Upload a screenshot of your scores"}</span>
        <span className="text-xs text-cream-dim">PNG, JPG, WEBP or PDF · max 5 MB</span>
        <input
          type="file"
          name="proof"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          required
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Uploading…" disabled={!fileName}>
        Submit proof
      </SubmitButton>
    </form>
  );
}
