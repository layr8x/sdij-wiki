-- AI 기반 카카오 채팅 카테고리·감정 분류 결과를 저장하기 위한 칼럼 추가
-- + 대시보드용 집계 RPC 두 개.

alter table public.kakao_partner_chats
  add column if not exists category text,
  add column if not exists category_confidence numeric,
  add column if not exists category_classified_at timestamptz;

alter table public.kakao_partner_messages
  add column if not exists sentiment text check (sentiment in ('positive','neutral','negative')),
  add column if not exists sentiment_score numeric check (sentiment_score between -1 and 1),
  add column if not exists sentiment_classified_at timestamptz;

create index if not exists chats_category_idx on public.kakao_partner_chats (category);
create index if not exists chats_classified_at_idx on public.kakao_partner_chats (category_classified_at);
create index if not exists messages_sentiment_idx on public.kakao_partner_messages (sentiment);
create index if not exists messages_sentiment_classified_idx on public.kakao_partner_messages (sentiment_classified_at);

-- ─── 카테고리 분포 RPC ─────────────────────────────────────────────────────
create or replace function public.get_chat_category_distribution(window_days int default 90)
returns table(category text, cnt bigint, pct numeric, negative_rate numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with classified_chats as (
    select c.chat_id, c.category
      from public.kakao_partner_chats c
     where c.category is not null
       and c.last_log_send_at >= now() - (window_days || ' days')::interval
  ),
  chat_neg as (
    select
      cc.chat_id,
      cc.category,
      (select count(*) from public.kakao_partner_messages m
         where m.chat_id = cc.chat_id and m.sentiment = 'negative')::numeric as neg_msgs,
      (select count(*) from public.kakao_partner_messages m
         where m.chat_id = cc.chat_id and m.sentiment is not null)::numeric as total_msgs
    from classified_chats cc
  )
  select
    coalesce(category, '기타') as category,
    count(*)::bigint as cnt,
    round(100.0 * count(*) / sum(count(*)) over (), 1) as pct,
    round(case when sum(total_msgs) > 0
               then 100.0 * sum(neg_msgs) / sum(total_msgs)
               else 0 end, 1) as negative_rate
  from chat_neg
  group by category
  order by cnt desc;
$$;

-- ─── 감정 추세 RPC (일별) ──────────────────────────────────────────────────
create or replace function public.get_sentiment_trend(window_days int default 30)
returns table(day date, positive bigint, neutral bigint, negative bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (sent_at at time zone 'Asia/Seoul')::date as day,
    count(*) filter (where sentiment = 'positive')::bigint as positive,
    count(*) filter (where sentiment = 'neutral')::bigint  as neutral,
    count(*) filter (where sentiment = 'negative')::bigint as negative
  from public.kakao_partner_messages
  where sentiment is not null
    and sent_at >= now() - (window_days || ' days')::interval
  group by day
  order by day;
$$;

grant execute on function public.get_chat_category_distribution(int) to anon, authenticated;
grant execute on function public.get_sentiment_trend(int) to anon, authenticated;
