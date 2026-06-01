// src/components/chatbot/useChatbot.js
// AMS 운영도우미 챗봇 — 대화형 단일 스레드 상태머신 (Figma v4 업데이트 830:5936)
//
// 흐름: 봇 인사 + 칩 메뉴 → (칩 → FAQ 목록 → 답변) | (검색 → 답변/해결요청)
//       → 인라인 폼(텍스트+첨부, 하단 고정 취소/보내기) → 접수확인 + 칩.
//
// 폼은 본문에 인라인으로, 취소/보내기는 하단 고정바로 분리(시안). 폼 내용
// (text/files)은 훅이 보관해 인라인 입력부와 고정 버튼이 공유한다.

import { useState, useCallback, useEffect } from 'react'
import { getRelatedGuidesForQa } from './intents'
import { getQaByCategory, OFFICIAL_QA, OFFICIAL_QA_CATEGORIES, matchOfficialQa } from '@/data/officialQa'
import { getCategoryLabel, FORM_COPY, CONFIRM, GUIDE_LINK_LABEL, SOLUTION_INTRO, ATTACH_LIMIT } from './chatbotConfig'

export const MSG_TYPES = {
  GREETING: 'greeting', CHIPS: 'chips', USER: 'user',
  BOT: 'bot', FAQ: 'faq', GUIDE: 'guide', LINK: 'link', FORM: 'form',
}
export const CHATBOT_STAGES = { FAQ: 1, RAG: 2, TICKET: 3, NL2SQL: 4 }

let _id = 1
const nextId = () => _id++
const mk = (type, props = {}) => ({ id: nextId(), type, ...props })

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

export function useChatbot({ userName = '명준', onOpenGuide } = {}) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState(initialThread)
  // 활성 폼 + 입력 내용(인라인 입력부 ↔ 하단 고정 버튼 공유)
  const [activeForm, setActiveForm] = useState(null) // { id, kind } | null
  const [formText, setFormText] = useState('')
  const [formFiles, setFormFiles] = useState([])
  const [fileError, setFileError] = useState('')

  const append = useCallback((items) => setMessages((prev) => [...prev, ...items]), [])

  // ─── 열기/닫기 ──────────────────────────────────────────────────────────
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((o) => !o), [])
  const clearForm = useCallback(() => { setActiveForm(null); setFormText(''); setFormFiles([]); setFileError('') }, [])
  const reset = useCallback(() => { clearForm(); setMessages(initialThread()) }, [clearForm])

  // ─── 칩 → 카테고리 FAQ ──────────────────────────────────────────────────
  const openCategory = useCallback((catId, label) => {
    const name = label || getCategoryLabel(catId)
    append([
      mk('user', { text: name }),
      mk('bot', { text: `${name}에서 자주 찾는 항목이에요.\n관련 문의 내용을 선택해 주세요.` }),
      mk('faq', { categoryId: catId }),
    ])
  }, [append])

  // ─── 인라인 폼 시작 ─────────────────────────────────────────────────────
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
      mk('bot', { text: FORM_COPY.error.intro }),
      mk('link', { label: FORM_COPY.error.link.label, url: FORM_COPY.error.link.url }),
    ])
  }, [startForm])

  const pickChip = useCallback((chip) => {
    if (chip.id === 'error') startError()
    else openCategory(chip.id, chip.label)
  }, [startError, openCategory])

  // ─── FAQ 행 → 답변 + 가이드 + 후속 칩 ───────────────────────────────────
  const pickQa = useCallback((qa) => {
    append([
      mk('user', { text: qa.q }),
      mk('bot', { text: answerText(qa) }),
      mk('guide', { guide: buildGuideCard(qa) }),
      mk('bot', { text: CONFIRM.more }),
      mk('chips'),
    ])
  }, [append])

  // ─── 하단 검색 + 자동완성 ───────────────────────────────────────────────
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
      // 무결과 → 해결방법요청 폼
      requestSolution()
    }
  }, [append, requestSolution])

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
      mk('bot', { text: CONFIRM.done }),
      mk('bot', { text: CONFIRM.more }),
      mk('chips'),
    ])
    clearForm()
  }, [activeForm, formText, formFiles, clearForm])

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
    // 폼 공유 상태
    activeForm, formText, setFormText, formFiles, fileError, addFiles, removeFile,
    canSubmit: !!activeForm && !!formText.trim(),
    open, close, toggle, reset,
    pickChip, openCategory, pickQa, requestSolution, startError, openGuide,
    search, faqSuggestions, submitForm, cancelForm, markVisited,
  }
}

export default useChatbot
