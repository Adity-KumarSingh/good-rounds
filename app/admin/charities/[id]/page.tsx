import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCharity, deleteCharityEvent } from "@/app/actions/admin-charities";
import { PageHeader } from "@/components/app-shell";
import { CharityArt } from "@/components/charity-card";
import { ActionButton } from "@/components/ui/action-button";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Charity, CharityEvent } from "@/lib/types";
import { CharityForm, EventForm } from "../charity-form";

export default async function EditCharityPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const db = createAdminClient();
  const [{ data: charity }, { data: events }, { count: supporters }] = await Promise.all([
    db.from("charities").select("*").eq("id", id).maybeSingle<Charity>(),
    db.from("charity_events").select("*").eq("charity_id", id).order("event_date"),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("charity_id", id),
  ]);
  if (!charity) notFound();

  return (
    <>
      <Link href="/admin/charities" className="btn-ghost -ml-3 mb-4">
        <ArrowLeft className="h-4 w-4" /> Charities
      </Link>
      <PageHeader
        title={charity.name}
        subtitle={`${supporters ?? 0} members support this charity`}
        actions={
          <>
            {charity.active && (
              <Link href={`/charities/${charity.slug}`} target="_blank" className="btn-secondary">
                <ExternalLink className="h-4 w-4" /> View
              </Link>
            )}
            <ActionButton
              action={deleteCharity.bind(null, charity.id)}
              className="btn-danger"
              confirm={`Delete ${charity.name}? ${supporters ?? 0} supporters will be asked to choose a new charity. Consider hiding it instead.`}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </ActionButton>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="card p-6">
          <CharityForm charity={charity} />
        </div>
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <div className="h-40">
              <CharityArt charity={charity} />
            </div>
          </div>
          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold">Events</h2>
            <ul className="mt-4 space-y-2">
              {((events ?? []) as CharityEvent[]).map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 rounded-xl bg-ink/60 px-3 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className="text-xs text-cream-dim">
                      {formatDate(e.event_date)}
                      {e.location && ` · ${e.location}`}
                    </p>
                  </div>
                  <ActionButton action={deleteCharityEvent.bind(null, e.id, charity.id)} className="btn-ghost px-2 text-red-300" showMessage={false}>
                    <Trash2 className="h-4 w-4" />
                  </ActionButton>
                </li>
              ))}
              {!events?.length && <li className="text-sm text-cream-dim">No events yet.</li>}
            </ul>
            <div className="mt-5 border-t border-white/[0.06] pt-5">
              <EventForm charityId={charity.id} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
