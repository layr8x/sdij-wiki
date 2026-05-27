#!/usr/bin/env node
/**
 * scripts/classify-kakao-stream.mjs
 *
 * Supabase 의 kakao_partner_chats / kakao_partner_messages 를 직접 읽어
 * Claude Haiku 4.5 로 카테고리·감정을 분류해 DB 에 되쓴다.
 *
 * 키워드 기반(classify-kakao-csv.mjs) 보다 정확도 높음. 비용은 Haiku 기준
 * 1만 채팅당 약 $0.5~1 수준.
 *
 * ─── 사용 ───────────────────────────────────────────────────────────────
 *   npm run classify:kakao:db                 # 미분류 채팅 100개 처리
 *   npm run classify:kakao:db -- --limit 500  # 500개
 *   npm run classify:kakao:db -- --sentiment  # 메시지 감정도 함께 처리
 *
 * ─── 환경변수 (.env.local) ─────────────────────────────────────────────
 *   ANTHROPIC_API_KEY        — Claude API 키 (필수)
 *   SUPABASE_URL             — Supabase 프로젝트 URL
 *   SUPABASE_SERVICE_ROLE_KEY — service_role 키 (또는 sb_secret_...)
 */

import process from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { CATEGORY_RULES } from './classify-kakao-csv.mjs'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[classify] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요 (.env.local)')
  process.exit(1)
}
if (!ANTHROPIC_KEY) {
  console.error('[classify] ANTHROPIC_API_KEY 필요 (.env.local)')
  process.exit(1)
}

const args = process.argv.slice(2)
const limitIdx = args.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 100
const RUN_SENTIMENT = args.includes('--sentiment')
const SENTIMENT_LIMIT = 500 // 메시지는 더 많으니 별도 한도

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// 분류 가능한 카테고리 ID 목록 (Claude 가 이 중에서만 선택)
const ALLOWED_CATEGORIES = [...CATEGORY_RULES.map(r => r.id), 'misc']
const CATEGORY_DESC = CATEGORY_RULES.map(r => `  - ${r.id}: ${r.label} (${r.keywords.slice(0, 4).join(', ')} 관련)`).join('\n')

// ─── Claude API 호출 ────────────────────────────────────────────────────
async function callClaude(systemPrompt, userMessage, maxTokens = 1024) {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: [
        { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userMessage }],
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Claude API ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = await res.json()
  return json.content?.[0]?.text || ''
}

// ─── 채팅 카테고리 분류 ─────────────────────────────────────────────────
const CATEGORY_SYSTEM = `당신은 학원 고객상담 카테고리 분류기다. 학부모-학원 카카오톡 대화를 읽고 가장 적합한 카테고리 하나를 고른다.

가능한 카테고리:
${CATEGORY_DESC}
  - misc: 기타 (위 어느 것에도 해당 없음)

출력 형식 (JSON 만, 다른 텍스트 없이):
{"category":"<id>","confidence":0.0~1.0}

confidence 는 분류 확신도. 단일 키워드 매칭이면 0.6, 명확한 맥락이면 0.9+, 애매하면 0.3 이하.`

async function classifyChat(chatId, lastMessage) {
  const text = (lastMessage || '').slice(0, 500)
  if (!text.trim()) return null
  try {
    const reply = await callClaude(CATEGORY_SYSTEM, text, 100)
    const match = reply.match(/\{[^}]+\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    if (!ALLOWED_CATEGORIES.includes(parsed.category)) return null
    return { category: parsed.category, confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)) }
  } catch (err) {
    console.warn(`[classify] chat ${chatId} 실패:`, err.message)
    return null
  }
}

// ─── 메시지 감정 분류 ─────────────────────────────────────────────────
const SENTIMENT_SYSTEM = `당신은 한국어 감정 분류기다. 학부모가 학원에 보낸 카톡 메시지의 감정을 평가한다.

출력 형식 (JSON 만):
{"sentiment":"positive|neutral|negative","score":-1.0~1.0}

기준:
- positive (+0.3 이상): 감사·만족·칭찬
- negative (-0.3 이하): 불만·분노·항의·실망
- neutral: 단순 정보 요청·중립적 질문

score 는 강도. 매우 화남 -0.9, 보통 부정 -0.5, 살짝 만족 +0.3.`

async function classifySentiment(messageId, message) {
  const text = (message || '').slice(0, 300)
  if (!text.trim()) return null
  try {
    const reply = await callClaude(SENTIMENT_SYSTEM, text, 100)
    const match = reply.match(/\{[^}]+\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    if (!['positive', 'neutral', 'negative'].includes(parsed.sentiment)) return null
    return { sentiment: parsed.sentiment, score: Math.min(1, Math.max(-1, parsed.score || 0)) }
  } catch (err) {
    console.warn(`[classify] message ${messageId} 실패:`, err.message)
    return null
  }
}

// ─── 메인 ──────────────────────────────────────────────────────────────
async function classifyChats() {
  console.log(`[classify] 미분류 채팅 ${LIMIT}건 처리 시작...`)
  const { data: chats, error } = await supabase
    .from('kakao_partner_chats')
    .select('chat_id, last_message')
    .is('category', null)
    .not('last_message', 'is', null)
    .order('last_log_send_at', { ascending: false })
    .limit(LIMIT)
  if (error) throw error
  if (!chats?.length) {
    console.log('[classify] 미분류 채팅 없음.')
    return
  }

  let ok = 0, fail = 0
  for (const chat of chats) {
    const result = await classifyChat(chat.chat_id, chat.last_message)
    if (!result) { fail++; continue }
    const { error: updErr } = await supabase
      .from('kakao_partner_chats')
      .update({
        category: result.category,
        category_confidence: result.confidence,
        category_classified_at: new Date().toISOString(),
      })
      .eq('chat_id', chat.chat_id)
    if (updErr) { fail++; console.warn(`[classify] update 실패:`, updErr.message) }
    else ok++
    // 분당 50회 정도로 rate-limit
    await new Promise(r => setTimeout(r, 200))
  }
  console.log(`[classify] 채팅 분류 완료: ${ok} 성공 / ${fail} 실패`)
}

async function classifyMessages() {
  console.log(`[classify] 미분류 메시지 ${SENTIMENT_LIMIT}건 감정 분석 시작...`)
  const { data: messages, error } = await supabase
    .from('kakao_partner_messages')
    .select('log_id, message')
    .eq('sender_type', 'user')
    .is('sentiment', null)
    .not('message', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(SENTIMENT_LIMIT)
  if (error) throw error
  if (!messages?.length) {
    console.log('[classify] 미분류 메시지 없음.')
    return
  }

  let ok = 0, fail = 0
  for (const msg of messages) {
    const result = await classifySentiment(msg.log_id, msg.message)
    if (!result) { fail++; continue }
    const { error: updErr } = await supabase
      .from('kakao_partner_messages')
      .update({
        sentiment: result.sentiment,
        sentiment_score: result.score,
        sentiment_classified_at: new Date().toISOString(),
      })
      .eq('log_id', msg.log_id)
    if (updErr) { fail++; console.warn(`[classify] message update 실패:`, updErr.message) }
    else ok++
    await new Promise(r => setTimeout(r, 200))
  }
  console.log(`[classify] 감정 분석 완료: ${ok} 성공 / ${fail} 실패`)
}

async function main() {
  await classifyChats()
  if (RUN_SENTIMENT) await classifyMessages()
  console.log('[classify] 모든 작업 완료.')
}

main().catch(err => {
  console.error('[classify] 치명적 오류:', err)
  process.exit(1)
})
