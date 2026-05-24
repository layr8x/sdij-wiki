-- 20260524_kakao_partner_stream_health.sql
-- 스트림 데몬 헬스 가시화.
-- 쿠키 만료 등으로 수집이 멈췄을 때, 그 원인을 stream_state 에 기록해
-- `npm run kakao:status` / 관리자 화면에서 "왜 멈췄는지" 바로 확인 가능하게 함.
-- 적용: Supabase Dashboard > SQL Editor 에 붙여넣고 RUN. (additive — 기존 데이터 영향 없음)

alter table kakao_partner_stream_state
  add column if not exists last_error    text,
  add column if not exists last_error_at timestamptz;

comment on column kakao_partner_stream_state.last_error is
  '최근 수집 실패 원인(예: auth 401 — 쿠키 만료). 정상 폴 시 null 로 해제됨.';
comment on column kakao_partner_stream_state.last_error_at is
  'last_error 기록 시각.';
