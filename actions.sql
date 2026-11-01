-- Venue actions: additive migration. Run once, after printer.sql.
-- Adds the photo wall, plotter, refreshments and messages, plus action history links.
begin;

-- Events: new actions, outcomes, the partner pet and generated messages.
alter table public.island_events drop constraint island_events_action_check;
alter table public.island_events add constraint island_events_action_check check (action in (
  'approach','wave','explore','use_printer','take_photo','use_plotter','visit_refreshments','send_message'));
alter table public.island_events drop constraint island_events_outcome_check;
alter table public.island_events add constraint island_events_outcome_check check (outcome is null or outcome in (
  'pink_dot','blue_dot','yellow_dot',
  'food','codex_cola',
  'cheerful','shy','punny','nerdy','competitive','sleepy'));
alter table public.island_events add column other_pet_id uuid references public.island_pets(id) on delete set null;
alter table public.island_events add column message text check (message is null or (length(message) between 1 and 140 and message !~ '[\r\n]'));
alter table public.island_events add column message_model text check (message_model is null or length(message_model) between 1 and 80);
alter table public.island_events add constraint island_events_message_pair_check check (
  (action = 'send_message') = (message is not null) and (message is null) = (message_model is null));
create index island_events_pet_history_idx on public.island_events(pet_id, created_at desc);
create index island_events_other_pet_history_idx on public.island_events(other_pet_id, created_at desc);

-- Inventory: photos (shared by both pets), portraits ready to plot, food and Codex Cola.
alter table public.island_inventory drop constraint island_inventory_item_type_check;
alter table public.island_inventory drop constraint island_inventory_item_key_check;
alter table public.island_inventory alter column item_key drop not null;
alter table public.island_inventory add column partner_pet_id uuid references public.island_pets(id) on delete set null;
alter table public.island_inventory add constraint island_inventory_item_check check (
  (item_type = 'dot' and item_key in ('pink_dot','blue_dot','yellow_dot')) or
  (item_type in ('photo','portrait','food','codex_cola') and item_key is null));

-- Stations: one pet (or one photo pair) at a time.
alter table public.island_stations drop constraint island_stations_name_check;
alter table public.island_stations add constraint island_stations_name_check check (name in ('printer','photo_wall','plotter','refreshments'));
insert into public.island_stations(name) values ('photo_wall'),('plotter'),('refreshments') on conflict (name) do nothing;

-- Saves a photo, plotter, refreshment or message action with its items in one transaction.
-- Invoker permissions and the locked station row keep each event and its items atomic.
create function public.save_action(p_action text, p_pet_id uuid, p_other_pet_id uuid, p_confidence double precision,
  p_context text, p_outcome text, p_message text, p_message_model text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_event_id uuid; v_pet_name text; v_other_name text := ''; v_station text; v_until timestamptz;
  v_paired boolean := p_action in ('take_photo','send_message');
begin
  if p_action not in ('take_photo','use_plotter','visit_refreshments','send_message') then raise exception 'unsupported action'; end if;
  v_station := case p_action when 'take_photo' then 'photo_wall' when 'use_plotter' then 'plotter' when 'visit_refreshments' then 'refreshments' end;
  select name into strict v_pet_name from public.island_pets where id = p_pet_id;
  if v_paired then
    if p_other_pet_id is null or p_other_pet_id = p_pet_id then raise exception 'partner required'; end if;
    select name into strict v_other_name from public.island_pets where id = p_other_pet_id;
  end if;
  if v_station is not null then
    select busy_until into strict v_until from public.island_stations where name = v_station for update;
    if v_until > pg_catalog.now() then raise exception '% busy', v_station; end if;
  end if;
  if p_action <> 'send_message' and (select count(*) from public.island_inventory where pet_id = p_pet_id) >= 12 then
    raise exception 'inventory full';
  end if;
  if p_action = 'take_photo' and (select count(*) from public.island_inventory where pet_id = p_other_pet_id) >= 12 then
    raise exception 'partner inventory full';
  end if;
  if p_action = 'use_plotter' and exists (select 1 from public.island_inventory where pet_id = p_pet_id and item_type = 'portrait') then
    raise exception 'portrait already ready';
  end if;
  if p_action = 'visit_refreshments' and p_outcome is distinct from 'food' and p_outcome is distinct from 'codex_cola' then
    raise exception 'invalid item';
  end if;
  if p_action = 'send_message' and (p_message is null or p_message_model is null or p_outcome is null) then
    raise exception 'message required';
  end if;
  insert into public.island_events(pet_id, pet_name, other_name, other_pet_id, action, confidence, context, outcome, message, message_model)
    values (p_pet_id, v_pet_name, v_other_name, case when v_paired then p_other_pet_id end, p_action, p_confidence, p_context,
      case when p_action in ('visit_refreshments','send_message') then p_outcome end,
      case when p_action = 'send_message' then p_message end,
      case when p_action = 'send_message' then p_message_model end)
    returning id into v_event_id;
  if p_action = 'take_photo' then
    insert into public.island_inventory(pet_id, event_id, item_type, partner_pet_id)
      values (p_pet_id, v_event_id, 'photo', p_other_pet_id), (p_other_pet_id, v_event_id, 'photo', p_pet_id);
  elsif p_action = 'use_plotter' then
    insert into public.island_inventory(pet_id, event_id, item_type) values (p_pet_id, v_event_id, 'portrait');
  elsif p_action = 'visit_refreshments' then
    insert into public.island_inventory(pet_id, event_id, item_type) values (p_pet_id, v_event_id, p_outcome);
  end if;
  if v_station is not null then
    update public.island_stations set busy_until = pg_catalog.now() + interval '20 seconds' where name = v_station;
  end if;
  return v_event_id;
end $$;
revoke all on function public.save_action(text,uuid,uuid,double precision,text,text,text,text) from public, anon, authenticated;
grant execute on function public.save_action(text,uuid,uuid,double precision,text,text,text,text) to service_role;

commit;
