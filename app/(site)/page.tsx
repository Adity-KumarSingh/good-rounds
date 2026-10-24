import { ArrowRight, CalendarDays, HandHeart, PenLine, Repeat, Trophy } from "lucide-react";
import Link from "next/link";
import { CharityArt } from "@/components/charity-card";
import { HeroVisual } from "@/components/home/hero-visual";
import { NumberBall } from "@/components/number-ball";
import { CountUp, MoneyCountUp, Reveal } from "@/components/ui/motion";
import { CHARITY_MIN_PERCENT, PLANS, PRIZE_POOL_PERCENT, TIER_SHARES } from "@/lib/config";
import { currentPoolEstimate } from "@/lib/draws";
import { currentPeriod, formatDate, formatMoney, formatPeriod, nextDrawDate } from "@/lib/format";
import { getPlatformStats } from "@/lib/stats";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Charity, Draw } from "@/lib/types";

async function loadHome() {
  const db = createAdminClient();
  try {
    const [stats, pool, featured, latest, charityCount] = await Promise.all([
      getPlatformStats(),
      currentPoolEstimate(db, currentPeriod()),
      db.from("charities").select("*").eq("active", true).order("featured", { ascending: false }).order("created_at").limit(1).maybeSingle<Charity>(),
      db.from("draws").select("*").eq("status", "published").order("period", { ascending: false }).limit(1).maybeSingle<Draw>(),
      db.from("charities").select("id", { count: "exact", head: true }).eq("active", true),
    ]);
    return {
      raised: stats.charity_subscription_cents + stats.donations_cents,
      members: stats.active_subscribers,
      pool,
      featured: featured.data,
      latest: latest.data,
      charities: charityCount.count ?? 0,
    };
  } catch {
    // Database not reachable/configured yet: render the page with zeros.
    return { raised: 0, members: 0, pool: null, featured: null, latest: null, charities: 0 };
  }
}

const STEPS = [
  {
    icon: HandHeart,
    title: "Choose your cause",
    body: `Pick a charity when you join. At least ${CHARITY_MIN_PERCENT}% of every payment goes straight to them, and you can give more whenever you like.`,
  },
  {
    icon: PenLine,
    title: "Log your last 5 rounds",
    body: "Enter your Stableford scores after you play. We keep your latest five, and those five scores become your draw numbers.",
  },
  {
    icon: Trophy,
    title: "Win every month",
    body: "On the last day of each month we draw five numbers. Match 3, 4 or all 5 to share that tier of the prize pool.",
  },
];

export default async function HomePage() {
  const { raised, members, pool, featured, latest, charities } = await loadHome();
  const drawDate = nextDrawDate();

  return (
    <>
      {/* ------------------------------------------------------------ HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-ember/10 blur-[120px]" />
        <div className="container-page relative grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr]">
          <div className="animate-rise">
            <p className="eyebrow">Every round does good</p>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Your game can <span className="italic text-gradient">change a life.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-cream-muted">
              Join a community of golfers who turn their weekly rounds into real funding for causes they love, with a
              monthly prize draw built from their own scores.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="btn-primary px-7 py-3.5 text-base">
                Start giving: {formatMoney(PLANS.monthly.priceCents)}/month <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#how-it-works" className="btn-secondary px-7 py-3.5 text-base">
                See how it works
              </Link>
            </div>
            <p className="mt-5 text-sm text-cream-dim">Cancel any time · Next draw {formatDate(drawDate, { day: "numeric", month: "long" })}</p>
          </div>
          <HeroVisual
            poolLabel={formatMoney(pool?.totalCents ?? 0, { round: true })}
            raisedLabel={formatMoney(raised, { round: true })}
            charityName={featured?.name ?? "Your chosen charity"}
          />
        </div>
      </section>

      {/* ----------------------------------------------------- IMPACT STRIP */}
      <section className="border-y border-white/[0.06] bg-ink-800/50">
        <div className="container-page grid grid-cols-2 gap-y-8 py-10 lg:grid-cols-4">
          {[
            { label: "Raised for charity", node: <MoneyCountUp cents={raised} /> },
            { label: "Active members", node: <CountUp value={members} /> },
            { label: `${formatPeriod(currentPeriod())} prize pool`, node: <MoneyCountUp cents={pool?.totalCents ?? 0} /> },
            { label: "Charities supported", node: <CountUp value={charities} /> },
          ].map((s) => (
            <div key={s.label} className="px-2 text-center">
              <p className="font-display text-3xl font-semibold sm:text-4xl">{s.node}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-cream-dim">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- HOW IT WORKS */}
      <section id="how-it-works" className="container-page scroll-mt-20 py-24">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Three steps. Twelve chances a year.</h2>
        </Reveal>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.1} className="card group relative overflow-hidden p-7">
              <span className="absolute -right-4 -top-6 font-display text-[120px] font-semibold leading-none text-white/[0.03] transition group-hover:text-ember/10">
                {i + 1}
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ember/10 text-ember transition group-hover:scale-110 group-hover:bg-ember group-hover:text-ink">
                <step.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-6 font-display text-2xl font-semibold">{step.title}</h3>
              <p className="mt-3 text-cream-muted">{step.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- HOW YOU WIN */}
      <section className="container-page py-8">
        <div className="card relative overflow-hidden p-8 sm:p-12">
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
          <div className="grid gap-12 lg:grid-cols-2">
            <Reveal>
              <p className="eyebrow">How you win</p>
              <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight">Your scores are your numbers.</h2>
              <p className="mt-5 text-cream-muted">
                Each month we draw five numbers from 1 to 45, the Stableford range. Match them against your five latest
                scores. {PRIZE_POOL_PERCENT}% of every subscription goes into the pool, and every tier is split equally
                among its winners.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {(latest?.winning_numbers ?? [4, 19, 27, 33, 38]).map((n, i) => (
                  <NumberBall key={i} n={n} index={i} />
                ))}
              </div>
              <p className="mt-3 text-xs text-cream-dim">
                {latest ? `Winning numbers, ${formatPeriod(latest.period)}` : "Example draw"}
              </p>
            </Reveal>
            <div className="space-y-3">
              {([5, 4, 3] as const).map((tier, i) => (
                <Reveal key={tier} delay={i * 0.1} className="flex items-center gap-5 rounded-2xl border border-white/[0.07] bg-ink/60 p-5">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <span key={j} className={`h-3 w-3 rounded-full ${j < tier ? "bg-gold" : "bg-white/10"}`} />
                    ))}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{tier}-number match</p>
                    <p className="text-sm text-cream-dim">
                      {tier === 5 ? "Jackpot. Rolls over to next month if nobody wins it." : "Shared equally among winners."}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-semibold text-gold">{TIER_SHARES[tier]}%</p>
                    {pool && <p className="text-xs text-cream-dim">{formatMoney(pool.tiers[tier], { round: true })} now</p>}
                  </div>
                </Reveal>
              ))}
              <Reveal delay={0.3} className="flex items-center gap-3 px-2 pt-2 text-sm text-cream-muted">
                <Repeat className="h-4 w-4 text-mint" /> Unclaimed jackpots grow every month until someone wins.
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ CHARITY SPOTLIGHT */}
      {featured && (
        <section className="container-page py-24">
          <Reveal className="grid overflow-hidden rounded-4xl border border-white/[0.07] bg-ink-800 lg:grid-cols-2">
            <div className="min-h-[280px]">
              <CharityArt charity={featured} />
            </div>
            <div className="flex flex-col justify-center p-8 sm:p-12">
              <p className="eyebrow">Charity spotlight</p>
              <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight">{featured.name}</h2>
              <p className="mt-2 text-lg text-cream">{featured.tagline}</p>
              <p className="mt-4 line-clamp-4 text-cream-muted">{featured.description}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={`/charities/${featured.slug}`} className="btn-primary">
                  Meet {featured.name.split(" ")[0]} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/charities" className="btn-secondary">
                  All charities
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* ------------------------------------------------- WHERE MONEY GOES */}
      <section className="container-page py-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Where your money goes</p>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight">You can see where every pound goes.</h2>
        </Reveal>
        <Reveal delay={0.1} className="mx-auto mt-10 max-w-3xl">
          <div className="flex h-14 overflow-hidden rounded-2xl text-sm font-semibold text-ink">
            <div className="flex items-center justify-center bg-mint" style={{ width: `${CHARITY_MIN_PERCENT * 2}%` }}>
              {CHARITY_MIN_PERCENT}%+
            </div>
            <div className="flex items-center justify-center bg-gold" style={{ width: `${PRIZE_POOL_PERCENT}%` }}>
              {PRIZE_POOL_PERCENT}%
            </div>
            <div className="flex flex-1 items-center justify-center bg-ink-600 text-cream-muted">Rest</div>
          </div>
          <div className="mt-4 grid gap-4 text-left text-sm sm:grid-cols-3">
            <p><span className="font-semibold text-mint">Your charity.</span> <span className="text-cream-muted">At least {CHARITY_MIN_PERCENT}%, and you can raise it up to 50%.</span></p>
            <p><span className="font-semibold text-gold">Prize pool.</span> <span className="text-cream-muted">A fixed {PRIZE_POOL_PERCENT}%, paid back to members.</span></p>
            <p><span className="font-semibold text-cream">Platform.</span> <span className="text-cream-muted">Keeps the lights on and the draws fair.</span></p>
          </div>
        </Reveal>
      </section>

      {/* -------------------------------------------------------- FINAL CTA */}
      <section className="container-page py-24">
        <Reveal className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-ember via-ember-deep to-iris p-10 text-center sm:p-16">
          <div className="grain absolute inset-0 opacity-40" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Play your next round for someone else too.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ink/75">
              {formatMoney(PLANS.monthly.priceCents)} a month or {formatMoney(PLANS.yearly.priceCents)} a year. Pick a
              cause, log your scores, and you&apos;re in the next draw.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="btn bg-ink px-8 py-3.5 text-base text-cream hover:bg-ink-700">
                Become a member <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/draws" className="btn border border-ink/20 px-8 py-3.5 text-base text-ink hover:bg-ink/10">
                <CalendarDays className="h-4 w-4" /> Past draws
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
