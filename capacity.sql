create table public.island_presence (
 user_id uuid primary key,
 last_seen timestamptz not null default now()
);
alter table public.island_presence enable row level security;
revoke all on public.island_presence from anon, authenticated;
grant select, insert, update, delete on public.island_presence to service_role;
create function public.claim_island_slot(p_user_id uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(716472803);
  delete from public.island_presence where last_seen < pg_catalog.now() - interval '2 minutes';
  if exists (select 1 from public.island_presence where user_id = p_user_id) then
    update public.island_presence set last_seen = pg_catalog.now() where user_id = p_user_id;
    return true;
  end if;
  if (select count(*) from public.island_presence) >= 50 then return false; end if;
  insert into public.island_presence(user_id) values (p_user_id);
  return true;
end;
$$;
revoke all on function public.claim_island_slot(uuid) from public, anon, authenticated;
grant execute on function public.claim_island_slot(uuid) to service_role;
