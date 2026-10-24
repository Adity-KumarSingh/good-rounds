import type { Metadata } from "next";
import Link from "next/link";
import { cancelSubscription, resumeSubscription } from "@/app/actions/subscription";
import { PageHeader } from "@/components/app-shell";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/badges";
import { requireUser } from "@/lib/auth";
import { PLANS } from "@/lib/config";
import { formatDate, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Charity, Payment } from "@/lib/types";
import { CharityForm, ProfileForm } from "./forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requireUser();
  const supabase = await createClient();
  const [{ data: charities }, { data: payments }] = await Promise.all([
    supabase.from("charities").select("id, name, category").eq("active", true).order("name"),
    supabase.from("payments").select("*").eq("user_id", session.userId).order("created_at", { ascending: false }).limit(24),
  ]);
  const sub = session.subscription;

  return (
    <>
      <PageHeader title="Settings" subtitle="Your profile, your cause and your membership." />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-display text-xl font-semibold">Profile</h2>
          <ProfileForm fullName={session.profile.full_name} email={session.email} />
        </section>

        <section id="charity" className="card scroll-mt-24 p-6">
          <h2 className="font-display text-xl font-semibold">Your charity</h2>
          <p className="mt-1 text-sm text-cream-muted">Changes apply from your next payment.</p>
          <CharityForm
            charities={(charities ?? []) as Pick<Charity, "id" | "name" | "category">[]}
            charityId={session.profile.charity_id}
            percent={session.profile.charity_percent}
            plan={sub?.plan ?? "monthly"}
          />
        </section>

        <section id="membership" className="card scroll-mt-24 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Membership</h2>
            <StatusBadge status={session.status} />
          </div>
          {sub && session.isSubscriber ? (
            <>
              <p className="mt-3 text-sm text-cream-muted">
                {PLANS[sub.plan].label} plan · {formatMoney(sub.amount_cents)}.{" "}
                {sub.cancel_at_period_end
                  ? `Cancelled. Your access continues until ${formatDate(sub.current_period_end)}.`
                  : `Renews automatically on ${formatDate(sub.current_period_end)}.`}
              </p>
              <div className="mt-5">
                {sub.cancel_at_period_end ? (
                  <ActionButton action={resumeSubscription} className="btn-primary">
                    Resume membership
                  </ActionButton>
                ) : (
                  <ActionButton
                    action={cancelSubscription}
                    className="btn-danger"
                    confirm="Cancel your membership? You'll keep access and stay in draws until the end of this period."
                  >
                    Cancel membership
                  </ActionButton>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-cream-muted">
                {session.status === "none"
                  ? "You don't have a membership yet."
                  : `Your membership ${session.status === "lapsed" ? "lapsed" : "ended"} on ${formatDate(sub?.current_period_end)}.`}
              </p>
              <Link href="/checkout" className="btn-primary mt-5">
                {session.status === "none" ? "Subscribe" : "Restart membership"}
              </Link>
            </>
          )}
        </section>

        <section className="card p-6">
          <h2 className="font-display text-xl font-semibold">Payment history</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Plan</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">To charity</th>
                </tr>
              </thead>
              <tbody>
                {((payments ?? []) as Payment[]).map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.created_at)}</td>
                    <td className="capitalize">
                      {p.plan} {p.kind === "renewal" && <span className="text-cream-dim">(renewal)</span>}
                    </td>
                    <td className="text-right">{formatMoney(p.amount_cents)}</td>
                    <td className="text-right text-mint">{formatMoney(p.charity_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!payments?.length && <p className="py-6 text-center text-sm text-cream-dim">No payments yet.</p>}
          </div>
        </section>
      </div>
    </>
  );
}
