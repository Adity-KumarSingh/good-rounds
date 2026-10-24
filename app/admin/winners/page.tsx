import clsx from "clsx";
import { FileImage } from "lucide-react";
import Link from "next/link";
import { markPaid } from "@/app/actions/admin-winners";
import { PageHeader } from "@/components/app-shell";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/badges";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatMoney, formatPeriod } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Winner } from "@/lib/types";
import { ReviewForm } from "./review-form";

const FILTERS = {
  all: { label: "All" },
  review: { label: "To review" },
  payout: { label: "To pay" },
  awaiting: { label: "Awaiting proof" },
  paid: { label: "Paid" },
} as const;
type Filter = keyof typeof FILTERS;

type Row = Winner & {
  draw: { period: string };
  profile: { full_name: string; email: string };
  entry: { numbers: number[] };
};

export default async function AdminWinnersPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await requireAdmin();
  const { filter: rawFilter } = await searchParams;
  const filter: Filter = rawFilter && rawFilter in FILTERS ? (rawFilter as Filter) : "all";
  const db = createAdminClient();

  let query = db
    .from("winners")
    .select("*, draw:draws(period), profile:profiles!winners_user_id_fkey(full_name, email), entry:draw_entries(numbers)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter === "review") query = query.eq("verification_status", "pending_review");
  if (filter === "payout") query = query.eq("verification_status", "approved").eq("payout_status", "pending");
  if (filter === "awaiting") query = query.in("verification_status", ["awaiting_proof", "rejected"]);
  if (filter === "paid") query = query.eq("payout_status", "paid");
  const { data, error } = await query;
  const winners = (data ?? []) as Row[];

  // Proofs live in a private bucket; generate short-lived links for the reviewer.
  const paths = winners.map((w) => w.proof_path).filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await db.storage.from("winner-proofs").createSignedUrls(paths, 60 * 30);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  }

  return (
    <>
      <PageHeader title="Winners" subtitle="Verify proof submissions and record payouts." />
      <div className="mb-5 flex flex-wrap gap-2">
        {(Object.keys(FILTERS) as Filter[]).map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/admin/winners" : `?filter=${f}`}
            className={clsx(
              "rounded-full px-4 py-1.5 text-sm transition",
              filter === f ? "bg-cream text-ink" : "bg-white/5 text-cream-muted hover:bg-white/10",
            )}
          >
            {FILTERS[f].label}
          </Link>
        ))}
      </div>
      {error && <p className="mb-4 text-sm text-red-300">{error.message}</p>}

      <div className="space-y-3">
        {winners.map((w) => (
          <div key={w.id} className="card p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Link href={`/admin/users/${w.user_id}`} className="font-semibold hover:text-ember">
                  {w.profile?.full_name || w.profile?.email}
                </Link>
                <p className="text-sm text-cream-muted">
                  {formatPeriod(w.draw.period)} · {w.tier}-number match ·{" "}
                  <span className="font-semibold text-gold">{formatMoney(w.prize_cents)}</span>
                </p>
                <p className="mt-1 font-mono text-xs text-cream-dim">Numbers: {w.entry?.numbers.join(" · ")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={w.verification_status} />
                <StatusBadge status={w.payout_status} />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-4 border-t border-white/[0.06] pt-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="text-sm">
                {w.proof_path && signed.get(w.proof_path) ? (
                  <a href={signed.get(w.proof_path)} target="_blank" rel="noreferrer" className="btn-secondary">
                    <FileImage className="h-4 w-4" /> View proof ({formatDate(w.proof_uploaded_at)})
                  </a>
                ) : (
                  <span className="text-cream-dim">No proof uploaded yet.</span>
                )}
                {w.review_note && <p className="mt-2 text-cream-muted">Note: {w.review_note}</p>}
                {w.reviewed_at && <p className="mt-1 text-xs text-cream-dim">Reviewed {formatDate(w.reviewed_at)}</p>}
              </div>
              <div className="lg:min-w-[340px]">
                {w.verification_status === "pending_review" && <ReviewForm id={w.id} />}
                {w.verification_status === "approved" && w.payout_status === "pending" && (
                  <ActionButton action={markPaid.bind(null, w.id)} className="btn-primary" confirm={`Mark ${formatMoney(w.prize_cents)} as paid?`}>
                    Mark payout completed
                  </ActionButton>
                )}
                {w.payout_status === "paid" && <p className="text-sm text-mint">Paid {formatDate(w.paid_at)}</p>}
              </div>
            </div>
          </div>
        ))}
        {!winners.length && <div className="card p-10 text-center text-sm text-cream-dim">Nothing here.</div>}
      </div>
    </>
  );
}
