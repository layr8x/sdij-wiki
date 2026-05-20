-- 20260520_kakao_partner_rls_auth.sql
-- 카카오 파트너 상담 데이터 RLS 강화.
-- 변경: anon(비로그인) 읽기 제거 → authenticated(로그인 사용자) 만 읽기 허용.
-- 사유: kakao_partner_messages 는 고객 상담 내용(PII). anon 키는 배포된 프론트 JS 에
--       노출되므로 anon 읽기 허용 시 외부에서도 조회 가능. 관리자 페이지(/admin/consults)는
--       로그인 후 접근이라 authenticated 세션으로 동작 → 호환됨.
-- 쓰기(INSERT/UPDATE/DELETE)는 정책 미정의 → 기존대로 service_role 전용.

drop policy if exists "anon_read_chats"    on kakao_partner_chats;
drop policy if exists "anon_read_messages" on kakao_partner_messages;
drop policy if exists "anon_read_state"    on kakao_partner_stream_state;

drop policy if exists "auth_read_chats"    on kakao_partner_chats;
drop policy if exists "auth_read_messages" on kakao_partner_messages;
drop policy if exists "auth_read_state"    on kakao_partner_stream_state;

create policy "auth_read_chats"
  on kakao_partner_chats        for select to authenticated using (true);
create policy "auth_read_messages"
  on kakao_partner_messages     for select to authenticated using (true);
create policy "auth_read_state"
  on kakao_partner_stream_state for select to authenticated using (true);
