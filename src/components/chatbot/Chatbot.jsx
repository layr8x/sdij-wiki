// src/components/chatbot/Chatbot.jsx
// AMS 운영도우미 챗봇 — Figma v4-260601 "업데이트" 시나리오 1:1 반영
//
// 대화형 단일 스레드: 공지 카드 + 봇 인사 + 칩 메뉴(카테고리5+오류신고).
// 칩 → FAQ 목록 → (답변+가이드카드 | 인라인 폼) → 접수확인 + 칩 재노출.
// 토큰: 배경 #F4F4F4 · 네이비 헤더 · 유저 말풍선 #0043CE · body-l 20/32 ·
//       말풍선 8px · 공지 카드 12px · 칩 pill · 하단 입력바/아바타 없음. 폭 512.

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useChatbot, MSG_TYPES } from './useChatbot'
import { MIcon } from './chatbotIcons'
import {
  T, FONT, CHIP_MENU, GREETING, FORM_COPY, ATTACH_LIMIT, SEARCH_PLACEHOLDER, getCategoryLabel,
} from './chatbotConfig'

const R_BOT = '0px 8px 8px 8px' // 봇 말풍선 — 좌상단 직각
const R_USER = '8px 0px 8px 8px' // 유저 말풍선 — 우상단 직각

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 640px)').matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const onChange = () => setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isMobile
}

function XIcon({ size = 24, color = 'currentColor', stroke = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  )
}

// ─── FAB ─────────────────────────────────────────────────────────────────
function ChatbotFAB({ onClick, pulse }) {
  return (
    <>
      <style>{`
        @keyframes ams-fab-pulse{0%,100%{box-shadow:0 0 0 0 rgba(0,67,206,.4),0 8px 24px rgba(0,0,0,.18)}50%{box-shadow:0 0 0 12px rgba(0,67,206,0),0 8px 24px rgba(0,0,0,.18)}}
        .ams-fab-pulse{animation:ams-fab-pulse 2.4s ease-out infinite}
        @media(prefers-reduced-motion:reduce){.ams-fab-pulse{animation:none}}
      `}</style>
      <button
        type="button"
        onClick={onClick}
        aria-label="AMS 챗봇 열기 (⌘+/)"
        className={cn(
          'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full flex items-center justify-center text-white',
          'shadow-lg hover:shadow-xl transition-all duration-200 ease-out hover:scale-105 active:scale-95',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200',
          pulse && 'ams-fab-pulse'
        )}
        style={{ backgroundColor: T.navy }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = T.navyHover)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = T.navy)}
      >
        <MIcon name="forum" size={28} color="#fff" />
        {pulse && <span className="absolute top-2.5 right-2.5 h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ backgroundColor: '#DA1E28' }} />}
      </button>
    </>
  )
}

// ─── 헤더 (타이틀 + BETA, 닫기) ──────────────────────────────────────────
function WidgetHeader({ onClose }) {
  return (
    <div className="shrink-0 flex items-center gap-[16px] px-[24px] py-[16px]" style={{ backgroundColor: T.navy }}>
      <div className="flex-1 flex items-center gap-[8px] min-w-0">
        <span className="whitespace-nowrap" style={{ fontSize: '20px', lineHeight: '32px', color: T.inkOnColor, ...FONT.ss }}>
          <b style={{ fontWeight: 600 }}>AMS</b>
          <span style={{ fontWeight: 400 }}> 챗봇</span>
        </span>
        <span className="whitespace-nowrap" style={{ ...FONT.bodyM, color: T.tealBorder }}>BETA</span>
      </div>
      <button type="button" onClick={onClose} aria-label="닫기 (Esc)" className="shrink-0 opacity-70 hover:opacity-100 transition-opacity" style={{ color: T.inkOnColor }}>
        <XIcon size={22} />
      </button>
    </div>
  )
}

// ─── 말풍선 ──────────────────────────────────────────────────────────────
function BotBubble({ text }) {
  return (
    <div className="flex justify-start w-full">
      <div className="px-[16px] py-[12px] max-w-[400px]" style={{ backgroundColor: T.white, border: `1px solid ${T.border}`, borderRadius: R_BOT }}>
        <p className="break-words [overflow-wrap:anywhere] whitespace-pre-wrap" style={{ ...FONT.bodyLBold, color: T.ink }}>{text}</p>
      </div>
    </div>
  )
}

function UserBubble({ text }) {
  return (
    <div className="flex justify-end w-full animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="px-[16px] py-[12px] max-w-[400px]" style={{ backgroundColor: T.brandBlue, borderRadius: R_USER }}>
        <p className="break-words [overflow-wrap:anywhere] whitespace-pre-wrap" style={{ ...FONT.bodyLBold, color: T.inkOnColor }}>{text}</p>
      </div>
    </div>
  )
}

// ─── 칩 메뉴 ─────────────────────────────────────────────────────────────
function Chip({ label, variant, onClick }) {
  const [hover, setHover] = useState(false)
  const red = variant === 'red'
  const borderC = red ? T.chipRedBorder : T.noticeBorder
  const textC = red ? T.chipRedText : T.chipBlueText
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="px-[20px] py-[8px] rounded-[24px] transition-colors duration-150"
      style={{ backgroundColor: hover ? (red ? '#FFF1F1' : T.noticeBg) : T.white, border: `1px solid ${borderC}`, boxShadow: T.shadowS }}
    >
      <span style={{ ...FONT.bodyLBold, color: textC }}>{label}</span>
    </button>
  )
}

function ChipMenu({ onPick }) {
  return (
    <div className="flex flex-wrap gap-[8px] w-full">
      {CHIP_MENU.map((c) => (
        <Chip key={c.id} label={c.label} variant={c.variant} onClick={() => onPick(c)} />
      ))}
    </div>
  )
}

// ─── 인사 + 칩 (그룹) ────────────────────────────────────────────────────
function GreetingGroup() {
  return <BotBubble text={GREETING} />
}

// ─── FAQ 목록 (카테고리 상세) ────────────────────────────────────────────
function FaqRow({ children, onClick, isLink, last }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-[16px] px-[16px] py-[12px] text-left transition-colors hover:bg-[#F7FAFF]"
      style={{ backgroundColor: T.white, borderBottom: last ? 'none' : `1px solid ${T.border}` }}
    >
      <span className="flex-1 min-w-0 break-words inline-flex items-center gap-[4px]" style={{ ...FONT.bodyLBold, color: isLink ? T.link : T.navy }}>
        {children}
        {isLink && <MIcon name="open_in_new" size={22} color={T.link} />}
      </span>
      {!isLink && <MIcon name="chevron_right" size={24} color="rgba(22,22,22,0.3)" />}
    </button>
  )
}

function FaqList({ categoryId, items, onPickQa, onRequestSolution, onOpenGuide }) {
  const label = getCategoryLabel(categoryId)
  return (
    <div className="rounded-[16px] overflow-hidden w-full" style={{ boxShadow: T.shadowS }}>
      {items.map((qa) => (
        <FaqRow key={qa.id} onClick={() => onPickQa(qa)}>
          {qa.q.replace(/[?？]\s*$/, '')}?
        </FaqRow>
      ))}
      <FaqRow onClick={onRequestSolution}>해결방법 요청하기</FaqRow>
      <FaqRow isLink last onClick={() => onOpenGuide(`/guides`)}>{label} 가이드 보기</FaqRow>
    </div>
  )
}

// ─── 가이드 카드 ─────────────────────────────────────────────────────────
function GuideCard({ guide, onOpen }) {
  const [hover, setHover] = useState(false)
  return (
    <div className="flex justify-start w-full">
      <button
        type="button"
        onClick={() => onOpen?.(guide)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="flex flex-col gap-[12px] p-[16px] max-w-[360px] w-full text-left transition-shadow"
        style={{ backgroundColor: T.white, border: `1px solid ${T.border}`, borderRadius: R_BOT, outline: hover ? `1.5px solid ${T.noticeBorder}` : '1.5px solid transparent' }}
      >
        <p style={{ ...FONT.bodyMBold, color: T.brandBlue }}>📘 {guide.categoryLabel}</p>
        <p className="break-words" style={{ ...FONT.headlineBold, color: T.navy }}>{guide.title}</p>
        {guide.snippet && <p className="break-words line-clamp-2" style={{ ...FONT.bodyM, color: T.helper }}>{guide.snippet}</p>}
        <span className="flex items-center gap-[4px]">
          <span className="underline underline-offset-[3px]" style={{ ...FONT.bodyM, color: T.link }}>전체 가이드 보기</span>
          <MIcon name="open_in_new" size={24} color={T.link} />
        </span>
      </button>
    </div>
  )
}

// ─── 가이드 링크 (단독 — 오류신고 안내 하단) ─────────────────────────────
function GuideLink({ label, url, onOpen }) {
  return (
    <div className="flex justify-start w-full">
      <button type="button" onClick={() => onOpen(url)} className="flex items-center gap-[4px] px-[16px] py-[12px]" style={{ backgroundColor: T.white, border: `1px solid ${T.border}`, borderRadius: R_BOT }}>
        <span style={{ ...FONT.bodyL, color: T.link }}>{label}</span>
        <MIcon name="open_in_new" size={24} color={T.link} />
      </button>
    </div>
  )
}

// ─── 인라인 폼 (문의/오류) ───────────────────────────────────────────────
function InlineForm({ kind, done, onSubmit, onCancel }) {
  const copy = FORM_COPY[kind] || FORM_COPY.inquiry
  const [text, setText] = useState('')
  const [files, setFiles] = useState([])
  const [err, setErr] = useState('')
  const fileRef = useRef(null)

  const onFiles = (list) => {
    setErr('')
    const next = [...files]
    for (const f of Array.from(list)) {
      if (next.length >= ATTACH_LIMIT.maxCount) { setErr(`이미지는 최대 ${ATTACH_LIMIT.maxCount}개까지 첨부할 수 있어요.`); break }
      if (!f.type.startsWith('image/')) { setErr('이미지 파일만 첨부할 수 있어요.'); continue }
      if (f.size > ATTACH_LIMIT.maxBytes) { setErr('각 이미지는 1MB 이하만 첨부할 수 있어요.'); continue }
      next.push(f)
    }
    setFiles(next.slice(0, ATTACH_LIMIT.maxCount))
    if (fileRef.current) fileRef.current.value = ''
  }

  const canSend = !!text.trim() && !done

  return (
    <div className={cn('flex flex-col gap-[16px] w-full', done && 'opacity-60 pointer-events-none')}>
      {/* 텍스트 입력 */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={copy.placeholder}
        disabled={done}
        className="w-full rounded-[8px] p-[16px] resize-none outline-none placeholder:text-[rgba(22,22,22,0.32)]"
        style={{ minHeight: 160, backgroundColor: T.white, border: `1px solid ${T.border}`, ...FONT.bodyL, color: T.ink }}
      />

      {/* 이미지 첨부 */}
      <div className="flex flex-col gap-[8px] w-full">
        {files.map((f, i) => (
          <div key={i} className="w-full flex items-center gap-[4px] px-[16px] py-[10px] rounded-[8px]" style={{ backgroundColor: T.surfaceHover }}>
            <span className="flex-1 min-w-0 truncate text-center" style={{ ...FONT.headline, color: T.ink }}>{f.name}</span>
            <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="첨부 삭제" style={{ color: T.ink }}>
              <XIcon size={24} stroke={2.2} />
            </button>
          </div>
        ))}
        {files.length < ATTACH_LIMIT.maxCount && !done && (
          <button type="button" onClick={() => fileRef.current?.click()} className="w-full flex items-center px-[16px] py-[10px] rounded-[8px] transition-colors hover:bg-[#FAFAFA]" style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
            <span className="flex-1 text-center" style={{ ...FONT.headline, color: T.ink }}>이미지 첨부하기</span>
            <MIcon name="add" size={24} color={T.ink} />
          </button>
        )}
        <input ref={fileRef} type="file" accept={ATTACH_LIMIT.accept} multiple hidden onChange={(e) => onFiles(e.target.files)} />
        <p style={{ ...FONT.bodyM, color: T.helper }}>이미지만 첨부 가능 / 최대 2개 / 각 1MB 이하</p>
        {err && <p style={{ ...FONT.bodyM, color: T.chipRedText }}>{err}</p>}
      </div>

      {/* 취소 / 보내기 */}
      <div className="flex gap-[8px] w-full">
        <button type="button" onClick={onCancel} disabled={done} className="shrink-0 flex items-center justify-center px-[32px] py-[16px] rounded-[8px] transition-colors hover:bg-[#FAFAFA]" style={{ backgroundColor: T.white, border: `1px solid ${T.borderStrong}` }}>
          <span style={{ ...FONT.bodyLBold, color: T.ink }}>취소</span>
        </button>
        <button type="button" onClick={onSubmit} disabled={!canSend} className="flex-1 flex items-center justify-center gap-[8px] pl-[32px] pr-[28px] py-[16px] rounded-[8px] transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed" style={{ backgroundColor: canSend ? T.navy : T.disabled }}>
          <span style={{ ...FONT.bodyLBold, color: canSend ? T.inkOnColor : T.placeholder }}>보내기</span>
          <MIcon name="send" size={28} color={canSend ? T.inkOnColor : T.placeholder} />
        </button>
      </div>
    </div>
  )
}

// ─── 메시지 렌더러 ───────────────────────────────────────────────────────
function ThreadMessage({ m, chatbot }) {
  switch (m.type) {
    case MSG_TYPES.GREETING:
      return <GreetingGroup />
    case MSG_TYPES.CHIPS:
      return <ChipMenu onPick={chatbot.pickChip} />
    case MSG_TYPES.USER:
      return <UserBubble text={m.text} />
    case MSG_TYPES.BOT:
      return <BotBubble text={m.text} />
    case MSG_TYPES.LINK:
      return <GuideLink label={m.label} url={m.url} onOpen={chatbot.openGuide} />
    case MSG_TYPES.FAQ:
      return (
        <FaqList
          categoryId={m.categoryId}
          items={chatbot.getQaByCategory(m.categoryId)}
          onPickQa={chatbot.pickQa}
          onRequestSolution={chatbot.requestSolution}
          onOpenGuide={chatbot.openGuide}
        />
      )
    case MSG_TYPES.GUIDE:
      return <GuideCard guide={m.guide} onOpen={chatbot.openGuide} />
    case MSG_TYPES.FORM:
      return (
        <InlineForm
          kind={m.kind}
          done={chatbot.isFormDone(m.id)}
          onSubmit={() => chatbot.submitForm(m.id)}
          onCancel={() => chatbot.cancelForm(m.id)}
        />
      )
    default:
      return null
  }
}

// ─── 하단 검색바 (자유 입력 + FAQ 자동완성) ─────────────────────────────
function SearchBar({ onSearch, suggest, onPickSuggestion }) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [showSug, setShowSug] = useState(true)
  const inputRef = useRef(null)
  const active = !!text.trim()
  const list = showSug && active ? suggest(text) : []

  const submit = (v) => {
    const q = (v ?? text).trim()
    if (!q) return
    onSearch(q)
    setText('')
    setShowSug(false)
    inputRef.current?.focus()
  }
  const pick = (qa) => {
    setText('')
    setShowSug(false)
    onPickSuggestion(qa)
    inputRef.current?.focus()
  }

  return (
    <div className="shrink-0 p-[24px]" style={{ backgroundColor: T.bg }}>
      <div className="relative">
        {list.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-2 rounded-[16px] overflow-hidden" style={{ backgroundColor: T.white, boxShadow: T.shadowXl, border: `1px solid ${T.border}` }}>
            {list.map((qa, i) => (
              <button
                key={qa.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(qa)}
                className="w-full text-left px-[16px] py-[12px] transition-colors hover:bg-[#F7FAFF]"
                style={{ borderTop: i === 0 ? 'none' : `1px solid ${T.border}`, ...FONT.bodyLBold, color: T.navy }}
              >
                {qa.q.replace(/[?？]\s*$/, '')}?
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); submit() }}
          className="flex items-center p-[8px] rounded-[8px]"
          style={{ backgroundColor: T.white, border: `1px solid ${focused ? T.brandBlue : T.border}`, transition: 'border-color 150ms' }}
        >
          <div className="flex-1 flex items-center gap-[2px] pl-[8px] min-w-0">
            <span className="w-px h-[24px] shrink-0" style={{ backgroundColor: T.ink }} />
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => { setText(e.target.value); setShowSug(true) }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={SEARCH_PLACEHOLDER}
              aria-label="FAQ 검색"
              className="flex-1 bg-transparent border-0 outline-none placeholder:text-[rgba(22,22,22,0.32)]"
              style={{ ...FONT.bodyL, color: T.ink }}
              autoComplete="off"
            />
          </div>
          <button type="submit" aria-label="검색" className="shrink-0 flex items-center justify-center p-[10px] rounded-[4px] transition-colors hover:bg-[#F4F4F4]">
            <MIcon name="search" size={28} color={active ? T.ink : 'rgba(22,22,22,0.45)'} />
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── 위젯 ────────────────────────────────────────────────────────────────
function ChatbotWidget({ chatbot }) {
  const isMobile = useIsMobile()
  const bodyRef = useRef(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [chatbot.messages])

  const widgetClass = isMobile
    ? 'fixed inset-0 z-50 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300'
    : 'fixed bottom-4 right-4 z-50 w-[512px] h-[840px] max-h-[calc(100dvh-2rem)] rounded-[24px] overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300'

  return (
    <div role="dialog" aria-modal="true" aria-label="AMS 운영도우미 챗봇" className={widgetClass} style={{ backgroundColor: T.bg, boxShadow: isMobile ? 'none' : T.shadowXl }}>
      <WidgetHeader onClose={chatbot.close} />
      <div ref={bodyRef} className="flex-1 overflow-y-auto flex flex-col gap-[24px] p-[24px]" style={{ backgroundColor: T.bg }}>
        {chatbot.messages.map((m) => (
          <ThreadMessage key={m.id} m={m} chatbot={chatbot} />
        ))}
      </div>
      <SearchBar onSearch={chatbot.search} suggest={chatbot.faqSuggestions} onPickSuggestion={chatbot.pickQa} />
    </div>
  )
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────
export function Chatbot({ userName = '명준', onOpenGuide }) {
  const chatbot = useChatbot({ userName, onOpenGuide })

  useEffect(() => {
    if (chatbot.isOpen) chatbot.markVisited()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatbot.isOpen])

  return (
    <>
      {!chatbot.isOpen && <ChatbotFAB onClick={chatbot.open} pulse={chatbot.isFirstVisit} />}
      {chatbot.isOpen && <ChatbotWidget chatbot={chatbot} />}
    </>
  )
}

export default Chatbot
