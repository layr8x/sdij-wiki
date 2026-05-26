-- 20260526_supabase_advisors_cleanup.sql
-- Supabase Database Linter 권장 사항 두 건 해소:
--   0014 extension_in_public — pg_trgm 을 public → extensions 스키마로 이동
--   0005 unused_index        — idx_kakao_partner_chats_open (한 번도 안 쓰임) 제거
--
-- 적용 이력: 2026-05-26, Seoul project bnszzjaupayakkahmwsu 에 MCP apply_migration
-- 으로 즉시 반영. 본 파일은 version control 용.

create schema if not exists extensions;

alter extension pg_trgm set schema extensions;

drop index if exists public.idx_kakao_partner_chats_open;
