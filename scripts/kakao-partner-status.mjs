#!/usr/bin/env node
// scripts/kakao-partner-status.mjs
// 채널별 수집 현황(채팅수/메시지수/최신메시지) 출력.
// 실행: node --env-file=.env.local scripts/kakao-partner-status.mjs

import { getAdminClient } from './lib/supabase-admin.mjs';

const sb = getAdminClient();
const ids = (process.env.KAKAO_PARTNER_PROFILE_IDS || process.env.KAKAO_PARTNER_PROFILE_ID || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

// 최신 메시지가 이 분(min)보다 오래되면 STALE(수집 정체) 로 표시.
const STALE_MIN = Number(process.env.KAKAO_STATUS_STALE_MIN || 15);
const ageMin = (iso) => (iso ? (Date.now() - new Date(iso).getTime()) / 60_000 : Infinity);

for (const pid of ids) {
  const { count: chats } = await sb.from('kakao_partner_chats')
    .select('*', { count: 'exact', head: true }).eq('profile_id', pid);
  const { count: msgs } = await sb.from('kakao_partner_messages')
    .select('*', { count: 'exact', head: true }).eq('profile_id', pid);
  const { data: last } = await sb.from('kakao_partner_messages')
    .select('sent_at, message').eq('profile_id', pid)
    .order('sent_at', { ascending: false }).limit(1);
  // select('*') → last_error 컬럼 미적용 환경에서도 에러 없이 동작.
  const { data: state } = await sb.from('kakao_partner_stream_state')
    .select('*').eq('profile_id', pid).maybeSingle();
  const lr = last && last[0];
  const stale = ageMin(lr?.sent_at) > STALE_MIN;
  const flag = stale ? '⚠️STALE' : '✅ok';
  console.log(`${flag.padEnd(8)} ${pid.padEnd(10)} chats=${String(chats).padStart(5)} messages=${String(msgs).padStart(7)} last=${lr?.sent_at || '-'} | ${(lr?.message || '').replace(/\n/g, ' ').slice(0, 36)}`);
  if (state?.last_heartbeat_at) {
    console.log(`${' '.repeat(8)} ${' '.repeat(10)} heartbeat=${Math.round(ageMin(state.last_heartbeat_at))}분 전 reconnects=${state.total_reconnects ?? 0}`);
  }
  if (state?.last_error) {
    console.log(`${' '.repeat(8)} ${' '.repeat(10)} └ last_error: ${String(state.last_error).slice(0, 100)} @ ${state.last_error_at || '-'}`);
  }
}
