// src/components/chatbot/useChatbot.js
// AMS 운영도우미 챗봇 — 대화형 단일 스레드 상태머신 (Figma v4-260601 "업데이트")
//
// v4 모델: 화면 분리(view) 없이 메시지 스레드 하나. 칩 메뉴 → FAQ 목록 →
//          (답변 | 인라인 폼) → 접수확인 + 칩 재노출. 하단 입력바 없음.
//
// 메시지 타입:
//   notice   공지 카드(상단)         greeting  봇 인사 말풍선
//   chips    칩 메뉴(카테고리5+오류)  user      사용자 말풍선
//   bot      봇 말풍선(text)          faq       카테고리 FAQ 목록
//   guide    가이드 카드             link      "전체 가이드 보기" 링크
//   form     인라인 폼(문의/오류)

import { useState, useCallback, useEffect } from 'react'
import { getRelatedGuidesForQa } from './intents'
import { getQaByCategory, OFFICIAL_QA, OFFICIAL_QA_CATEGORIES, matchOfficialQa } from '@/data/officialQa'
import { getCategoryLabel, FORM_COPY, CONFIRM, GUIDE_LINK_LABEL, NO_RESULT } from './chatbotConfig'

// 외부 호환 export (index.js barrel)
export const MSG_TYPES = {
  NOTICE: 'notice', GREETING: 'greeting', CHIPS: 'chips', USER: 'user',
  BOT: 'bot', FAQ: 'faq', GUIDE: 'guide', LINK: 'link', FORM: 'form',
}
export const CHATBOT_STAGES = { FAQ: 1, RAG: 2, TICKET: 3, NL2SQL: 4 }

let _id = 1
const nextId = () => _id++
const mk = (type, props = {}) => ({ id: nextId(), type, ...props })

// QA 답변 본문(① ② ※ 등 줄바꿈 텍스트) → 봇 말풍선 표시용 평문
function answerText(qa) {
  return (qa.a || '').replace(/\n{3,}/g, '\n\n').trim()
}

// QA → 가이드 카드
function buildGuideCard(qa) {
  const cat = OFFICIAL_QA_CATEGORIES.find((c) => c.id === qa.category)
  const related = getRelatedGuidesForQa(qa)
  const top = related[0]
  const lead = (qa.a || '').split('\n').map((s) => s.trim()).filter(Boolean)[0] || ''
  return {
    categoryLabel: cat?.label || getCategoryLabel(qa.category),
    categoryEmoji: cat?.emoji || '📘',
    title: top?.title || `${qa.q.replace(/[?？]\s*$/, '')} 가이드`,
    snippet: lead || qa.tip || '',
    url: top?.url || null,
  }
}

const ONBOARDED_KEY = 'ams-wiki-chatbot-onboarded-v1'
const initialThread = () => [mk('greeting'), mk('chips')]

export function useChatbot({ userName = '명준', onOpenGuide } = {}) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState(initialThread)
  const [doneForms, setDoneForms] = useState(() => new Set())

  const append = useCallback((items) => {
    setMessages((prev) => [...prev, ...items])
  }, [])

  // ─── 열기/닫기 ──────────────────────────────────────────────────────────
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((o) => !o), [])
  const reset = useCallback(() => {
    setDoneForms(new Set())
    setMessages(initialThread())
  }, [])

  // ─── 칩 클릭 ────────────────────────────────────────────────────────────
  const openCategory = useCallback((catId, label) => {
    const name = label || getCategoryLabel(catId)
    append([
      mk('user', { text: name }),
      mk('bot', { text: `${name}에서 자주 찾는 항목이에요.\n관련 문의 내용을 선택해 주세요.` }),
      mk('faq', { categoryId: catId }),
    ])
  }, [append])

  const startForm = useCallback((kind, copy) => {
    const items = [mk('user', { text: copy.userLabel })]
    if (copy.intro) items.push(mk('bot', { text: copy.intro }))
    if (copy.link) items.push(mk('link', { label: copy.link.label, url: copy.link.url }))
    items.push(mk('form', { kind }))
    append(items)
  }, [append])

  const startError = useCallback(() => startForm('error', FORM_COPY.error), [startForm])
  const requestSolution = useCallback(() => startForm('inquiry', FORM_COPY.inquiry), [startForm])

  const pickChip = useCallback((chip) => {
    if (chip.id === 'error') startError()
    else openCategory(chip.id, chip.label)
  }, [startError, openCategory])

  // ─── FAQ 행 클릭 → 답변 + 가이드 카드 + 후속 칩 ─────────────────────────
  const pickQa = useCallback((qa) => {
    append([
      mk('user', { text: qa.q }),
      mk('bot', { text: answerText(qa) }),
      mk('guide', { guide: buildGuideCard(qa) }),
      mk('bot', { text: CONFIRM.more }),
      mk('chips'),
    ])
  }, [append])

  // ─── 하단 검색 (자유 입력) + 자동완성 ───────────────────────────────────
  const faqSuggestions = useCallback((q, limit = 5) => {
    const nq = (q || '').trim().toLowerCase()
    if (nq.length < 1) return []
    return OFFICIAL_QA
      .filter((x) => x.q.toLowerCase().includes(nq) || (x.tip || '').toLowerCase().includes(nq))
      .slice(0, limit)
  }, [])

  const search = useCallback((rawQuery) => {
    const query = (rawQuery || '').trim()
    if (!query) return
    const hit = matchOfficialQa(query)
    if (hit?.item) {
      const guide = buildGuideCard(hit.item)
      append([
        mk('user', { text: query }),
        mk('bot', { text: answerText(hit.item) }),
        mk('link', { label: GUIDE_LINK_LABEL, url: guide.url || '/guides' }),
        mk('bot', { text: CONFIRM.more }),
        mk('chips'),
      ])
    } else {
      append([mk('user', { text: query }), mk('bot', { text: NO_RESULT }), mk('chips')])
    }
  }, [append])

  const openGuide = useCallback((arg) => {
    // 가이드 카드/링크 → 라우터 이동 또는 새 탭
    const url = typeof arg === 'string' ? arg : arg?.url
    if (url) {
      if (/^https?:\/\//.test(url)) window.open(url, '_blank', 'noopener')
      else window.location.assign(url)
    } else onOpenGuide?.(arg)
  }, [onOpenGuide])

  // ─── 폼 제출/취소 ───────────────────────────────────────────────────────
  const finishForm = useCallback((id) => {
    setDoneForms((prev) => new Set(prev).add(id))
  }, [])
  const submitForm = useCallback((id) => {
    finishForm(id)
    append([mk('bot', { text: CONFIRM.done }), mk('bot', { text: CONFIRM.more }), mk('chips')])
  }, [finishForm, append])
  const cancelForm = useCallback((id) => {
    finishForm(id)
    append([mk('chips')])
  }, [finishForm, append])

  // ─── 단축키 (⌘/Ctrl + / 토글, Esc 닫기) ────────────────────────────────
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

  return {
    isOpen, messages, userName, isFirstVisit,
    getQaByCategory,
    isFormDone: (id) => doneForms.has(id),
    open, close, toggle, reset,
    pickChip, openCategory, pickQa, requestSolution, startError, openGuide,
    search, faqSuggestions,
    submitForm, cancelForm, markVisited,
  }
}

export default useChatbot
