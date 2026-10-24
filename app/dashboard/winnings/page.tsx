import type { Metadata } from "next";
import { PageHeader, StatCard } from "@/components/app-shell";
import { NumberBall } from "@/components/number-ball";
import { StatusBadge } from "@/components/ui/badges";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMoney, formatPeriod } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Draw, Winner } from "@/lib/types";
import { ProofUpload } from "./proof-upload";

export const metadata: Metadata = { title: "Winnings" };

type WinnerRow = Winner & {
  draw: Pick<Draw, "period" | "winning_numbers">;
  entry: { numbers: number[] };
};

export default async function WinningsPage() {
  const session = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("winners")
    .select("*, draw:draws(period, winning_numbers), entry:draw_entries(numbers)")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false });
  const winners = (data ?? []) as WinnerRow[];

  const total = winners.reduce((s, w) => s + Number(w.prize_cents), 0);
  const paid = winners.filter((w) => w.payout_status === "paid").reduce((s, w) => s + Number(w.prize_cents), 0);

  return (
    <>
      <PageHeader title="Winnings" subtitle="Claim prizes by uploading a screenshot of your scores from your golf platform." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total won" value={formatMoney(total)} accent="text-gold" />
        <StatCard label="Paid out" value={formatMoney(paid)} accent="text-mint" />
        <StatCard label="Pending" value={formatMoney(total - paid)} />
      </div>

      <div className="mt-8 space-y-4">
        {winners.map((w) => {
          const mine = new Set(w.entry?.numbers ?? []);
          const canUpload = w.verification_status === "awaiting_proof" || w.verification_status === "rejected";
          return (
            <div key={w.id} className="card p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm text-cream-dim">{formatPeriod(w.draw.period)} draw</p>
                  <p className="mt-1 font-display text-3xl font-semibold">
                    {formatMoney(w.prize_cents)} <span className="text-base font-normal text-cream-muted">· {w.tier}-number match</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(w.draw.winning_numbers ?? []).map((n, i) => (
                      <NumberBall key={i} n={n} index={i} size="sm" matched={mine.has(n)} />
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={w.verification_status} />
                  <StatusBadge status={w.payout_status} />
                </div>
              </div>

              {/* lifecycle */}
              <ol className="mt-6 grid grid-cols-4 gap-2 text-center text-xs">
                {[
                  { label: "Won", done: true },
                  { label: "Proof sent", done: !!w.proof_uploaded_at && w.verification_status !== "rejected" },
                  { label: "Approved", done: w.verification_status === "approved" },
                  { label: "Paid", done: w.payout_status === "paid" },
                ].map((s) => (
                  <li key={s.label}>
                    <span className={`block h-1.5 rounded-full ${s.done ? "bg-mint" : "bg-white/10"}`} />
                    <span className={`mt-2 block ${s.done ? "text-cream" : "text-cream-dim"}`}>{s.label}</span>
                  </li>
                ))}
              </ol>

              {w.verification_status === "rejected" && w.review_note && (
                <p className="mt-5 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  Your proof was rejected: {w.review_note}. Please upload a new one.
                </p>
              )}
              {canUpload && <ProofUpload winnerId={w.id} />}
              {w.verification_status === "pending_review" && (
                <p className="mt-5 text-sm text-cream-muted">Proof received {formatDate(w.proof_uploaded_at)}. We&apos;re reviewing it.</p>
              )}
              {w.payout_status === "paid" && <p className="mt-5 text-sm text-mint">Paid on {formatDate(w.paid_at)}. Enjoy it!</p>}
            </div>
          );
        })}
        {!winners.length && (
          <div className="card p-10 text-center">
            <p className="font-display text-2xl">No prizes yet</p>
            <p className="mt-2 text-cream-muted">Keep your 5 scores up to date. Every month is a new chance.</p>
          </div>
        )}
      </div>
    </>
  );
}
