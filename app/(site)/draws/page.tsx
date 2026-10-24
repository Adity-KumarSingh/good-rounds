import { Repeat, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NumberBall } from "@/components/number-ball";
import { Reveal } from "@/components/ui/motion";
import { getSession } from "@/lib/auth";
import { formatDate, formatMoney, formatPeriod, nextDrawDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Draw } from "@/lib/types";

export const metadata: Metadata = { title: "Draw results" };

export default async function DrawsPage() {
  const supabase = await createClient();
  const session = await getSession();
  const { data } = await supabase.from("draws").select("*").eq("status", "published").order("period", { ascending: false }).limit(24);
  const draws = (data ?? []) as Draw[];

  // Highlight the signed-in member's numbers on each draw they entered.
  const myNumbers = new Map<string, number[]>();
  if (session) {
    const { data: entries } = await supabase.from("draw_entries").select("draw_id, numbers").eq("user_id", session.userId);
    for (const e of entries ?? []) myNumbers.set(e.draw_id, e.numbers);
  }

  return (
    <div className="container-page py-16 sm:py-20">
      <Reveal className="max-w-2xl">
        <p className="eyebrow">Monthly draws</p>
        <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight">Results</h1>
        <p className="mt-4 text-lg text-cream-muted">
          Next draw: <span className="text-cream">{formatDate(nextDrawDate(), { day: "numeric", month: "long", year: "numeric" })}</span>.
          Active members with 5 scores logged are entered automatically.
        </p>
      </Reveal>

      <div className="mt-12 space-y-5">
        {draws.map((d, i) => {
          const mine = myNumbers.get(d.id);
          const mySet = new Set(mine ?? []);
          return (
            <Reveal key={d.id} delay={Math.min(i, 4) * 0.05} className="card p-6 sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm text-cream-dim">Published {formatDate(d.published_at)}</p>
                  <h2 className="font-display text-3xl font-semibold">{formatPeriod(d.period)}</h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(d.winning_numbers ?? []).map((n, j) => (
                      <NumberBall key={j} n={n} index={j} matched={mine ? mySet.has(n) : undefined} />
                    ))}
                  </div>
                  {mine && (
                    <p className="mt-3 text-sm text-cream-muted">
                      Your numbers: <span className="font-mono text-cream">{mine.join(" · ")}</span>
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3 text-center lg:min-w-[380px]">
                  {([5, 4, 3] as const).map((t) => {
                    const winners = d[`winners${t}`];
                    const pool = d[`tier${t}_cents`];
                    return (
                      <div key={t} className="rounded-2xl bg-ink/60 p-3">
                        <p className="text-xs text-cream-dim">{t} match</p>
                        <p className="font-display text-xl font-semibold">{winners}</p>
                        <p className="text-xs text-cream-dim">{winners ? `${formatMoney(Math.floor(pool / winners))} each` : t === 5 ? "Rolled over" : "No winners"}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/[0.06] pt-4 text-sm text-cream-muted">
                <span className="flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-gold" /> Pool {formatMoney(d.pool_total_cents)}
                </span>
                <span>{d.entries_count} entries</span>
                {d.rollover_out_cents > 0 && (
                  <span className="flex items-center gap-1.5 text-mint">
                    <Repeat className="h-4 w-4" /> {formatMoney(d.rollover_out_cents)} jackpot carried forward
                  </span>
                )}
              </div>
            </Reveal>
          );
        })}
        {!draws.length && (
          <div className="card p-10 text-center">
            <p className="font-display text-2xl">The first draw is coming soon.</p>
            <p className="mt-2 text-cream-muted">Join now and log your scores to be in it.</p>
            <Link href="/signup" className="btn-primary mt-6">
              Join the draw
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
