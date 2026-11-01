-- Applied to the hackathon project via Supabase migration `pet_island`.
create table public.island_pets (
 id uuid primary key default gen_random_uuid(),
 slug text not null check (length(slug) between 1 and 100),
 name text not null check (length(name) between 1 and 60),
 sprite text not null check (sprite like 'https://assets.petdex.dev/%'),
 credit text not null check (length(credit) <= 80),
 personality text not null check (length(personality) between 3 and 120),
 created_at timestamptz not null default now()
);
create table public.island_events (
 id uuid primary key default gen_random_uuid(),
 pet_id uuid not null references public.island_pets(id) on delete cascade,
 pet_name text not null,
 other_name text not null,
 action text not null check (action in ('approach','wave','explore')),
 confidence double precision check (confidence between 0 and 1),
 context text not null,
 created_at timestamptz not null default now()
);
alter table public.island_pets enable row level security;
alter table public.island_events enable row level security;
revoke all on public.island_pets, public.island_events from anon, authenticated;
grant select, insert, update, delete on public.island_pets, public.island_events to service_role;
create index island_events_created_at_idx on public.island_events(created_at desc);
