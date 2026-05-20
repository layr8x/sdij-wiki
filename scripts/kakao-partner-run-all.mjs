#!/usr/bin/env node
// scripts/kakao-partner-run-all.mjs
// 배치 스크립트(bootstrap/backfill)를 채널마다 순차 실행하는 러너.
// 채널 목록: KAKAO_PARTNER_PROFILE_IDS(CSV) 우선, 없으면 KAKAO_PARTNER_PROFILE_ID.
//
// 실행: node --env-file=.env.local scripts/kakao-partner-run-all.mjs <target.mjs>
//   예) node --env-file=.env.local scripts/kakao-partner-run-all.mjs kakao-partner-bootstrap.mjs

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = process.argv[2];
if (!target) {
  console.error('usage: kakao-partner-run-all.mjs <target-script.mjs>');
  process.exit(1);
}

const ids = (process.env.KAKAO_PARTNER_PROFILE_IDS || process.env.KAKAO_PARTNER_PROFILE_ID || '')
  .split(',').map((s) => s.trim()).filter(Boolean);
if (ids.length === 0) {
  console.error('[run-all] KAKAO_PARTNER_PROFILE_IDS / KAKAO_PARTNER_PROFILE_ID 가 비어있음');
  process.exit(1);
}

const script = path.join(__dirname, target);
let failures = 0;
for (const pid of ids) {
  console.log(`\n===== [${pid}] ${target} =====`);
  const r = spawnSync(process.execPath, [script], {
    env: { ...process.env, KAKAO_PARTNER_PROFILE_ID: pid },
    stdio: 'inherit',
  });
  if (r.status !== 0) {
    failures++;
    console.error(`[run-all] [${pid}] exited ${r.status} — 다음 채널 계속`);
  }
}
console.log(`\n[run-all] done. channels=${ids.length} failures=${failures}`);
process.exit(failures ? 1 : 0);
