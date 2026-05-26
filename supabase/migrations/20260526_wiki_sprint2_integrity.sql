-- Sprint 2: profiles table + role-based RLS for guides/guide_feedback
-- (session_id, archived status, increment_guide_helpful already in wiki_base_schema)

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  name       text,
  role       text not null default 'guest'
             check (role in ('admin','director','counselor','operator','guest')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles for select
  using ((select auth.uid()) = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles for update
  using ((select auth.uid()) = id);

create or replace function public.create_profile_on_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'guest')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger-only: prevent RPC abuse by anon/authenticated.
revoke execute on function public.create_profile_on_signup() from public;
revoke execute on function public.create_profile_on_signup() from anon;
revoke execute on function public.create_profile_on_signup() from authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_on_signup();

drop policy if exists "guides_admin_director_update" on public.guides;
create policy "guides_admin_director_update" on public.guides for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('admin','director')
    )
  );

drop policy if exists "guides_admin_insert" on public.guides;
create policy "guides_admin_insert" on public.guides for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('admin','director','counselor')
    )
  );

drop policy if exists "guides_admin_delete" on public.guides;
create policy "guides_admin_delete" on public.guides for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

drop policy if exists "feedback_admin_delete" on public.guide_feedback;
create policy "feedback_admin_delete" on public.guide_feedback for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );
