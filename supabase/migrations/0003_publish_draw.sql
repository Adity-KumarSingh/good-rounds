-- Publishes a simulated draw atomically: entries, winners and the draw's
-- final figures are written in ONE transaction from the stored simulation
-- snapshot, so what the admin previewed is exactly what gets published.
create or replace function public.publish_draw(p_draw_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d          public.draws;
  sim        jsonb;
  e          jsonb;
  v_entry_id uuid;
  v_match    int;
begin
  select * into d from public.draws where id = p_draw_id for update;
  if not found then
    raise exception 'DRAW_NOT_FOUND';
  end if;
  if d.status <> 'simulated' or d.simulation is null then
    raise exception 'DRAW_NOT_SIMULATED: run a simulation before publishing';
  end if;
  if exists (select 1 from public.draws where status = 'published' and period > d.period) then
    raise exception 'LATER_DRAW_PUBLISHED: a later month has already been published';
  end if;

  sim := d.simulation;

  for e in select * from jsonb_array_elements(sim -> 'entries') loop
    v_match := (e ->> 'matchCount')::int;

    insert into public.draw_entries (draw_id, user_id, numbers, match_count)
    values (
      d.id,
      (e ->> 'userId')::uuid,
      array(select jsonb_array_elements_text(e -> 'numbers')::int),
      v_match
    )
    returning id into v_entry_id;

    if v_match >= 3 then
      insert into public.winners (draw_id, user_id, entry_id, tier, prize_cents)
      values (
        d.id,
        (e ->> 'userId')::uuid,
        v_entry_id,
        v_match,
        (sim -> 'tiers' -> (v_match::text) ->> 'prizeEachCents')::bigint
      );
    end if;
  end loop;

  update public.draws set
    status                  = 'published',
    published_at            = now(),
    winning_numbers         = array(select jsonb_array_elements_text(sim -> 'winningNumbers')::int),
    active_subscribers      = (sim -> 'pool' ->> 'activeSubscribers')::int,
    pool_contribution_cents = (sim -> 'pool' ->> 'contributionCents')::bigint,
    rollover_in_cents       = (sim -> 'pool' ->> 'rolloverInCents')::bigint,
    pool_total_cents        = (sim -> 'pool' ->> 'totalCents')::bigint,
    tier5_cents             = (sim -> 'tiers' -> '5' ->> 'poolCents')::bigint,
    tier4_cents             = (sim -> 'tiers' -> '4' ->> 'poolCents')::bigint,
    tier3_cents             = (sim -> 'tiers' -> '3' ->> 'poolCents')::bigint,
    rollover_out_cents      = (sim ->> 'rolloverOutCents')::bigint,
    unallocated_cents       = (sim ->> 'unallocatedCents')::bigint,
    entries_count           = jsonb_array_length(sim -> 'entries'),
    winners5                = jsonb_array_length(sim -> 'tiers' -> '5' -> 'winners'),
    winners4                = jsonb_array_length(sim -> 'tiers' -> '4' -> 'winners'),
    winners3                = jsonb_array_length(sim -> 'tiers' -> '3' -> 'winners')
  where id = d.id;
end $$;

-- Only the service role (server actions, after an admin check) may publish.
revoke execute on function public.publish_draw(uuid) from public, anon, authenticated;
