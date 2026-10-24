import Link from "next/link";
import { PageHeader, StatCard } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { currentPoolEstimate } from "@/lib/draws";
import { currentPeriod, formatMoney, formatPeriod } from "@/lib/format";
import { getCharityTotals, getPlatformStats } from "@/lib/stats";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Draw } from "@/lib/types";

export default async function AdminReportsPage() {
  await requireAdmin();
  const db = createAdminClient();
  const [stats, charities, pool, { data: draws }] = await Promise.all([
    getPlatformStats(),
    getCharityTotals(),
    currentPoolEstimate(db, currentPeriod()),
    db.from("draws").select("*").eq("status", "published").order("period", { ascending: false }).limit(6),
  ]);
  const charityTotal = stats.charity_subscription_cents + stats.donations_cents;
  const maxCharity = Math.max(1, ...charities.map((c) => c.total_cents));

  return (
    <>
      <PageHeader title="Reports & analytics" subtitle={`Live figures · ${formatPeriod(currentPeriod())}`} />

      {(stats.pending_reviews > 0 || stats.pending_payouts > 0) && (
        <Link href="/admin/winners" className="mb-6 flex items-center justify-between rounded-2xl bg-iris/10 px-5 py-4 text-sm ring-1 ring-iris/30 hover:bg-iris/15">
          <span>
            <strong>{stats.pending_reviews}</strong> proof{stats.pending_reviews === 1 ? "" : "s"} to review ·{" "}
            <strong>{stats.pending_payouts}</strong> payout{stats.pending_payouts === 1 ? "" : "s"} to complete
          </span>
          <span className="text-iris-soft">Open winners →</span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={stats.total_users} hint={`${stats.lapsed_or_cancelled} lapsed or cancelled`} />
        <StatCard
          label="Active subscribers"
          value={stats.active_subscribers}
          hint={`${stats.monthly_subscribers} monthly · ${stats.yearly_subscribers} yearly`}
          accent="text-mint"
        />
        <StatCard
          label="Current prize pool"
          value={formatMoney(pool.totalCents)}
          hint={`${formatMoney(pool.contributionCents)} new + ${formatMoney(pool.rolloverInCents)} rollover`}
          accent="text-gold"
        />
        <StatCard
          label="Charity contributions"
          value={formatMoney(charityTotal)}
          hint={`${formatMoney(stats.charity_subscription_cents)} subs · ${formatMoney(stats.donations_cents)} donations`}
          accent="text-mint"
        />
        <StatCard label="Revenue (all time)" value={formatMoney(stats.revenue_cents)} />
        <StatCard label="Prizes awarded" value={formatMoney(stats.prizes_awarded_cents)} hint={`${stats.total_winners} winners`} />
        <StatCard label="Prizes paid" value={formatMoney(stats.prizes_paid_cents)} />
        <StatCard label="Draws published" value={stats.draws_published} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-display text-xl font-semibold">Charity contribution totals</h2>
          <ul className="mt-5 space-y-4">
            {charities.map((c) => (
              <li key={c.charity_id}>
                <div className="flex justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="text-cream-muted">
                    {formatMoney(c.total_cents)} · {c.supporters} supporters
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-mint to-gold" style={{ width: `${(c.total_cents / maxCharity) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-xl font-semibold">Draw statistics</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="text-right">Entries</th>
                  <th className="text-right">Pool</th>
                  <th className="text-right">5 / 4 / 3</th>
                  <th className="text-right">Rollover</th>
                </tr>
              </thead>
              <tbody>
                {((draws ?? []) as Draw[]).map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link href={`/admin/draws/${d.id}`} className="hover:text-ember">
                        {formatPeriod(d.period)}
                      </Link>
                    </td>
                    <td className="text-right">{d.entries_count}</td>
                    <td className="text-right">{formatMoney(d.pool_total_cents)}</td>
                    <td className="text-right">
                      {d.winners5} / {d.winners4} / {d.winners3}
                    </td>
                    <td className="text-right">{d.rollover_out_cents ? formatMoney(d.rollover_out_cents) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!draws?.length && <p className="py-6 text-center text-sm text-cream-dim">No published draws yet.</p>}
          </div>
        </section>
      </div>
    </>
  );
}
