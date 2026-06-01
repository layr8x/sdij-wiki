// src/components/chatbot/useChatbot.js
// AMS 운영도우미 챗봇 — 뷰 기반 상태머신 (Figma v3-260601 시나리오 반영)
//
// 화면(view) 전이도 — Figma 시나리오 01~05 와 1:1
//   onboarding ──(카테고리 타일)──▶ category ──(FAQ 행)──▶ chat
//        │                                                   │
//        ├──(입력 전송)─────────────────────────────────────▶ chat
//        │                                                   │
//   (헤더 "처음으로")◀──────── 모든 화면 ────────▶ (헤더 "오류신고") ▶ form(error)
//        │                                                   │
//        └◀──(접수완료 "홈으로")── complete ◀──(보내기)── form(inquiry/solution/error)
//
// 데이터 계층은 그대로 재사용:
//   - intents.detectIntent / decideResponseMode (자가해결 라벨 분기)
//   - officialQa.getQaByCategory (카테고리 → FAQ 목록)
//   - intents.getRelatedGuidesForQa (답변 → 관련 가이드 카드)

import { useState, useCallback, useRef, useEffect } from 'react'
import { detectIntent, decideResponseMode, getRelatedGuidesForQa } from './intents'
import { getQaByCategory, getQaById, OFFICIAL_QA_CATEGORIES } from '@/data/officialQa'
import { getCategoryLabel, RELATED_SUGGESTIONS } from './chatbotConfig'

// 뷰 식별자
export const VIEWS = {
  ONBOARDING: 'onboarding',
  CATEGORY: 'category',
  CHAT: 'chat',
  FORM: 'form',
  COMPLETE: 'complete',
}

// 메시지 종류 (chat 스레드) — 외부 호환용 export 유지
export const MSG_TYPES = { USER: 'user', BOT: 'bot', TYPING: 'typing' }
// 레거시 호환 (index.js barrel)
export const CHATBOT_STAGES = { FAQ: 1, RAG: 2, TICKET: 3, NL2SQL: 4 }

let _id = 1
const nextId = () => _id++

// ─── 답변 본문 파서 ───────────────────────────────────────────────────────
// officialQa 의 `a` (줄바꿈·①②③·[헤더]·※주의 혼합)를 구조화.
// → { lead, blocks:[{text, heading?}], notes:[...] }
export function parseAnswer(a) {
  if (!a) return { lead: '', blocks: [], notes: [] }
  const lines = a.split('\n').map((s) => s.trim())
  const nonEmpty = lines.filter(Boolean)
  const lead = nonEmpty[0] || ''
  const blocks = []
  const notes = []
  for (const line of nonEmpty.slice(1)) {
    if (line.startsWith('※')) {
      notes.push(line.replace(/^※\s*/, ''))
    } else if (/^\[.*\]$/.test(line)) {
      blocks.push({ text: line.replace(/[[\]]/g, ''), heading: true })
    } else if (/^🔗/.test(line)) {
      notes.push(line)
    } else {
      blocks.push({ text: line })
    }
  }
  return { lead, blocks, notes }
}

// ─── QA → 가이드 카드 ─────────────────────────────────────────────────────
function buildGuideCard(qa) {
  const cat = OFFICIAL_QA_CATEGORIES.find((c) => c.id === qa.category)
  const related = getRelatedGuidesForQa(qa)
  const top = related[0]
  const { lead } = parseAnswer(qa.a)
  return {
    categoryLabel: cat?.label || getCategoryLabel(qa.category),
    categoryEmoji: cat?.emoji || '📘',
    title: top?.title || `${qa.q.replace(/[?？]\s*$/, '')} 가이드`,
    snippet: lead || qa.tip || '',
    url: top?.url || null,
  }
}

// ─── QA → 봇 답변 객체 ────────────────────────────────────────────────────
function buildAnswerFromQa(qa) {
  const mode = decideResponseMode(qa) // 'self-solve' | 'escalate' | 'partial'
  const bubble = parseAnswer(qa.a)
  const answer = { bubble, qaId: qa.id }

  if (mode === 'self-solve') {
    answer.guide = buildGuideCard(qa)
  } else if (mode === 'escalate') {
    // 자가해결 불가 → 미해결(03-3): 단일 1차 버튼 (해결방법 요청)
    answer.action = { kind: 'solution', label: '해결방법 요청', prefill: qa.q }
  } else if (mode === 'partial') {
    // 일부 가능 → 가이드 + 추가 요청 버튼
    answer.guide = buildGuideCard(qa)
    answer.action = { kind: 'solution', label: '추가 해결방법 요청', prefill: qa.q }
  }
  return answer
}

// ─── 결과 없음(03-5) 답변 객체 ────────────────────────────────────────────
function buildNoResultAnswer() {
  return {
    bubble: {
      lead: '요청하신 내용을 찾을 수 없어요.',
      blocks: [{ text: '다른 키워드로 찾거나, 해결방법을 요청해 주세요.' }],
      notes: [],
    },
    action: { kind: 'solution', label: '해결방법 요청' },
    chipsTitle: '이런 걸 찾으셨나요?',
    chips: RELATED_SUGGESTIONS,
  }
}

const ONBOARDED_KEY = 'ams-wiki-chatbot-onboarded-v1'

export function useChatbot({ contextKey = 'home', userName = '명준' } = {}) {
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState(VIEWS.ONBOARDING)
  const [activeCategory, setActiveCategory] = useState(null)
  const [formType, setFormType] = useState('inquiry')
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const prevViewRef = useRef(VIEWS.ONBOARDING) // 폼 "돌아가기" 복귀용
  const timers = useRef([])

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])
  const schedule = useCallback((fn, ms) => {
    const t = setTimeout(fn, ms)
    timers.current.push(t)
    return t
  }, [])

  // ─── 위젯 열기/닫기 ─────────────────────────────────────────────────────
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((o) => !o), [])

  const goHome = useCallback(() => {
    clearTimers()
    setMessages([])
    setActiveCategory(null)
    setIsTyping(false)
    setView(VIEWS.ONBOARDING)
  }, [clearTimers])

  // ─── 카테고리 진입 (온보딩 타일 클릭) ───────────────────────────────────
  const openCategory = useCallback((catId) => {
    setActiveCategory(catId)
    setView(VIEWS.CATEGORY)
  }, [])

  const backToCategories = useCallback(() => {
    setView(VIEWS.ONBOARDING)
    setActiveCategory(null)
  }, [])

  // ─── 봇 답변 추가 (타이핑 → 답변) ───────────────────────────────────────
  const pushBotAnswer = useCallback(
    (answer) => {
      setIsTyping(true)
      const typingId = nextId()
      setMessages((prev) => [...prev, { id: typingId, role: MSG_TYPES.TYPING }])
      schedule(() => {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== typingId),
          { id: nextId(), role: MSG_TYPES.BOT, answer },
        ])
        setIsTyping(false)
      }, 850)
    },
    [schedule]
  )

  // ─── 질문하기 (입력 전송) ───────────────────────────────────────────────
  const ask = useCallback(
    (rawText) => {
      const text = (rawText || '').trim()
      if (!text) return
      setView(VIEWS.CHAT)
      setMessages((prev) => [...prev, { id: nextId(), role: MSG_TYPES.USER, text }])

      const detection = detectIntent(text)
      const qa = detection.officialQa || null
      pushBotAnswer(qa ? buildAnswerFromQa(qa) : buildNoResultAnswer())
    },
    [pushBotAnswer]
  )

  // ─── FAQ 행 클릭 (카테고리 상세 → 정확한 QA 답변) ───────────────────────
  const askQa = useCallback(
    (qaOrId) => {
      const qa = typeof qaOrId === 'string' ? getQaById(qaOrId) : qaOrId
      if (!qa) return
      setView(VIEWS.CHAT)
      setMessages((prev) => [...prev, { id: nextId(), role: MSG_TYPES.USER, text: qa.q }])
      pushBotAnswer(buildAnswerFromQa(qa))
    },
    [pushBotAnswer]
  )

  // ─── 폼 (문의/해결요청/오류신고) ────────────────────────────────────────
  const openForm = useCallback(
    (type = 'inquiry') => {
      setFormType(type)
      prevViewRef.current = view === VIEWS.FORM ? prevViewRef.current : view
      setView(VIEWS.FORM)
    },
    [view]
  )

  const backFromForm = useCallback(() => {
    const back = prevViewRef.current
    // chat 으로 돌아갈 땐 스레드 유지, 아니면 온보딩
    setView(back === VIEWS.CHAT && messages.length > 0 ? VIEWS.CHAT : VIEWS.ONBOARDING)
  }, [messages.length])

  const submitForm = useCallback(() => {
    // TODO: Supabase board.insert / Slack webhook — 현재는 접수완료 화면 전환
    setView(VIEWS.COMPLETE)
  }, [])

  // ─── 답변 내 1차 버튼 (해결방법 요청 등) ────────────────────────────────
  const runAction = useCallback(
    (action) => {
      if (!action) return
      if (action.kind === 'solution' || action.kind === 'inquiry' || action.kind === 'error') {
        openForm(action.kind === 'error' ? 'error' : action.kind === 'inquiry' ? 'inquiry' : 'solution')
      }
    },
    [openForm]
  )

  // ─── 키보드 단축키 (⌘/Ctrl + / 토글, Esc 닫기) ─────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        toggle()
      }
      if (e.key === 'Escape' && isOpen) close()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle, close, isOpen])

  // 언마운트 시 타이머 정리
  useEffect(() => () => clearTimers(), [clearTimers])

  // 첫 방문 여부 (FAB 알림 점)
  const [isFirstVisit] = useState(() => {
    if (typeof window === 'undefined') return true
    return !window.localStorage.getItem(ONBOARDED_KEY)
  })
  const markVisited = useCallback(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(ONBOARDED_KEY, '1')
  }, [])

  return {
    // state
    isOpen,
    view,
    activeCategory,
    formType,
    messages,
    isTyping,
    contextKey,
    userName,
    isFirstVisit,
    submenu: activeCategory ? getQaByCategory(activeCategory) : [],
    // actions
    open,
    close,
    toggle,
    goHome,
    openCategory,
    backToCategories,
    ask,
    askQa,
    openForm,
    backFromForm,
    submitForm,
    runAction,
    markVisited,
  }
}

export default useChatbot
