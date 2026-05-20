#!/usr/bin/env node
// scripts/kakao-partner-refresh-cookie.mjs
// Chrome 로컬 쿠키 저장소에서 카카오 비즈니스 쿠키를 추출해 .env.local 의
// KAKAO_PARTNER_COOKIE 를 갱신한다. 쿠키 만료(보통 1~4주) 시 실행.
//
// 전제: Chrome 으로 business.kakao.com 에 로그인되어 있어야 함.
// 실행: npm run kakao:refresh-cookie
//   (최초 실행 시 "Chrome Safe Storage" 키체인 접근 허용 팝업 → 항상 허용)
// 갱신 후 데몬 재시작까지 자동 시도.

import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HOME = os.homedir();
const CHROME = path.join(HOME, 'Library/Application Support/Google/Chrome');

const pw = execFileSync('security',
  ['find-generic-password', '-w', '-s', 'Chrome Safe Storage', '-a', 'Chrome']).toString().trim();
const key = crypto.pbkdf2Sync(pw, 'saltysalt', 1003, 16, 'sha1');
const IV = Buffer.alloc(16, 0x20);

function decrypt(u8) {
  const buf = Buffer.from(u8);
  if (buf.length < 4) return null;
  if (buf.subarray(0, 3).toString('latin1') !== 'v10') return buf.toString('utf8');
  const dec = crypto.createDecipheriv('aes-128-cbc', key, IV);
  dec.setAutoPadding(false);
  let out = Buffer.concat([dec.update(buf.subarray(3)), dec.final()]);
  const pad = out[out.length - 1];
  if (pad >= 1 && pad <= 16) out = out.subarray(0, out.length - pad);
  if (out.length > 32) {
    let ctrl = false;
    for (let i = 0; i < 32; i++) { if (out[i] < 0x20 || out[i] > 0x7e) { ctrl = true; break; } }
    if (ctrl) out = out.subarray(32);
  }
  return out.toString('utf8');
}

function readProfile(dir) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-'));
  for (const f of ['Cookies', 'Cookies-wal', 'Cookies-shm']) {
    const src = path.join(dir, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(tmp, f));
  }
  if (!fs.existsSync(path.join(tmp, 'Cookies'))) return null;
  const db = new DatabaseSync(path.join(tmp, 'Cookies'), { readOnly: false });
  const rows = db.prepare(
    "SELECT host_key, name, encrypted_value FROM cookies " +
    "WHERE host_key IN ('.kakao.com','business.kakao.com','.business.kakao.com','kakao.com')"
  ).all();
  db.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  rows.sort((a, b) => (a.host_key.startsWith('.kakao') ? 0 : 1) - (b.host_key.startsWith('.kakao') ? 0 : 1));
  const map = new Map();
  for (const r of rows) {
    const v = decrypt(r.encrypted_value);
    if (v != null && v !== '') map.set(r.name, v);
  }
  return map;
}

// _kawlt(로그인 토큰) 보유 프로필 중 가장 최근 것 선택
let best = null;
for (const name of fs.readdirSync(CHROME)) {
  const dir = path.join(CHROME, name);
  if (!fs.existsSync(path.join(dir, 'Cookies'))) continue;
  let map;
  try { map = readProfile(dir); } catch { continue; }
  if (map && map.has('_kawlt')) {
    const mtime = fs.statSync(path.join(dir, 'Cookies')).mtimeMs;
    if (!best || mtime > best.mtime) best = { name, map, mtime };
  }
}

if (!best) {
  console.error('[refresh] _kawlt 쿠키를 가진 Chrome 프로필을 못 찾음. Chrome 으로 business.kakao.com 에 로그인했는지 확인.');
  process.exit(1);
}

const cookieStr = [...best.map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
console.log(`[refresh] profile="${best.name}" cookies=${best.map.size} length=${cookieStr.length} has_kawlt=${best.map.has('_kawlt')}`);

const envPath = path.join(process.cwd(), '.env.local');
let env = fs.readFileSync(envPath, 'utf8');
fs.writeFileSync(envPath + '.bak', env);
const line = "KAKAO_PARTNER_COOKIE='" + cookieStr.replace(/'/g, '') + "'";
env = /^KAKAO_PARTNER_COOKIE=.*$/m.test(env)
  ? env.replace(/^KAKAO_PARTNER_COOKIE=.*$/m, line)
  : env + '\n' + line + '\n';
fs.writeFileSync(envPath, env);
console.log('[refresh] .env.local 갱신 (backup: .env.local.bak)');

// 데몬 재시작(있으면)
try {
  const uid = process.getuid();
  execSync(`launchctl kickstart -k gui/${uid}/com.amswiki.kakao-stream`, { stdio: 'ignore' });
  console.log('[refresh] launchd 데몬 재시작 완료 (com.amswiki.kakao-stream)');
} catch {
  console.log('[refresh] 데몬 미등록/재시작 생략 — 수동 실행 시 npm run kakao:stream:all');
}
