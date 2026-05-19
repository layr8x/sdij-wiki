#!/usr/bin/env node
// scripts/kakao-partner-backfill.mjs
// 모든 채팅의 과거 메시지를 /chatlogs REST endpoint 로 가져와 supabase 에 적재.
//
// 카카오 응답 구조 (실측):
//   GET /api/profiles/{pid}/chats/{cid}/chatlogs?since={log_id}&direct={prev|next}
//   { has_prev: bool, has_next: bool, items: [...] }
//
// 페이지네이션:
//   - direct=next + since=0      → 가장 오래된 메시지부터 시간순
//   - direct=next + since=lastId → 다음 페이지 (더 최근)
//   - has_next 가 true 인 동안 반복

import { KakaoPartnerClient } from './lib/kakao-partner-client.mjs';
import { getAdminClient } from './lib/supabase-admin.mjs';

const PROFILE_ID = process.env.KAKAO_PARTNER_PROFILE_ID;
const COOKIE = process.env.KAKAO_PARTNER_COOKIE;
const PAGE_DELAY_MS = Number(process.env.KAKAO_BACKFILL_DELAY_MS || 250);
const MAX_PAGES_PER_CHAT = Number(process.env.KAKAO_BACKFILL_MAX_PAGES || 200);

const client = new KakaoPartnerClient({ cookie: COOKIE, profileId: PROFILE_ID });
const supabase = getAdminClient();

function logToRow(item, profileId, chatId) {
  // sender_type 판정: manager 객체가 있으면 manager, 없고 author.user_type=0 면 user
  const isManager = !!item.manager;
  const author = item.author || {};
  const senderType = isManager ? 'manager' : (author.user_type === 0 ? 'user' : 'system');
  const senderId = isManager ? String(item.manager?.id ?? '') : String(author.id ?? '');

  // 메시지 본문 후보: message, text, content
  const message = item.message ?? item.text ?? item.content ?? null;
  const messageType = item.type ?? null;
  const sentAt = item.send_at
    ? new Date(item.send_at).toISOString()
    : item.created_at
    ? new Date(item.created_at).toISOString()
    : null;

  return {
    log_id: String(item.id),
    chat_id: String(chatId),
    profile_id: profileId,
    sender_type: senderType,
    sender_id: senderId || null,
    message,
    message_type: messageType,
    attachments: item.attachment && Object.keys(item.attachment).length ? item.attachment : null,
    sent_at: sentAt,
    raw: item,
    source: 'rest_backfill',
  };
}

async function backfillChat(chatId) {
  let totalInserted = 0;
  let oldestLogId = null;
  let lastInsertedId = null;
  // 카카오 chatlogs 페이지네이션 실측:
  //   ?size=500          → 가장 최근 N건 (has_prev: true 면 더 과거 있음)
  //   ?since=<id>&direct=prev → 그 id 이전(더 과거) N건
  for (let page = 0; page < MAX_PAGES_PER_CHAT; page++) {
    const qs = page === 0
      ? `size=500`
      : `since=${oldestLogId}&direct=prev&size=500`;
    const url = `/api/profiles/${PROFILE_ID}/chats/${chatId}/chatlogs?${qs}`;
    let res;
    try {
      res = await client._fetch(url);
    } catch (e) {
      console.error(`  [chat ${chatId} page ${page}] fetch fail:`, e.message);
      return { totalInserted, error: e.message };
    }
    const items = res?.items || [];
    if (!items.length) break;

    const rows = items.map((it) => logToRow(it, PROFILE_ID, chatId));
    const { error } = await supabase
      .from('kakao_partner_messages')
      .upsert(rows, { onConflict: 'log_id' });
    if (error) {
      console.error(`  [chat ${chatId} page ${page}] upsert fail:`, error.message);
      return { totalInserted, error: error.message };
    }
    totalInserted += rows.length;
    // items 는 시간순(과거→최근) 정렬, oldest 가 첫 element
    oldestLogId = rows[0].log_id;
    lastInsertedId = rows[rows.length - 1].log_id;

    if (!res.has_prev) break; // 더 과거 메시지 없음
    await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
  }
  return { totalInserted, lastLogId: lastInsertedId };
}

async function main() {
  // 인증 검증
  const me = await client.me();
  console.log(`[auth] ${me.email || me.id}`);

  // 채팅 ID 목록 — Supabase 기본 1000 limit 회피
  const { data: chats, error: chatsErr } = await supabase
    .from('kakao_partner_chats')
    .select('chat_id, nickname, last_log_id')
    .eq('profile_id', PROFILE_ID)
    .order('last_log_send_at', { ascending: false })
    .range(0, 9999);
  if (chatsErr) throw chatsErr;
  console.log(`[plan] ${chats.length} chats to backfill`);

  const CONCURRENCY = Number(process.env.KAKAO_BACKFILL_CONCURRENCY || 8);
  let grandTotal = 0;
  let done = 0;
  const startedAt = Date.now();

  // 워커 N개로 큐 소비
  const queue = chats.slice();
  async function worker(wid) {
    while (queue.length > 0) {
      const chat = queue.shift();
      if (!chat) break;
      const { totalInserted, lastLogId, error } = await backfillChat(chat.chat_id);
      grandTotal += totalInserted;
      done++;
      const tag = error ? `ERR ${error}` : `last=${lastLogId || '-'}`;
      if (done % 25 === 0 || done === chats.length) {
        const eta = ((Date.now() - startedAt) / done * (chats.length - done) / 1000).toFixed(0);
        console.log(`[${done}/${chats.length}] grand=${grandTotal} eta=${eta}s`);
      }
      if (error) console.error(`  [chat ${chat.chat_id}] ${tag}`);
      await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));
  console.log(`\n[done] inserted ${grandTotal} messages across ${chats.length} chats in ${(Date.now()-startedAt)/1000}s`);
}

main().catch((e) => {
  console.error('[fatal]', e);
  process.exit(1);
});
