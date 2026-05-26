-- 20260526_fix_set_updated_at_search_path.sql
-- Supabase Database Linter 0011 (function_search_path_mutable) 해소.
-- search_path injection 방지: 함수 호출 시점이 아닌 정의 시점에 스키마 고정.

alter function public.set_updated_at() set search_path = pg_catalog, pg_temp;

comment on function public.set_updated_at() is 'updated_at 자동 갱신 트리거. search_path 고정(보안).';
