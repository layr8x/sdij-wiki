// src/components/chatbot/useChatbot.js
// AMS 챗봇 — 대화형 단일 스레드 상태머신 (Figma v4 / 실시간 FAQ 참조)
//
// 데이터: officialQa(25 시트 Q&A) + 매니저 FAQ(/api/faq 실시간, 번들 폴백).
// 인터랙션: 봇 응답 전 타이핑 인디케이터(대화감) · reduced-motion 존중.

import { useState, useCallback, useRef, useEffect } from 'react'
import { getRelatedGuidesForQa } from './intents'
import { getQaByCategory, OFFICIAL_QA, OFFICIAL_QA_CATEGORIES, matchOfficialQa } from '@/data/officialQa'
import { MANAGER_FAQ, searchManagerFaq, bestManagerFaq, popularManagerFaq } from '@/data/managerFaq'
import { getCategoryLabel, FORM_COPY, CONFIRM, GUIDE_LINK_LABEL, SOLUTION_INTRO, ATTACH_LIMIT } from './chatbotConfig'

export const MSG_TYPES = {
  GREETING: 'greeting', CHIPS: 'chips', USER: 'user',
  BOT: 'bot', FAQ: 'faq', GUIDE: 'guide', FORM: 'form', TYPING: 'typing',
}
export const CHATBOT_STAGES = { FAQ: 1, RAG: 2, TICKET: 3, NL2SQL: 4 }

let _id = 1
const nextId = () => _id++
const mk = (type, props = {}) => ({ id: nextId(), type, ...props })
const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const answerText = (qa) => (qa.a || '').replace(/\n{3,}/g, '\n\n').trim()

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

export function useChatbot({ userName = '명준', onOpenGuide, faqList = MANAGER_FAQ } = {}) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState(initialThread)
  const [activeForm, setActiveForm] = useState(null)
  const [formText, setFormText] = useState('')
  const [formFiles, setFormFiles] = useState([])
  const [fileError, setFileError] = useState('')
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

  // ─── 열기/닫기 ──────────────────────────────────────────────────────────
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((o) => !o), [])
  const clearForm = useCallback(() => { setActiveForm(null); setFormText(''); setFormFiles([]); setFileError('') }, [])
  const reset = useCallback(() => {
    timers.current.forEach(clearTimeout); timers.current = []
    clearForm(); setMessages(initialThread())
  }, [clearForm])

  // ─── 칩 → 카테고리 FAQ ──────────────────────────────────────────────────
  const openCategory = useCallback((catId, label) => {
    const name = label || getCategoryLabel(catId)
    respond(
      [mk('user', { text: name })],
      [
        mk('bot', { text: `${name}에서 자주 찾는 항목이에요.\n관련 문의 내용을 선택해 주세요.` }),
        mk('faq', { categoryId: catId }),
      ]
    )
  }, [respond])

  // ─── 인라인 폼 (즉시 — 폼 진입은 타이핑 없이) ───────────────────────────
  const startForm = useCallback((kind, bubbles) => {
    const id = nextId()
    setMessages((prev) => [...prev, ...bubbles, { id, type: 'form', kind }])
    setActiveForm({ id, kind })
    setFormText(''); setFormFiles([]); setFileError('')
  }, [])

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

  // ─── FAQ 행 → 답변 + 가이드 카드 + 후속 칩 ───────────────────────────────
  const pickQa = useCallback((qa) => {
    respond(
      [mk('user', { text: qa.q })],
      [
        mk('bot', { text: answerText(qa) }),
        mk('guide', { guide: buildGuideCard(qa) }),
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
        mk('bot', { text: item.a, link: { label: GUIDE_LINK_LABEL, url: '/faq' } }),
        mk('bot', { text: CONFIRM.more }),
        mk('chips'),
      ]
    )
  }, [respond])

  // ─── 하단 검색 + 자동완성 (officialQa + 매니저 FAQ 전체 참조) ────────────
  const faqSuggestions = useCallback((q, limit = 6) => {
    if (!(q || '').trim()) return []
    const nq = q.trim().toLowerCase()
    const qa = OFFICIAL_QA
      .filter((x) => x.q.toLowerCase().includes(nq) || (x.tip || '').toLowerCase().includes(nq))
      .slice(0, 3)
    const merged = []
    const seen = new Set()
    for (const it of [...qa, ...searchManagerFaq(q, 4, faqList)]) {
      if (seen.has(it.q)) continue
      seen.add(it.q); merged.push(it)
      if (merged.length >= limit) break
    }
    return merged
  }, [faqList])

  // 빈 검색창 포커스 시 추천 (인기 FAQ)
  const popularSuggestions = useCallback(() => popularManagerFaq(5, faqList), [faqList])

  // 자동완성 클릭 — officialQa(가이드 카드) / 매니저 FAQ(가이드 링크) 분기
  const pickSuggestion = useCallback((item) => {
    if (item && item.guideId) faqAnswer(item)
    else pickQa(item)
  }, [faqAnswer, pickQa])

  const search = useCallback((rawQuery) => {
    const query = (rawQuery || '').trim()
    if (!query) return
    const hit = matchOfficialQa(query)
    if (hit?.item) {
      const guide = buildGuideCard(hit.item)
      respond(
        [mk('user', { text: query })],
        [
          mk('bot', { text: answerText(hit.item), link: { label: GUIDE_LINK_LABEL, url: guide.url || '/guides' } }),
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
          mk('bot', { text: faq.a, link: { label: GUIDE_LINK_LABEL, url: '/faq' } }),
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
    if (url) {
      if (/^https?:\/\//.test(url)) window.open(url, '_blank', 'noopener')
      else window.location.assign(url)
    } else onOpenGuide?.(arg)
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
  }, [])
  const removeFile = useCallback((idx) => setFormFiles((prev) => prev.filter((_, i) => i !== idx)), [])

  // ─── 폼 제출/취소 ───────────────────────────────────────────────────────
  const submitForm = useCallback(() => {
    if (!activeForm || !formText.trim()) return
    const id = activeForm.id
    const submittedText = formText
    const submittedFiles = formFiles.map((f) => f.name)
    setMessages((prev) => [
      ...prev.map((m) => (m.id === id ? { ...m, done: true, submittedText, submittedFiles } : m)),
    ])
    clearForm()
    respond([], [mk('bot', { text: CONFIRM.done }), mk('bot', { text: CONFIRM.more }), mk('chips')])
  }, [activeForm, formText, formFiles, clearForm, respond])

  const cancelForm = useCallback(() => {
    if (!activeForm) return
    const id = activeForm.id
    setMessages((prev) => prev.filter((m) => m.id !== id))
    clearForm()
  }, [activeForm, clearForm])

  // ─── 단축키 ─────────────────────────────────────────────────────────────
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
    activeForm, formText, setFormText, formFiles, fileError, addFiles, removeFile,
    canSubmit: !!activeForm && !!formText.trim(),
    open, close, toggle, reset,
    pickChip, openCategory, pickQa, requestSolution, startError, openGuide,
    search, faqSuggestions, popularSuggestions, pickSuggestion, submitForm, cancelForm, markVisited,
  }
}

export default useChatbot
