#!/usr/bin/env node
// scripts/kakao-partner-bootstrap.mjs
// 1회 백필: 파트너센터의 모든 채팅 목록을 Supabase로 적재 — 다중 채널 지원.
//
// 환경변수:
//   KAKAO_PARTNER_PROFILE_IDS=_VGAQn,_TkpPG,_xfxilXn   (복수)
//   KAKAO_PARTNER_PROFILE_ID=_VGAQn                    (단수, 백워드 호환)
//
// 실행:
//   node --env-file=.env.local scripts/kakao-partner-bootstrap.mjs
//   npm run kakao:bootstrap

import { KakaoPartnerClient, chatToRow } from './lib/kakao-partner-client.mjs';
import { getAdminClient } from './lib/supabase-admin.mjs';

const COOKIE = process.env.KAKAO_PARTNER_COOKIE;
const PAGE_SIZE = Number(process.env.KAKAO_PARTNER_PAGE_SIZE || 100);
const MAX_PAGES = Number(process.env.KAKAO_PARTNER_MAX_PAGES || 50);

function parseProfileIds() {
  const raw = process.env.KAKAO_PARTNER_PROFILE_IDS || process.env.KAKAO_PARTNER_PROFILE_ID || '';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

async function bootstrapProfile(profileId, supabase) {
  console.log(`\n=== profile ${profileId} ===`);
  const client = new KakaoPartnerClient({ cookie: COOKIE, profileId });

  const me = await client.me();
  console.log(`[auth] logged in as ${me.email || me.id || 'unknown'}`);

  let totalInserted = 0;
  let totalSeen = 0;
  const seenIds = new Set();
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

    const rows = items.map((it) => chatToRow(it, profileId));
    const { error } = await supabase
      .from('kakao_partner_chats')
      .upsert(rows, { onConflict: 'chat_id' });
    if (error) throw error;
    totalInserted += rows.length;

    console.log(`[${profileId} page ${page}] received=${items.length} new=${newOnes} has_next=${res.has_next} grand=${totalSeen}`);

    if (!res.has_next) break;
    const lastItem = items[items.length - 1];
    since = lastItem?.last_log_id;
    if (!since) {
      console.warn(`[${profileId} abort] last_log_id missing — cannot paginate further`);
      break;
    }
  }

  const { error: stErr } = await supabase
    .from('kakao_partner_stream_state')
    .upsert(
      { profile_id: profileId, last_heartbeat_at: new Date().toISOString() },
      { onConflict: 'profile_id' },
    );
  if (stErr) throw stErr;

  console.log(`[${profileId} done] totalChats=${totalSeen} upserted=${totalInserted}`);
  return { profileId, totalSeen, totalInserted };
}

async function main() {
  const profileIds = parseProfileIds();
  if (profileIds.length === 0) {
    throw new Error('KAKAO_PARTNER_PROFILE_IDS (or KAKAO_PARTNER_PROFILE_ID) is empty');
  }
  console.log(`[boot] bootstrapping ${profileIds.length} channel(s): ${profileIds.join(', ')}`);

  const supabase = getAdminClient();
  const results = [];
  for (const pid of profileIds) {
    try {
      results.push(await bootstrapProfile(pid, supabase));
    } catch (e) {
      console.error(`[${pid} fatal]`, e.message);
      results.push({ profileId: pid, error: e.message });
    }
  }

  console.log('\n[summary]');
  for (const r of results) {
    if (r.error) console.log(`  ${r.profileId}: ERROR ${r.error}`);
    else console.log(`  ${r.profileId}: chats=${r.totalSeen} upserted=${r.totalInserted}`);
  }
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
