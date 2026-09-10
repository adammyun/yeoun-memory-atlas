-- Run as the database owner. Exact coordinates and authors never have public table grants.
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create table public.memories (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 title text not null check (char_length(btrim(title)) between 1 and 100),
 content text not null check (char_length(btrim(content)) between 1 and 10000),
 location extensions.geography(Point,4326) not null,
 public_location extensions.geometry(Point,4326) not null,
 location_name text not null check (char_length(btrim(location_name)) between 1 and 160),
 memory_date date not null,
 emotion text not null check (emotion in ('calm','joy','longing','love','sadness')),
 visibility text not null default 'private' check (visibility in ('private','unlisted','public')),
 is_anonymous boolean not null default true,
 location_precision text not null default 'approximate' check (location_precision in ('exact','approximate')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
-- A stable 0.01 degree grid (~0.9–1.1 km in Seoul), not a new random offset per request.
-- Public filters, sorting, and counts must all use this public geometry, never location.
create function public.prepare_memory() returns trigger language plpgsql set search_path = '' as $$
begin
 if TG_OP = 'UPDATE' then
   if new.user_id <> old.user_id or new.id <> old.id then raise exception 'Immutable owner and ID'; end if;
   new.created_at := old.created_at;
 end if;
 new.public_location := case when new.location_precision = 'approximate'
   then extensions.st_snaptogrid(new.location::extensions.geometry,0.01)
   else new.location::extensions.geometry end;
 new.updated_at := now();
 return new;
end $$;
create trigger prepare_memory before insert or update on public.memories for each row execute function public.prepare_memory();
create index memories_location_gist on public.memories using gist(location);
create index memories_public_location_gist on public.memories using gist(public_location) where visibility='public';
create index memories_owner_created_idx on public.memories(user_id,created_at desc,id);
alter table public.memories enable row level security;
revoke all on public.memories from anon, authenticated;
grant select, delete on public.memories to authenticated;
grant insert (title,content,location,location_name,memory_date,emotion,visibility,is_anonymous,location_precision) on public.memories to authenticated;
grant update (title,content,location,location_name,memory_date,emotion,visibility,is_anonymous,location_precision) on public.memories to authenticated;
create policy owner_read on public.memories for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.memories for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.memories for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.memories for delete to authenticated using ((select auth.uid()) = user_id);

-- Deliberately no user_id/profile fields in this API type, even for non-anonymous rows.
create type public.memory_result as (
 id uuid, title text, content text, location_name text, memory_date date,
 emotion text, visibility text, is_anonymous boolean, location_precision text,
 lng double precision, lat double precision, created_at timestamptz, owned boolean
);
create function public.map_memories(west double precision,south double precision,east double precision,north double precision,own_only boolean default false)
returns setof public.memory_result language plpgsql stable security definer set search_path = '' as $$
declare box extensions.geometry;
begin
 if west is null or east is null or south is null or north is null
 or not (west >= -180 and east <= 180 and south >= -85 and north <= 85 and west < east and south < north)
 then raise exception 'Invalid viewport' using errcode='22023'; end if;
 box := extensions.st_makeenvelope(west,south,east,north,4326);
 if own_only then
   if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
   return query select m.id,m.title,left(m.content,180),m.location_name,m.memory_date,m.emotion,m.visibility,m.is_anonymous,m.location_precision,
   extensions.st_x(m.location::extensions.geometry),extensions.st_y(m.location::extensions.geometry),m.created_at,true
   from public.memories m where m.user_id=auth.uid() and extensions.st_intersects(m.location,box::extensions.geography)
   order by m.created_at desc,m.id limit 301;
 else
   return query select m.id,m.title,left(m.content,180),m.location_name,m.memory_date,m.emotion,m.visibility,m.is_anonymous,m.location_precision,
   extensions.st_x(m.public_location),extensions.st_y(m.public_location),m.created_at,false
   from public.memories m where m.visibility='public' and m.public_location && box and extensions.st_intersects(m.public_location,box)
   order by m.created_at desc,m.id limit 301;
 end if;
end $$;
create function public.memory_detail(memory_id uuid,own_only boolean default false)
returns setof public.memory_result language sql stable security definer set search_path = '' as $$
 select m.id,m.title,m.content,m.location_name,m.memory_date,m.emotion,m.visibility,m.is_anonymous,m.location_precision,
 extensions.st_x(case when own_only then m.location::extensions.geometry else m.public_location end),
 extensions.st_y(case when own_only then m.location::extensions.geometry else m.public_location end),m.created_at,own_only
 from public.memories m where m.id=memory_id and
 ((own_only and m.user_id=auth.uid()) or (not own_only and m.visibility='public'));
$$;
-- Unlisted sharing is intentionally not exposed in this vertical slice.
revoke all on function public.prepare_memory() from public,anon,authenticated;
revoke all on function public.map_memories(double precision,double precision,double precision,double precision,boolean) from public;
revoke all on function public.memory_detail(uuid,boolean) from public;
grant execute on function public.map_memories(double precision,double precision,double precision,double precision,boolean) to anon,authenticated;
grant execute on function public.memory_detail(uuid,boolean) to anon,authenticated;

create table public.memory_media (
 id uuid primary key default gen_random_uuid(),
 memory_id uuid not null references public.memories(id) on delete cascade,
 storage_path text not null unique,
 position integer not null default 0 check (position>=0),
 created_at timestamptz not null default now()
);
create index memory_media_memory_idx on public.memory_media(memory_id,position);
alter table public.memory_media enable row level security;
revoke all on public.memory_media from anon,authenticated;
grant select,insert,delete on public.memory_media to authenticated;
create policy media_owner_read on public.memory_media for select to authenticated using (exists(select 1 from public.memories m where m.id=memory_id and m.user_id=(select auth.uid())));
create policy media_owner_insert on public.memory_media for insert to authenticated with check (
 storage_path like (select auth.uid())::text || '/' || memory_id::text || '/%'
 and exists(select 1 from public.memories m where m.id=memory_id and m.user_id=(select auth.uid()))
);
create policy media_owner_delete on public.memory_media for delete to authenticated using (exists(select 1 from public.memories m where m.id=memory_id and m.user_id=(select auth.uid())));
-- Reserved for the next photo slice. Never create a public bucket for private memories.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('memory-images','memory-images',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
-- No Storage object policies yet: uploads and downloads are closed until the photo flow,
-- EXIF stripping, authorization and short-lived delivery are implemented together.
