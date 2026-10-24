import { ArrowRight, CalendarClock, HeartHandshake, PartyPopper, Ticket, Trophy } from "lucide-react";
import Link from "next/link";
import { addScore, deleteScore, updateScore } from "@/app/actions/scores";
import { PageHeader } from "@/components/app-shell";
import { NumberBall } from "@/components/number-ball";
import { ScoreManager } from "@/components/score-manager";
import { StatusBadge } from "@/components/ui/badges";
import { requireUser } from "@/lib/auth";
import { PLANS } from "@/lib/config";
import { splitFee } from "@/lib/draw-engine";
import { formatDate, formatMoney, formatPeriod, nextDrawDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Charity, Draw, Score, Winner } from "@/lib/types";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const session = await requireUser();
  const { welcome } = await searchParams;
  const supabase = await createClient();

  const [scoresRes, charityRes, paymentsRes, entriesRes, winnersRes, latestDrawRes] = await Promise.all([
    supabase.from("scores").select("*").eq("user_id", session.userId).order("played_on", { ascending: false }),
    session.profile.charity_id
      ? supabase.from("charities").select("*").eq("id", session.profile.charity_id).maybeSingle<Charity>()
      : Promise.resolve({ data: null }),
    supabase.from("payments").select("charity_cents").eq("user_id", session.userId),
    supabase.from("draw_entries").select("draw_id, numbers, match_count").eq("user_id", session.userId),
    supabase.from("winners").select("*").eq("user_id", session.userId),
    supabase.from("draws").select("*").eq("status", "published").order("period", { ascending: false }).limit(1).maybeSingle<Draw>(),
  ]);

  const scores = (scoresRes.data ?? []) as Score[];
  const charity = charityRes.data as Charity | null;
  const givenCents = (paymentsRes.data ?? []).reduce((s, p) => s + p.charity_cents, 0);
  const entries = entriesRes.data ?? [];
  const winners = (winnersRes.data ?? []) as Winner[];
  const latestDraw = latestDrawRes.data;
  const latestEntry = latestDraw ? entries.find((e) => e.draw_id === latestDraw.id) : null;

  const totalWon = winners.reduce((s, w) => s + Number(w.prize_cents), 0);
  const paid = winners.filter((w) => w.payout_status === "paid").reduce((s, w) => s + Number(w.prize_cents), 0);
  const needsProof = winners.filter((w) => w.verification_status === "awaiting_proof" || w.verification_status === "rejected");

  const sub = session.subscription;
  const plan = sub ? PLANS[sub.plan] : null;
  const perCharge = plan ? splitFee(plan.priceCents, session.profile.charity_percent).charity : 0;
  const eligible = session.isSubscriber && scores.length >= 5;
  const firstName = session.profile.full_name.split(" ")[0] || "there";

  return (
    <>
      <PageHeader title={`Hi, ${firstName}`} subtitle="Here's your game, your giving and your draws." />

      {welcome && session.isSubscriber && (
        <section className="mb-6 flex items-center gap-4 rounded-3xl bg-gradient-to-r from-mint/20 to-iris/10 p-5 ring-1 ring-mint/30">
          <PartyPopper className="h-8 w-8 shrink-0 text-mint" />
          <div>
            <p className="font-semibold">Welcome to the club!</p>
            <p className="text-sm text-cream-muted">Your membership is active. Log 5 scores below to enter this month&apos;s draw.</p>
          </div>
        </section>
      )}

      {needsProof.length > 0 && (
        <Link href="/dashboard/winnings" className="mb-6 flex items-center gap-4 rounded-3xl bg-gold/10 p-5 ring-1 ring-gold/30 transition hover:bg-gold/15">
          <Trophy className="h-7 w-7 shrink-0 text-gold" />
          <div className="flex-1">
            <p className="font-semibold">You&apos;ve won! Upload your proof to claim your prize.</p>
            <p className="text-sm text-cream-muted">We need a screenshot of your scores before paying out.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-gold" />
        </Link>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* ------------------------------------------------------- SCORES */}
        <section className="card p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Your last 5 rounds</h2>
            <span className="text-xs text-cream-dim">Stableford · newest first</span>
          </div>
          <ScoreManager
            scores={scores}
            locked={!session.isSubscriber}
            addAction={addScore}
            updateAction={updateScore}
            deleteAction={deleteScore}
          />
        </section>

        <div className="space-y-6">
          {/* ----------------------------------------------- SUBSCRIPTION */}
          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Membership</h2>
              <StatusBadge status={session.status} />
            </div>
            {sub && session.status !== "none" ? (
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-cream-muted">Plan</dt>
                  <dd>
                    {plan!.label} · {formatMoney(plan!.priceCents)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-cream-muted">
                    {session.isSubscriber ? (sub.cancel_at_period_end ? "Ends on" : "Renews on") : "Ended on"}
                  </dt>
                  <dd>{formatDate(sub.current_period_end)}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-cream-muted">You&apos;re not subscribed yet.</p>
            )}
            {session.isSubscriber ? (
              <Link href="/dashboard/settings#membership" className="btn-secondary mt-5 w-full">
                Manage membership
              </Link>
            ) : (
              <Link href="/checkout" className="btn-primary mt-5 w-full">
                {session.status === "none" ? "Subscribe now" : "Restart membership"}
              </Link>
            )}
          </section>

          {/* ---------------------------------------------------- CHARITY */}
          <section className="card p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mint/15 text-mint">
                <HeartHandshake className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-cream-dim">You play for</p>
                <p className="truncate font-semibold">{charity?.name ?? "No charity selected"}</p>
              </div>
              <p className="font-display text-2xl font-semibold text-mint">{session.profile.charity_percent}%</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center text-sm">
              <div className="rounded-2xl bg-ink/60 p-3">
                <p className="font-semibold">{formatMoney(givenCents)}</p>
                <p className="text-xs text-cream-dim">given so far</p>
              </div>
              <div className="rounded-2xl bg-ink/60 p-3">
                <p className="font-semibold">{plan ? formatMoney(perCharge) : "—"}</p>
                <p className="text-xs text-cream-dim">per {sub?.plan === "yearly" ? "year" : "month"}</p>
              </div>
            </div>
            <Link href="/dashboard/settings#charity" className="btn-ghost mt-3 w-full">
              Change charity or share
            </Link>
          </section>
        </div>

        {/* -------------------------------------------------- PARTICIPATION */}
        <section className="card p-6">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
            <Ticket className="h-5 w-5 text-iris" /> Draws
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-ink/60 p-4">
              <p className="font-display text-3xl font-semibold">{entries.length}</p>
              <p className="text-xs text-cream-dim">draws entered</p>
            </div>
            <div className="rounded-2xl bg-ink/60 p-4">
              <p className="flex items-center gap-1.5 font-semibold">
                <CalendarClock className="h-4 w-4 text-ember" /> {formatDate(nextDrawDate(), { day: "numeric", month: "short" })}
              </p>
              <p className="mt-1 text-xs text-cream-dim">next draw ({formatPeriod(nextDrawDate().toISOString().slice(0, 7))})</p>
            </div>
          </div>
          <p className={`mt-4 rounded-2xl px-4 py-3 text-sm ${eligible ? "bg-mint/10 text-mint" : "bg-white/5 text-cream-muted"}`}>
            {eligible
              ? "You're entered in the next draw with your current 5 scores."
              : !session.isSubscriber
                ? "Subscribe to be entered in upcoming draws."
                : `Log ${5 - scores.length} more score${5 - scores.length === 1 ? "" : "s"} to be entered.`}
          </p>
          {latestDraw && (
            <div className="mt-5 border-t border-white/[0.06] pt-5">
              <p className="text-sm text-cream-muted">Latest result · {formatPeriod(latestDraw.period)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(latestDraw.winning_numbers ?? []).map((n, i) => (
                  <NumberBall key={i} n={n} index={i} size="sm" matched={latestEntry ? latestEntry.numbers.includes(n) : undefined} />
                ))}
              </div>
              <p className="mt-2 text-xs text-cream-dim">
                {latestEntry ? `You matched ${latestEntry.match_count} number${latestEntry.match_count === 1 ? "" : "s"}.` : "You weren't entered in this draw."}
              </p>
            </div>
          )}
        </section>

        {/* ------------------------------------------------------ WINNINGS */}
        <section className="card p-6">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
            <Trophy className="h-5 w-5 text-gold" /> Winnings
          </h2>
          <p className="mt-4 font-display text-4xl font-semibold text-gold">{formatMoney(totalWon)}</p>
          <p className="text-sm text-cream-dim">
            total won · {formatMoney(paid)} paid · {formatMoney(totalWon - paid)} pending
          </p>
          <ul className="mt-4 space-y-2">
            {winners.slice(0, 3).map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 rounded-2xl bg-ink/60 px-4 py-3 text-sm">
                <span>
                  {w.tier}-match · {formatMoney(w.prize_cents)}
                </span>
                <StatusBadge status={w.payout_status === "paid" ? "paid" : w.verification_status} />
              </li>
            ))}
          </ul>
          {!winners.length && <p className="mt-3 text-sm text-cream-muted">No wins yet. Your first could be this month.</p>}
          <Link href="/dashboard/winnings" className="btn-ghost mt-3 w-full">
            View all winnings
          </Link>
        </section>
      </div>
    </>
  );
}
