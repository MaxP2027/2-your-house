begin;
create extension if not exists pgtap with schema extensions;
select plan(15);
select has_table('public', 'profiles', 'Profiles table exists');

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
('10000000-0000-0000-0000-000000000001', 'customer@example.test', now(), '{"full_name":"  Test Customer  ","role":"customer"}'),
('10000000-0000-0000-0000-000000000002', 'technician@example.test', now(), '{"full_name":"Test Technician","role":"technician"}'),
('10000000-0000-0000-0000-000000000003', 'unconfirmed@example.test', null, '{"full_name":"Unconfirmed User","role":"customer"}');
select is((select count(*)::integer from public.profiles), 3, 'Trigger created all profiles');
select throws_ok($$insert into auth.users(id, raw_user_meta_data) values ('10000000-0000-0000-0000-000000000004', '{"full_name":"Admin","role":"admin"}')$$, '23514', 'Invalid account type', 'Invalid account roles rejected');
select throws_ok($$insert into auth.users(id, raw_user_meta_data) values ('10000000-0000-0000-0000-000000000005', '{"full_name":" ","role":"customer"}')$$, '23514', 'Invalid full name', 'Blank names rejected');
select is((select full_name from public.profiles where id = '10000000-0000-0000-0000-000000000001'), 'Test Customer', 'Name is trimmed');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is((select count(*)::integer from public.profiles), 1, 'Confirmed customer sees only own profile');
select is((select count(*)::integer from public.profiles where id = '10000000-0000-0000-0000-000000000002'), 0, 'Other profile hidden');
select throws_ok($$insert into public.profiles(id,full_name,role) values ('10000000-0000-0000-0000-000000000006','Injected','customer')$$, '42501', 'permission denied for table profiles', 'Client insertion denied');
select throws_ok($$update public.profiles set role='technician'$$, '42501', 'permission denied for table profiles', 'Client role changes denied');
select throws_ok($$delete from public.profiles$$, '42501', 'permission denied for table profiles', 'Client deletion denied');
select is((select role from public.profiles), 'customer', 'Role remains protected');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select is((select count(*)::integer from public.profiles), 0, 'Even an unconfirmed JWT cannot read profiles');
set local role anon;
select throws_ok($$select * from public.profiles$$, '42501', 'permission denied for table profiles', 'Anonymous profile reads denied');
reset role;
update auth.users set raw_user_meta_data = '{"full_name":"Test Customer","role":"technician"}' where id = '10000000-0000-0000-0000-000000000001';
select is((select role from public.profiles where id = '10000000-0000-0000-0000-000000000001'), 'customer', 'Editable auth metadata cannot change protected role');
select throws_ok($$update public.profiles set role = 'admin' where id = '10000000-0000-0000-0000-000000000001'$$, '23514', null, 'Database restricts role values');
select * from finish();
rollback;
