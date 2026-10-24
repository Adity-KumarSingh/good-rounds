# Good Rounds

A subscription platform that combines golf score tracking, monthly prize draws and charity giving, built against the **Digital Heroes PRD (Level 1)**.

Members subscribe monthly or yearly and choose a charity that receives at least 10% of every payment. They log their last 5 Stableford scores, and those 5 scores become their numbers in a monthly draw with 3, 4 and 5-match prize tiers and a rolling jackpot.

**Stack:** Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind CSS · Framer Motion · Supabase (Postgres, Auth, Storage, RLS) · Vitest · deployed on Vercel.

---

## Test credentials

After running `npm run seed` (see setup):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@goodrounds.test` | `Admin#2026` |
| Subscriber (active, 5 scores) | `player@goodrounds.test` | `Player#2026` |
| Demo members (10) | `<firstname>@goodrounds.test` (e.g. `priya@…`) | `Demo#2026` |

The demo set includes one lapsed member and one member with only 3 scores, so you can see the eligibility rules in action.

**Payments are mocked** (test mode). Any card number works, and `4000 0000 0000 0002` simulates a decline.

---

## Setup

### 1. Supabase (new project)
1. Create a **new** Supabase project.
2. Apply the database migrations, using either option:
   - **Script:** set `DATABASE_URL` (Supabase → Connect → Session pooler) and `DATABASE_PASSWORD` in `.env.local`, then run `npm run migrate`. Each file is applied once, in order, inside a transaction.
   - **Manually:** in **SQL Editor**, run the files in `supabase/migrations/` in order: `0001_schema.sql` → `0002_seed_charities.sql` → `0003_publish_draw.sql` → `0004_reporting.sql`.
3. **Authentication → Providers → Email:** for frictionless testing, turn **off** "Confirm email". If it's left on, signup shows a "check your inbox" message and the confirmation link lands on `/auth/callback`.
4. **Authentication → URL Configuration:** set the Site URL to your deployed URL and add `https://<your-domain>/auth/callback` to the redirect URLs.

### 2. Local
```bash
cp .env.example .env.local   # fill in values from Supabase → Project Settings → API
npm install
npm run migrate              # creates tables, RLS, functions, starter charities
npm run seed                 # creates admin + test users
npm run dev                  # http://localhost:3000
```

### 3. Vercel (new account)
1. Import the repo into a **new** Vercel account.
2. Add the environment variables from `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` and `CRON_SECRET`. Supabase's newer `sb_publishable_…` and `sb_secret_…` keys work in place of the anon and service_role keys. `DATABASE_URL` and `DATABASE_PASSWORD` are only needed locally for migrations.
3. Deploy. `vercel.json` registers a daily cron (`/api/cron/renewals`) that processes subscription renewals and cancellations.

### Scripts
| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Unit tests for the draw engine and prize maths |
| `npm run typecheck` | TypeScript |
| `npm run migrate` | Apply SQL migrations (tracked, idempotent) |
| `npm run seed` | Demo accounts (idempotent) |

---

## Feature map (PRD → implementation)

| PRD | Where |
|---|---|
| §03 Roles: public / subscriber / admin | `middleware.ts`, `lib/auth.ts`, `profiles.role` and RLS |
| §04 Monthly and yearly plans, renewal, cancellation, lapsed state | `lib/billing.ts`, `app/actions/subscription.ts`, `/api/cron/renewals` |
| §04 Real-time status check on every authenticated request | `getSession()` reconciles the subscription against the clock on every request |
| §05 5-score rolling window, range 1–45, one score per date, newest first | DB triggers in `0001_schema.sql`, plus `components/score-manager.tsx` |
| §06 Random and algorithmic draws, simulation, publishing | `lib/draw-engine.ts` (pure), `lib/draws.ts`, `/admin/draws/[id]` |
| §07 Pool tiers 40/35/25, equal split, jackpot rollover | `computePool` / `settleDraw` in `lib/draw-engine.ts`, plus `publish_draw()` SQL |
| §08 Charity at signup, min 10%, can increase, independent donations | Signup wizard, `/dashboard/settings`, `/charities/[slug]` donate form |
| §08.2 Directory with search and filter, profiles with events, homepage spotlight | `/charities`, `/charities/[slug]`, homepage |
| §09 Proof upload, admin approve/reject, Pending → Paid | `/dashboard/winnings`, `/admin/winners`; the DB blocks "paid" before "approved" |
| §10 User dashboard modules | `/dashboard` (subscription, scores, charity, participation, winnings) |
| §11 Admin: users, draws, charities, winners, reports | `/admin/*` |

---

## Architecture

```
app/
  (site)/          public pages: home, charities, draws, pricing, signup, login, checkout
  dashboard/       member area (overview, winnings, settings)
  admin/           admin panel (reports, users, draws, charities, winners)
  actions/         server actions — every mutation, validated with zod
  api/cron/        subscription lifecycle job
lib/
  draw-engine.ts   PURE draw/pool/prize logic (unit tested)
  draws.ts         builds simulations from live data
  billing.ts       payment provider + subscription lifecycle
  auth.ts          per-request session + live subscription status
  config.ts        prices, percentages, tier shares (single source)
supabase/migrations/   schema, RLS, triggers, publish_draw(), reporting functions
```

**Key decisions**
- **Rules live in the database.** The 5-score window, one score per date, the score range, payment splits summing to the charge, and payouts only after approval are all Postgres constraints or triggers. A bug or a direct API call can't break them.
- **RLS everywhere.** Reads use the user's session under RLS. Privileged writes (payments, draws, reviews) run server-side with the service role, and only after an explicit role check in the server action.
- **Pure draw engine.** All number generation, matching and money maths live in `lib/draw-engine.ts` with no I/O, covered by `tests/draw-engine.test.ts`.
- **Atomic publishing.** `publish_draw()` writes entries, winners and final figures in one transaction from the stored simulation snapshot, so the published result is exactly what the admin previewed.
- **Money as integer pence** throughout, with remainders accounted for explicitly (see below).
- **Swappable payments.** `PaymentProvider` interface in `lib/subscription.ts`. The mock implements it today, and a Stripe provider (Checkout plus webhooks) can replace it without touching callers.

---

## Ambiguities in the PRD and how they were resolved

| Question | Decision |
|---|---|
| What are the draw "numbers"? | Each entrant's numbers are their **5 retained Stableford scores**. Five winning numbers are drawn from **1–45**, the same range as scores. |
| Who is entered? | Members with an **active subscription and a full set of 5 scores** at simulation time. The dashboard tells members how many scores they still need. |
| Duplicate scores (e.g. 36 twice)? | Allowed, since different dates can have the same score. A repeated score can only match one winning number, so duplicates never inflate matches. |
| A new score that's older than all 5 retained scores? | **Rejected with an explanation.** Accepting it would delete it straight away, because "only the latest 5 are kept". |
| What does "oldest" mean? | Oldest by **date played**, not by entry time. Future dates are rejected. |
| How big is the prize pool? | A fixed **40%** of each fee. Each month's pool = Σ active subscribers' monthly-equivalent contribution (a yearly plan contributes 1/12 of its annual share each month) + any rolled-over jackpot. |
| Charity share? | **10–50%**, chosen at signup and adjustable later. It's capped at 50% so the fixed pool share is always funded. Changes apply to the next charge. The split is frozen on each payment row for an accurate audit trail. |
| Unclaimed 4/3-match tiers? | The PRD says they don't roll over. They are reported as **unallocated** (retained by the platform) and shown in admin reports. |
| Pennies left after an equal split? | Prizes are floored to the penny, and the remainder is reported as unallocated. Every penny is accounted for (unit tested). |
| Algorithmic draw: weighted toward which numbers? | The admin chooses. **Hot** favours numbers members score most often (more winners). **Cold** favours the rarest (bigger rollovers). Every number keeps a non-zero chance. |
| Order of draws and rollover? | A jackpot rolls into the next published month. Draws must be published in month order, which the DB enforces. |
| Cancellation? | Cancelling stops auto-renewal, and access continues until the end of the paid period. A failed renewal marks the subscription **lapsed**. Non-subscribers can still browse, donate and view results, but score entry is locked. |
| Admin-granted access? | Admins can grant a "complimentary" subscription. It counts toward the pool but creates no payment row, so charity totals stay truthful. |
| Deleting a charity with supporters? | Supporters are unlinked and asked to choose again. Past payments keep their totals. Hiding the charity is offered as the safer option. |

---

## Testing

- `npm test` runs 13 unit tests covering number generation (distinct values, range, weighting bias), matching with duplicate scores, fee splits, pool tiers, equal splitting, jackpot rollover and penny accounting.
- The SQL migrations were also run against real Postgres (PGlite), with 36 checks: the signup trigger, the rolling window, one score per date, future and out-of-range scores, payment-split integrity, atomic and in-order publishing, payout-after-approval, reporting functions, and RLS (own data only, subscribers only, no self-promotion, unpublished draws hidden, `publish_draw` not callable by users).

- A browser end-to-end run (headless Edge + Puppeteer) against a live Supabase project passed 31 checks: signup and checkout (including a declined card), the score rules, draw simulation and publishing, proof upload, approval and payout, admin subscription controls, and member cancel/resume.

### Framework issues found and worked around
- **No root `loading.tsx`.** On Next.js 15, a `loading.tsx` Suspense boundary combined with `revalidatePath` and `useActionState` intermittently left forms stuck on "Saving…", even though the server action had completed and returned. Removing the root `loading.tsx` fixed it: 16/16 saves succeeded, versus most failing before.
- **Multi-button forms** (approve/reject, subscription operations) send the chosen action through a hidden field rather than the clicked button's `name`/`value`, which was not reliably forwarded to server actions.
- **Node 20.** supabase-js ≥ 2.109 needs a global `WebSocket`, which Node only provides from v22. `instrumentation.ts` installs `ws` on older Node; Vercel (Node 22+) is unaffected.

## Scalability notes

- Aggregates (`platform_stats`, `charity_totals`) run in Postgres, not in the app.
- Large reads are paginated (`fetchAll`) to avoid PostgREST's 1000-row cap silently truncating draws.
- Indexes cover every hot lookup (scores by user and date, subscriptions by status and period end, winners by status).
- Pricing, pool share and tier splits live in `lib/config.ts`, ready to move into a settings table. Multi-currency or multi-region support would mean extending `config` and `format`.
- For very large member bases, the simulation snapshot (currently jsonb on the draw) can move to a staging table, and settlement can move into SQL.
