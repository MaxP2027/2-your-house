-- Sprint 2: immutable participants, private addresses, and transactional booking.
create extension if not exists btree_gist with schema extensions;

create table public.technician_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 100),
  city text not null check (char_length(btrim(city)) between 1 and 100),
  bio text not null default '' check (char_length(bio) <= 1000),
  services text not null check (char_length(btrim(services)) between 1 and 500),
  accepting_requests boolean not null default true
);
create table public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references public.technician_profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default true,
  check (ends_at > starts_at and ends_at <= starts_at + interval '8 hours'),
  exclude using gist (technician_id with =, tstzrange(starts_at, ends_at, '[)') with &&) where (active)
);
create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  technician_id uuid not null references public.technician_profiles(id),
  slot_id uuid not null references public.availability_slots(id),
  description text not null check (char_length(btrim(description)) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled','completed')),
  approx_lat numeric not null check (approx_lat between -90 and 90),
  approx_lng numeric not null check (approx_lng between -180 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (customer_id <> technician_id)
);
create unique index one_reservation_per_slot on public.service_requests(slot_id)
  where status in ('pending','accepted');
create index requests_by_customer on public.service_requests(customer_id);
create index requests_by_technician on public.service_requests(technician_id);

create table public.request_locations (
  request_id uuid primary key references public.service_requests(id) on delete cascade,
  address text not null check (char_length(btrim(address)) between 5 and 300),
  latitude numeric not null check (latitude between -90 and 90),
  longitude numeric not null check (longitude between -180 and 180)
);
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  technician_id uuid not null references public.technician_profiles(id),
  created_at timestamptz not null default now(),
  unique(customer_id,technician_id),
  check (customer_id <> technician_id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_by_conversation on public.messages(conversation_id,created_at);
create index messages_by_sender on public.messages(sender_id,created_at);

alter table public.technician_profiles enable row level security;
alter table public.availability_slots enable row level security;
alter table public.service_requests enable row level security;
alter table public.request_locations enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

revoke all on public.technician_profiles,public.availability_slots,public.service_requests,
 public.request_locations,public.conversations,public.messages from anon,authenticated;
grant select on public.technician_profiles,public.availability_slots,public.service_requests,
 public.request_locations,public.conversations,public.messages to authenticated;
grant all on public.technician_profiles,public.availability_slots,public.service_requests,
 public.request_locations,public.conversations,public.messages to service_role;

create policy "Confirmed members see directory" on public.technician_profiles for select to authenticated
 using ((select public.current_user_is_confirmed()));
create policy "Confirmed members see published availability" on public.availability_slots for select to authenticated
 using ((select public.current_user_is_confirmed()) and (technician_id=(select auth.uid()) or
 (active and starts_at>now() and exists(select 1 from public.technician_profiles t where t.id=technician_id and t.accepting_requests))));
create policy "Participants see requests" on public.service_requests for select to authenticated
 using ((select public.current_user_is_confirmed()) and (customer_id=(select auth.uid()) or technician_id=(select auth.uid())));
create policy "Address access follows acceptance" on public.request_locations for select to authenticated
 using ((select public.current_user_is_confirmed()) and exists (
 select 1 from public.service_requests r where r.id=request_id and
 (r.customer_id=(select auth.uid()) or (r.technician_id=(select auth.uid()) and r.status in ('accepted','completed')))));
create policy "Participants see conversations" on public.conversations for select to authenticated
 using ((select public.current_user_is_confirmed()) and (customer_id=(select auth.uid()) or technician_id=(select auth.uid())));
create policy "Participants see messages" on public.messages for select to authenticated
 using ((select public.current_user_is_confirmed()) and exists(select 1 from public.conversations c
 where c.id=conversation_id and (c.customer_id=(select auth.uid()) or c.technician_id=(select auth.uid()))));

-- RPC callers cannot select a different actor or impersonate mutable auth metadata.
create function public.marketplace_actor() returns public.profiles language plpgsql
security definer set search_path='' as $$
declare actor public.profiles;
begin
 if auth.uid() is null or not public.current_user_is_confirmed() then
   raise exception 'Confirmed account required' using errcode='42501';
 end if;
 select * into actor from public.profiles where id=auth.uid();
 if not found then raise exception 'Account profile required' using errcode='42501'; end if;
 return actor;
end;
$$;

create function public.marketplace_mutate(payload jsonb) returns jsonb language plpgsql
security definer set search_path='' as $$
declare
 actor public.profiles := public.marketplace_actor();
 operation text := payload->>'action';
 slot public.availability_slots;
 req public.service_requests;
 conv public.conversations;
 slot_uuid uuid;
 target uuid;
 start_time timestamptz;
 end_time timestamptz;
 new_status text;
 text_value text;
 lat numeric;
 lng numeric;
begin
 if payload is null or jsonb_typeof(payload)<>'object' then raise exception 'Invalid request' using errcode='22023'; end if;
 if operation='saveProfile' then
   if actor.role<>'technician' then raise exception 'Technician account required' using errcode='42501'; end if;
   if coalesce(char_length(btrim(payload->>'display_name')),0) not between 1 and 100
    or coalesce(char_length(btrim(payload->>'city')),0) not between 1 and 100
    or coalesce(char_length(btrim(payload->>'services')),0) not between 1 and 500
    or char_length(coalesce(payload->>'bio',''))>1000
    or jsonb_typeof(payload->'accepting_requests') is distinct from 'boolean' then
     raise exception 'Invalid profile' using errcode='22023';
   end if;
   insert into public.technician_profiles(id,display_name,city,bio,services,accepting_requests)
   values(actor.id,btrim(payload->>'display_name'),btrim(payload->>'city'),coalesce(payload->>'bio',''),btrim(payload->>'services'),(payload->>'accepting_requests')::boolean)
   on conflict(id) do update set display_name=excluded.display_name,city=excluded.city,bio=excluded.bio,
    services=excluded.services,accepting_requests=excluded.accepting_requests;
 elsif operation='addSlot' then
   if actor.role<>'technician' then raise exception 'Technician account required' using errcode='42501'; end if;
   if not exists(select 1 from public.technician_profiles where id=actor.id) then
     raise exception 'Publish your technician profile first' using errcode='22023';
   end if;
   start_time := (payload->>'starts_at')::timestamptz;
   end_time := (payload->>'ends_at')::timestamptz;
   if start_time is null or end_time is null or start_time<=now() or end_time<=start_time or end_time>start_time+interval '8 hours'
    or start_time>now()+interval '1 year' then raise exception 'Invalid appointment times' using errcode='22023'; end if;
   insert into public.availability_slots(technician_id,starts_at,ends_at) values(actor.id,start_time,end_time);
 elsif operation='removeSlot' then
   select * into slot from public.availability_slots where id=(payload->>'slot_id')::uuid for update;
   if not found or actor.role<>'technician' or slot.technician_id<>actor.id then raise exception 'Slot unavailable' using errcode='42501'; end if;
   if exists(select 1 from public.service_requests where slot_id=slot.id and status in ('pending','accepted')) then
     raise exception 'Reserved slots cannot be removed' using errcode='23505'; end if;
   update public.availability_slots set active=false where id=slot.id;
 elsif operation='request' then
   if actor.role<>'customer' then raise exception 'Customer account required' using errcode='42501'; end if;
   text_value := btrim(payload->>'description');
   lat := (payload->>'latitude')::numeric; lng := (payload->>'longitude')::numeric;
   if coalesce(char_length(text_value),0) not between 10 and 2000
    or coalesce(char_length(btrim(payload->>'address')),0) not between 5 and 300
    or lat is null or lng is null or lat not between -90 and 90 or lng not between -180 and 180 then
    raise exception 'Invalid service request' using errcode='22023'; end if;
   select * into slot from public.availability_slots where id=(payload->>'slot_id')::uuid for update;
   if not found or not slot.active or slot.starts_at<=now() then raise exception 'Slot unavailable' using errcode='23505'; end if;
   -- Lock the listing as well so disabling new requests has an atomic boundary.
   perform 1 from public.technician_profiles where id=slot.technician_id and accepting_requests for share;
   if not found then raise exception 'Technician unavailable' using errcode='23505'; end if;
   insert into public.service_requests(customer_id,technician_id,slot_id,description,approx_lat,approx_lng)
    values(actor.id,slot.technician_id,slot.id,text_value,round(lat,2),round(lng,2)) returning id into target;
   insert into public.request_locations(request_id,address,latitude,longitude)
    values(target,btrim(payload->>'address'),lat,lng);
   insert into public.conversations(customer_id,technician_id) values(actor.id,slot.technician_id)
    on conflict(customer_id,technician_id) do nothing;
 elsif operation='requestAction' then
   select slot_id into slot_uuid from public.service_requests where id=(payload->>'request_id')::uuid
     and (customer_id=actor.id or technician_id=actor.id);
   if not found then raise exception 'Request unavailable' using errcode='42501'; end if;
   -- Every state transition locks slot first, matching the reservation lock order.
   select * into slot from public.availability_slots where id=slot_uuid for update;
   select * into req from public.service_requests where id=(payload->>'request_id')::uuid for update;
   new_status := payload->>'status';
   if new_status in ('accepted','declined') and req.technician_id=actor.id and actor.role='technician' and req.status='pending' then
     if new_status='accepted' and slot.starts_at<=now() then raise exception 'Appointment is in the past' using errcode='23505'; end if;
   elsif new_status='cancelled' and ((req.customer_id=actor.id and req.status in ('pending','accepted')) or (req.technician_id=actor.id and req.status='accepted')) then
     null;
   elsif new_status='completed' and req.technician_id=actor.id and actor.role='technician' and req.status='accepted' and slot.starts_at<=now() then
     null;
   else raise exception 'Request state cannot be changed' using errcode='23505';
   end if;
   update public.service_requests set status=new_status,updated_at=now() where id=req.id;
 elsif operation='conversation' then
   if actor.role<>'customer' then raise exception 'Customer account required' using errcode='42501'; end if;
   target := (payload->>'technician_id')::uuid;
   if not exists(select 1 from public.technician_profiles where id=target and accepting_requests) then
     raise exception 'Technician unavailable' using errcode='22023'; end if;
   insert into public.conversations(customer_id,technician_id) values(actor.id,target)
    on conflict(customer_id,technician_id) do nothing;
 elsif operation='message' then
   text_value := btrim(payload->>'body');
   if coalesce(char_length(text_value),0) not between 1 and 2000 then raise exception 'Invalid message' using errcode='22023'; end if;
   -- Global per-sender lock makes the message limit consistent across conversations.
   perform 1 from public.profiles where id=actor.id for update;
   select * into conv from public.conversations where id=(payload->>'conversation_id')::uuid
    and (customer_id=actor.id or technician_id=actor.id);
   if not found then raise exception 'Conversation unavailable' using errcode='42501'; end if;
   if (select count(*) from public.messages where sender_id=actor.id and created_at>now()-interval '1 minute')>=30 then
     raise exception 'Message rate limit reached' using errcode='P0429'; end if;
   insert into public.messages(conversation_id,sender_id,body) values(conv.id,actor.id,text_value);
 else raise exception 'Unknown action' using errcode='22023';
 end if;
 return jsonb_build_object('ok',true);
end;
$$;

create function public.marketplace_snapshot() returns jsonb language plpgsql
security definer set search_path='' as $$
declare actor public.profiles := public.marketplace_actor(); result jsonb;
begin
 select jsonb_build_object(
  'role',actor.role,'userId',actor.id,
  'technicians',coalesce((select jsonb_agg(to_jsonb(t) order by t.display_name,t.id) from public.technician_profiles t),'[]'::jsonb),
  'ownTechnician',(select to_jsonb(t) from public.technician_profiles t where t.id=actor.id),
  'slots',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'technician_id',s.technician_id,'starts_at',s.starts_at,'ends_at',s.ends_at) order by s.starts_at,s.id)
    from public.availability_slots s join public.technician_profiles t on t.id=s.technician_id
    where s.active and s.starts_at>now() and (s.technician_id=actor.id or
      (t.accepting_requests and not exists(select 1 from public.service_requests r where r.slot_id=s.id and r.status in ('pending','accepted'))))),'[]'::jsonb),
  'requests',coalesce((select jsonb_agg(
    jsonb_build_object('id',r.id,'customer_id',r.customer_id,'technician_id',r.technician_id,'slot_id',r.slot_id,'description',r.description,
    'status',r.status,'approx_lat',r.approx_lat,'approx_lng',r.approx_lng,'starts_at',s.starts_at,'ends_at',s.ends_at,
    'customer_name',p.full_name,'technician_name',t.display_name)
    || case when r.customer_id=actor.id or r.status in ('accepted','completed') then
      jsonb_build_object('address',l.address,'latitude',l.latitude,'longitude',l.longitude) else '{}'::jsonb end
    order by s.starts_at,r.id)
    from public.service_requests r join public.availability_slots s on s.id=r.slot_id
    join public.profiles p on p.id=r.customer_id join public.technician_profiles t on t.id=r.technician_id
    join public.request_locations l on l.request_id=r.id
    where r.customer_id=actor.id or r.technician_id=actor.id),'[]'::jsonb),
  'conversations',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'customer_id',c.customer_id,'technician_id',c.technician_id,
    'customer_name',p.full_name,'technician_name',t.display_name) order by c.created_at,c.id)
    from public.conversations c join public.profiles p on p.id=c.customer_id join public.technician_profiles t on t.id=c.technician_id
    where c.customer_id=actor.id or c.technician_id=actor.id),'[]'::jsonb),
  'messages',coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at,m.id)
    from public.messages m join public.conversations c on c.id=m.conversation_id
    where c.customer_id=actor.id or c.technician_id=actor.id),'[]'::jsonb)
 ) into result;
 return result;
end;
$$;

revoke all on function public.marketplace_actor(),public.marketplace_mutate(jsonb),public.marketplace_snapshot() from public,anon,authenticated;
grant execute on function public.marketplace_actor(),public.marketplace_mutate(jsonb),public.marketplace_snapshot() to authenticated;
-- Only message inserts need subscription events; row-level SELECT policies gate delivery.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime')
  and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
   alter publication supabase_realtime add table public.messages;
 end if;
end $$;
