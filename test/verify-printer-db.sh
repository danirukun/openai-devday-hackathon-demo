#!/bin/sh
set -eu
repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
scratch_dir=$(mktemp -d /private/tmp/pet-printer.XXXXXX)
cleanup() {
  if [ -f "$scratch_dir/data/postmaster.pid" ]; then pg_ctl -D "$scratch_dir/data" -m immediate stop >/dev/null; fi
  rm -rf "$scratch_dir"
}
trap cleanup EXIT INT TERM
initdb -D "$scratch_dir/data" --auth=trust --no-instructions > /dev/null
pg_ctl -D "$scratch_dir/data" -o "-F -p 39431 -k $scratch_dir -c listen_addresses=''" -w start > /dev/null
psql -h "$scratch_dir" -p 39431 -d postgres -v ON_ERROR_STOP=1 -q -c 'create role anon; create role authenticated; create role service_role;' > /dev/null
psql -h "$scratch_dir" -p 39431 -d postgres -v ON_ERROR_STOP=1 -q -f "$repo_dir/schema.sql" > /dev/null
psql -h "$scratch_dir" -p 39431 -d postgres -v ON_ERROR_STOP=1 -q -f "$repo_dir/printer.sql" > /dev/null
psql -h "$scratch_dir" -p 39431 -d postgres -v ON_ERROR_STOP=1 -q -c "insert into island_pets(id,slug,name,sprite,credit,personality) values ('00000000-0000-4000-8000-000000000001','test-a','A','https://assets.petdex.dev/a','test','fictional pet'),('00000000-0000-4000-8000-000000000002','test-b','B','https://assets.petdex.dev/b','test','fictional pet');" > /dev/null
psql -h "$scratch_dir" -p 39431 -d postgres -v ON_ERROR_STOP=1 -q -c "begin; select save_printer_action('00000000-0000-4000-8000-000000000001','',0.5,'fake','pink_dot'); select pg_sleep(2); commit;" > "$scratch_dir/first" 2>&1 &
first_pid=$!
sleep 0.4
if psql -h "$scratch_dir" -p 39431 -d postgres -v ON_ERROR_STOP=1 -q -c "select save_printer_action('00000000-0000-4000-8000-000000000002','',0.5,'fake','blue_dot');" > "$scratch_dir/second" 2>&1; then
  echo 'FAIL: simultaneous printer action succeeded'
  exit 1
fi
wait "$first_pid"
if ! rg -q 'printer busy' "$scratch_dir/second"; then
  echo 'FAIL: second request did not fail with printer busy'
  exit 1
fi
counts=$(psql -h "$scratch_dir" -p 39431 -d postgres -Atq -c 'select (select count(*) from island_events), (select count(*) from island_inventory);')
if [ "$counts" != '1|1' ]; then
  echo 'FAIL: expected one event and one inventory item'
  exit 1
fi
printf 'PASS: competing printer writes produced one event and one item; the second received printer busy.\n'
