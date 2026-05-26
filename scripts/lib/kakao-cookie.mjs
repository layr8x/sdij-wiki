// scripts/lib/kakao-cookie.mjs
// 카카오 파트너센터 쿠키 런타임 헬퍼.
// - readCookieFromEnvFile : .env.local 의 KAKAO_PARTNER_COOKIE 값을 디스크에서 직접 읽음
//   (env 변수는 프로세스 시작 시점 스냅샷이라, 외부에서 .env.local 을 갱신해도
//    실행 중 데몬은 모름 → 자가복구 시 파일을 다시 읽어 최신 쿠키를 픽업)
// - maybeRefreshCookie    : Chrome 로컬 쿠키에서 재추출(refresh 스크립트 위임).
//   다채널 동시 폭주를 막기 위해 lockfile mtime 기반 쿨다운 적용.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REFRESH_SCRIPT = path.join(__dirname, '..', 'kakao-partner-refresh-cookie.mjs');
const LOCK_NAME = '.kakao-cookie-refresh.lock';
const DEFAULT_COOLDOWN_MS = 10 * 60_000;

export function envFilePath(cwd = process.cwd()) {
  return path.join(cwd, '.env.local');
}

// .env.local 에서 KAKAO_PARTNER_COOKIE 값 파싱 (작은/큰따옴표 제거).
export function readCookieFromEnvFile(envPath = envFilePath()) {
  try {
    const txt = fs.readFileSync(envPath, 'utf8');
    const m = txt.match(/^KAKAO_PARTNER_COOKIE=(.*)$/m);
    if (!m) return null;
    let v = m[1].trim();
    if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
      v = v.slice(1, -1);
    }
    return v || null;
  } catch {
    return null;
  }
}

// Chrome 로컬 쿠키 저장소에서 쿠키 재추출 (macOS 전용, refresh 스크립트 위임).
// 데몬 자가복구 경로에서 호출되므로 KAKAO_SKIP_DAEMON_RESTART=1 로 자기 자신 재시작 방지.
// 최근 cooldownMs 안에 이미 시도했으면 skip(=false) 하고 .env.local 재읽기에 맡긴다.
// 성공(exit 0) 시 true.
export function maybeRefreshCookie({ cwd = process.cwd(), cooldownMs = DEFAULT_COOLDOWN_MS } = {}) {
  const lock = path.join(cwd, LOCK_NAME);
  try {
    const st = fs.statSync(lock);
    if (Date.now() - st.mtimeMs < cooldownMs) return false; // 최근에 시도함 → 폭주 방지
  } catch {
    /* 락 없음 → 진행 */
  }
  try {
    fs.writeFileSync(lock, String(Date.now()));
  } catch {
    /* 락 기록 실패는 치명적 아님 */
  }

  const r = spawnSync(process.execPath, [REFRESH_SCRIPT], {
    cwd,
    env: { ...process.env, KAKAO_SKIP_DAEMON_RESTART: '1' },
    stdio: 'inherit',
    timeout: 90_000,
  });
  return r.status === 0;
}
