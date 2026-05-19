-- =============================================================================
-- 카카오 비즈니스 파트너센터 실시간 채팅 수집
-- =============================================================================
-- 적용: Supabase Dashboard > SQL Editor 에 전체 붙여넣고 RUN
-- 의존: 없음 (kakao_chats / 카카오 i 오픈빌더 webhook 테이블과 분리)
-- =============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;

-- ─── 채팅방 (대화 단위) ─────────────────────────────────────────────────────
create table if not exists kakao_partner_chats (
  -- 카카오에서 부여하는 채팅 ID (예: "4972213338456731")
  chat_id              text primary key,
  -- 카카오 채널 프로필 ID (예: "_VGAQn")
  profile_id           text not null,

  -- 사용자 정보 (talk_user 객체)
  user_id              text,
  nickname             text,
  profile_image_url    text,
  user_type            int default 0,

  -- 마지막 활동 정보
  last_log_id          text,
  last_message         text,
  last_log_send_at     timestamptz,

  -- 상태 플래그
  is_read              boolean default false,
  is_done              boolean default false,
  is_blocked           boolean default false,
  is_starred           boolean default false,
  is_deleted           boolean default false,
  unread_count         int default 0,
  assignee_id          bigint default 0,

  -- 원본 응답 통째 저장 (스키마 변경 대비)
  raw                  jsonb,

  -- 타임스탬프
  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),
  -- 카카오 측 version (timestamp ms) — 옵티미스틱 락 / 갭 검출용
  remote_version       bigint
);

create index if not exists idx_kakao_partner_chats_profile
  on kakao_partner_chats (profile_id, last_log_send_at desc);
create index if not exists idx_kakao_partner_chats_open
  on kakao_partner_chats (profile_id) where is_done = false;

-- ─── 메시지 (log 단위) ───────────────────────────────────────────────────────
create table if not exists kakao_partner_messages (
  -- 카카오 log_id (예: "3838886903437127443")
  log_id               text primary key,
  chat_id              text not null references kakao_partner_chats(chat_id) on delete cascade,
  profile_id           text not null,

  -- 보낸 사람: 'user' | 'manager' | 'bot' | 'system' (실제 값은 raw에서 매핑)
  sender_type          text,
  sender_id            text,

  -- 메시지 본문
  message              text,
  message_type         text,    -- text/image/file/template 등
  attachments          jsonb,   -- 첨부 (이미지 URL 등)

  -- 시각
  sent_at              timestamptz,

  -- 원본
  raw                  jsonb,

  -- 수집 시각
  ingested_at          timestamptz default now(),
  -- 수집 경로: 'rest_backfill' | 'ws_push'
  source               text not null check (source in ('rest_backfill','ws_push'))
);

create index if not exists idx_kakao_partner_messages_chat_time
  on kakao_partner_messages (chat_id, sent_at desc);
create index if not exists idx_kakao_partner_messages_profile_time
  on kakao_partner_messages (profile_id, sent_at desc);
create index if not exists idx_kakao_partner_messages_text_trgm
  on kakao_partner_messages using gin (message gin_trgm_ops);

-- ─── 스트림 상태 (재연결 시 갭 백필 기준점) ──────────────────────────────────
create table if not exists kakao_partner_stream_state (
  profile_id           text primary key,
  last_seen_log_id     text,
  last_heartbeat_at    timestamptz default now(),
  ws_session_id        text,
  ws_server_id         text,
  -- 누적 수신 카운터 (모니터링용)
  total_messages       bigint default 0,
  total_reconnects     int default 0
);

-- ─── updated_at 자동 갱신 트리거 ─────────────────────────────────────────────
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_kakao_partner_chats_updated on kakao_partner_chats;
create trigger trg_kakao_partner_chats_updated
  before update on kakao_partner_chats
  for each row execute function set_updated_at();

-- ─── RLS: anon 읽기 허용, 쓰기는 service_role 만 ──────────────────────────────
alter table kakao_partner_chats        enable row level security;
alter table kakao_partner_messages     enable row level security;
alter table kakao_partner_stream_state enable row level security;

drop policy if exists "anon_read_chats"    on kakao_partner_chats;
drop policy if exists "anon_read_messages" on kakao_partner_messages;
drop policy if exists "anon_read_state"    on kakao_partner_stream_state;

create policy "anon_read_chats"
  on kakao_partner_chats for select
  using (true);

create policy "anon_read_messages"
  on kakao_partner_messages for select
  using (true);

create policy "anon_read_state"
  on kakao_partner_stream_state for select
  using (true);

-- INSERT/UPDATE/DELETE 정책은 정의하지 않음 → service_role 만 가능
