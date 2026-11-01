create table public.island_pet_needs (
 pet_id uuid primary key references public.island_pets(id) on delete cascade,
 fullness numeric not null default 70 check(fullness between 10 and 100),
 energy numeric not null default 70 check(energy between 10 and 100),
 fun numeric not null default 70 check(fun between 10 and 100),
 social numeric not null default 70 check(social between 10 and 100),
 settled_at timestamptz not null default now()
);
alter table public.island_pet_needs enable row level security;
revoke all on public.island_pet_needs from public, anon, authenticated;
grant select,insert,update on public.island_pet_needs to service_role;
insert into public.island_pet_needs(pet_id) select id from public.island_pets;
create function public.init_pet_needs() returns trigger language plpgsql security invoker set search_path='' as $$
begin insert into public.island_pet_needs(pet_id) values(new.id); return new; end $$;
revoke all on function public.init_pet_needs() from public,anon,authenticated;
grant execute on function public.init_pet_needs() to service_role;
create trigger island_pet_needs_init after insert on public.island_pets for each row execute function public.init_pet_needs();
create function public.pet_mood(f numeric,e numeric,u numeric,s numeric) returns text language sql immutable set search_path='' as $$
 select case when least(f,e,u,s)<30 then case least(f,e,u,s) when f then 'hungry' when e then 'sleepy' when u then 'bored' else 'lonely' end when least(f,e,u,s)>75 then 'excited' else 'happy' end
$$;
create function public.project_pet_needs_at(p_pet_ids uuid[], p_as_of timestamptz) returns table(pet_id uuid,fullness numeric,energy numeric,fun numeric,social numeric,mood text,as_of timestamptz) language sql stable security invoker set search_path='' as $$
 with vals as(select n.pet_id,greatest(10,n.fullness-10*h) f,greatest(10,n.energy-8*h) e,greatest(10,n.fun-10*h) u,greatest(10,n.social-12*h) s from public.island_pet_needs n cross join lateral(select greatest(0,extract(epoch from (p_as_of-n.settled_at)))/3600 h) t where n.pet_id=any(p_pet_ids))
 select vals.pet_id,f,e,u,s,public.pet_mood(f,e,u,s),p_as_of from vals
$$;
create function public.project_pet_needs(p_pet_ids uuid[]) returns table(pet_id uuid,fullness numeric,energy numeric,fun numeric,social numeric,mood text,as_of timestamptz) language sql stable security invoker set search_path='' as $$ select * from public.project_pet_needs_at(p_pet_ids,now()) $$;
revoke all on function public.project_pet_needs_at(uuid[],timestamptz) from public,anon,authenticated;
grant execute on function public.project_pet_needs_at(uuid[],timestamptz) to service_role;
revoke all on function public.pet_mood(numeric,numeric,numeric,numeric),public.project_pet_needs(uuid[]) from public,anon,authenticated;
grant execute on function public.pet_mood(numeric,numeric,numeric,numeric),public.project_pet_needs(uuid[]) to service_role;
create function public.save_pet_turn(p_action text,p_pet_id uuid,p_other_pet_id uuid,p_confidence double precision,p_context text,p_outcome text,p_message text,p_message_model text) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_actor text; v_partner text:=''; v_ids uuid[]; v_pair boolean; v_time timestamptz:=now();
begin
 if p_action is null or p_action not in ('approach','wave','explore','use_printer','take_photo','use_plotter','visit_refreshments','send_message') then raise exception 'invalid action'; end if;
 if p_confidence is null or not(p_confidence between 0 and 1) then raise exception 'invalid confidence'; end if;
 v_pair:=p_action in ('approach','wave','take_photo','send_message');
 select name into strict v_actor from public.island_pets where id=p_pet_id;
 v_ids:=array[p_pet_id];
 if v_pair then
  if p_other_pet_id is null or p_other_pet_id=p_pet_id then raise exception 'partner required'; end if;
  select name into strict v_partner from public.island_pets where id=p_other_pet_id;
  v_ids:=array[p_pet_id,p_other_pet_id];
 end if;
 perform pet_id from public.island_pet_needs where pet_id=any(v_ids) order by pet_id for update;
 if (select count(*) from public.island_pet_needs where pet_id=any(v_ids))<>cardinality(v_ids) then raise exception 'needs unavailable'; end if;
 v_time:=clock_timestamp();
 if p_action='use_printer' then
  if p_outcome is null then raise exception 'invalid dot'; end if;
  v_id:=public.save_printer_action(p_pet_id,'',p_confidence,p_context,p_outcome);
 elsif p_action in ('take_photo','use_plotter','visit_refreshments','send_message') then
  v_id:=public.save_action(p_action,p_pet_id,case when v_pair then p_other_pet_id end,p_confidence,p_context,p_outcome,p_message,p_message_model);
 else
  if p_outcome is not null or p_message is not null or p_message_model is not null then raise exception 'unexpected outcome'; end if;
  insert into public.island_events(pet_id,pet_name,other_pet_id,other_name,action,confidence,context) values(p_pet_id,v_actor,case when v_pair then p_other_pet_id end,v_partner,p_action,p_confidence,p_context) returning id into v_id;
 end if;
 update public.island_pet_needs n set
 fullness=least(100,greatest(10,p.fullness+case when n.pet_id=p_pet_id and p_action='visit_refreshments' and p_outcome='food' then 35 else 0 end)),
 energy=least(100,greatest(10,p.energy+case when n.pet_id=p_pet_id and p_action='visit_refreshments' and p_outcome='codex_cola' then 30 when n.pet_id=p_pet_id and p_action='explore' then -10 else 0 end)),
 fun=least(100,greatest(10,p.fun+case when p_action='take_photo' then 20 when n.pet_id=p_pet_id and p_action in ('use_printer','use_plotter') then 25 when n.pet_id=p_pet_id and p_action='explore' then 15 else 0 end)),
 social=least(100,greatest(10,p.social+case when p_action='take_photo' then 25 when p_action in ('approach','wave') then 10 when p_action='send_message' and n.pet_id=p_pet_id then 15 when p_action='send_message' then 20 else 0 end)),
 settled_at=v_time
 from public.project_pet_needs_at(v_ids,v_time) p where n.pet_id=p.pet_id;
 return v_id;
end $$;
revoke all on function public.save_pet_turn(text,uuid,uuid,double precision,text,text,text,text) from public,anon,authenticated;
grant execute on function public.save_pet_turn(text,uuid,uuid,double precision,text,text,text,text) to service_role;
