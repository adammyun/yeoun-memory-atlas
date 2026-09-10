-- Integration test: execute against a fresh LOCAL Supabase database after the migration.
-- Test identities and data are rolled back. A failure aborts the transaction.
begin;
create function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',message; end if; end $$;
insert into auth.users(id,email) values
 ('10000000-0000-0000-0000-000000000001','privacy-a@example.invalid'),
 ('10000000-0000-0000-0000-000000000002','privacy-b@example.invalid');
insert into public.memories(id,user_id,title,content,location,location_name,memory_date,emotion,visibility,is_anonymous,location_precision) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','private','secret','SRID=4326;POINT(127.04321 37.54321)','park','2026-09-10','calm','private',true,'exact'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','anonymous approximate','public text','SRID=4326;POINT(127.04321 37.54321)','park','2026-09-10','calm','public',true,'approximate'),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','unlisted','hidden link','SRID=4326;POINT(127.04321 37.54321)','park','2026-09-10','calm','unlisted',true,'exact'),
 ('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','exact public','public text','SRID=4326;POINT(127.06 37.56)','park','2026-09-10','joy','public',false,'exact');
set local role anon;
select pg_temp.assert((select count(*)=2 from public.map_memories(127,37.5,127.1,37.6)), 'public viewport excludes private and unlisted');
select pg_temp.assert((select count(*)=0 from public.map_memories(127.04320,37.54320,127.04322,37.54322)), 'public viewport cannot probe original approximate coordinates');
select pg_temp.assert((select count(*)=0 from public.memory_detail('20000000-0000-0000-0000-000000000001')), 'anonymous private detail hidden');
select pg_temp.assert((select count(*)=0 from public.memory_detail('20000000-0000-0000-0000-000000000003')), 'unlisted detail not exposed in MVP');
select pg_temp.assert((select abs(lng-127.04)<0.000001 and abs(lat-37.54)<0.000001 from public.memory_detail('20000000-0000-0000-0000-000000000002')), 'approximate detail uses stable grid');
select pg_temp.assert((select not (to_jsonb(m) ?| array['user_id','profile','email','location','public_location']) from public.memory_detail('20000000-0000-0000-0000-000000000002') m), 'public payload contains no identity or raw location fields');
do $$ begin
 begin perform count(*) from public.memories; raise exception 'FAIL: raw anonymous table access'; exception when insufficient_privilege then null; end;
 begin perform * from public.map_memories(127,37.5,127.1,37.6,true); raise exception 'FAIL: anonymous owner query'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select pg_temp.assert((select count(*)=1 from public.memories), 'other user sees only own raw rows');
select pg_temp.assert((select count(*)=0 from public.memory_detail('20000000-0000-0000-0000-000000000001',true)), 'other user cannot request private owner detail');
select pg_temp.assert((select count(*)=1 from public.map_memories(127,37.5,127.1,37.6,true)), 'own map enforces JWT identity');
with changed as (update public.memories set title='attack' where id='20000000-0000-0000-0000-000000000001' returning id)
select pg_temp.assert((select count(*)=0 from changed),'other user cannot update private memory');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select pg_temp.assert((select count(*)=3 from public.memories), 'owner reads all own visibilities');
select pg_temp.assert((select abs(lng-127.04321)<0.000001 from public.memory_detail('20000000-0000-0000-0000-000000000002',true)), 'owner retains original position');
update public.memories set visibility='private' where id='20000000-0000-0000-0000-000000000002';
reset role;
set local role anon;
select pg_temp.assert((select count(*)=1 from public.map_memories(127,37.5,127.1,37.6)), 'visibility revocation immediately removes public result');
select pg_temp.assert((select count(*)=0 from public.memory_detail('20000000-0000-0000-0000-000000000002')), 'visibility revocation also closes detail');
reset role;
rollback;
