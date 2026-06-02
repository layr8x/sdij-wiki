// src/components/chatbot/useChatbot.js
// AMS 챗봇 — 대화형 단일 스레드 상태머신 (Figma v4 / 실시간 FAQ 참조)
//
// 데이터: officialQa(25 시트 Q&A) + 매니저 FAQ(/api/faq 실시간, 번들 폴백).
// 인터랙션: 봇 응답 전 타이핑 인디케이터(대화감) · reduced-motion 존중.

import { useState, useCallback, useRef, useEffect } from 'react'
import { getQaByCategory, OFFICIAL_QA, matchOfficialQa } from '@/data/officialQa'
import { MANAGER_FAQ, searchManagerFaq, bestManagerFaq, popularManagerFaq } from '@/data/managerFaq'
import { getCategoryLabel, FORM_COPY, CONFIRM, GUIDE_LINK_LABEL, SOLUTION_INTRO, ATTACH_LIMIT, guideSearchUrl } from './chatbotConfig'
import { AMS_GUIDE_INDEX } from '@/data/guides/amsGuideIndex'

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

// ─── AMS 가이드(위키 반영분 100개) 매칭 — 챗봇 검색/관련가이드 연결 ─────────
// FAQ 카테고리 → 위키 가이드 모듈(카테고리). 관련 가이드 매칭 시 가중치로 사용.
const CAT_TO_MODULE = {
  okta: '공통/시스템', refund: '청구/수납/결제/환불', payment: '청구/수납/결제/환불',
  enrollment: '모집/접수 관리', attendance: '수업운영관리', member: '고객(원생) 관리',
  course: '강좌/교재 관리', message: '메시지발송 관리',
}
const amsGuideUrl = (id) => `/guides/${id}` // 위키 가이드 상세(원문 컨플루언스 링크 포함)
function amsTokens(q) {
  const query = (q || '').trim().toLowerCase()
  if (!query) return []
  const parts = new Set([query])
  for (const t of query.split(/\s+/)) if (t.length >= 2) parts.add(t)
  const compact = query.replace(/\s+/g, '')
  if (/^[가-힣]{3,}$/.test(compact)) for (let i = 0; i < compact.length - 1; i++) parts.add(compact.slice(i, i + 2))
  return [...parts]
}
function matchAmsGuides(q, limit = 4, moduleHint) {
  const toks = amsTokens(q)
  if (!toks.length) return []
  const scored = []
  for (const g of AMS_GUIDE_INDEX) {
    const hay = `${g.title} ${g.tldr}`.toLowerCase()
    let score = 0
    for (const t of toks) if (hay.includes(t)) score += g.title.toLowerCase().includes(t) ? 2 : 1
    if (moduleHint && g.module === moduleHint) score += 1
    if (score > 0) scored.push({ g, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.g)
}
// 답변 "관련 가이드 보기" 링크 — 최적 매칭 AMS 가이드(없으면 컨플루언스 검색)
function relatedGuideLink(query, category) {
  const best = matchAmsGuides(query, 1, CAT_TO_MODULE[category])[0]
  return { label: GUIDE_LINK_LABEL, url: best ? amsGuideUrl(best.id) : guideSearchUrl(query) }
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

  // ─── FAQ 행 → 답변(말풍선 내 "관련 가이드 보기" 링크) + 후속 칩 ──────────
  // 시안 2번 형태: 별도 GuideCard 없이 답변 말풍선 안에 링크만. 링크는 위키에
  // 반영된 AMS 가이드 100개 중 최적 매칭으로 연결(없으면 컨플루언스 검색).
  const pickQa = useCallback((qa) => {
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
