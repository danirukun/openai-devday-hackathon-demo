-- Browser ownership is private; public clients only receive a computed canControl flag.
create table public.island_pet_owners (
 pet_id uuid primary key references public.island_pets(id) on delete cascade,
 owner_hash text not null check(owner_hash ~ '^[a-f0-9]{64}$')
);
create index island_pet_owners_hash_idx on public.island_pet_owners(owner_hash);
alter table public.island_pet_owners enable row level security;
revoke all on public.island_pet_owners from public,anon,authenticated;
grant select,insert,delete on public.island_pet_owners to service_role;
alter table public.island_pets add column busy_until timestamptz;
alter table public.island_events add column source text not null default 'autonomous' check(source in ('autonomous','owner'));
alter table public.island_events add column command_id uuid unique;

create function public.create_owned_pet(p_owner_hash text,p_slug text,p_name text,p_sprite text,p_credit text,p_personality text)
returns setof public.island_pets language plpgsql security invoker set search_path='' as $$
declare v_pet public.island_pets;
begin
 if p_owner_hash is null or p_owner_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid owner' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(73639501);
 if (select count(*) from public.island_pets)>=50 then raise exception 'island full'; end if;
 insert into public.island_pets(slug,name,sprite,credit,personality) values(p_slug,p_name,p_sprite,p_credit,p_personality) returning * into v_pet;
 insert into public.island_pet_owners(pet_id,owner_hash) values(v_pet.id,p_owner_hash);
 return next v_pet;
end $$;
revoke all on function public.create_owned_pet(text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.create_owned_pet(text,text,text,text,text,text) to service_role;

-- Both the AI and owner route pass through this guard before the existing atomic effects.
alter function public.save_pet_turn(text,uuid,uuid,double precision,text,text,text,text) rename to apply_pet_turn_effects;
create function public.save_pet_turn(p_action text,p_pet_id uuid,p_other_pet_id uuid,p_confidence double precision,p_context text,p_outcome text,p_message text,p_message_model text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_ids uuid[];v_id uuid;v_pair boolean;
begin
 v_pair:=p_action in ('approach','wave','take_photo','send_message');
 v_ids:=case when v_pair then array[p_pet_id,p_other_pet_id] else array[p_pet_id] end;
 perform id from public.island_pets where id=any(v_ids) order by id for update;
 if exists(select 1 from public.island_pets where id=any(v_ids) and busy_until>pg_catalog.clock_timestamp()) then raise exception 'pet busy' using errcode='55P03'; end if;
 v_id:=public.apply_pet_turn_effects(p_action,p_pet_id,p_other_pet_id,p_confidence,p_context,p_outcome,p_message,p_message_model);
 if p_action in ('use_printer','take_photo','use_plotter','visit_refreshments') then
  update public.island_pets set busy_until=pg_catalog.clock_timestamp()+interval '20 seconds'
   where id=p_pet_id or (p_action='take_photo' and id=p_other_pet_id);
 end if;
 return v_id;
end $$;
revoke all on function public.save_pet_turn(text,uuid,uuid,double precision,text,text,text,text) from public,anon,authenticated;
grant execute on function public.save_pet_turn(text,uuid,uuid,double precision,text,text,text,text) to service_role;

create function public.save_owner_action(p_owner_hash text,p_pet_id uuid,p_action text,p_other_pet_id uuid,p_outcome text,p_request_id uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid;v_pair boolean;v_ids uuid[];
begin
 if not exists(select 1 from public.island_pet_owners where pet_id=p_pet_id and owner_hash=p_owner_hash) then raise exception 'not owner' using errcode='42501'; end if;
 if p_request_id is null or p_action is null or p_action not in ('wave','explore','visit_refreshments','take_photo','use_printer') then raise exception 'invalid command' using errcode='22023'; end if;
 v_pair:=p_action in ('wave','take_photo');
 if (v_pair and (p_other_pet_id is null or p_other_pet_id=p_pet_id)) or (not v_pair and p_other_pet_id is not null) then raise exception 'invalid partner' using errcode='22023'; end if;
 if (p_action='use_printer' and (p_outcome is null or p_outcome not in ('pink_dot','blue_dot','yellow_dot'))) or
    (p_action='visit_refreshments' and (p_outcome is null or p_outcome not in ('food','codex_cola'))) or
    (p_action not in ('use_printer','visit_refreshments') and p_outcome is not null) then raise exception 'invalid outcome' using errcode='22023'; end if;
 v_ids:=case when v_pair then array[p_pet_id,p_other_pet_id] else array[p_pet_id] end;
 perform id from public.island_pets where id=any(v_ids) order by id for update;
 if (select count(*) from public.island_pets where id=any(v_ids))<>cardinality(v_ids) then raise exception 'invalid pet' using errcode='22023'; end if;
 select id into v_id from public.island_events where command_id=p_request_id and pet_id=p_pet_id and source='owner';
 if v_id is not null then return v_id; end if;
 v_id:=public.save_pet_turn(p_action,p_pet_id,p_other_pet_id,1,'Requested by the pet owner.',p_outcome,null,null);
 update public.island_events set source='owner',confidence=null,command_id=p_request_id where id=v_id;
 update public.island_pets set busy_until=pg_catalog.clock_timestamp()+interval '20 seconds' where id=any(v_ids);
 return v_id;
end $$;
revoke all on function public.save_owner_action(text,uuid,text,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.save_owner_action(text,uuid,text,uuid,text,uuid) to service_role;

-- Preserve any station actions that were already in progress at migration time.
update public.island_pets p set busy_until=active.until from (
 select pet_id,max(created_at+interval '20 seconds') until from (
  select pet_id,created_at from public.island_events where action in ('use_printer','take_photo','use_plotter','visit_refreshments')
  union all select other_pet_id,created_at from public.island_events where action='take_photo'
 ) events where created_at>now()-interval '20 seconds' group by pet_id
) active where p.id=active.pet_id;
