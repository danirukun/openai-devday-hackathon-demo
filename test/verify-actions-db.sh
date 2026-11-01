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
clear_stations() { sql -c "update island_stations set busy_until=null;" > /dev/null; }

clear_stations
sql -c "set role service_role; select save_action('take_photo','$A','$B',0.7,'ctx',null,null,null);" > /dev/null
[ "$(sql -c "select count(*) from island_inventory where item_type='photo';")" = 2 ] || fail 'photo should go to both pets'
[ "$(sql -c "select other_pet_id from island_events where action='take_photo';")" = "$B" ] || fail 'photo partner not stored'
expect_error "select save_action('take_photo','$A','$B',0.7,'ctx',null,null,null);" 'photo_wall busy'
expect_error "select save_action('take_photo','$A','$A',0.7,'ctx',null,null,null);" 'partner required'

sql -c "set role service_role; select save_action('use_plotter','$A',null,0.7,'ctx',null,null,null);" > /dev/null
clear_stations
expect_error "select save_action('use_plotter','$A',null,0.7,'ctx',null,null,null);" 'portrait already ready'

sql -c "set role service_role; select save_action('visit_refreshments','$A',null,0.7,'ctx','codex_cola',null,null);" > /dev/null
clear_stations
expect_error "select save_action('visit_refreshments','$A',null,0.7,'ctx','coffee',null,null);" 'invalid item'

sql -c "set role service_role; select save_action('send_message','$A','$B',0.7,'ctx','punny','Ship it, Pip!','fake-model');" > /dev/null
[ "$(sql -c "select message||'|'||message_model||'|'||outcome from island_events where action='send_message';")" = 'Ship it, Pip!|fake-model|punny' ] || fail 'message not stored'
expect_error "select save_action('send_message','$A','$B',0.7,'ctx','punny',null,null);" 'message required'
expect_error "select save_action('send_message','$A','$B',0.7,'ctx','angry','Hi','m');" 'island_events_outcome_check'
expect_error "select save_action('send_message','$A','$B',0.7,'ctx','shy','$(printf 'x%.0s' $(seq 1 141))','m');" 'island_events_message_check'
expect_error "select save_action('dance','$A',null,0.7,'ctx',null,null,null);" 'unsupported action'
expect_error "insert into island_events(pet_id,pet_name,other_name,action,context) values ('$A','Mochi','Pip','send_message','no text');" 'island_events_message_pair_check'

# Inventory cap of 12, counting the existing dot, photo, portrait and cola.
clear_stations
sql -c "insert into island_inventory(pet_id,event_id,item_type) select '$A',(select id from island_events limit 1),'food' from generate_series(1,8);" > /dev/null
expect_error "select save_action('visit_refreshments','$A',null,0.7,'ctx','food',null,null);" 'inventory full'
expect_error "select save_action('take_photo','$B','$A',0.7,'ctx',null,null,null);" 'partner inventory full'

if sql -c "set role anon; select save_action('use_plotter','$B',null,0.7,'ctx',null,null,null);" > /dev/null 2>&1; then fail 'anon could save an action'; fi
[ "$(sql -c "select count(*) from island_stations;")" = 4 ] || fail 'expected four stations'
[ "$(sql -c "select count(*) from island_events where context='old';")" = 2 ] || fail 'old events changed'
echo 'PASS: actions.sql applies after the existing migrations and enforces its rules'
