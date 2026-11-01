#!/bin/sh
# Applies every migration to a throwaway local Postgres and checks actions.sql.
# Needs initdb, pg_ctl and psql on PATH (for example inside the official postgres Docker image):
#   docker run --rm -v "$PWD":/repo:ro postgres:17 su postgres -c 'sh /repo/test/verify-actions-db.sh'
set -eu
repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
scratch_dir=$(mktemp -d "${TMPDIR:-/tmp}/pet-actions.XXXXXX")
cleanup() {
  if [ -f "$scratch_dir/data/postmaster.pid" ]; then pg_ctl -D "$scratch_dir/data" -m immediate stop >/dev/null; fi
  rm -rf "$scratch_dir"
}
trap cleanup EXIT INT TERM
initdb -D "$scratch_dir/data" --auth=trust --no-instructions > /dev/null
pg_ctl -D "$scratch_dir/data" -o "-F -p 39432 -k $scratch_dir -c listen_addresses=''" -w start > /dev/null
sql() { psql -h "$scratch_dir" -p 39432 -d postgres -v ON_ERROR_STOP=1 -Atq "$@"; }
fail() { echo "FAIL: $1"; exit 1; }
# Runs as service_role and expects an error containing $2.
expect_error() {
  if sql -c "set role service_role; $1" > "$scratch_dir/out" 2>&1; then fail "expected an error: $1"; fi
  grep -q "$2" "$scratch_dir/out" || { cat "$scratch_dir/out"; fail "wrong error for: $1"; }
}
A=00000000-0000-4000-8000-00000000000a
B=00000000-0000-4000-8000-00000000000b

sql -c 'create role anon; create role authenticated; create role service_role bypassrls;' > /dev/null  # as in Supabase
for f in schema.sql capacity.sql upload.sql printer.sql; do sql -f "$repo_dir/$f" > /dev/null; done
# Rows written before actions.sql must stay valid.
sql -c "insert into island_pets(id,slug,name,sprite,credit,personality) values ('$A','test-a','Mochi','https://assets.petdex.dev/a','test','fictional pet'),('$B','test-b','Pip','https://assets.petdex.dev/b','test','fictional pet');
  insert into island_events(pet_id,pet_name,other_name,action,confidence,context) values ('$A','Mochi','Pip','wave',0.5,'old');
  set role service_role; select save_printer_action('$A','Pip',0.5,'old','pink_dot');" > /dev/null
sql -f "$repo_dir/actions.sql" > /dev/null
sql -f "$repo_dir/supabase/migrations/20261101164901_shared_pet_needs.sql" > /dev/null
sql -c "update island_stations set busy_until=null;" >/dev/null
sql -v a="$A" -v b="$B" <<'SQL'
begin;
set role service_role;
do $$
declare a uuid:='00000000-0000-4000-8000-00000000000a'; b uuid:='00000000-0000-4000-8000-00000000000b'; r record; before_count int; old_state jsonb;
begin
 assert (select count(*) from public.island_pet_needs)=2, 'backfill';
 select * into r from public.project_pet_needs_at(array[a],now()+interval '1 hour');
 assert abs(r.fullness-60)<0.1 and abs(r.energy-62)<0.1 and abs(r.fun-60)<0.1 and abs(r.social-58)<0.1,'hour decay';
 select * into r from public.project_pet_needs_at(array[a],now()+interval '100 hours'); assert r.fullness=10 and r.social=10,'floor';
 select * into r from public.project_pet_needs_at(array[a],now()-interval '1 hour'); assert r.fullness=70,'negative time';
 assert public.pet_mood(29,29,70,70)='hungry','tie';
 assert public.pet_mood(30,70,70,70)='happy','threshold';
 assert public.pet_mood(76,76,76,76)='excited','excited';
 assert public.pet_mood(75,76,76,76)='happy','75 boundary';
 assert public.pet_mood(70,20,70,70)='sleepy','sleepy';
 assert public.pet_mood(70,70,20,70)='bored','bored';
 assert public.pet_mood(70,70,70,20)='lonely','lonely';
 perform public.save_pet_turn('take_photo',a,b,0.8,'fixture',null,null,null);
 select * into r from public.island_pet_needs where pet_id=b; assert r.fun>89 and r.social>94,'photo partner gains';
 select count(*) into before_count from public.island_events;
 select to_jsonb(n) into old_state from public.island_pet_needs n where pet_id=a;
 begin perform public.save_pet_turn('take_photo',a,b,0.8,'fixture',null,null,null); raise exception 'expected busy error'; exception when others then if sqlerrm='expected busy error' then raise; end if; end;
 assert (select count(*) from public.island_events)=before_count,'rollback event';
 assert (select to_jsonb(n) from public.island_pet_needs n where pet_id=a)=old_state,'rollback needs';
 perform public.save_pet_turn('explore',a,null,0.8,'fixture',null,null,null);
 select * into r from public.island_pet_needs where pet_id=a; assert r.energy<60.01 and r.energy>59 and r.fun=100,'explore';
 perform public.save_pet_turn('wave',a,b,0.8,'fixture',null,null,null);
 assert (select social from public.island_pet_needs where pet_id=b)=100,'social cap';
 perform public.save_pet_turn('visit_refreshments',a,null,0.8,'fixture','food',null,null);
 assert (select fullness from public.island_pet_needs where pet_id=a)=100,'food gain';
 update public.island_stations set busy_until=null;
 perform public.save_pet_turn('visit_refreshments',a,null,0.8,'fixture','codex_cola',null,null);
 assert (select energy from public.island_pet_needs where pet_id=a)>89,'cola gain';
 perform public.save_pet_turn('use_printer',a,null,0.8,'fixture','blue_dot',null,null);
 perform public.save_pet_turn('use_plotter',a,null,0.8,'fixture',null,null,null);
 assert (select fun from public.island_pet_needs where pet_id=a)=100,'printer and plotter cap';
 perform public.save_pet_turn('send_message',a,b,0.8,'fixture','cheerful','Hello!','fake-model');
 perform public.project_pet_needs(array[a,b]);
 assert (select count(*) from public.island_events where context='old')=2,'old records preserved';
end $$;
rollback;
SQL
if sql -c "set role anon; select * from public.project_pet_needs(array['$A'::uuid]);" >/dev/null 2>&1; then fail 'anon could read needs'; fi
sql -c "set role service_role; insert into island_pets(slug,name,sprite,credit,personality) values ('new','New','https://assets.petdex.dev/a','test','fictional pet');" >/dev/null
[ "$(sql -c 'select count(*) from island_pet_needs;')" = 3 ] || fail 'new pet trigger'
echo 'PASS: needs projection, moods, effects, rollback, privileges and initialization'

# Opposite participant ordering must not deadlock or lose either social gain.
sql -c "update island_pet_needs set social=70,settled_at=now();" >/dev/null
sql -c "begin; set role service_role; select save_pet_turn('wave','$A','$B',0.8,'concurrent-a',null,null,null); select pg_sleep(0.2); commit;" >/dev/null &
first=$!
sql -c "begin; set role service_role; select save_pet_turn('wave','$B','$A',0.8,'concurrent-b',null,null,null); commit;" >/dev/null &
second=$!
wait "$first"
wait "$second"
[ "$(sql -c "select count(*) from island_pet_needs where pet_id in ('$A','$B') and social>89 and social<=90;")" = 2 ] || fail 'concurrent gains lost'
echo 'PASS: concurrent reverse-order paired actions'
