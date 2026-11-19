begin;
create extension if not exists pgtap with schema extensions;
select plan(33);
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('20000000-0000-0000-0000-000000000001','market-customer@example.test',now(),'{"full_name":"Customer One","role":"customer"}'),
('20000000-0000-0000-0000-000000000002','market-tech@example.test',now(),'{"full_name":"Technician One","role":"technician"}'),
('20000000-0000-0000-0000-000000000003','market-outsider@example.test',now(),'{"full_name":"Customer Two","role":"customer"}'),
('20000000-0000-0000-0000-000000000004','market-unconfirmed@example.test',null,'{"full_name":"Unconfirmed","role":"customer"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
select lives_ok($$select public.marketplace_mutate('{"action":"saveProfile","display_name":"Local Tech","city":"Chicago","bio":"Heating and cooling service","services":"AC, heating","accepting_requests":true}')$$,'Technician publishes directory profile');
select is((public.marketplace_snapshot()->'ownTechnician'->>'display_name'),'Local Tech','Own public profile returned');
select lives_ok($$select public.marketplace_mutate(jsonb_build_object('action','addSlot','starts_at',now()+interval '2 days','ends_at',now()+interval '2 days 1 hour'))$$,'Future slot created');
select set_config('test.slot',(public.marketplace_snapshot()->'slots'->0->>'id'),true);
select throws_ok($$select public.marketplace_mutate(jsonb_build_object('action','addSlot','starts_at',now()+interval '2 days 30 minutes','ends_at',now()+interval '2 days 2 hours'))$$,'23P01',null,'Overlapping availability rejected');
select throws_ok($$select public.marketplace_mutate(jsonb_build_object('action','addSlot','starts_at',now()-interval '1 hour','ends_at',now()+interval '1 hour'))$$,'22023','Invalid appointment times','Past start rejected');
select throws_ok($$select public.marketplace_mutate(jsonb_build_object('action','addSlot','starts_at',now()+interval '3 days','ends_at',now()+interval '4 days'))$$,'22023','Invalid appointment times','Slots longer than eight hours rejected');

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select is(jsonb_array_length(public.marketplace_snapshot()->'technicians'),1,'Customer sees technician directory');
select is((select count(*)::int from public.profiles),1,'Directory does not open private profiles');
select throws_ok($$select public.marketplace_mutate('{"action":"saveProfile","display_name":"Fake","city":"Chicago","services":"AC","accepting_requests":true}')$$,'42501','Technician account required','Customers cannot publish technician profiles');
select lives_ok($$select public.marketplace_mutate(jsonb_build_object('action','conversation','technician_id','20000000-0000-0000-0000-000000000002'))$$,'Customer starts conversation before booking');
select set_config('test.conv',(public.marketplace_snapshot()->'conversations'->0->>'id'),true);
select lives_ok($$select public.marketplace_mutate(jsonb_build_object('action','message','conversation_id',current_setting('test.conv'),'body','My air conditioner stopped cooling.'))$$,'Participant sends a message');
select is(jsonb_array_length(public.marketplace_snapshot()->'messages'),1,'Persisted message appears in snapshot');
select lives_ok($$select public.marketplace_mutate(jsonb_build_object('action','request','slot_id',current_setting('test.slot'),'description','My air conditioner is not cooling the house.','address','123 Test Street, Chicago','latitude',41.881234,'longitude',-87.621234))$$,'Customer requests a slot');
select set_config('test.req',(public.marketplace_snapshot()->'requests'->0->>'id'),true);
select is(jsonb_array_length(public.marketplace_snapshot()->'conversations'),1,'Booking reuses existing conversation');
select is((public.marketplace_snapshot()->'requests'->0->>'address'),'123 Test Street, Chicago','Customer sees own precise address');
select is(jsonb_array_length(public.marketplace_snapshot()->'slots'),0,'Pending reservation removes slot from customer availability');
select throws_ok($$update public.service_requests set status='accepted'$$,'42501','permission denied for table service_requests','Clients cannot bypass request transitions');
select throws_ok($$insert into public.messages(conversation_id,sender_id,body) values(current_setting('test.conv')::uuid,auth.uid(),'Bypass')$$,'42501','permission denied for table messages','Direct message writes cannot bypass sender validation');
select throws_ok($$select public.marketplace_mutate(jsonb_build_object('action','requestAction','request_id',current_setting('test.req'),'status','accepted'))$$,'23505','Request state cannot be changed','Customer cannot accept own request');

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000003',true);
select is(jsonb_array_length(public.marketplace_snapshot()->'requests'),0,'Unrelated customer sees no requests');
select is((select count(*)::int from public.messages),0,'Unrelated customer sees no message rows');
select is((select count(*)::int from public.request_locations),0,'Unrelated customer sees no address rows');
select throws_ok($$select public.marketplace_mutate(jsonb_build_object('action','message','conversation_id',current_setting('test.conv'),'body','Intrusion'))$$,'42501','Conversation unavailable','Foreign conversation send denied');
select throws_ok($$select public.marketplace_mutate(jsonb_build_object('action','request','slot_id',current_setting('test.slot'),'description','Another request for the same reserved appointment.','address','456 Test Avenue','latitude',41.9,'longitude',-87.6))$$,'23505',null,'Second reservation cannot take occupied slot');

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
select is((select count(*)::int from public.request_locations),0,'Technician cannot read pending address directly');
select ok(not ((public.marketplace_snapshot()->'requests'->0) ? 'address'),'Pending snapshot omits precise address');
select is((public.marketplace_snapshot()->'requests'->0->>'approx_lat')::numeric,41.88::numeric,'Only rounded coordinates exposed before acceptance');
select lives_ok($$select public.marketplace_mutate(jsonb_build_object('action','requestAction','request_id',current_setting('test.req'),'status','accepted'))$$,'Technician confirms requested appointment');
select is((select count(*)::int from public.request_locations),1,'Accepted technician can read address');
select lives_ok($$select public.marketplace_mutate(jsonb_build_object('action','requestAction','request_id',current_setting('test.req'),'status','cancelled'))$$,'Technician cancels accepted appointment');
select ok(not ((public.marketplace_snapshot()->'requests'->0) ? 'address'),'Cancellation removes precise address from technician snapshot');
select is((select count(*)::int from public.request_locations),0,'Cancellation revokes direct address access');

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000004',true);
select throws_ok($$select public.marketplace_snapshot()$$,'42501','Confirmed account required','Unconfirmed accounts cannot read marketplace snapshot');
reset role;
select * from finish();
rollback;
