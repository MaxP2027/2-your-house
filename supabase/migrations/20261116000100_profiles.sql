-- Credentials stay in auth.users. Profiles are immutable to browser roles in Sprint 1.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 100 and full_name ~ '[^[:space:]]'),
  role text not null check (role in ('customer', 'technician')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;

create function public.current_user_is_confirmed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where id = (select auth.uid()) and email_confirmed_at is not null
  );
$$;
revoke all on function public.current_user_is_confirmed() from public, anon;
grant execute on function public.current_user_is_confirmed() to authenticated;

create policy "Confirmed users read their own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()) and (select public.current_user_is_confirmed()));

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_name text := btrim(new.raw_user_meta_data ->> 'full_name');
  account_role text := new.raw_user_meta_data ->> 'role';
begin
  if account_name is null or char_length(account_name) not between 1 and 100 or account_name !~ '[^[:space:]]' then
    raise exception 'Invalid full name' using errcode = '23514';
  end if;
  if account_role is null or account_role not in ('customer', 'technician') then
    raise exception 'Invalid account type' using errcode = '23514';
  end if;
  insert into public.profiles(id, full_name, role)
  values(new.id, account_name, account_role);
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
