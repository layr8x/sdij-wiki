// src/components/chatbot/useChatbot.js
// AMS Wiki 챗봇 상태 + 액션 훅 (v4 고도화)
//
// 외부 의존:
//  - intents.js (의도 분석 + 인용 + Trust Calibration)
//  - 향후 src/lib/db.js (가이드 조회) 또는 Supabase RPC
//  - 향후 src/lib/chatbot/api.js (LLM 엔드포인트)
//
// v4 신규 (2026-05-19):
//  - Streaming 응답 시뮬레이션 (Claude/ChatGPT 패턴) — 토큰별 점진 표시
//  - Conversation Memory (Cathy Pearl) — 최근 5개 user 발화 컨텍스트로 보존
//  - Onboarding Tour (Intercom Fin 패턴) — 첫 사용자 3-step
//  - Trust Calibration band (NIST 2025) — 응답마다 confidence label
//  - Inline citations (Perplexity 2025) — 응답에 [1] 마커

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
  USER_TEXT: 'user-text',
  QUICK_REPLIES: 'quick-replies',
  FEEDBACK: 'feedback',
  ONBOARDING_TOUR: 'onboarding-tour',       // v4: 첫 사용자 가이드
}

let msgIdCounter = 1
const nextId = () => msgIdCounter++

export function useChatbot({ contextKey = 'home', userName = '명준', stage: initialStage = CHATBOT_STAGES.FAQ } = {}) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [stage, setStage] = useState(initialStage)
  // isTyping은 위젯이 typing indicator를 메시지 목록에 직접 추가하는 방식으로 표시.
  // 별도 boolean state는 현재 불필요하나 향후 abort 처리용으로 유지.
  const [isTyping] = useState(false)
  const conversationStarted = useRef(false)

  // v4 — Conversation Memory (Cathy Pearl): 최근 사용자 발화 N개 보존
  const userHistoryRef = useRef([])

  // v4 — Onboarding Tour (Intercom Fin): 첫 사용자 여부
  const [needsOnboarding, setNeedsOnboarding] = useState(() => {
    if (typeof window === 'undefined') return false
    return !window.localStorage.getItem(ONBOARDING_DONE_KEY)
  })
  const completeOnboarding = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ONBOARDING_DONE_KEY, '1')
    }
    setNeedsOnboarding(false)
  }, [])

  // === 메시지 추가 헬퍼 ===
  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, { id: nextId(), createdAt: Date.now(), ...msg }])
  }, [])

  const removeMessage = useCallback((id) => {
    setMessages(prev => prev.filter(m => m.id !== id))
  }, [])

  // === 초기 대화 흐름 — 먼저 선언해서 open/reset이 참조 가능하도록 ===
  const startConversation = useCallback(() => {
    setTimeout(() => addMessage({
      type: MSG_TYPES.BOT_CONTEXT_BANNER,
      contextKey,
    }), 100)

    setTimeout(() => addMessage({
      type: MSG_TYPES.BOT_TEXT,
      html: `안녕하세요, ${userName}님 👋<br>저는 <b>AMS Wiki</b>입니다. 운영 가이드와 자주 묻는 질문을 빠르게 찾아드려요.`,
    }), 500)

    setTimeout(() => addMessage({
      type: MSG_TYPES.BOT_CAPABILITY,
    }), 1000)

    // v5+: 시간/시즌 기반 컨텍스트 힌트 (단과 카톡 + 채널톡 분석 인사이트)
    const hints = getContextualHints()
    if (hints.length > 0) {
      setTimeout(() => addMessage({
        type: MSG_TYPES.BOT_CONTEXTUAL_HINT,
        hints,
      }), 1300)
    }

    setTimeout(() => {
      addMessage({
        type: MSG_TYPES.BOT_TEXT,
        html: '먼저 이런 것들이 자주 물어보세요:',
      })
      addMessage({
        type: MSG_TYPES.QUICK_REPLIES,
        replies: getQuickRepliesForContext(contextKey),
      })
    }, 1500)
  }, [contextKey, userName, addMessage])

  // === 위젯 열기/닫기 ===
  const open = useCallback(() => {
    setIsOpen(true)
    if (!conversationStarted.current) {
      conversationStarted.current = true
      startConversation()
    }
  }, [startConversation])

  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(o => !o), [])

  const reset = useCallback(() => {
    setMessages([])
    conversationStarted.current = false
    startConversation()
  }, [startConversation])

  // === 응답 생성 (stage별 분기) — generateResponse를 먼저 선언 ===
  const generateResponse = useCallback((userText) => {
    const detection = detectIntent(userText)

    if (!detection.intent || detection.confidence < CONFIDENCE_THRESHOLD) {
      // 의도 미인식 → 명확화 질문 (Watson Disambiguation 패턴)
      addMessage({
        type: MSG_TYPES.BOT_TEXT,
        html: '죄송해요, 정확히 이해하지 못했어요. 다음 중 어떤 것에 가까운가요?',
      })
      addMessage({
        type: MSG_TYPES.QUICK_REPLIES,
        replies: ['회원 병합', '영상 재생 문제', '환불 절차'],
      })
      addMessage({
        type: MSG_TYPES.BOT_ESCALATION,
        reason: 'low-confidence',
        originalQuery: userText,
      })
      return
    }

    // v5: 실장님 시트 매칭 우선 분기 ─────────────────────────
    if (detection.source === 'sheet' && detection.officialQa) {
      const qa = detection.officialQa
      const mode = decideResponseMode(qa)
      const cat = OFFICIAL_QA_CATEGORIES.find(c => c.id === qa.category)

      // 답변 본문 (단계 + 주의사항)
      addMessage({
        type: MSG_TYPES.BOT_OFFICIAL_QA,
        qa,
        category: cat,
        mode,
      })

      // 자가해결=가능 → 메뉴 경로 카드
      if (mode === 'self-solve' && qa.menuPath) {
        addMessage({
          type: MSG_TYPES.BOT_MENU_PATH,
          menuPath: qa.menuPath,
          tip: qa.tip,
        })
      }

      // 자가해결=불가 → 즉시 에스컬레이션 (슬랙 제목 자동)
      if (mode === 'escalate') {
        addMessage({
          type: MSG_TYPES.BOT_ESCALATION,
          reason: 'self-solve-impossible',
          originalQuery: userText,
          slackTitle: qa.slackTitle || `${cat?.label || ''} 처리 요청`,
          tip: qa.tip,
        })
      }

      // 부분 가능 → 자가/플서실 분리 안내
      if (mode === 'partial') {
        addMessage({
          type: MSG_TYPES.BOT_TEXT,
          html: `이 항목은 <b>일부만 직접 처리 가능</b>해요. 처리 가능한 부분은 위 경로로 진행하시고, 나머지는 플서실 요청이 필요합니다.`,
        })
        if (qa.slackTitle) {
          addMessage({
            type: MSG_TYPES.BOT_ESCALATION,
            reason: 'partial-escalate',
            originalQuery: userText,
            slackTitle: qa.slackTitle,
            tip: qa.tip,
          })
        }
      }

      // (Confidence 밴드 제거 — 사용자 요청: 가이드에 의심만 들게 만듦)

      // v5+: 관련 컨플 가이드 자동 인용 (FVSOL + AMS)
      const relatedGuides = getRelatedGuidesForQa(qa)
      if (relatedGuides.length > 0) {
        addMessage({
          type: MSG_TYPES.BOT_RELATED_GUIDES,
          guides: relatedGuides,
          category: cat,
        })
      }

      // v5+: 부정 시그널 빈도가 높은 카테고리 (예: player 47%, okta 31%) — 자동 매니저 추천
      const negThreshold = NEGATIVE_SIGNAL_BY_CATEGORY[qa.category] || 0
      if (detection.isNegative || negThreshold >= 0.30) {
        const recommended = getRecommendedManagers(qa.category)
        if (recommended.length > 0) {
          addMessage({
            type: MSG_TYPES.BOT_CONTEXTUAL_HINT,
            hints: [{ icon: '👥', text: `이 카테고리 담당: ${recommended.join(' / ')}` }],
          })
        }
      }

      addMessage({ type: MSG_TYPES.FEEDBACK, intentId: qa.id })

      // 부정 시그널이면 에스컬레이션 한 번 더 권유
      if (detection.isNegative && mode === 'self-solve') {
        setTimeout(() => addMessage({
          type: MSG_TYPES.BOT_ESCALATION,
          reason: 'negative-signal',
          originalQuery: userText,
          slackTitle: qa.slackTitle || `${cat?.label || ''} 문의`,
        }), 700)
      }
      return
    }

    const { rule, isNegative } = detection

    // v5+: 신뢰도 밴드 제거 (사용자 요청 — 가이드 의심 유발). 인용 메타만 유지.
    const citation = getCitation(rule.docSlug)
    const citationNum = citation?.n || 1

    if (stage === CHATBOT_STAGES.FAQ) {
      // 1차 FAQ: 가이드 카드 응답 + 인라인 [1] 인용 + 신뢰도 밴드
      addMessage({
        type: MSG_TYPES.BOT_TEXT,
        html: `"${rule.title}" 관련 가이드를 찾았어요 [${citationNum}].`,
        citations: citation ? [citation] : [],
      })
      addMessage({
        type: MSG_TYPES.BOT_GUIDE_CARD,
        category: rule.category,
        title: rule.title,
        docSlug: rule.docSlug,
        confidence: rule.confidence,
      })
      addMessage({ type: MSG_TYPES.FEEDBACK, intentId: rule.intent })
    }
    else if (stage === CHATBOT_STAGES.RAG) {
      // 2차 RAG: streaming + 인용 + 가이드 카드
      const ragText = generateRagResponse(rule.intent, userText)
      // 본문 끝에 [1] 마커 부착 (Perplexity 스타일)
      const ragWithCitation = ragText.replace(/\.<br>/, `.<sup class="citation-marker">[${citationNum}]</sup><br>`)

      addMessage({
        type: MSG_TYPES.BOT_STREAMING,
        html: ragWithCitation || ragText,
        citations: citation ? [citation] : [],
      })
      if (citation) {
        addMessage({
          type: MSG_TYPES.BOT_CITATION_LIST,
          citations: [citation],
        })
      }
      addMessage({ type: MSG_TYPES.FEEDBACK, intentId: rule.intent })
    }
    else if (stage === CHATBOT_STAGES.TICKET) {
      // 3차 게시판 자동등록
      addMessage({
        type: MSG_TYPES.BOT_TEXT,
        html: '자유 입력 감지 — <b>AMS 게시판에 자동 등록</b>해드릴까요?',
      })
      addMessage({
        type: MSG_TYPES.BOT_DATA_CARD,
        title: '자동 생성된 티켓 미리보기',
        kind: 'ticket-preview',
        data: {
          title: userText.length > 30 ? userText.substring(0, 30) + '...' : userText,
          category: rule.intent,
          author: '김명준 · 플랫폼서비스실',
          body: userText,
          relatedGuide: rule.title,
        },
      })
      addMessage({
        type: MSG_TYPES.QUICK_REPLIES,
        replies: ['✓ 게시판 등록', '수정', '바로 Slack'],
      })
    }
    else if (stage === CHATBOT_STAGES.NL2SQL) {
      // 4차 NL2SQL
      const sample = NL2SQL_SAMPLES.unpaid // 데모용 고정
      addMessage({
        type: MSG_TYPES.BOT_TEXT,
        html: '자연어 질문을 SQL로 변환해 AMS DB에서 조회했어요.',
      })
      addMessage({
        type: MSG_TYPES.BOT_DATA_CARD,
        title: sample.title,
        kind: 'nl2sql',
        data: sample,
      })
      addMessage({
        type: MSG_TYPES.QUICK_REPLIES,
        replies: ['📨 일괄 SMS 발송', '📥 Excel 내려받기', '다른 조건'],
      })
    }

    // 부정 시그널 + 에스컬레이션
    if (isNegative) {
      setTimeout(() => addMessage({
        type: MSG_TYPES.BOT_ESCALATION,
        reason: 'negative-signal',
        originalQuery: userText,
      }), 700)
    }
  }, [addMessage, stage])

  // === 사용자 입력 처리 (generateResponse 뒤에 배치 — TDZ 회피) ===
  const sendUserMessage = useCallback((text) => {
    const trimmed = text.trim()
    if (!trimmed) return

    // v4 — Conversation Memory: 최근 N개 사용자 발화 보존
    userHistoryRef.current = [
      ...userHistoryRef.current.slice(-(MEMORY_WINDOW - 1)),
      { text: trimmed, ts: Date.now() }
    ]

    addMessage({ type: MSG_TYPES.USER_TEXT, text: trimmed })

    // 타이핑 인디케이터
    let typingId = null
    setMessages(prev => {
      const id = nextId()
      typingId = id
      return [...prev, { id, type: MSG_TYPES.BOT_TYPING, createdAt: Date.now() }]
    })

    // 의도 분석 + 응답 (300ms~1200ms 시뮬레이션)
    setTimeout(() => {
      removeMessage(typingId)
      generateResponse(trimmed)
    }, 1200)
  }, [addMessage, removeMessage, generateResponse])

  // === Quick Reply 클릭 ===
  const sendQuickReply = useCallback((text) => {
    sendUserMessage(text)
  }, [sendUserMessage])

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
    }
    // TODO: Supabase에 피드백 로그 저장
    // await supabase.from('chatbot_feedback').insert({ intent_id, helpful, user_id })
  }, [addMessage])

  // === 에스컬레이션 (Slack 또는 게시판) ===
  const escalate = useCallback((query, target = 'slack') => {
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
  }, [addMessage])

  // === Cmd+/ 키보드 단축키 ===
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        toggle()
      }
      if (e.key === 'Escape' && isOpen) {
        close()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle, close, isOpen])

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
    // v4 신규 export
    needsOnboarding,
    completeOnboarding,
    // 사용자 발화 히스토리는 ref이므로 직접 접근 함수로 노출 (render-time ref read 회피)
    getUserHistory: () => userHistoryRef.current,
  }
}

export { MSG_TYPES }
