import { ArrowLeft, FlaskConical, Megaphone, Repeat, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteDraw, publishDraw, simulateDraw } from "@/app/actions/admin-draws";
import { PageHeader, StatCard } from "@/components/app-shell";
import { NumberBall } from "@/components/number-ball";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/badges";
import { requireAdmin } from "@/lib/auth";
import { TIER_SHARES } from "@/lib/config";
import { formatDate, formatMoney, formatPeriod } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Draw } from "@/lib/types";
import { DrawConfigForm } from "./config-form";

export default async function AdminDrawPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { data: draw } = await createAdminClient().from("draws").select("*").eq("id", id).maybeSingle<Draw>();
  if (!draw) notFound();

  const sim = draw.simulation;
  const published = draw.status === "published";
  const winnerIds = sim ? new Set([...sim.tiers[5].winners, ...sim.tiers[4].winners, ...sim.tiers[3].winners]) : new Set<string>();

  return (
    <>
      <Link href="/admin/draws" className="btn-ghost -ml-3 mb-4">
        <ArrowLeft className="h-4 w-4" /> Draws
      </Link>
      <PageHeader
        title={`${formatPeriod(draw.period)} draw`}
        subtitle={
          published
            ? `Published ${formatDate(draw.published_at)}`
            : sim
              ? `Simulated ${formatDate(draw.simulated_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}. Not visible to members yet.`
              : "Draft. Run a simulation to preview results."
        }
        actions={<StatusBadge status={draw.status} />}
      />

      {!published && (
        <div className="mb-6 grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold">Configuration</h2>
            <DrawConfigForm id={draw.id} logic={draw.logic} bias={draw.algo_bias} />
          </div>
          <div className="card flex flex-col justify-between gap-6 p-6">
            <div>
              <h2 className="font-display text-lg font-semibold">Run &amp; publish</h2>
              <p className="mt-1 text-sm text-cream-muted">
                Simulations use live subscriber and score data and can be re-run any number of times. Publishing saves the
                current simulation exactly as shown, creates winner records and makes the results public. This cannot be undone.
              </p>
            </div>
            <div className="flex flex-wrap items-start gap-3">
              <ActionButton action={simulateDraw.bind(null, draw.id)} className="btn-secondary">
                <FlaskConical className="h-4 w-4" /> {sim ? "Re-run simulation" : "Run simulation"}
              </ActionButton>
              {sim && (
                <ActionButton
                  action={publishDraw.bind(null, draw.id)}
                  className="btn-primary"
                  confirm={`Publish ${formatPeriod(draw.period)} results? Winners will be notified on their dashboards. This cannot be undone.`}
                >
                  <Megaphone className="h-4 w-4" /> Publish results
                </ActionButton>
              )}
              <ActionButton action={deleteDraw.bind(null, draw.id)} className="btn-ghost text-red-300" confirm="Delete this draft draw?">
                <Trash2 className="h-4 w-4" /> Delete
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {sim && (
        <>
          <div className="card mb-6 p-6 sm:p-8">
            <p className="eyebrow">{published ? "Winning numbers" : "Simulated numbers"}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {sim.winningNumbers.map((n, i) => (
                <NumberBall key={`${draw.simulated_at}-${n}`} n={n} index={i} size="lg" />
              ))}
            </div>
            <p className="mt-4 text-sm capitalize text-cream-muted">
              {sim.logic} draw{sim.logic === "algorithmic" && ` · ${sim.bias} weighting`}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active subscribers" value={sim.pool.activeSubscribers} hint="fund this month's pool" />
            <StatCard
              label="Entries"
              value={sim.entries.length}
              hint={`${sim.ineligible.notEnoughScores} subscribers had < 5 scores`}
            />
            <StatCard
              label="Prize pool"
              value={formatMoney(sim.pool.totalCents)}
              hint={`${formatMoney(sim.pool.contributionCents)} new + ${formatMoney(sim.pool.rolloverInCents)} rollover`}
              accent="text-gold"
            />
            <StatCard
              label="Jackpot carried forward"
              value={formatMoney(sim.rolloverOutCents)}
              hint={sim.unallocatedCents ? `${formatMoney(sim.unallocatedCents)} unallocated (no rollover for 3/4)` : undefined}
              accent={sim.rolloverOutCents ? "text-mint" : ""}
            />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {(["5", "4", "3"] as const).map((t) => {
              const tier = sim.tiers[t];
              return (
                <div key={t} className="card p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{t}-number match</p>
                    <span className="text-xs text-cream-dim">{TIER_SHARES[Number(t) as 3 | 4 | 5]}% share</span>
                  </div>
                  <p className="mt-2 font-display text-2xl font-semibold">{formatMoney(tier.poolCents)}</p>
                  <p className="text-sm text-cream-muted">
                    {tier.winners.length
                      ? `${tier.winners.length} winner${tier.winners.length > 1 ? "s" : ""} · ${formatMoney(tier.prizeEachCents)} each`
                      : t === "5"
                        ? (
                            <span className="flex items-center gap-1 text-mint">
                              <Repeat className="h-3.5 w-3.5" /> No winner. Rolls over.
                            </span>
                          )
                        : "No winners"}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="card mt-6 overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Entrant</th>
                  <th>Numbers (latest 5 scores)</th>
                  <th className="text-right">Matches</th>
                  <th className="text-right">Prize</th>
                </tr>
              </thead>
              <tbody>
                {sim.entries.map((e) => {
                  const win = new Set(sim.winningNumbers);
                  const tier = e.matchCount >= 3 ? sim.tiers[String(e.matchCount) as "3" | "4" | "5"] : null;
                  return (
                    <tr key={e.userId} className={winnerIds.has(e.userId) ? "bg-gold/[0.04]" : ""}>
                      <td>
                        <Link href={`/admin/users/${e.userId}`} className="hover:text-ember">
                          {e.name}
                        </Link>
                      </td>
                      <td className="font-mono">
                        {e.numbers.map((n, i) => (
                          <span key={i} className={`mr-2 ${win.has(n) ? "font-bold text-mint" : "text-cream-muted"}`}>
                            {n}
                          </span>
                        ))}
                      </td>
                      <td className="text-right">{e.matchCount}</td>
                      <td className="text-right">{tier ? formatMoney(tier.prizeEachCents) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!sim.entries.length && (
              <p className="py-8 text-center text-sm text-cream-dim">No eligible entries (active subscribers with 5 scores).</p>
            )}
          </div>
        </>
      )}
    </>
  );
}
