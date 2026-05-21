#!/usr/bin/env node
// scripts/kakao-partner-export-csv.mjs
// 카카오 파트너 3채널 상담 메시지를 채널별 "정제 CSV"로 추출.
// - 채널: 마이클래스(_VGAQn) / LIVE(_TkpPG) / C(_xfxilXn) 각각 파일 분리
// - Excel 한글 호환: UTF-8 BOM + CRLF
// - 정제: KST 시각, 보낸이 한글 라벨, 닉네임 조인, 본문 개행/제어문자 제거
// 실행: npm run kakao:export   (출력 폴더 기본 ./exports, KAKAO_EXPORT_DIR 로 변경)

import { getAdminClient } from './lib/supabase-admin.mjs';
import fs from 'node:fs';
import path from 'node:path';

const sb = getAdminClient();
const CHANNELS = [
  { id: '_VGAQn', label: '마이클래스' },
  { id: '_TkpPG', label: 'LIVE' },
  { id: '_xfxilXn', label: 'C' },
];
const OUT = process.env.KAKAO_EXPORT_DIR || path.join(process.cwd(), 'exports');
fs.mkdirSync(OUT, { recursive: true });
const BOM = String.fromCharCode(0xFEFF);
const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const PAGE = 1000;

const SENDER = { manager: '상담원', user: '고객', system: '시스템' };

const fmtKST = (iso) => {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(new Date(iso)).replace('T', ' ');
  } catch { return iso; }
};

// 제어문자 제거 + 공백 정규화 (이스케이프 깨짐 방지 위해 charCode 기반)
function clean(s) {
  if (s == null) return '';
  let out = '';
  for (const c of String(s)) {
    const k = c.charCodeAt(0);
    out += (k < 32 || k === 127) ? ' ' : c;
  }
  return out.replace(/\s+/g, ' ').trim();
}

const cell = (s) => {
  const v = String(s == null ? '' : s);
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
};

async function nicknames(pid) {
  const map = new Map();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from('kakao_partner_chats')
      .select('chat_id, nickname').eq('profile_id', pid)
      .order('chat_id', { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || !data.length) break;
    for (const r of data) map.set(String(r.chat_id), r.nickname || '');
    if (data.length < PAGE) break;
  }
  return map;
}

async function exportChannel(ch) {
  const nick = await nicknames(ch.id);
  const head = ['채널', '채팅ID', '보낸시각(KST)', '보낸이', '닉네임', '메시지유형', '메시지'];
  const lines = [head.map(cell).join(',')];
  let count = 0;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from('kakao_partner_messages')
      .select('chat_id, sender_type, message, message_type, sent_at')
      .eq('profile_id', ch.id).order('sent_at', { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || !data.length) break;
    for (const m of data) {
      lines.push([
        ch.label, m.chat_id, fmtKST(m.sent_at),
        SENDER[m.sender_type] || m.sender_type || '',
        nick.get(String(m.chat_id)) || '', m.message_type || '', clean(m.message),
      ].map(cell).join(','));
    }
    count += data.length;
    if (data.length < PAGE) break;
  }
  const file = path.join(OUT, `kakao_${ch.label}_${today}.csv`);
  fs.writeFileSync(file, BOM + lines.join('\r\n') + '\r\n', 'utf8');
  console.log(`${ch.label}  ${count} rows -> ${file}`);
  return { file, count };
}

const results = [];
for (const ch of CHANNELS) results.push(await exportChannel(ch));
console.log('\nDONE total', results.reduce((a, b) => a + b.count, 0), 'rows');
results.forEach((r) => console.log('FILE:' + r.file));
