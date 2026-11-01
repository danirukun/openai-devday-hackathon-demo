#!/bin/sh
set -eu
repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
scratch_dir=$(mktemp -d "${TMPDIR:-/tmp}/neodots-controls.XXXXXX")
cleanup(){ if [ -f "$scratch_dir/data/postmaster.pid" ]; then pg_ctl -D "$scratch_dir/data" -m immediate stop >/dev/null; fi; rm -rf "$scratch_dir"; }
trap cleanup EXIT INT TERM
initdb -D "$scratch_dir/data" --auth=trust --no-instructions >/dev/null
pg_ctl -D "$scratch_dir/data" -o "-F -p 39433 -k $scratch_dir -c listen_addresses=''" -w start >/dev/null
sql(){ psql -h "$scratch_dir" -p 39433 -d postgres -v ON_ERROR_STOP=1 -Atq "$@"; }
fail(){ echo "FAIL: $1"; exit 1; }
expect_error(){ if sql -c "set role service_role; $1" >"$scratch_dir/error" 2>&1; then fail 'expected rejection'; fi; rg -q "$2" "$scratch_dir/error" || { cat "$scratch_dir/error";fail "wrong rejection: $2"; }; }
sql -c 'create role anon; create role authenticated; create role service_role bypassrls;' >/dev/null
for f in schema.sql capacity.sql upload.sql printer.sql actions.sql supabase/migrations/20261101164901_shared_pet_needs.sql supabase/migrations/20261101172058_pet_action_controls.sql; do sql -f "$repo_dir/$f" >/dev/null; done
HASH=$(printf '%064d' 1)
OTHER=$(printf '%064d' 2)
A=$(sql -c "set role service_role; select id from create_owned_pet('$HASH','owner-test','Owner Test','https://assets.petdex.dev/test','fixture','friendly fixture');")
B=$(sql -c "set role service_role; select id from create_owned_pet('$OTHER','other-test','Other Test','https://assets.petdex.dev/test','fixture','friendly fixture');")
R=00000000-0000-4000-8000-000000000001
expect_error "select save_owner_action('$OTHER','$A','explore',null,null,'$R');" 'not owner'
expect_error "select save_owner_action('$HASH','$A','move',null,null,'$R');" 'invalid command'
expect_error "select save_owner_action('$HASH','$A','wave','$A',null,'$R');" 'invalid partner'
ID=$(sql -c "set role service_role; select save_owner_action('$HASH','$A','use_printer',null,'pink_dot','$R');")
RETRY=$(sql -c "set role service_role; select save_owner_action('$HASH','$A','use_printer',null,'pink_dot','$R');")
[ "$ID" = "$RETRY" ] || fail 'retry duplicated event'
[ "$(sql -c "select count(*) from island_inventory where pet_id='$A';")" = 1 ] || fail 'retry duplicated inventory'
[ "$(sql -c "select source||':'||(confidence is null) from island_events where id='$ID';")" = owner:true ] || fail 'owner action attributed to AI'
expect_error "select save_pet_turn('explore','$A',null,.8,'AI',null,null,null);" 'pet busy'
expect_error "select save_owner_action('$HASH','$A','explore',null,null,gen_random_uuid());" 'pet busy'
sql -c "update island_pets set busy_until=now()-interval '1 second'; update island_stations set busy_until=null;" >/dev/null
sql -c "set role service_role; select save_pet_turn('explore','$A',null,.8,'AI resumes',null,null,null);" >/dev/null
sql -c "set role service_role; select save_owner_action('$HASH','$A','wave','$B',null,gen_random_uuid());" >/dev/null
expect_error "select save_owner_action('$OTHER','$B','wave','$A',null,gen_random_uuid());" 'pet busy'
sql -c "update island_pets set busy_until=null; update island_stations set busy_until=now()+interval '1 minute' where name='photo_wall';" >/dev/null
BEFORE=$(sql -c 'select count(*) from island_events;')
expect_error "select save_owner_action('$HASH','$A','take_photo','$B',null,gen_random_uuid());" 'photo_wall busy'
[ "$(sql -c 'select count(*) from island_events;')" = "$BEFORE" ] || fail 'failed command wrote event'
[ "$(sql -c 'select count(*) from island_pets where busy_until is not null;')" = 0 ] || fail 'failed command reserved pets'
for role in anon authenticated; do
 if sql -c "set role $role; select * from island_pet_owners;" >/dev/null 2>&1;then fail "$role sees ownership";fi
 if sql -c "set role $role; select save_owner_action('$HASH','$A','explore',null,null,gen_random_uuid());" >/dev/null 2>&1;then fail "$role can command";fi
done
# Hold the command transaction open while an AI writer competes for the actor.
sql -c "begin; set role service_role; select save_owner_action('$HASH','$A','explore',null,null,gen_random_uuid()); select pg_sleep(.4); commit;" >"$scratch_dir/owner" 2>&1 &
owner_pid=$!
sleep .1
if sql -c "set role service_role; select save_pet_turn('explore','$A',null,.8,'race',null,null,null);" >"$scratch_dir/race" 2>&1;then fail 'AI overrode owner';fi
wait "$owner_pid"
rg -q 'pet busy' "$scratch_dir/race" || fail 'wrong AI race failure'
echo 'PASS: ownership, idempotency, actor/partner reservations, autonomy resume, rollback, role isolation and racing writes'
