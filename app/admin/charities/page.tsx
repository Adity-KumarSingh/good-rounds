import { Plus, Star } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { CharityArt } from "@/components/charity-card";
import { Badge } from "@/components/ui/badges";
import { requireAdmin } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { getCharityTotals } from "@/lib/stats";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Charity } from "@/lib/types";

export default async function AdminCharitiesPage() {
  await requireAdmin();
  const [{ data }, totals] = await Promise.all([createAdminClient().from("charities").select("*").order("name"), getCharityTotals()]);
  const charities = (data ?? []) as Charity[];
  const totalOf = new Map(totals.map((t) => [t.charity_id, t]));

  return (
    <>
      <PageHeader
        title="Charities"
        subtitle="Manage listings, media and events."
        actions={
          <Link href="/admin/charities/new" className="btn-primary">
            <Plus className="h-4 w-4" /> Add charity
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {charities.map((c) => {
          const t = totalOf.get(c.id);
          return (
            <Link key={c.id} href={`/admin/charities/${c.id}`} className="card group overflow-hidden transition hover:border-white/20">
              <div className="h-28 overflow-hidden">
                <CharityArt charity={c} className="transition group-hover:scale-105" />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{c.name}</p>
                  {c.featured && <Star className="h-4 w-4 fill-gold text-gold" aria-label="Featured" />}
                </div>
                <p className="mt-1 text-xs text-cream-dim">
                  {c.category} · /{c.slug}
                </p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-mint">{formatMoney(t?.total_cents ?? 0)} raised</span>
                  {c.active ? <Badge tone="mint">Live</Badge> : <Badge>Hidden</Badge>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
