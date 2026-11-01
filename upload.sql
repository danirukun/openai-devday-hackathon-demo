-- Run once after schema.sql and capacity.sql for ZIP pet uploads.
create table public.island_uploaded_sprites (
 id uuid primary key,
 content_type text not null check (content_type in ('image/png', 'image/webp')),
 data bytea not null check (octet_length(data) <= 5242880),
 created_at timestamptz not null default now()
);
alter table public.island_uploaded_sprites enable row level security;
revoke all on public.island_uploaded_sprites from anon, authenticated;
grant select, insert, delete on public.island_uploaded_sprites to service_role;
alter table public.island_pets drop constraint island_pets_sprite_check;
alter table public.island_pets add constraint island_pets_sprite_check check (
 sprite like 'https://assets.petdex.dev/%' or sprite ~ '^island-upload://[0-9a-f-]{36}$'
);
