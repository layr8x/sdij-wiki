-- supabase/migrations/20260512_kakao_webhook.sql
-- 카카오 채널 webhook 실시간 수집 — kakao_messages 테이블 + 집계 뷰 + RLS
-- 실행: Supabase Dashboard > SQL Editor 에 전체 붙여넣기 (멱등)

-- ─── 1. kakao_messages: 원본 수신 메시지 ──────────────────────────────────
create table if not exists public.kakao_messages (
  id              bigserial primary key,
  -- 발신자 식별 (카카오 user_key 또는 익명 해시)
  user_key        text not null,
  -- 메시지 본문 (utterance)
  message         text not null,
  -- 카카오 측 수신 시각
  received_at     timestamptz not null default now(),

  -- 자동 분류 결과 (Edge Function 에서 채움)
  category        text,
  category_label  text,
  sentiment       text check (sentiment in ('positive','neutral','negative')),
  sentiment_score int default 0,

  -- 원본 payload (디버깅·재처리용)
  raw_payload     jsonb,

  -- 카카오 측 메시지 ID (중복 수신 방지)
  external_id     text unique,

  created_at      timestamptz default now()
);

create index if not exists kakao_messages_received_at_idx
  on public.kakao_messages (received_at desc);
create index if not exists kakao_messages_category_idx
  on public.kakao_messages (category);
create index if not exists kakao_messages_user_key_idx
  on public.kakao_messages (user_key);
create index if not exists kakao_messages_sentiment_idx
  on public.kakao_messages (sentiment);

-- ─── 2. RLS: anon 읽기 / service_role 전권 ─────────────────────────────────
alter table public.kakao_messages enable row level security;

-- anon: 집계 뷰를 직접 쿼리할 수 있도록 select 허용
-- 메시지 본문은 노출되지만 user_key 는 카카오 발급 hash 라 PII 위험 낮음
-- (운영 시 RLS 강화 또는 뷰만 노출하도록 정책 변경 권장)
drop policy if exists "kakao_messages_anon_read" on public.kakao_messages;
create policy "kakao_messages_anon_read"
  on public.kakao_messages for select to anon
  using (true);

-- service_role: 모든 권한 (Edge Function 이 사용)
drop policy if exists "kakao_messages_service_all" on public.kakao_messages;
create policy "kakao_messages_service_all"
  on public.kakao_messages for all to service_role
  using (true) with check (true);

-- ─── 3. 집계 뷰: 카테고리별 실시간 통계 (csInsights 가 직접 쿼리) ──────────
-- 90일 윈도우 기본. 더 좁히려면 csInsights hook 에서 별도 필터.
create or replace view public.kakao_category_stats as
with recent as (
  select * from public.kakao_messages
  where received_at >= now() - interval '90 days'
    and category is not null
),
totals as (
  select count(*)::numeric as total from recent
)
select
  r.category                                                       as id,
  r.category_label                                                 as label,
  count(*)::int                                                    as count,
  round(100.0 * count(*) / nullif((select total from totals), 0), 1)::numeric(5,1) as share,
  round(
    100.0 * count(*) filter (where r.sentiment = 'negative')
    / nullif(count(*), 0), 1
  )::numeric(5,1)                                                  as negative_rate,
  round(avg(r.sentiment_score)::numeric, 2)                        as avg_sentiment_score,
  max(r.received_at)                                               as last_received_at
from recent r
group by r.category, r.category_label
order by count(*) desc;

-- 뷰는 base table 의 RLS 를 상속하므로 anon 도 select 가능

-- ─── 4. 일일 집계 뷰 (트렌드 차트용, 선택) ───────────────────────────────
create or replace view public.kakao_daily_volume as
select
  date_trunc('day', received_at)::date as day,
  count(*)::int as total,
  count(*) filter (where sentiment = 'negative')::int as negative,
  count(distinct user_key)::int as unique_users
from public.kakao_messages
where received_at >= now() - interval '90 days'
group by 1
order by 1 desc;

-- ─── 5. 헬퍼 RPC: 분류 미완 레코드 backfill (선택, 운영용) ─────────────────
-- Edge Function 분류 실패 시 또는 룰셋 변경 후 재분류용
create or replace function public.kakao_unclassified_count()
returns int language sql stable as $$
  select count(*)::int from public.kakao_messages where category is null;
$$;

-- ─── 6. updated_at 트리거 (필요 시) ───────────────────────────────────────
-- kakao_messages 는 insert-only 패턴이라 updated_at 불필요. 생략.

comment on table public.kakao_messages is
  '카카오 채널 webhook 수신 메시지 (실시간). Edge Function kakao-webhook 이 INSERT.';
comment on view public.kakao_category_stats is
  '카테고리별 90일 집계 — csInsights.js 의 count/share/negativeRate 실시간 소스.';
comment on view public.kakao_daily_volume is
  '일별 메시지 볼륨 + 부정감정 비율 (트렌드 차트용).';
