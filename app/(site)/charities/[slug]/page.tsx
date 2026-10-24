import { ArrowLeft, CalendarDays, ExternalLink, Heart, MapPin, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CharityArt } from "@/components/charity-card";
import { Reveal } from "@/components/ui/motion";
import { getSession } from "@/lib/auth";
import { formatDate, formatMoney, todayISO } from "@/lib/format";
import { getCharityTotals } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";
import type { Charity, CharityEvent } from "@/lib/types";
import { DonateForm } from "./donate-form";

type Props = { params: Promise<{ slug: string }> };

async function getCharity(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("charities").select("*").eq("slug", slug).eq("active", true).maybeSingle<Charity>();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const charity = await getCharity((await params).slug);
  return { title: charity?.name ?? "Charity", description: charity?.tagline };
}

export default async function CharityPage({ params }: Props) {
  const charity = await getCharity((await params).slug);
  if (!charity) notFound();

  const supabase = await createClient();
  const [{ data: events }, totals, session] = await Promise.all([
    supabase.from("charity_events").select("*").eq("charity_id", charity.id).gte("event_date", todayISO()).order("event_date"),
    getCharityTotals().catch(() => []),
    getSession(),
  ]);
  const total = totals.find((t) => t.charity_id === charity.id);
  const isMine = session?.profile.charity_id === charity.id;

  return (
    <div className="container-page py-10 sm:py-14">
      <Link href="/charities" className="btn-ghost -ml-3 mb-6">
        <ArrowLeft className="h-4 w-4" /> All charities
      </Link>

      <Reveal className="overflow-hidden rounded-4xl border border-white/[0.07]">
        <div className="h-56 sm:h-80">
          <CharityArt charity={charity} />
        </div>
      </Reveal>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <Reveal>
            <div className="flex flex-wrap items-center gap-3 text-sm text-cream-dim">
              <span className="rounded-full bg-white/5 px-3 py-1 text-cream-muted">{charity.category}</span>
              {charity.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {charity.location}
                </span>
              )}
              {charity.website && (
                <a href={charity.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-cream">
                  <ExternalLink className="h-4 w-4" /> Website
                </a>
              )}
            </div>
            <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{charity.name}</h1>
            <p className="mt-3 text-xl text-cream">{charity.tagline}</p>
            <p className="mt-6 whitespace-pre-line leading-relaxed text-cream-muted">{charity.description}</p>
          </Reveal>

          <Reveal delay={0.1} className="mt-12">
            <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
              <CalendarDays className="h-5 w-5 text-ember" /> Upcoming events
            </h2>
            {events?.length ? (
              <ul className="mt-5 space-y-3">
                {(events as CharityEvent[]).map((e) => (
                  <li key={e.id} className="card flex gap-5 p-5">
                    <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-ember/10 text-ember">
                      <span className="text-xs font-semibold uppercase">{formatDate(e.event_date, { month: "short" })}</span>
                      <span className="font-display text-2xl font-semibold leading-none">{formatDate(e.event_date, { day: "numeric" })}</span>
                    </div>
                    <div>
                      <p className="font-semibold">{e.title}</p>
                      {e.location && <p className="text-sm text-cream-dim">{e.location}</p>}
                      {e.description && <p className="mt-1 text-sm text-cream-muted">{e.description}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-cream-muted">No upcoming events right now. Check back soon.</p>
            )}
          </Reveal>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="card grid grid-cols-2 divide-x divide-white/10 p-6 text-center">
            <div>
              <p className="font-display text-3xl font-semibold text-mint">{formatMoney(total?.total_cents ?? 0, { round: true })}</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-xs text-cream-dim">
                <Heart className="h-3 w-3" /> raised here
              </p>
            </div>
            <div>
              <p className="font-display text-3xl font-semibold">{total?.supporters ?? 0}</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-xs text-cream-dim">
                <Users className="h-3 w-3" /> members backing
              </p>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-display text-xl font-semibold">Play for {charity.name}</h2>
            <p className="mt-2 text-sm text-cream-muted">
              {isMine
                ? "This is your chosen charity. Thank you for backing them."
                : "Subscribe and choose this charity. At least 10% of every payment goes to them."}
            </p>
            {isMine ? (
              <Link href="/dashboard/settings" className="btn-secondary mt-5 w-full">
                Adjust my contribution
              </Link>
            ) : session ? (
              <Link href="/dashboard/settings" className="btn-primary mt-5 w-full">
                Make this my charity
              </Link>
            ) : (
              <Link href={`/signup?charity=${charity.id}`} className="btn-primary mt-5 w-full">
                Join &amp; support them
              </Link>
            )}
          </div>

          <DonateForm charityId={charity.id} charityName={charity.name} signedIn={!!session} />
        </aside>
      </div>
    </div>
  );
}
