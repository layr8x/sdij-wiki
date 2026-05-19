#!/usr/bin/env node
// scripts/kakao-partner-bootstrap.mjs
// 1회 백필: 파트너센터의 모든 채팅 목록을 Supabase로 적재.
//
// 메시지 단건 로그(/logs)는 REST에서 안 잡혔으므로 이 스크립트는 채팅 목록 +
// last_message 까지만 저장. 메시지 본문은 stream 데몬이 WS로 받아서 채움.
//
// 실행:
//   node --env-file=.env.local scripts/kakao-partner-bootstrap.mjs
// 또는:
//   npm run kakao:bootstrap

import { KakaoPartnerClient, chatToRow } from './lib/kakao-partner-client.mjs';
import { getAdminClient } from './lib/supabase-admin.mjs';

const PROFILE_ID = process.env.KAKAO_PARTNER_PROFILE_ID;
const COOKIE = process.env.KAKAO_PARTNER_COOKIE;
const PAGE_SIZE = Number(process.env.KAKAO_PARTNER_PAGE_SIZE || 100);
const MAX_PAGES = Number(process.env.KAKAO_PARTNER_MAX_PAGES || 50);

async function main() {
  const client = new KakaoPartnerClient({ cookie: COOKIE, profileId: PROFILE_ID });
  const supabase = getAdminClient();

  // 인증 검증
  const me = await client.me();
  console.log(`[auth] logged in as ${me.email || me.id || 'unknown'}`);

  let totalInserted = 0;
  let totalSeen = 0;
  const seenIds = new Set();

  // 카카오 search 페이지네이션: ?size=100&since={마지막 채팅의 last_log_id}
  let since = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await client.searchChats({ size: PAGE_SIZE, since, body: {} });
    const items = Array.isArray(res?.items) ? res.items : [];
    if (items.length === 0) break;

    let newOnes = 0;
    for (const it of items) {
      if (seenIds.has(it.id)) continue;
      seenIds.add(it.id);
      newOnes++;
    }
    totalSeen += newOnes;

    const rows = items.map((it) => chatToRow(it, PROFILE_ID));
    const { error } = await supabase
      .from('kakao_partner_chats')
      .upsert(rows, { onConflict: 'chat_id' });
    if (error) throw error;
    totalInserted += rows.length;

    console.log(`[page ${page}] received=${items.length} new=${newOnes} has_next=${res.has_next} grand=${totalSeen}`);

    if (!res.has_next) break;
    // 다음 페이지: 마지막 채팅의 last_log_id
    const lastItem = items[items.length - 1];
    since = lastItem?.last_log_id;
    if (!since) {
      console.warn('[abort] last_log_id missing on last item — cannot paginate further');
      break;
    }
  }

  // stream_state 초기화
  const { error: stErr } = await supabase
    .from('kakao_partner_stream_state')
    .upsert(
      { profile_id: PROFILE_ID, last_heartbeat_at: new Date().toISOString() },
      { onConflict: 'profile_id' },
    );
  if (stErr) throw stErr;

  console.log(`\n[done] totalChats=${totalSeen} upserted=${totalInserted}`);
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
