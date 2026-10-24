import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDeleteScore, adminSaveScore } from "@/app/actions/admin-users";
import { PageHeader } from "@/components/app-shell";
import { ScoreManager } from "@/components/score-manager";
import { StatusBadge } from "@/components/ui/badges";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatMoney, formatPeriod } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { effectiveStatus } from "@/lib/subscription";
import type { Charity, Payment, Profile, Score, Subscription } from "@/lib/types";
import { ProfileEditor, SubscriptionControls } from "./forms";

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const db = createAdminClient();

  const [{ data: profile }, { data: sub }, { data: scores }, { data: charities }, { data: payments }, { data: winners }] = await Promise.all([
    db.from("profiles").select("*").eq("id", id).maybeSingle<Profile>(),
    db.from("subscriptions").select("*").eq("user_id", id).maybeSingle<Subscription>(),
    db.from("scores").select("*").eq("user_id", id).order("played_on", { ascending: false }),
    db.from("charities").select("id, name").order("name"),
    db.from("payments").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(12),
    db.from("winners").select("id, tier, prize_cents, verification_status, payout_status, draw:draws(period)").eq("user_id", id),
  ]);
  if (!profile) notFound();
  const status = effectiveStatus(sub);

  return (
    <>
      <Link href="/admin/users" className="btn-ghost -ml-3 mb-4">
        <ArrowLeft className="h-4 w-4" /> Users
      </Link>
      <PageHeader title={profile.full_name || profile.email} subtitle={`${profile.email} · joined ${formatDate(profile.created_at)}`} actions={<StatusBadge status={status} />} />

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-display text-xl font-semibold">Profile</h2>
          <ProfileEditor profile={profile} charities={(charities ?? []) as Pick<Charity, "id" | "name">[]} />
        </section>

        <section className="card p-6">
          <h2 className="font-display text-xl font-semibold">Subscription</h2>
          {sub ? (
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-cream-dim">Plan</dt>
                <dd className="capitalize">{sub.plan}</dd>
              </div>
              <div>
                <dt className="text-cream-dim">Source</dt>
                <dd>{sub.provider === "admin" ? "Complimentary (admin)" : "Paid"}</dd>
              </div>
              <div>
                <dt className="text-cream-dim">Period</dt>
                <dd>
                  {formatDate(sub.current_period_start)} → {formatDate(sub.current_period_end)}
                </dd>
              </div>
              <div>
                <dt className="text-cream-dim">Auto-renew</dt>
                <dd>{sub.cancel_at_period_end ? "Off (cancels at period end)" : "On"}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-cream-muted">No subscription on record.</p>
          )}
          <SubscriptionControls userId={id} hasSub={!!sub} active={status === "active"} cancelAtEnd={!!sub?.cancel_at_period_end} />
        </section>

        <section className="card p-6">
          <h2 className="mb-5 font-display text-xl font-semibold">Golf scores</h2>
          <ScoreManager
            scores={(scores ?? []) as Score[]}
            addAction={adminSaveScore}
            updateAction={adminSaveScore}
            deleteAction={adminDeleteScore.bind(null, id)}
            hiddenFields={{ user_id: id }}
          />
        </section>

        <section className="card space-y-6 p-6">
          <div>
            <h2 className="font-display text-xl font-semibold">Winnings</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {(winners ?? []).map((w) => (
                <li key={w.id} className="flex items-center justify-between rounded-xl bg-ink/60 px-3 py-2">
                  <span>
                    {formatPeriod((w.draw as unknown as { period: string }).period)} · {w.tier}-match · {formatMoney(w.prize_cents)}
                  </span>
                  <StatusBadge status={w.payout_status === "paid" ? "paid" : w.verification_status} />
                </li>
              ))}
              {!winners?.length && <li className="text-cream-dim">No winnings.</li>}
            </ul>
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">Payments</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {((payments ?? []) as Payment[]).map((p) => (
                <li key={p.id} className="flex justify-between text-cream-muted">
                  <span>
                    {formatDate(p.created_at)} · <span className="capitalize">{p.plan}</span> {p.kind}
                  </span>
                  <span>
                    {formatMoney(p.amount_cents)} <span className="text-mint">({formatMoney(p.charity_cents)} charity)</span>
                  </span>
                </li>
              ))}
              {!payments?.length && <li className="text-cream-dim">No payments.</li>}
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}
