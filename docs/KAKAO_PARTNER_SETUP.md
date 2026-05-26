# 카카오 파트너센터 실시간 수집 셋업

업무 카카오 비즈니스 파트너센터(business.kakao.com)의 채팅을 실시간으로 Supabase 에 적재하는 데몬.

## 아키텍처

```
                 ┌──────────────────────────────────┐
business.kakao   │  REST: /api/profiles/_VGAQn/...  │  ← 채팅 메타·목록
.com  (cookie)   ├──────────────────────────────────┤
                 │  WS  : pf-capi.kakao.com (SockJS)│  ← 메시지 push
                 └──────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
   scripts/kakao-partner-       scripts/kakao-partner-
        bootstrap.mjs                 stream.mjs
   (1회 채팅 메타 백필)        (상시 데몬 — WS + 60s 폴링 폴백)
              │                           │
              └────────────┬──────────────┘
                           ▼
                    Supabase 테이블
       kakao_partner_chats / _messages / _stream_state
```

핵심:
- **인증은 쿠키만** — 별도 토큰/Bearer 없음. 카카오 로그인 세션 쿠키 그대로.
- **메시지 본문은 WebSocket push 로만** 수신 (REST 단건 endpoint 발견 못함).
- **service_role 키**로 RLS 우회 — 절대 브라우저 코드에 노출 금지.

---

## 1. Supabase 마이그레이션 적용

Supabase Dashboard → SQL Editor → New query → 아래 파일 전체 붙여넣고 RUN.

```
supabase/migrations/20260512_kakao_partner.sql
```

생성되는 것:
- `kakao_partner_chats` — 채팅방 메타 (chat_id PK)
- `kakao_partner_messages` — 메시지 단건 (log_id PK, chat_id FK)
- `kakao_partner_stream_state` — 스트림 재개 기준점 (profile_id PK)

이어서 헬스 컬럼 마이그레이션도 적용 (수집 멈춤 원인 기록용, additive):
```
supabase/migrations/20260524_kakao_partner_stream_health.sql
```

---

## 2. 의존성 설치

```bash
npm install
```

`ws` 가 새로 추가됨.

---

## 3. 쿠키 + 키 추출

### 3-1. 카카오 파트너센터 쿠키

1. Chrome 으로 https://business.kakao.com/_VGAQn/chats 접속 후 정상 로그인
2. DevTools 열기 (Cmd+Opt+I)
3. **Application** 탭 → Storage → Cookies → `https://business.kakao.com`
4. 모든 쿠키를 복사. 가장 빠른 방법: **Network 탭** 에서 아무 `/api/...` XHR 클릭 → **Request Headers** → `cookie:` 값을 통째로 복사
5. 쿠키 문자열 예시:
   ```
   _kawlt=...; _kawltea=...; _karmt=...; TIARA=...; _T=...
   ```

### 3-2. Profile ID

URL 의 `/_VGAQn/` 부분이 profile ID. 본인 채널이 다르면 확인.

### 3-3. Supabase service_role key

Supabase Dashboard → Project Settings → API → `service_role` `secret` 키 복사.

> ⚠️ 이 키는 RLS 를 완전히 우회. 절대 git/브라우저/Slack 에 올리지 말 것.

### 3-4. `.env.local` 작성

저장소 루트에 `.env.local` 생성 (이미 `.gitignore` 됨):

```bash
KAKAO_PARTNER_PROFILE_ID=_VGAQn
KAKAO_PARTNER_COOKIE='_kawlt=...; _kawltea=...; ...'
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

쿠키에 작은따옴표 또는 큰따옴표를 꼭 감싸기 (세미콜론 때문에 깨짐).

---

## 4. 부트스트랩 (1회)

```bash
npm run kakao:bootstrap
```

기대 출력:
```
[auth] logged in as basis9@kakao.com
[page 0] received=37 new=37 upserted=37
[done] totalChats=37 upserted=37
```

Supabase 에서 확인:
```sql
select count(*), max(last_log_send_at) from kakao_partner_chats;
```

---

## 5. 실시간 스트림 (상시)

### 5-1. 포그라운드로 먼저 검증

```bash
npm run kakao:stream
```

새 메시지가 들어오면 첫 번째 frame 의 raw payload 가
`./kakao-partner-raw.log` 와 콘솔에 동시에 출력됨.

→ **payload 구조 확인 후 `_handlePayload()` 의 휴리스틱(log_id/chat_id/text 추출)
정확도 점검**. 실제 키 이름이 다르면 PR 로 매핑 보강.

확인되면 raw 덤프 끄기:
```bash
KAKAO_PARTNER_DUMP_RAW=false npm run kakao:stream
```

### 5-2. macOS launchd 로 상시 실행

```bash
mkdir -p ~/Library/Logs/ams-wiki
# 1) plist 의 WorkingDirectory / NODE_BIN / 로그 경로를 본인 환경에 맞게 수정
vim scripts/launchd/com.amswiki.kakao-stream.plist
# 2) 설치
cp scripts/launchd/com.amswiki.kakao-stream.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.amswiki.kakao-stream.plist
# 3) 로그 확인
tail -f ~/Library/Logs/ams-wiki/kakao-stream.log
```

중지:
```bash
launchctl unload ~/Library/LaunchAgents/com.amswiki.kakao-stream.plist
```

---

## 6. 동작 확인 SQL

```sql
-- 최근 수집된 메시지 20건
select sent_at, chat_id, sender_type, left(message, 60) as preview
from kakao_partner_messages
order by sent_at desc
limit 20;

-- 스트림 상태
select * from kakao_partner_stream_state;

-- 미응답 채팅
select chat_id, nickname, last_message, last_log_send_at
from kakao_partner_chats
where is_done = false and is_read = false
order by last_log_send_at desc;
```

---

## 7. 쿠키 만료 자가복구 (수집 멈춤 방지)

쿠키는 보통 1~4주면 만료된다. 과거엔 만료 시 데몬이 시작 단계 `me()` 401 에서
`process.exit(1)` 으로 죽고, supervisor 가 5초마다 무한 재시작(폭주)하거나, 폴링이
조용히 멈춰 **수집이 영구 정지**했다. 이제 다음과 같이 스스로 복구한다.

**반응형 (데몬 자체)** — 401/403 을 만나면:
1. `.env.local` 의 `KAKAO_PARTNER_COOKIE` 를 다시 읽어 외부에서 갱신된 쿠키를 즉시 픽업
2. (macOS) `KAKAO_PARTNER_AUTO_REFRESH=1` 이면 Chrome 로컬 쿠키에서 자동 재추출 후 재시도
3. 실패해도 죽지 않고 백오프(최대 5분) 후 재시도하며, 원인을
   `kakao_partner_stream_state.last_error` 에 기록 → `npm run kakao:status` 로 확인

**선제형 (스케줄)** — 6시간마다 쿠키를 미리 갱신해 만료 자체를 예방:
```bash
cp scripts/launchd/com.amswiki.kakao-cookie-refresh.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.amswiki.kakao-cookie-refresh.plist
```
(값이 바뀐 경우에만 `.env.local` 갱신하며, 데몬은 끊지 않음 — 다음 401 때 재읽음.)
전제: **Chrome 으로 business.kakao.com 로그인 유지** + 최초 1회 키체인(Chrome Safe Storage) 허용.

수집 상태 점검:
```bash
npm run kakao:status   # ✅ok / ⚠️STALE + heartbeat + last_error 표시
```

### 그 외 증상

| 증상 | 원인 | 해결 |
|---|---|---|
| `⚠️STALE` + `last_error: auth 401` | 쿠키 만료 + 자동 갱신 실패 | Chrome 으로 카카오 재로그인 (자가복구가 다음 주기에 픽업) |
| `HTTP 403 /chats/search` | 권한 부족 | 매니저 권한 가진 계정으로 재로그인 |
| `ws/info HTTP 503` | 카카오 서버 점검 또는 IP 차단 | 30분 대기. 반복되면 jitter 늘리기 |
| `payload (unmatched)` 만 나옴 | push payload 키가 휴리스틱과 다름 | 덤프 파일 보고 `_handlePayload()` 수정 |
| `cookie refresh unavailable` | macOS 아님 / Chrome 로그아웃 | Chrome 재로그인 또는 수동 `npm run kakao:refresh-cookie` |

---

## 8. 보안 / ToS 주의

- 카카오 비즈니스 약관에 자동화 도구 명시 금지가 있는지 사용 전 확인 권장.
- 본 데몬은 **본인 계정의 본인 데이터** 수집용. 타인 채널/계정 데이터 수집 금지.
- 트래픽 패턴: REST 폴백 60초 간격 + jitter 0~400ms. 더 공격적으로 설정 시
  카카오 측 어뷰즈 탐지에 걸릴 수 있음.
- 쿠키 노출 시 **계정 탈취** 가능. `.env.local` 는 절대 commit 금지 (이미 무시됨).

---

## 9. 다음 작업 (PR 단위)

1. payload 구조 확정 후 `_handlePayload()` 의 휴리스틱을 정식 매핑으로 교체
2. `useCSInsightsLive` (PR #36) 에 `kakao_partner_messages` 소스 추가
3. 메시지 첨부파일 (이미지) 의 카카오 CDN 만료 대응 — Supabase Storage 미러링
4. 갭 백필: `last_seen_log_id` 와 REST `last_log_id` 비교해서 누락 감지 시 알림
