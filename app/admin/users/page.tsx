import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { Badge, StatusBadge } from "@/components/ui/badges";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { effectiveStatus } from "@/lib/subscription";
import type { Profile, Subscription } from "@/lib/types";

const PAGE_SIZE = 25;

type Row = Profile & { subscription: Subscription | null; charity: { name: string } | null };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdmin();
  const { q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const db = createAdminClient();

  let query = db
    .from("profiles")
    .select("*, subscription:subscriptions(*), charity:charities(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1);
  const term = q.trim().replace(/[%,()]/g, "");
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  const { data, count } = await query;
  const users = (data ?? []) as Row[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Users" subtitle={`${count ?? 0} accounts`} />
      <form className="mb-5 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search name or email" className="input max-w-sm" />
        <button className="btn-secondary">Search</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>User</th>
              <th>Subscription</th>
              <th>Plan</th>
              <th>Charity</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-white/[0.02]">
                <td>
                  <Link href={`/admin/users/${u.id}`} className="block hover:text-ember">
                    <span className="font-medium">{u.full_name || "—"}</span>
                    {u.role === "admin" && <Badge tone="iris" className="ml-2">Admin</Badge>}
                    <span className="block text-xs text-cream-dim">{u.email}</span>
                  </Link>
                </td>
                <td>
                  <StatusBadge status={effectiveStatus(u.subscription)} />
                </td>
                <td className="capitalize text-cream-muted">{u.subscription?.plan ?? "—"}</td>
                <td className="text-cream-muted">
                  {u.charity?.name ?? "—"} <span className="text-cream-dim">({u.charity_percent}%)</span>
                </td>
                <td className="text-cream-muted">{formatDate(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && <p className="py-10 text-center text-sm text-cream-dim">No users found.</p>}
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          {pageNum > 1 && (
            <Link className="btn-ghost" href={`?q=${encodeURIComponent(q)}&page=${pageNum - 1}`}>
              ← Previous
            </Link>
          )}
          <span className="text-cream-dim">
            Page {pageNum} of {pages}
          </span>
          {pageNum < pages && (
            <Link className="btn-ghost" href={`?q=${encodeURIComponent(q)}&page=${pageNum + 1}`}>
              Next →
            </Link>
          )}
        </div>
      )}
    </>
  );
}
