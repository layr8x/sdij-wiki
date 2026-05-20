#!/usr/bin/env node
// scripts/kakao-partner-status.mjs
// 채널별 수집 현황(채팅수/메시지수/최신메시지) 출력.
// 실행: node --env-file=.env.local scripts/kakao-partner-status.mjs

import { getAdminClient } from './lib/supabase-admin.mjs';

const sb = getAdminClient();
const ids = (process.env.KAKAO_PARTNER_PROFILE_IDS || process.env.KAKAO_PARTNER_PROFILE_ID || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

for (const pid of ids) {
  const { count: chats } = await sb.from('kakao_partner_chats')
    .select('*', { count: 'exact', head: true }).eq('profile_id', pid);
  const { count: msgs } = await sb.from('kakao_partner_messages')
    .select('*', { count: 'exact', head: true }).eq('profile_id', pid);
  const { data: last } = await sb.from('kakao_partner_messages')
    .select('sent_at, message').eq('profile_id', pid)
    .order('sent_at', { ascending: false }).limit(1);
  const lr = last && last[0];
  console.log(`${pid.padEnd(10)} chats=${String(chats).padStart(5)} messages=${String(msgs).padStart(7)} last=${lr?.sent_at || '-'} | ${(lr?.message || '').replace(/\n/g, ' ').slice(0, 36)}`);
}
