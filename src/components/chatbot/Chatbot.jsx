// src/components/chatbot/Chatbot.jsx
// AMS 챗봇 — Figma v4 업데이트(830:5936) 1:1 반영
//
// 대화형 단일 스레드: 봇 인사 + 칩 메뉴 → 칩(카테고리 FAQ)·검색(답변/해결요청).
// 인라인 폼(텍스트+첨부) + 하단 고정 취소/보내기 바. 평소엔 하단 검색바.
// 토큰: 배경 #F4F4F4 · 헤더 "AMS 챗봇" · 유저 말풍선 #0043CE · body 20/32 ·
//       말풍선/입력 4px · 칩 pill(회색 테두리·검정/빨강 텍스트) · 폭 512.

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useManagerFaq } from '@/hooks/useManagerFaq'
import { useChatbot, MSG_TYPES } from './useChatbot'
import { MIcon } from './chatbotIcons'
import {
  T, FONT, CHIP_MENU, GREETING, FORM_COPY, ATTACH_LIMIT, SEARCH_PLACEHOLDER, getCategoryLabel, guideSearchUrl,
} from './chatbotConfig'

const BTN = { fontSize: '18px', lineHeight: '32px', fontWeight: 400, ...FONT.ss } // 버튼 라벨(body 18)
const R_BOT = '4px 24px 24px 24px' // 봇 말풍선 — 좌상단 꼬리
const R_USER = '24px 4px 24px 24px' // 유저 말풍선 — 우상단 꼬리

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

// ─── FAB (런처 — 항상 표시 · 시선 유도 인터랙션) ─────────────────────────
function ChatbotFAB({ onClick, pulse, open }) {
  const isMobile = useIsMobile()
  const pos = open && isMobile ? 'top-4 right-4' : 'bottom-6 right-6'
  return (
    <>
      <style>{`
        @keyframes ams-fab-ping{0%{transform:scale(1);opacity:.45}70%,100%{transform:scale(2.1);opacity:0}}
        @keyframes ams-fab-attn{0%,84%,100%{transform:translateY(0) rotate(0deg)}89%{transform:translateY(-7px) rotate(-7deg)}94%{transform:translateY(-2px) rotate(5deg)}}
        .ams-fab-ping{animation:ams-fab-ping 2.6s cubic-bezier(0,0,.2,1) infinite}
        .ams-fab-attn{animation:ams-fab-attn 6s ease-in-out infinite}
        @media(prefers-reduced-motion:reduce){.ams-fab-ping,.ams-fab-attn{animation:none}}
      `}</style>
      <div className={cn('fixed z-[60] flex items-center gap-2 group', pos)}>
        {/* 호버/첫 방문 시 라벨 */}
        {!open && (
          <span
            className={cn(
              'hidden sm:flex items-center h-10 px-4 rounded-full whitespace-nowrap select-none pointer-events-none',
              'transition-all duration-300 translate-x-3 opacity-0 group-hover:translate-x-0 group-hover:opacity-100',
              pulse && 'translate-x-0 opacity-100'
            )}
            style={{ backgroundColor: T.white, boxShadow: T.shadowXl, color: T.navy, ...FONT.bodyMBold }}
          >
            무엇이든 물어보세요 👋
          </span>
        )}
        <div className={cn('relative h-14 w-14 shrink-0', !open && 'ams-fab-attn')}>
          {!open && <span className="ams-fab-ping absolute inset-0 rounded-full" style={{ backgroundColor: T.navy }} aria-hidden />}
          <button
            type="button"
            data-ams-fab
            onClick={onClick}
            aria-label={open ? 'AMS 챗봇 닫기 (⌘+/)' : 'AMS 챗봇 열기 (⌘+/)'}
            aria-expanded={open}
            className={cn(
              'relative h-14 w-14 rounded-full flex items-center justify-center text-white',
              'shadow-lg hover:shadow-xl transition-transform duration-200 ease-out hover:scale-110 active:scale-95',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200'
            )}
            style={{ backgroundColor: T.navy }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = T.navyHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = T.navy)}
          >
            <MIcon name="forum" size={28} color="#fff" />
            {!open && pulse && <span className="absolute top-1 right-1 h-3 w-3 rounded-full ring-2 ring-white" style={{ backgroundColor: '#DA1E28' }} aria-hidden />}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── 헤더 (타이틀 + BETA — 닫기 X 없음, 팝업이라 바깥 클릭/런처로 닫음) ──
function WidgetHeader() {
  return (
    <div className="shrink-0 flex items-center gap-[8px] p-[16px]" style={{ backgroundColor: T.navy }}>
      <span className="whitespace-nowrap" style={{ fontSize: '20px', lineHeight: '32px', color: T.inkOnColor, ...FONT.ss }}>
        <b style={{ fontWeight: 600 }}>AMS</b>
        <span style={{ fontWeight: 400 }}> 챗봇</span>
      </span>
      <span className="whitespace-nowrap" style={{ ...FONT.bodyM, color: T.tealBorder }}>BETA</span>
    </div>
  )
}

// ─── 봇 말풍선 (말풍선형 모서리 · 본문 Regular 20/32 · 관련 가이드 링크) ──
// 시안(Figma 871:26431) 그대로: 본문은 전부 Pretendard Regular 20/32 #161616,
// 줄바꿈은 pre-wrap 으로 보존. 본문과 링크 사이 간격 24px. 링크는 회색 박스
// (bg #F4F4F4, rounded-16, "관련 가이드 보기" 가운데 + open_in_new 아이콘).
function BotBubble({ text, answer, link, onOpen }) {
  const body = answer || text
  return (
    <div className="flex justify-start w-full animate-in fade-in slide-in-from-bottom-3 slide-in-from-left-1 duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]">
      <div className="flex flex-col gap-[24px] p-[16px] max-w-[400px] overflow-hidden" style={{ backgroundColor: T.white, border: `1px solid ${T.border}`, borderRadius: R_BOT }}>
        <p className="w-full break-words [overflow-wrap:anywhere] whitespace-pre-wrap" style={{ ...FONT.bodyL, color: T.ink }}>{body}</p>
        {link && (
          <button type="button" onClick={() => onOpen?.(link.url)} className="w-full flex items-center gap-[8px] px-[16px] py-[8px] rounded-[16px] transition-[filter,transform] duration-150 hover:brightness-[0.97] active:scale-[0.99]" style={{ backgroundColor: T.bg }}>
            <span className="flex-1 text-center" style={{ ...FONT.bodyL, color: T.ink }}>{link.label}</span>
            <MIcon name="open_in_new" size={24} color={T.ink} />
          </button>
        )}
      </div>
    </div>
  )
}

function UserBubble({ text }) {
  return (
    <div className="flex justify-end w-full animate-in fade-in slide-in-from-right-2 duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]">
      <div className="p-[16px] max-w-[400px]" style={{ backgroundColor: T.brandBlue, borderRadius: R_USER }}>
        <p className="break-words [overflow-wrap:anywhere] whitespace-pre-wrap" style={{ ...FONT.bodyL, color: T.inkOnColor }}>{text}</p>
      </div>
    </div>
  )
}

// ─── 타이핑 인디케이터 (봇 응답 전 대화감) ───────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex justify-start w-full animate-in fade-in duration-200">
      <style>{`
        @keyframes ams-typing{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-4px);opacity:1}}
        @media(prefers-reduced-motion:reduce){.ams-typing-dot{animation:none!important;opacity:.6}}
      `}</style>
      <div className="inline-flex items-center gap-[6px] px-[16px] py-[16px]" style={{ backgroundColor: T.white, border: `1px solid ${T.border}`, borderRadius: R_BOT }}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="ams-typing-dot h-2 w-2 rounded-full" style={{ backgroundColor: T.helper, animation: `ams-typing 1s ${i * 0.15}s infinite ease-in-out` }} />
        ))}
      </div>
    </div>
  )
}

// ─── 칩 메뉴 (회색 테두리 · 검정/빨강 텍스트 · Regular) ───────────────────
function Chip({ label, variant, index = 0, onClick }) {
  const [hover, setHover] = useState(false)
  const red = variant === 'red'
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="px-[20px] py-[8px] rounded-[24px] transition-all duration-150 hover:-translate-y-px active:scale-95 animate-in fade-in zoom-in-95 fill-mode-both"
      style={{ backgroundColor: hover ? '#FAFAFA' : T.white, border: `1px solid ${T.borderStrong}`, boxShadow: T.shadowS, animationDuration: '280ms', animationDelay: `${index * 45}ms` }}
    >
      <span style={{ ...FONT.bodyL, color: red ? T.error : T.ink }}>{label}</span>
    </button>
  )
}

function ChipMenu({ onPick }) {
  return (
    <div className="flex flex-wrap gap-[8px] w-full">
      {CHIP_MENU.map((c, i) => (
        <Chip key={c.id} label={c.label} variant={c.variant} index={i} onClick={() => onPick(c)} />
      ))}
    </div>
  )
}

// ─── FAQ 목록 ────────────────────────────────────────────────────────────
function FaqRow({ children, onClick, isLink, last }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-[16px] p-[16px] text-left transition-colors duration-150 hover:bg-[#F7FAFF] active:bg-[#EDF5FF]"
      style={{ backgroundColor: T.white, borderBottom: last ? 'none' : `1px solid ${T.border}` }}
    >
      <span className="flex-1 min-w-0 break-words inline-flex items-center gap-[4px]" style={{ ...FONT.bodyL, color: isLink ? T.link : T.navy }}>
        {children}
        {isLink && <MIcon name="open_in_new" size={24} color={T.link} />}
      </span>
    </button>
  )
}

function FaqList({ categoryId, items, onPickQa, onRequestSolution, onOpenGuide }) {
  const label = getCategoryLabel(categoryId)
  return (
    <div className="rounded-[16px] overflow-hidden w-full animate-in fade-in slide-in-from-bottom-2 duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ boxShadow: T.shadowS }}>
      {items.map((qa) => (
        <FaqRow key={qa.id} onClick={() => onPickQa(qa)}>{qa.q.replace(/[?？]\s*$/, '')}?</FaqRow>
      ))}
      <FaqRow onClick={onRequestSolution}>해결방법 요청하기</FaqRow>
      <FaqRow isLink last onClick={() => onOpenGuide(guideSearchUrl(label))}>{label} 가이드 보기</FaqRow>
    </div>
  )
}

// ─── 가이드 카드 ─────────────────────────────────────────────────────────
function GuideCard({ guide, onOpen }) {
  const [hover, setHover] = useState(false)
  return (
    <div className="flex justify-start w-full animate-in fade-in zoom-in-95 slide-in-from-bottom-1 duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]">
      <button
        type="button"
        onClick={() => onOpen?.(guide)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="flex flex-col gap-[16px] p-[16px] max-w-[360px] w-full text-left rounded-[4px] transition-all duration-200 active:scale-[0.99]"
        style={{ backgroundColor: T.white, border: `1px solid ${hover ? T.noticeBorder : T.border}`, transform: hover ? 'translateY(-2px)' : 'none', boxShadow: hover ? '0 8px 22px rgba(0,67,206,0.10)' : 'none' }}
      >
        <p style={{ ...FONT.bodyMBold, color: T.brandBlue }}>📘 {guide.categoryLabel}</p>
        <div className="flex flex-col gap-[8px] w-full">
          <p className="break-words" style={{ ...FONT.headlineBold, color: T.navy }}>{guide.title}</p>
          <div className="flex flex-col gap-[12px] w-full">
            {guide.snippet && <p className="break-words line-clamp-2" style={{ ...FONT.bodyM, color: T.helper }}>{guide.snippet}</p>}
            <span className="flex items-center gap-[4px]">
              <span className="underline underline-offset-[3px]" style={{ ...FONT.bodyM, color: T.link }}>전체 가이드 보기</span>
              <MIcon name="open_in_new" size={24} color={T.link} />
            </span>
          </div>
        </div>
      </button>
    </div>
  )
}

// ─── 첨부 파일 칩 ────────────────────────────────────────────────────────
function FileChip({ name, onRemove }) {
  return (
    <div className="w-full flex items-center gap-[4px] px-[16px] py-[8px] rounded-[2px]" style={{ backgroundColor: T.surfaceHover }}>
      <span className="flex-1 min-w-0 truncate" style={{ fontSize: '18px', lineHeight: '32px', color: T.ink, ...FONT.ss }}>{name}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="첨부 삭제" style={{ color: T.ink }}>
          <XIcon size={22} stroke={2.2} />
        </button>
      )}
    </div>
  )
}

// ─── 인라인 폼 (텍스트 + 첨부) — 버튼은 하단 고정바 ──────────────────────
function InlineForm({ m, chatbot }) {
  const fileRef = useRef(null)
  const textareaRef = useRef(null)
  const isActive = chatbot.activeForm?.id === m.id && !m.done
  useEffect(() => { if (isActive) textareaRef.current?.focus() }, [isActive])
  const copy = FORM_COPY[m.kind] || FORM_COPY.solution
  const helper = <p style={{ ...FONT.bodyM, color: T.helper }}>이미지만 첨부 가능 / 최대 2개 / 각 1MB 이하</p>

  if (m.done) {
    return (
      <div className="flex flex-col gap-[8px] w-full opacity-90">
        <div className="w-full rounded-[4px] p-[16px]" style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
          <p className="whitespace-pre-wrap break-words" style={{ ...FONT.bodyL, color: T.ink }}>{m.submittedText}</p>
        </div>
        {(m.submittedFiles || []).map((name, i) => <FileChip key={i} name={name} />)}
        {helper}
      </div>
    )
  }
  if (!isActive) return null

  return (
    <div className="flex flex-col gap-[8px] w-full">
      <textarea
        ref={textareaRef}
        value={chatbot.formText}
        onChange={(e) => chatbot.setFormText(e.target.value)}
        placeholder={copy.placeholder}
        className="w-full rounded-[4px] p-[16px] resize-none outline-none placeholder:text-[rgba(22,22,22,0.32)]"
        style={{ minHeight: 160, backgroundColor: T.white, border: `1px solid ${T.border}`, ...FONT.bodyL, color: T.ink }}
      />
      {chatbot.formFiles.map((f, i) => <FileChip key={i} name={f.name} onRemove={() => chatbot.removeFile(i)} />)}
      {chatbot.formFiles.length < ATTACH_LIMIT.maxCount && (
        <button type="button" onClick={() => fileRef.current?.click()} className="w-full flex items-center gap-[4px] px-[20px] py-[8px] rounded-[2px] transition-colors hover:bg-[#FAFAFA]" style={{ backgroundColor: T.white, border: `1px solid ${T.borderStrong}` }}>
          <span className="flex-1 text-center" style={{ ...BTN, color: T.ink }}>이미지 첨부하기</span>
          <MIcon name="add" size={24} color={T.ink} />
        </button>
      )}
      <input ref={fileRef} type="file" accept={ATTACH_LIMIT.accept} multiple hidden onChange={(e) => chatbot.addFiles(e.target.files)} />
      {helper}
      {chatbot.fileError && <p style={{ ...FONT.bodyM, color: T.error }}>{chatbot.fileError}</p>}
    </div>
  )
}

// ─── 하단 고정바: 취소 / 보내기 ──────────────────────────────────────────
function FormActionBar({ canSubmit, onCancel, onSubmit }) {
  return (
    <div className="shrink-0 flex items-center justify-between px-[16px] py-[16px]" style={{ backgroundColor: T.white, borderTop: `1px solid ${T.border}` }}>
      <button type="button" onClick={onCancel} className="flex items-center justify-center px-[32px] py-[16px] rounded-[32px] transition-colors hover:bg-[#FAFAFA]" style={{ backgroundColor: T.white, border: `1px solid ${T.borderStrong}` }}>
        <span style={{ ...BTN, color: T.ink }}>취소</span>
      </button>
      <button type="button" onClick={onSubmit} disabled={!canSubmit} className="flex items-center justify-center gap-[4px] pl-[32px] pr-[28px] py-[16px] rounded-[32px] transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed" style={{ backgroundColor: canSubmit ? T.navy : T.disabled }}>
        <span style={{ ...BTN, color: canSubmit ? T.inkOnColor : T.placeholder }}>보내기</span>
        <MIcon name="send" size={28} color={canSubmit ? T.inkOnColor : T.placeholder} />
      </button>
    </div>
  )
}

// 자동완성에서 일치 부분 강조
function highlightMatch(text, q) {
  const query = (q || '').trim()
  if (!query) return text
  const i = text.toLowerCase().indexOf(query.toLowerCase())
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <span style={{ color: T.brandBlue, fontWeight: 600 }}>{text.slice(i, i + query.length)}</span>
      {text.slice(i + query.length)}
    </>
  )
}

// ─── 하단 검색바 (자유 입력 + FAQ 자동완성 + 키보드 탐색) ────────────────
function SearchBar({ onSearch, suggest, popular, onPickSuggestion }) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const inputRef = useRef(null)
  const isMobile = useIsMobile()
  const trimmed = text.trim()
  const list = open ? (trimmed ? suggest(text) : popular()) : []

  // 팝업 열리면 데스크탑 자동 포커스(모바일은 키보드 방지)
  useEffect(() => { if (!isMobile) inputRef.current?.focus() }, [isMobile])

  const submit = (v) => {
    const q = (v ?? text).trim()
    if (!q) return
    onSearch(q); setText(''); setOpen(false); inputRef.current?.focus()
  }
  const pick = (qa) => { setText(''); setOpen(false); onPickSuggestion(qa); inputRef.current?.focus() }
  const onKeyDown = (e) => {
    if (e.key === 'Escape' && open && list.length) { e.stopPropagation(); setOpen(false); return }
    if (!list.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % list.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + list.length) % list.length) }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(list[active]) }
  }

  return (
    <div className="shrink-0 p-[16px]" style={{ backgroundColor: T.white, borderTop: `1px solid ${T.border}` }}>
      <div className="relative">
        {list.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-2 rounded-[16px] overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-200" style={{ backgroundColor: T.white, boxShadow: T.shadowXl, border: `1px solid ${T.border}` }}>
            {!trimmed && <div className="px-[16px] pt-[12px] pb-[4px]" style={{ ...FONT.bodyM, color: T.helper }}>자주 찾는 항목</div>}
            {list.map((qa, i) => (
              <button
                key={qa.id}
                type="button"
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(qa)}
                className="w-full text-left p-[16px] transition-colors"
                style={{ borderTop: i === 0 ? 'none' : `1px solid ${T.border}`, backgroundColor: active === i ? '#F0F5FF' : T.white, ...FONT.bodyL, color: T.navy }}
              >
                {highlightMatch(qa.q.replace(/[?？]\s*$/, '') + '?', text)}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); submit() }}
          className="flex items-center gap-[8px] p-[8px] pl-[16px] rounded-[32px]"
          style={{ backgroundColor: T.white, border: `1px solid ${focused ? T.brandBlue : T.border}`, transition: 'border-color 150ms' }}
        >
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => { setText(e.target.value); setOpen(true); setActive(-1) }}
            onClick={() => { setOpen(true); setActive(-1) }}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); setOpen(false) }}
            onKeyDown={onKeyDown}
            placeholder={SEARCH_PLACEHOLDER}
            aria-label="FAQ 검색"
            className="flex-1 min-w-0 bg-transparent border-0 outline-none placeholder:text-[rgba(22,22,22,0.32)]"
            style={{ ...FONT.bodyL, color: T.ink }}
            autoComplete="off"
          />
          <button type="submit" aria-label="검색" className="shrink-0 flex items-center justify-center p-[12px] rounded-full transition-[filter,transform] hover:brightness-110 active:scale-95" style={{ backgroundColor: T.brandBlue }}>
            <MIcon name="search" size={24} color={T.inkOnColor} />
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── 메시지 렌더러 ───────────────────────────────────────────────────────
function ThreadMessage({ m, chatbot }) {
  switch (m.type) {
    case MSG_TYPES.GREETING:
      return <BotBubble text={GREETING} />
    case MSG_TYPES.CHIPS:
      return <ChipMenu onPick={chatbot.pickChip} />
    case MSG_TYPES.USER:
      return <UserBubble text={m.text} />
    case MSG_TYPES.TYPING:
      return <TypingIndicator />
    case MSG_TYPES.BOT:
      return <BotBubble text={m.text} answer={m.answer} link={m.link} onOpen={chatbot.openGuide} />
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
      return <InlineForm m={m} chatbot={chatbot} />
    default:
      return null
  }
}

// ─── 위젯 (팝업 — 모달 아님 · 바깥 클릭/런처/Esc 로 닫힘) ─────────────────
function ChatbotWidget({ chatbot }) {
  const isMobile = useIsMobile()
  const bodyRef = useRef(null)
  const panelRef = useRef(null)
  const { close } = chatbot

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' })
  }, [chatbot.messages, chatbot.activeForm])

  // 팝업: 바깥(런처 제외) 클릭 시 닫기
  useEffect(() => {
    const onDown = (e) => {
      const t = e.target
      if (
        panelRef.current &&
        !panelRef.current.contains(t) &&
        !(t instanceof Element && t.closest('[data-ams-fab]'))
      ) {
        close()
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [close])

  const widgetClass = isMobile
    ? 'fixed inset-0 z-40 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300'
    : 'fixed bottom-24 right-6 z-40 w-[512px] h-[960px] max-h-[calc(100dvh-7rem)] rounded-[16px] overflow-hidden flex flex-col origin-bottom-right animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300'

  return (
    <div ref={panelRef} role="dialog" aria-label="AMS 챗봇" className={widgetClass} style={{ backgroundColor: T.bg, boxShadow: isMobile ? 'none' : T.shadowXl }}>
      <WidgetHeader />
      <div ref={bodyRef} role="log" aria-live="polite" aria-relevant="additions" aria-label="AMS 챗봇 대화" className="flex-1 overflow-y-auto flex flex-col gap-[24px] px-[16px] py-[24px]" style={{ backgroundColor: T.bg }}>
        {chatbot.messages.map((m) => (
          <ThreadMessage key={m.id} m={m} chatbot={chatbot} />
        ))}
      </div>
      {chatbot.activeForm ? (
        <FormActionBar canSubmit={chatbot.canSubmit} onCancel={chatbot.cancelForm} onSubmit={chatbot.submitForm} />
      ) : (
        <SearchBar onSearch={chatbot.search} suggest={chatbot.faqSuggestions} popular={chatbot.popularSuggestions} onPickSuggestion={chatbot.pickSuggestion} />
      )}
    </div>
  )
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────
export function Chatbot({ userName = '명준', onOpenGuide }) {
  const faqList = useManagerFaq() // 실시간 FAQ(/api/faq, 번들 폴백)
  const chatbot = useChatbot({ userName, onOpenGuide, faqList })

  useEffect(() => {
    if (chatbot.isOpen) chatbot.markVisited()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatbot.isOpen])

  return (
    <>
      <ChatbotFAB onClick={chatbot.toggle} pulse={chatbot.isFirstVisit} open={chatbot.isOpen} />
      {chatbot.isOpen && <ChatbotWidget chatbot={chatbot} />}
    </>
  )
}

export default Chatbot
