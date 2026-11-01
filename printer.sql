-- Printer station: additive migration for the existing Pet Island database.
alter table public.island_events drop constraint island_events_action_check;
alter table public.island_events add constraint island_events_action_check check (action in ('approach','wave','explore','use_printer'));
alter table public.island_events add column outcome text check (outcome is null or outcome in ('pink_dot','blue_dot','yellow_dot'));
create table public.island_inventory (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.island_pets(id) on delete cascade,
  event_id uuid not null references public.island_events(id) on delete cascade,
  item_type text not null check (item_type='dot'),
  item_key text not null check (item_key in ('pink_dot','blue_dot','yellow_dot')),
  created_at timestamptz not null default now()
);
create index island_inventory_pet_id_idx on public.island_inventory(pet_id);
alter table public.island_inventory enable row level security;
revoke all on public.island_inventory from public, anon, authenticated;
grant select, insert on public.island_inventory to service_role;
-- Invoker permissions and the locked station row make each event and item atomic.
create table public.island_stations (
  name text primary key check (name='printer'),
  busy_until timestamptz
);
alter table public.island_stations enable row level security;
revoke all on public.island_stations from public, anon, authenticated;
grant select, insert, update on public.island_stations to service_role;
insert into public.island_stations(name) values ('printer');
create function public.save_printer_action(p_pet_id uuid, p_other_name text, p_confidence double precision, p_context text, p_outcome text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_event_id uuid; v_pet_name text; v_until timestamptz;
begin
  select busy_until into v_until from public.island_stations where name='printer' for update;
  if v_until > now() then raise exception 'printer busy'; end if;
  select name into strict v_pet_name from public.island_pets where id=p_pet_id;
  if p_outcome not in ('pink_dot','blue_dot','yellow_dot') then raise exception 'invalid dot'; end if;
  if (select count(*) from public.island_inventory where pet_id=p_pet_id)>=12 or
     (select count(*) from public.island_inventory where pet_id=p_pet_id and item_type='dot')>=3 then
    raise exception 'inventory full';
  end if;
  insert into public.island_events(pet_id,pet_name,other_name,action,confidence,context,outcome)
    values(p_pet_id,v_pet_name,p_other_name,'use_printer',p_confidence,p_context,p_outcome) returning id into v_event_id;
  insert into public.island_inventory(pet_id,event_id,item_type,item_key) values(p_pet_id,v_event_id,'dot',p_outcome);
  update public.island_stations set busy_until=now()+interval '20 seconds' where name='printer';
  return v_event_id;
end $$;
revoke all on function public.save_printer_action(uuid,text,double precision,text,text) from public, anon, authenticated;
grant execute on function public.save_printer_action(uuid,text,double precision,text,text) to service_role;
