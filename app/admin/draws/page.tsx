import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { StatusBadge } from "@/components/ui/badges";
import { requireAdmin } from "@/lib/auth";
import { currentPeriod, formatDate, formatMoney, formatPeriod } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Draw } from "@/lib/types";
import { CreateDrawForm } from "./create-form";

export default async function AdminDrawsPage() {
  await requireAdmin();
  const { data } = await createAdminClient().from("draws").select("*").order("period", { ascending: false });
  const draws = (data ?? []) as Draw[];
  const hasCurrent = draws.some((d) => d.period === currentPeriod());

  return (
    <>
      <PageHeader title="Draws" subtitle="Create a monthly draw, simulate it as often as you like, then publish." />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Month</th>
                <th>Status</th>
                <th>Logic</th>
                <th className="text-right">Pool</th>
                <th className="text-right">Winners</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {draws.map((d) => (
                <tr key={d.id} className="hover:bg-white/[0.02]">
                  <td>
                    <Link href={`/admin/draws/${d.id}`} className="font-medium hover:text-ember">
                      {formatPeriod(d.period)}
                    </Link>
                  </td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="capitalize text-cream-muted">
                    {d.logic}
                    {d.logic === "algorithmic" && ` (${d.algo_bias})`}
                  </td>
                  <td className="text-right">
                    {formatMoney(d.status === "published" ? d.pool_total_cents : (d.simulation?.pool.totalCents ?? 0))}
                  </td>
                  <td className="text-right">
                    {d.status === "published"
                      ? d.winners5 + d.winners4 + d.winners3
                      : d.simulation
                        ? d.simulation.tiers[5].winners.length + d.simulation.tiers[4].winners.length + d.simulation.tiers[3].winners.length
                        : "—"}
                  </td>
                  <td className="text-cream-muted">{formatDate(d.published_at ?? d.simulated_at ?? d.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!draws.length && <p className="py-10 text-center text-sm text-cream-dim">No draws yet. Create the first one.</p>}
        </div>
        <div className="card h-fit p-6">
          <h2 className="font-display text-xl font-semibold">New draw</h2>
          <CreateDrawForm defaultPeriod={currentPeriod()} hasCurrent={hasCurrent} />
        </div>
      </div>
    </>
  );
}
