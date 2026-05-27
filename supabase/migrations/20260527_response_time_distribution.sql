-- Returns response time distribution buckets for kakao_partner_messages.
-- For each `user` message, finds the next `manager` reply in same chat and
-- bucketizes the latency into 6 windows.

create or replace function public.get_response_time_distribution(window_days int default 90)
returns table(bucket text, cnt bigint, pct numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with user_msgs as (
    select chat_id, sent_at as user_sent_at
      from public.kakao_partner_messages
     where sender_type = 'user'
       and sent_at >= now() - (window_days || ' days')::interval
  ),
  next_manager as (
    select
      u.user_sent_at,
      (select min(m.sent_at)
         from public.kakao_partner_messages m
        where m.chat_id = u.chat_id
          and m.sender_type = 'manager'
          and m.sent_at > u.user_sent_at
      ) as first_manager_at
    from user_msgs u
  ),
  response_times as (
    select extract(epoch from (first_manager_at - user_sent_at)) / 60 as minutes
      from next_manager
     where first_manager_at is not null
  ),
  bucketed as (
    select case
        when minutes < 5    then '00. 0-5분'
        when minutes < 30   then '01. 5-30분'
        when minutes < 60   then '02. 30-60분'
        when minutes < 180  then '03. 1-3시간'
        when minutes < 1440 then '04. 3-24시간'
        else                     '05. 24시간+'
      end as bucket
      from response_times
  )
  select
    bucket,
    count(*)::bigint as cnt,
    round(100.0 * count(*) / sum(count(*)) over (), 1) as pct
  from bucketed
  group by bucket
  order by bucket;
$$;

grant execute on function public.get_response_time_distribution(int) to anon, authenticated;
