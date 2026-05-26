#!/usr/bin/env node
// scripts/kakao-partner-multi-stream.mjs
// 멀티채널 실시간 스트림 supervisor.
// 검증된 단일채널 kakao-partner-stream.mjs 를 채널마다 자식 프로세스로 띄운다.
// - 채널 격리: 한 채널 WS 가 죽어도 나머지 영향 없음
// - 크래시 자동 재시작(backoff)
// - SIGINT/SIGTERM → 모든 자식 정리 후 종료
// - 첫 가동 stagger 로 동시 접속 회피
//
// 채널 목록: KAKAO_PARTNER_PROFILE_IDS (CSV) 우선, 없으면 KAKAO_PARTNER_PROFILE_ID(단수) fallback.
//
// 실행: node --env-file=.env.local scripts/kakao-partner-multi-stream.mjs

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STREAM = path.join(__dirname, 'kakao-partner-stream.mjs');

const ids = (process.env.KAKAO_PARTNER_PROFILE_IDS || process.env.KAKAO_PARTNER_PROFILE_ID || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

if (ids.length === 0) {
  console.error('[multi] KAKAO_PARTNER_PROFILE_IDS / KAKAO_PARTNER_PROFILE_ID 가 비어있음');
  process.exit(1);
}
console.log(`[multi] starting ${ids.length} channels: ${ids.join(', ')}`);

const children = new Map();
const failCount = new Map();
let shuttingDown = false;

function prefix(tag, buf) {
  return buf.toString().split('\n').filter((l) => l.length).map((l) => `${tag} ${l}\n`).join('');
}

function startChild(pid, delay = 0) {
  setTimeout(() => {
    if (shuttingDown) return;
    const startedAt = Date.now();
    const env = { ...process.env, KAKAO_PARTNER_PROFILE_ID: pid, KAKAO_PARTNER_DUMP_RAW: 'false' };
    const child = spawn(process.execPath, [STREAM], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    children.set(pid, child);
    const tag = `[${pid}]`;
    child.stdout.on('data', (d) => process.stdout.write(prefix(tag, d)));
    child.stderr.on('data', (d) => process.stderr.write(prefix(tag, d)));
    child.on('exit', (code, sig) => {
      children.delete(pid);
      const uptime = Date.now() - startedAt;
      console.log(`${tag} exited code=${code} sig=${sig} uptime=${Math.round(uptime / 1000)}s`);
      if (shuttingDown) return;
      // 충분히 오래 살아있었으면 backoff 리셋, 즉시 죽으면(쿠키 만료 등) 지수 증가 → 카카오 폭주 방지.
      const fails = uptime > 60_000 ? 0 : (failCount.get(pid) || 0) + 1;
      failCount.set(pid, fails);
      const backoff = Math.min(5 * 60_000, 5000 * 2 ** Math.min(fails, 6));
      const jitter = Math.floor(Math.random() * 2000);
      console.log(`${tag} restart in ${backoff + jitter}ms (fails=${fails})`);
      startChild(pid, backoff + jitter);
    });
    console.log(`${tag} started os_pid=${child.pid}`);
  }, delay);
}

ids.forEach((pid, i) => startChild(pid, i * 2500));

function shutdown(sig) {
  console.log(`[multi] ${sig} → stopping ${children.size} children`);
  shuttingDown = true;
  for (const c of children.values()) { try { c.kill('SIGTERM'); } catch {} }
  setTimeout(() => process.exit(0), 2500);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
