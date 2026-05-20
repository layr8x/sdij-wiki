-- supabase/migrations/20260520_kakao_webhook_security.sql
-- 20260512_kakao_webhook.sql 후속 — Supabase Database Linter 권고사항 반영.
--
-- 1) view 는 기본 SECURITY DEFINER 라 view 생성자(보통 postgres) 권한으로 동작.
--    → 익명 사용자가 base table RLS 우회 가능 → security_invoker 로 전환.
-- 2) function 의 search_path 가 mutable 이면 search_path injection 가능.
--    → public, pg_temp 로 고정.

alter view public.kakao_category_stats set (security_invoker = true);
alter view public.kakao_daily_volume set (security_invoker = true);

alter function public.kakao_unclassified_count() set search_path = public, pg_temp;
