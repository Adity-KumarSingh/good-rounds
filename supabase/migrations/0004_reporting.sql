-- Aggregates computed in Postgres instead of pulling every row into the app.
-- Called server-side with the service role only.

create or replace function public.platform_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total_users',          (select count(*) from public.profiles where role = 'subscriber'),
    'active_subscribers',   (select count(*) from public.subscriptions where status = 'active' and current_period_end > now()),
    'monthly_subscribers',  (select count(*) from public.subscriptions where status = 'active' and current_period_end > now() and plan = 'monthly'),
    'yearly_subscribers',   (select count(*) from public.subscriptions where status = 'active' and current_period_end > now() and plan = 'yearly'),
    'lapsed_or_cancelled',  (select count(*) from public.subscriptions where status <> 'active' or current_period_end <= now()),
    'revenue_cents',        (select coalesce(sum(amount_cents), 0) from public.payments),
    'charity_subscription_cents', (select coalesce(sum(charity_cents), 0) from public.payments),
    'donations_cents',      (select coalesce(sum(amount_cents), 0) from public.donations),
    'prize_pool_funded_cents', (select coalesce(sum(prize_pool_cents), 0) from public.payments),
    'prizes_awarded_cents', (select coalesce(sum(prize_cents), 0) from public.winners),
    'prizes_paid_cents',    (select coalesce(sum(prize_cents), 0) from public.winners where payout_status = 'paid'),
    'draws_published',      (select count(*) from public.draws where status = 'published'),
    'total_winners',        (select count(*) from public.winners),
    'pending_reviews',      (select count(*) from public.winners where verification_status = 'pending_review'),
    'pending_payouts',      (select count(*) from public.winners where verification_status = 'approved' and payout_status = 'pending')
  );
$$;

create or replace function public.charity_totals()
returns table (
  charity_id uuid,
  name text,
  slug text,
  supporters bigint,
  subscription_cents bigint,
  donation_cents bigint,
  total_cents bigint
) language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.slug,
         (select count(*) from public.profiles p where p.charity_id = c.id),
         coalesce(pay.cents, 0),
         coalesce(don.cents, 0),
         coalesce(pay.cents, 0) + coalesce(don.cents, 0)
    from public.charities c
    left join (select charity_id, sum(charity_cents)::bigint cents from public.payments group by charity_id) pay on pay.charity_id = c.id
    left join (select charity_id, sum(amount_cents)::bigint cents from public.donations group by charity_id) don on don.charity_id = c.id
   order by 7 desc, c.name;
$$;

revoke execute on function public.platform_stats() from public, anon, authenticated;
revoke execute on function public.charity_totals() from public, anon, authenticated;
