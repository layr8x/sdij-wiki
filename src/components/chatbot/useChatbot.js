// src/components/chatbot/useChatbot.js
// AMS 챗봇 — 대화형 단일 스레드 상태머신 (Figma v4 / 실시간 FAQ 참조)
//
// 데이터: officialQa(25 시트 Q&A) + 매니저 FAQ(/api/faq 실시간, 번들 폴백).
// 인터랙션: 봇 응답 전 타이핑 인디케이터(대화감) · reduced-motion 존중.

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  detectIntent,
  CONFIDENCE_THRESHOLD,
  getQuickRepliesForContext,
  generateRagResponse,
  getCitation,
  NL2SQL_SAMPLES,
  decideResponseMode,
  OFFICIAL_QA_CATEGORIES,
  getRelatedGuidesForQa,
} from './intents'
import {
  getRecommendedManagers,
  getContextualHints,
  NEGATIVE_SIGNAL_BY_CATEGORY,
} from '@/data/insights'

// LocalStorage key — 첫 방문 여부
const ONBOARDING_DONE_KEY = 'ams-wiki-chatbot-onboarded-v1'
// Conversation memory 보존 메시지 수
const MEMORY_WINDOW = 5
// '대화 마치기' quick-reply 토큰 — sendQuickReply에서 가로채 finishConversation 호출
const FINISH_REPLY = '대화 마치기 ✓'

/**
 * 챗봇 단계 (위클리 4단계 로드맵 — 컨플 2072379811)
 */
export const CHATBOT_STAGES = {
  FAQ: 1,        // FAQ 하드코딩 (6월 1주 베타)
  RAG: 2,        // 위키 RAG (7-8월)
  TICKET: 3,     // 자유입력 → AMS 게시판 (9월)
  NL2SQL: 4,     // 자연어 → SQL → AMS DB (Q4)
}

/**
 * 메시지 타입
 */
const MSG_TYPES = {
  BOT_TEXT: 'bot-text',
  BOT_STREAMING: 'bot-streaming',     // v4: 토큰별 점진 표시
  BOT_CAPABILITY: 'bot-capability',
  BOT_CONTEXT_BANNER: 'bot-context-banner',
  BOT_GUIDE_CARD: 'bot-guide-card',
  BOT_DATA_CARD: 'bot-data-card',
  BOT_TYPING: 'bot-typing',
  BOT_ESCALATION: 'bot-escalation',
  BOT_CITATION_LIST: 'bot-citation-list',  // v4: 인용 목록
  BOT_CONFIDENCE: 'bot-confidence',         // v4: Trust Calibration 밴드
  BOT_OFFICIAL_QA: 'bot-official-qa',       // v5: 실장님 시트 정형 응답 (자가해결 라벨 포함)
  BOT_MENU_PATH: 'bot-menu-path',           // v5: AMS 메뉴 경로 카드
  BOT_RELATED_GUIDES: 'bot-related-guides', // v5+: FVSOL/AMS 컨플 가이드 자동 인용
  BOT_CONTEXTUAL_HINT: 'bot-contextual-hint', // v5+: 시간/시즌/매니저 컨텍스트 힌트
  BOT_STEPPER: 'bot-stepper',               // v6: 문의 처리 현황 — 플서실 요청 티켓 진행 단계
  BOT_CLOSING: 'bot-closing',               // v6: 문의 처리 완료 — 요약 + 만족도(CSAT)
  USER_TEXT: 'user-text',
  QUICK_REPLIES: 'quick-replies',
  FEEDBACK: 'feedback',
  ONBOARDING_TOUR: 'onboarding-tour',       // v4: 첫 사용자 가이드
}

const ONBOARDED_KEY = 'ams-wiki-chatbot-onboarded-v1'
const initialThread = () => [mk('greeting'), mk('chips')]

export function useChatbot({ userName = '명준', onOpenGuide, faqList = MANAGER_FAQ } = {}) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState(initialThread)
  const [activeForm, setActiveForm] = useState(null)
  const [formText, setFormText] = useState('')
  const [formFiles, setFormFiles] = useState([])
  const [fileError, setFileError] = useState('')
  const [faqViews, setFaqViews] = useState({}) // 분류별 TOP5 정렬용 누적 조회수
  const timers = useRef([])

  // 봇 응답: 사용자 메시지 즉시 → 타이핑 인디케이터 → 잠시 후 봇 메시지
  const respond = useCallback((userItems, botItems, delay = 600) => {
    const typingId = nextId()
    setMessages((prev) => [...prev, ...userItems, { id: typingId, type: 'typing' }])
    const t = setTimeout(() => {
      setMessages((prev) => [...prev.filter((m) => m.id !== typingId), ...botItems])
    }, prefersReduced() ? 0 : delay)
    timers.current.push(t)
  }, [])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  // FAQ 누적 조회수 로드 (분류별 TOP 5 정렬용)
  useEffect(() => { fetchFaqViews().then(setFaqViews).catch(() => {}) }, [])

  // ─── 열기/닫기 ──────────────────────────────────────────────────────────
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((o) => !o), [])
  const clearForm = useCallback(() => { setActiveForm(null); setFormText(''); setFormFiles([]); setFileError('') }, [])
  const reset = useCallback(() => {
    setMessages([])
    conversationStarted.current = false
    userHistoryRef.current = [] // 새 대화 → 대화 기억(메모리)도 초기화
    startConversation()
  }, [startConversation])

  // === 응답 생성 (stage별 분기) — generateResponse를 먼저 선언 ===
  const generateResponse = useCallback((userText) => {
    const detection = detectIntent(userText)

  const requestSolution = useCallback(() => {
    startForm('solution', [mk('user', { text: SOLUTION_INTRO.user }), mk('bot', { text: SOLUTION_INTRO.bot })])
  }, [startForm])

  const startError = useCallback(() => {
    startForm('error', [
      mk('user', { text: FORM_COPY.error.userLabel }),
      mk('bot', { text: FORM_COPY.error.intro, link: { label: FORM_COPY.error.link.label, url: FORM_COPY.error.link.url } }),
    ])
  }, [startForm])

  const pickChip = useCallback((chip) => {
    if (chip.id === 'error') startError()
    else openCategory(chip.id, chip.label)
  }, [startError, openCategory])

  // ─── FAQ 행 → 답변(말풍선 내 "관련 가이드 보기" 링크) + 후속 칩 ──────────
  // 시안 2번 형태: 별도 GuideCard 없이 답변 말풍선 안에 링크만. 링크는 위키에
  // 반영된 AMS 가이드 100개 중 최적 매칭으로 연결(없으면 컨플루언스 검색).
  const pickQa = useCallback((qa) => {
    incrementFaqView(qa.id) // FAQ 클릭 → 누적 조회수 집계
    setFaqViews((v) => ({ ...v, [qa.id]: (v[qa.id] || 0) + 1 }))
    respond(
      [mk('user', { text: qa.q })],
      [
        mk('bot', { answer: answerText(qa), link: relatedGuideLink(qa.q, qa.category) }),
        mk('bot', { text: CONFIRM.more }),
        mk('chips'),
      ]
    )
  }, [respond])

  // ─── 매니저 FAQ 답변 (단일 원본 가이드 → /faq 링크) ─────────────────────
  const faqAnswer = useCallback((item) => {
    respond(
      [mk('user', { text: item.q })],
      [
        mk('bot', { answer: item.a, link: relatedGuideLink(item.q, item.category) }),
        mk('bot', { text: CONFIRM.more }),
        mk('chips'),
      ]
    )
  }, [respond])

  // ─── 하단 검색 + 자동완성 (officialQa + 매니저 FAQ 전체 참조) ────────────
  // 폭넓은 매칭: 전체 질의 + 공백 토큰 + (붙여쓴 한글 합성어는 2글자 묶음)으로
  // 관련 항목을 두루 노출 (예: "환불취소" → 환불·취소 관련 항목 다수)
  const faqSuggestions = useCallback((q, limit = 6) => {
    const query = (q || '').trim()
    if (!query) return []
    const parts = new Set([query.toLowerCase()])
    for (const t of query.split(/\s+/)) if (t.length >= 2) parts.add(t.toLowerCase())
    const compact = query.replace(/\s+/g, '')
    if (/^[가-힣]{3,}$/.test(compact)) {
      for (let i = 0; i < compact.length - 1; i++) parts.add(compact.slice(i, i + 2).toLowerCase())
    }
    const tokens = [...parts]
    const hit = (text) => { const t = (text || '').toLowerCase(); return tokens.some((p) => t.includes(p)) }
    const qa = OFFICIAL_QA.filter((x) => hit(x.q) || hit(x.tip)).slice(0, 4)
    const faqCand = [...qa, ...searchManagerFaq(query, 4, faqList)]
    const amsCand = matchAmsGuides(query, 4) // 위키 반영 AMS 가이드 매칭
    const merged = []
    const seen = new Set()
    const push = (it) => { if (it && !seen.has(it.q)) { seen.add(it.q); merged.push(it) } }
    // AMS 가이드가 있으면 추천 자리 일부를 확보(FAQ로 다 채우지 않도록)
    const faqQuota = amsCand.length ? Math.max(2, limit - 3) : limit
    for (const it of faqCand) { if (merged.length >= faqQuota) break; push(it) }
    for (const g of amsCand) { if (merged.length >= limit) break; push({ id: g.id, q: g.title, tldr: g.tldr, ams: true, url: amsGuideUrl(g.id) }) }
    for (const it of faqCand) { if (merged.length >= limit) break; push(it) } // 남은 자리 FAQ로
    return merged
  }, [faqList])

  // 빈 검색창 포커스 시 추천 (인기 FAQ)
  const popularSuggestions = useCallback(() => popularManagerFaq(5, faqList), [faqList])

  // 자동완성 클릭 — officialQa(가이드 카드) / 매니저 FAQ(가이드 링크) 분기
  const pickSuggestion = useCallback((item) => {
    if (item?.ams) {
      // AMS 가이드 추천 클릭 → 요약 + "관련 가이드 보기"(원문) 링크
      respond(
        [mk('user', { text: item.q })],
        [
          mk('bot', { answer: item.tldr || item.q, link: { label: GUIDE_LINK_LABEL, url: item.url } }),
          mk('bot', { text: CONFIRM.more }),
          mk('chips'),
        ]
      )
      return
    }
    if (item && item.guideId) faqAnswer(item)
    else pickQa(item)
  }, [respond, faqAnswer, pickQa])

  const search = useCallback((rawQuery) => {
    const query = (rawQuery || '').trim()
    if (!query) return
    const hit = matchOfficialQa(query)
    if (hit?.item) {
      respond(
        [mk('user', { text: query })],
        [
          mk('bot', { answer: answerText(hit.item), link: relatedGuideLink(query, hit.item.category) }),
          mk('bot', { text: CONFIRM.more }),
          mk('chips'),
        ]
      )
      return
    }
    const faq = bestManagerFaq(query, faqList)
    if (faq) {
      respond(
        [mk('user', { text: query })],
        [
          mk('bot', { answer: faq.a, link: relatedGuideLink(query, faq.category) }),
          mk('bot', { text: CONFIRM.more }),
          mk('chips'),
        ]
      )
      return
    }
    requestSolution() // 무결과 → 해결방법요청 폼
  }, [respond, requestSolution, faqList])

  // ─── 가이드 열기 ────────────────────────────────────────────────────────
  const openGuide = useCallback((arg) => {
    const url = typeof arg === 'string' ? arg : arg?.url
    // 절대(컨플루언스)·상대(/guides/…) 모두 새 탭으로 — 챗봇 창은 유지
    if (url) window.open(url, '_blank', 'noopener')
    else onOpenGuide?.(arg)
  }, [onOpenGuide])

  // ─── 폼 입력(첨부) ──────────────────────────────────────────────────────
  const addFiles = useCallback((list) => {
    setFileError('')
    setFormFiles((prev) => {
      const next = [...prev]
      for (const f of Array.from(list)) {
        if (next.length >= ATTACH_LIMIT.maxCount) { setFileError(`이미지는 최대 ${ATTACH_LIMIT.maxCount}개까지 첨부할 수 있어요.`); break }
        if (!f.type.startsWith('image/')) { setFileError('이미지 파일만 첨부할 수 있어요.'); continue }
        if (f.size > ATTACH_LIMIT.maxBytes) { setFileError('각 이미지는 1MB 이하만 첨부할 수 있어요.'); continue }
        next.push(f)
      }
      return next.slice(0, ATTACH_LIMIT.maxCount)
    })

    // 의도 분석 + 응답 (300ms~1200ms 시뮬레이션)
    setTimeout(() => {
      removeMessage(typingId)
      generateResponse(trimmed)
    }, 1200)
  }, [addMessage, removeMessage, generateResponse])

  // === 대화 마치기 — 문의 처리 완료 + 만족도(CSAT) 카드 ===
  const finishConversation = useCallback(() => {
    // 대화 메모리에서 실제 질문 토픽 추출 (중복 제거 후 최근 3개)
    const topics = [...new Set(
      userHistoryRef.current.map(h => h.text).filter(t => t && t !== FINISH_REPLY)
    )].slice(-3)
    addMessage({
      type: MSG_TYPES.BOT_CLOSING,
      topics,
    })
  }, [addMessage])

  // === Quick Reply 클릭 ===
  const sendQuickReply = useCallback((text) => {
    if (text === FINISH_REPLY) {
      finishConversation()
      return
    }
    sendUserMessage(text)
  }, [sendUserMessage, finishConversation])

  // === 피드백 ===
  const submitFeedback = useCallback((intentId, helpful) => {
    if (!helpful) {
      // 👎 → 즉시 에스컬레이션 옵션 제시
      addMessage({
        type: MSG_TYPES.BOT_TEXT,
        html: '아쉬운 답변이었네요. 더 정확한 도움이 필요하시면:',
      })
      addMessage({
        type: MSG_TYPES.BOT_ESCALATION,
        reason: 'negative-feedback',
        intentId,
      })
    } else {
      // 👍 → 마무리 유도 (다른 질문 입력 or 대화 마치기 → CSAT)
      addMessage({
        type: MSG_TYPES.BOT_TEXT,
        html: '도움이 됐다니 좋아요 😊<br>더 궁금한 점은 아래에 입력해 주세요.',
      })
      addMessage({
        type: MSG_TYPES.QUICK_REPLIES,
        replies: [FINISH_REPLY],
      })
    }
    // TODO: Supabase에 피드백 로그 저장
    // await supabase.from('chatbot_feedback').insert({ intent_id, helpful, user_id })
  }, [addMessage])

  // === 에스컬레이션 (Slack 또는 게시판) ===
  const escalate = useCallback((query, target = 'slack') => {
    // 현재 시각 (접수 단계 타임스탬프)
    const now = new Date()
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    if (target === 'slack') {
      addMessage({
        type: MSG_TYPES.BOT_TEXT,
        html: '✓ Slack <b>#cs-escalation</b> 채널에 전달했어요. 담당자가 곧 응답할 거예요.',
      })
      // TODO: 실제 Slack webhook 호출
    } else if (target === 'board') {
      addMessage({
        type: MSG_TYPES.BOT_TEXT,
        html: '✓ <b>티켓 #4521</b>로 AMS 게시판에 등록했어요.',
      })
      // TODO: Supabase board.insert
    }

    // ① 처리 현황 Stepper — 플서실 요청 티켓의 진행 단계를 시각화
    addMessage({
      type: MSG_TYPES.BOT_STEPPER,
      title: '문의 처리 현황',
      current: 1, // 접수 완료 → 담당 배정(진행 중)
      steps: [
        { label: '접수 완료', meta: hhmm },
        { label: '담당 배정' },
        { label: '처리 중' },
        { label: '처리 완료' },
      ],
    })
  }, [addMessage])

  // === 만족도(CSAT) 점수 처리 ===
  const rateSatisfaction = useCallback((score) => {
    // TODO: Supabase에 CSAT 저장 — chatbot_csat.insert({ score, context_key, ts })
    // 낮은 점수(1~2점)면 사람 연결을 한 번 더 권유
    if (score <= 2) {
      setTimeout(() => {
        addMessage({
          type: MSG_TYPES.BOT_TEXT,
          html: '불편을 드려 죄송해요. 더 정확한 도움이 필요하시면 아래로 연결해드릴게요.',
        })
        addMessage({
          type: MSG_TYPES.BOT_ESCALATION,
          reason: 'negative-feedback',
        })
      }, 500)
    }
  }, [addMessage])

  // === Cmd+/ 키보드 단축키 ===
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') { e.preventDefault(); toggle() }
      if (e.key === 'Escape' && isOpen) close()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle, close, isOpen])

  const [isFirstVisit] = useState(() => {
    if (typeof window === 'undefined') return true
    return !window.localStorage.getItem(ONBOARDED_KEY)
  })
  const markVisited = useCallback(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(ONBOARDED_KEY, '1')
  }, [])

  // 분류별 FAQ: 누적 조회수 상위 5건만 노출 (5건 미만이면 전체) — 정책 반영
  const getQaByCategoryTop = useCallback(
    (catId) => [...getQaByCategory(catId)].sort((a, b) => (faqViews[b.id] || 0) - (faqViews[a.id] || 0)).slice(0, 5),
    [faqViews]
  )

  return {
    isOpen,
    messages,
    stage,
    setStage,
    isTyping,
    open,
    close,
    toggle,
    reset,
    sendUserMessage,
    sendQuickReply,
    submitFeedback,
    escalate,
    contextKey,
    // v6 신규 — 문의 처리 현황 / 종료·요약·만족도
    finishConversation,
    rateSatisfaction,
    // v4 신규 export
    needsOnboarding,
    completeOnboarding,
    // 사용자 발화 히스토리는 ref이므로 직접 접근 함수로 노출 (render-time ref read 회피)
    getUserHistory: () => userHistoryRef.current,
  }
}

export default useChatbot
