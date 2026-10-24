-- =====================================================================
-- Good Rounds — core schema
-- Run in the Supabase SQL editor (or `supabase db push`) on a NEW project.
-- Business rules that must never be bypassed (score window, one score per
-- date, payout only after approval) are enforced here in the database, not
-- only in application code.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Charities
-- ---------------------------------------------------------------------
create table public.charities (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null,
  tagline     text not null default '',
  description text not null default '',
  category    text not null default 'Community',
  location    text not null default '',
  website     text,
  image_url   text,
  featured    boolean not null default false,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.charity_events (
  id          uuid primary key default gen_random_uuid(),
  charity_id  uuid not null references public.charities(id) on delete cascade,
  title       text not null,
  event_date  date not null,
  location    text not null default '',
  description text not null default '',
  created_at  timestamptz not null default now()
);
create index charity_events_charity_idx on public.charity_events (charity_id, event_date);

-- ---------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  full_name       text not null default '',
  role            text not null default 'subscriber' check (role in ('subscriber', 'admin')),
  charity_id      uuid references public.charities(id) on delete set null,
  -- PRD: minimum 10% of the fee goes to charity; users may raise it.
  -- Capped at 50% so the fixed prize-pool share (see lib/config.ts) is always funded.
  charity_percent int not null default 10 check (charity_percent between 10 and 50),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index profiles_charity_idx on public.profiles (charity_id);

-- ---------------------------------------------------------------------
-- Subscriptions — one row per user, mutated through its lifecycle.
-- Every charge is recorded separately in `payments`.
-- ---------------------------------------------------------------------
create table public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null unique references public.profiles(id) on delete cascade,
  plan                 text not null check (plan in ('monthly', 'yearly')),
  status               text not null check (status in ('active', 'cancelled', 'lapsed')),
  amount_cents         int  not null check (amount_cents > 0),
  current_period_start timestamptz not null,
  current_period_end   timestamptz not null,
  cancel_at_period_end boolean not null default false,
  provider             text not null default 'mock',
  provider_ref         text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (current_period_end > current_period_start)
);
create index subscriptions_status_idx on public.subscriptions (status, current_period_end);

-- Ledger of every successful charge, with the fee split frozen at charge time.
create table public.payments (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  subscription_id  uuid references public.subscriptions(id) on delete set null,
  kind             text not null check (kind in ('new', 'renewal')),
  plan             text not null check (plan in ('monthly', 'yearly')),
  amount_cents     int  not null check (amount_cents > 0),
  charity_id       uuid references public.charities(id) on delete set null,
  charity_percent  int  not null,
  charity_cents    int  not null check (charity_cents >= 0),
  prize_pool_cents int  not null check (prize_pool_cents >= 0),
  platform_cents   int  not null check (platform_cents >= 0),
  provider_ref     text,
  created_at       timestamptz not null default now(),
  check (charity_cents + prize_pool_cents + platform_cents = amount_cents)
);
create index payments_user_idx on public.payments (user_id, created_at desc);
create index payments_charity_idx on public.payments (charity_id);

-- Independent donations (not tied to gameplay or a subscription).
create table public.donations (
  id           uuid primary key default gen_random_uuid(),
  charity_id   uuid not null references public.charities(id) on delete cascade,
  user_id      uuid references public.profiles(id) on delete set null,
  donor_name   text not null default 'Anonymous',
  donor_email  text,
  amount_cents int  not null check (amount_cents >= 100),
  message      text,
  provider_ref text,
  created_at   timestamptz not null default now()
);
create index donations_charity_idx on public.donations (charity_id);

-- ---------------------------------------------------------------------
-- Scores — rolling window of the latest 5 Stableford scores per user
-- ---------------------------------------------------------------------
create table public.scores (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  score      int  not null check (score between 1 and 45),
  played_on  date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- PRD: only one score entry per date.
  constraint scores_one_per_date unique (user_id, played_on)
);
create index scores_user_date_idx on public.scores (user_id, played_on desc);

-- Validate before insert/update.
create or replace function public.scores_validate()
returns trigger language plpgsql as $$
declare
  v_count  int;
  v_oldest date;
begin
  if new.played_on > current_date then
    raise exception 'SCORE_FUTURE_DATE: a score cannot be dated in the future' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' then
    -- Serialise concurrent inserts for the same user so the window stays exact.
    perform pg_advisory_xact_lock(hashtext(new.user_id::text));

    select count(*), min(played_on) into v_count, v_oldest
      from public.scores where user_id = new.user_id;

    -- With a full window, a round older than every retained round would be
    -- evicted immediately. Reject it explicitly instead of silently dropping it.
    if v_count >= 5 and new.played_on < v_oldest then
      raise exception 'SCORE_TOO_OLD: older than all of your 5 retained scores' using errcode = 'P0001';
    end if;
  end if;

  new.updated_at := now();
  return new;
end $$;

create trigger scores_validate_trg
  before insert or update on public.scores
  for each row execute function public.scores_validate();

-- After insert, keep only the 5 most recent rounds (by date played).
create or replace function public.scores_trim_window()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.scores s
   where s.user_id = new.user_id
     and s.id not in (
       select id from public.scores
        where user_id = new.user_id
        order by played_on desc, created_at desc
        limit 5
     );
  return null;
end $$;

create trigger scores_trim_window_trg
  after insert on public.scores
  for each row execute function public.scores_trim_window();

-- ---------------------------------------------------------------------
-- Draws
-- ---------------------------------------------------------------------
create table public.draws (
  id                      uuid primary key default gen_random_uuid(),
  period                  text not null unique check (period ~ '^\d{4}-(0[1-9]|1[0-2])$'), -- YYYY-MM
  logic                   text not null default 'random' check (logic in ('random', 'algorithmic')),
  -- Algorithmic draws: 'hot' favours frequently-scored numbers, 'cold' the rarest.
  algo_bias               text not null default 'hot' check (algo_bias in ('hot', 'cold')),
  status                  text not null default 'draft' check (status in ('draft', 'simulated', 'published')),
  winning_numbers         int[],
  -- Full preview snapshot produced by "Run simulation"; publishing persists it verbatim.
  simulation              jsonb,
  simulated_at            timestamptz,
  active_subscribers      int    not null default 0,
  pool_contribution_cents bigint not null default 0,
  rollover_in_cents       bigint not null default 0,
  pool_total_cents        bigint not null default 0,
  tier5_cents             bigint not null default 0,
  tier4_cents             bigint not null default 0,
  tier3_cents             bigint not null default 0,
  rollover_out_cents      bigint not null default 0,
  unallocated_cents       bigint not null default 0,
  entries_count           int    not null default 0,
  winners5                int    not null default 0,
  winners4                int    not null default 0,
  winners3                int    not null default 0,
  published_at            timestamptz,
  created_at              timestamptz not null default now(),
  check (status <> 'published' or (winning_numbers is not null and published_at is not null))
);

-- Snapshot of each eligible subscriber's numbers at publish time.
create table public.draw_entries (
  id          uuid primary key default gen_random_uuid(),
  draw_id     uuid not null references public.draws(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  numbers     int[] not null,
  match_count int not null default 0 check (match_count between 0 and 5),
  created_at  timestamptz not null default now(),
  unique (draw_id, user_id)
);
create index draw_entries_user_idx on public.draw_entries (user_id);

create table public.winners (
  id                  uuid primary key default gen_random_uuid(),
  draw_id             uuid not null references public.draws(id) on delete cascade,
  user_id             uuid not null references public.profiles(id) on delete cascade,
  entry_id            uuid not null references public.draw_entries(id) on delete cascade,
  tier                int  not null check (tier in (3, 4, 5)),
  prize_cents         bigint not null check (prize_cents >= 0),
  verification_status text not null default 'awaiting_proof'
                      check (verification_status in ('awaiting_proof', 'pending_review', 'approved', 'rejected')),
  proof_path          text,
  proof_uploaded_at   timestamptz,
  review_note         text,
  reviewed_by         uuid references public.profiles(id) on delete set null,
  reviewed_at         timestamptz,
  payout_status       text not null default 'pending' check (payout_status in ('pending', 'paid')),
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  unique (draw_id, user_id),
  -- A payout can only be marked paid once the proof has been approved.
  check (payout_status = 'pending' or verification_status = 'approved')
);
create index winners_user_idx on public.winners (user_id);
create index winners_status_idx on public.winners (verification_status, payout_status);

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.has_active_subscription(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
     where user_id = uid and status = 'active' and current_period_end > now()
  );
$$;

-- Keep updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger profiles_touch   before update on public.profiles      for each row execute function public.touch_updated_at();
create trigger subs_touch       before update on public.subscriptions for each row execute function public.touch_updated_at();
create trigger charities_touch  before update on public.charities     for each row execute function public.touch_updated_at();

-- Users may edit their own profile but never promote themselves.
create or replace function public.profiles_guard_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and not public.is_admin() then
    raise exception 'Not allowed to change role';
  end if;
  return new;
end $$;

create trigger profiles_guard_role_trg
  before update on public.profiles
  for each row execute function public.profiles_guard_role();

-- Create the profile row when a user signs up. Signup metadata carries
-- full_name, charity_id and charity_percent chosen on the signup form.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_charity uuid;
  v_percent int;
begin
  begin
    v_charity := nullif(new.raw_user_meta_data ->> 'charity_id', '')::uuid;
  exception when others then
    v_charity := null;
  end;
  if v_charity is not null and not exists (select 1 from public.charities where id = v_charity and active) then
    v_charity := null;
  end if;

  begin
    v_percent := coalesce((new.raw_user_meta_data ->> 'charity_percent')::int, 10);
  exception when others then
    v_percent := 10;
  end;

  insert into public.profiles (id, email, full_name, charity_id, charity_percent)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_charity,
    least(greatest(v_percent, 10), 50)
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Row Level Security
-- Reads go through RLS with the user's session. Privileged writes
-- (payments, draws, winner review) run server-side with the service role
-- after an explicit role check in the server action.
-- ---------------------------------------------------------------------
alter table public.charities      enable row level security;
alter table public.charity_events enable row level security;
alter table public.profiles       enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.payments       enable row level security;
alter table public.donations      enable row level security;
alter table public.scores         enable row level security;
alter table public.draws          enable row level security;
alter table public.draw_entries   enable row level security;
alter table public.winners        enable row level security;

-- Charities: public directory.
create policy "charities readable" on public.charities
  for select using (active or public.is_admin());
create policy "charities admin write" on public.charities
  for all using (public.is_admin()) with check (public.is_admin());

create policy "events readable" on public.charity_events
  for select using (true);
create policy "events admin write" on public.charity_events
  for all using (public.is_admin()) with check (public.is_admin());

-- Profiles.
create policy "profile self read" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profile self update" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Subscriptions / payments / donations: read own, writes are server-only.
create policy "subscription self read" on public.subscriptions
  for select using (user_id = auth.uid() or public.is_admin());
create policy "payments self read" on public.payments
  for select using (user_id = auth.uid() or public.is_admin());
create policy "donations self read" on public.donations
  for select using (user_id = auth.uid() or public.is_admin());

-- Scores: owners manage their own while subscribed; admins manage all.
create policy "scores self read" on public.scores
  for select using (user_id = auth.uid() or public.is_admin());
create policy "scores self insert" on public.scores
  for insert with check (
    (user_id = auth.uid() and public.has_active_subscription(auth.uid())) or public.is_admin()
  );
create policy "scores self update" on public.scores
  for update using (
    (user_id = auth.uid() and public.has_active_subscription(auth.uid())) or public.is_admin()
  ) with check (
    (user_id = auth.uid() and public.has_active_subscription(auth.uid())) or public.is_admin()
  );
create policy "scores self delete" on public.scores
  for delete using (
    (user_id = auth.uid() and public.has_active_subscription(auth.uid())) or public.is_admin()
  );

-- Draws: published results are public.
create policy "draws published read" on public.draws
  for select using (status = 'published' or public.is_admin());

create policy "entries self read" on public.draw_entries
  for select using (user_id = auth.uid() or public.is_admin());

create policy "winners self read" on public.winners
  for select using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('winner-proofs', 'winner-proofs', false),
       ('charity-media', 'charity-media', true)
on conflict (id) do nothing;
-- No storage policies are needed for anon/auth roles: uploads go through
-- server actions using the service role; proofs are viewed via signed URLs.
