-- AMS Wiki base schema: guides, guide_feedback, guide_views, search_logs
-- Extensions (pg_trgm, uuid-ossp) installed in `extensions` schema.

create table if not exists public.guides (
  id            text primary key,
  type          text not null check (type in ('SOP','DECISION','REFERENCE','TROUBLE','RESPONSE','POLICY')),
  module        text not null,
  title         text not null,
  tldr          text,
  path          text,
  ams_url       text,
  confluence_id text,
  confluence_url text,
  targets       text[],
  tags          text[],
  author        text,
  version       text default 'v1.0',
  status        text default 'published' check (status in ('draft','review','published','archived')),
  views         integer default 0,
  helpful       integer default 0,
  helpful_rate  integer default 0,
  steps         jsonb,
  main_items_table jsonb,
  cases         jsonb,
  cautions      text[],
  trouble_table jsonb,
  responses     jsonb,
  decision_table jsonb,
  reference_data jsonb,
  policy_diff   jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists guides_title_search on public.guides using gin (title extensions.gin_trgm_ops);
create index if not exists guides_tldr_search  on public.guides using gin (tldr  extensions.gin_trgm_ops);
create index if not exists guides_module_idx   on public.guides (module);
create index if not exists guides_type_idx     on public.guides (type);
create index if not exists guides_updated_idx  on public.guides (updated_at desc);
create index if not exists guides_views_idx    on public.guides (views desc);

create table if not exists public.guide_feedback (
  id         uuid primary key default extensions.uuid_generate_v4(),
  guide_id   text references public.guides(id) on delete cascade,
  vote       text check (vote in ('helpful','needs_improvement')),
  comment    text,
  session_id text,
  created_at timestamptz default now()
);
create index if not exists feedback_guide_idx   on public.guide_feedback (guide_id);
create index if not exists feedback_session_idx on public.guide_feedback (session_id);

create table if not exists public.guide_views (
  id         uuid primary key default extensions.uuid_generate_v4(),
  guide_id   text references public.guides(id) on delete cascade,
  session_id text,
  created_at timestamptz default now()
);
create index if not exists views_guide_idx   on public.guide_views (guide_id);
create index if not exists views_created_idx on public.guide_views (created_at desc);

create table if not exists public.search_logs (
  id         uuid primary key default extensions.uuid_generate_v4(),
  query      text not null,
  result_count integer default 0,
  created_at timestamptz default now()
);
create index if not exists search_logs_query_idx   on public.search_logs (query);
create index if not exists search_logs_created_idx on public.search_logs (created_at desc);

create or replace function public.update_guides_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists guides_updated_at on public.guides;
create trigger guides_updated_at
  before update on public.guides
  for each row execute function public.update_guides_updated_at();

create or replace function public.increment_guide_views(guide_id_param text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.guides set views = views + 1 where id = guide_id_param;
end;
$$;

create or replace function public.increment_guide_helpful(guide_id_param text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.guides
     set helpful = coalesce(helpful, 0) + 1,
         helpful_rate = case
           when coalesce(views, 0) = 0 then 100
           else round(100.0 * (coalesce(helpful, 0) + 1) / greatest(views, 1))
         end
   where id = guide_id_param;
end;
$$;

create or replace function public.get_guide_stats(guide_id_param text)
returns json
language plpgsql
security invoker
set search_path = ''
as $$
declare
  result json;
begin
  select json_build_object(
    'total',    count(*),
    'helpful',  count(*) filter (where vote = 'helpful'),
    'needsImprovement', count(*) filter (where vote = 'needs_improvement'),
    'helpfulRate', case when count(*) > 0
      then round(100.0 * count(*) filter (where vote = 'helpful') / count(*))
      else 0
    end
  ) into result
  from public.guide_feedback
  where guide_id = guide_id_param;
  return result;
end;
$$;

alter table public.guides enable row level security;
alter table public.guide_feedback enable row level security;
alter table public.guide_views enable row level security;
alter table public.search_logs enable row level security;

drop policy if exists "guides_public_read" on public.guides;
create policy "guides_public_read" on public.guides for select using (true);

drop policy if exists "guides_public_feedback" on public.guide_feedback;
create policy "guides_public_feedback" on public.guide_feedback for insert with check (true);

drop policy if exists "guides_feedback_read" on public.guide_feedback;
create policy "guides_feedback_read" on public.guide_feedback for select using (true);

drop policy if exists "views_public_insert" on public.guide_views;
create policy "views_public_insert" on public.guide_views for insert with check (true);

drop policy if exists "views_public_read" on public.guide_views;
create policy "views_public_read" on public.guide_views for select using (true);

drop policy if exists "search_logs_insert" on public.search_logs;
create policy "search_logs_insert" on public.search_logs for insert with check (true);
