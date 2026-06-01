// src/components/chatbot/Chatbot.jsx
// AMS 운영도우미 챗봇 — Figma v3-260601 "회의내용반영" 시나리오 1:1 반영
//
// 시안(6PSg6RlWrjpnNYk1zirmUp / 493-2)의 색·폰트·간격·아이콘·텍스트를 그대로 옮김:
//  - 위젯 480px · rounded-24 · shadow/xl · 콘텐츠 #EDF5FF
//  - 네이비 헤더(#001D6C) · 유저 말풍선 #0043CE · Pretendard 18/20/32px
//  - Material Symbols 아이콘(chatbotIcons) · QR pill 칩 · 가이드 카드
// 화면(view): onboarding · category · chat · form · complete  (useChatbot.js)

import { useState, useRef, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useChatbot, VIEWS, MSG_TYPES } from './useChatbot'
import { searchSuggestions } from './intents'
import { MIcon, BotAvatar } from './chatbotIcons'
import { T, FONT, CATEGORY_TILES, getCategoryLabel, getActiveNotice, FORM_COPY, ATTACH_LIMIT } from './chatbotConfig'

// 말풍선 라운딩 — 꼬리 코너만 직각 (Figma)
const R_BOT = '0px 16px 16px 16px' // 좌상단 직각 (아바타 쪽)
const R_USER = '16px 0px 16px 16px' // 우상단 직각

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
        aria-label="AMS 운영도우미 열기 (⌘+/)"
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
        {pulse && (
          <span className="absolute top-2.5 right-2.5 h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ backgroundColor: '#DA1E28' }} />
        )}
      </button>
    </>
  )
}

// ─── 헤더 ────────────────────────────────────────────────────────────────
function HeaderAction({ icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-[3px] opacity-95 hover:opacity-100 transition-opacity">
      <MIcon name={icon} size={24} color={T.inkOnColor} />
      <span className="whitespace-nowrap" style={{ ...FONT.bodyMBold, color: T.inkOnColor }}>{label}</span>
    </button>
  )
}

function WidgetHeader({ showHome, onHome, onError, onClose }) {
  return (
    <div className="shrink-0 flex items-center gap-[16px] px-[24px] py-[16px]" style={{ backgroundColor: T.navy }}>
      <div className="flex-1 flex items-center justify-between min-w-0">
        <div className="flex items-center gap-[8px] shrink-0">
          <span className="whitespace-nowrap" style={{ fontSize: '20px', lineHeight: '32px', color: T.inkOnColor, ...FONT.ss }}>
            <b style={{ fontWeight: 600 }}>AMS</b>
            <span style={{ fontWeight: 400 }}> 운영도우미</span>
          </span>
          <span
            className="flex items-center rounded-[4px] px-[6px] leading-none"
            style={{ backgroundColor: T.tealBg, border: `0.8px solid ${T.tealBorder}`, color: T.tealText, fontSize: '14px', fontWeight: 600, height: 22, ...FONT.ss }}
          >
            BETA
          </span>
        </div>
        <div className="flex items-center gap-[12px] shrink-0">
          {showHome && <HeaderAction icon="home" label="처음으로" onClick={onHome} />}
          <HeaderAction icon="bug_report" label="오류신고" onClick={onError} />
          <button type="button" onClick={onClose} aria-label="닫기 (Esc)" className="opacity-90 hover:opacity-100 transition-opacity" style={{ color: T.inkOnColor }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 웰컴 히어로 (온보딩) ────────────────────────────────────────────────
function WelcomeHero({ userName }) {
  return (
    <div className="shrink-0 flex flex-col gap-[8px] px-[24px] py-[32px]" style={{ backgroundColor: T.navy }}>
      <p style={{ ...FONT.title, color: T.inkOnColor }}>안녕하세요, {userName}님 👋</p>
      <p style={{ ...FONT.headline, color: T.inkOnColor, opacity: 0.6 }}>무엇을 도와드릴까요?</p>
    </div>
  )
}

// ─── 공지/긴급 배너 ──────────────────────────────────────────────────────
function NoticeBanner() {
  const n = getActiveNotice()
  if (!n) return null
  const emergency = n.level === 'emergency'
  return (
    <div
      className="shrink-0 w-full flex items-center gap-[8px] h-[48px] px-[16px]"
      style={{ backgroundColor: emergency ? T.redBg : T.tealBg, borderBottom: `1px solid ${emergency ? T.redBorder : T.tealBorder}` }}
    >
      <span className="w-[32px] text-center shrink-0" style={{ fontSize: '20px', lineHeight: '32px' }}>{n.emoji}</span>
      <span className="flex-1 min-w-0 truncate" style={{ ...FONT.bodyLBold, color: T.ink }}>{n.text}</span>
      <MIcon name="chevron_right" size={24} color="rgba(22,22,22,0.45)" />
    </div>
  )
}

// ─── 뒤로가기 링크 ───────────────────────────────────────────────────────
function BackLink({ label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-[4px] self-start">
      <MIcon name="arrow_back" size={28} color={T.ink} />
      <span className="underline underline-offset-[3px]" style={{ ...FONT.bodyL, color: T.ink }}>{label}</span>
    </button>
  )
}

// ─── 메뉴 타일 ───────────────────────────────────────────────────────────
function MenuTile({ id, label, icon, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex items-center gap-[12px] p-[8px] rounded-[16px] w-full text-left transition-transform duration-150"
      style={{ backgroundColor: T.white, boxShadow: T.shadowS, transform: hover ? 'translateY(-1px)' : 'none', outline: hover ? `1.5px solid ${T.chipBorder}` : '1.5px solid transparent' }}
    >
      <span className="shrink-0 flex items-center justify-center rounded-[8px]" style={{ width: 48, height: 48, backgroundColor: T.surface }}>
        <MIcon name={icon} size={26} color={T.navy} />
      </span>
      <span className="flex-1 min-w-0" style={{ ...FONT.bodyLBold, color: T.navy }}>{label}</span>
    </button>
  )
}

function CategoryGrid({ onPick }) {
  return (
    <div className="flex flex-col gap-[24px] p-[24px]">
      <p style={{ ...FONT.bodyL, color: T.ink }}>카테고리에서 찾기</p>
      <div className="grid grid-cols-2 gap-[16px]">
        {CATEGORY_TILES.map((c) => (
          <MenuTile key={c.id} {...c} onClick={onPick} />
        ))}
      </div>
    </div>
  )
}

// ─── 말풍선 ──────────────────────────────────────────────────────────────
function UserBubble({ text }) {
  return (
    <div className="flex justify-end w-full animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="px-[16px] py-[12px] max-w-[344px]" style={{ backgroundColor: T.brandBlue, borderRadius: R_USER }}>
        <p className="break-words [overflow-wrap:anywhere]" style={{ ...FONT.bodyLBold, color: T.inkOnColor }}>{text}</p>
      </div>
    </div>
  )
}

function BotBubble({ bubble }) {
  const lines = []
  if (bubble.lead) lines.push({ t: bubble.lead, w: 600 })
  ;(bubble.blocks || []).forEach((b) => lines.push({ t: b.text, w: 600, head: b.heading }))
  ;(bubble.notes || []).forEach((n) => lines.push({ t: n.startsWith('🔗') ? n : `※ ${n}`, w: 600, note: true }))
  return (
    <div className="px-[16px] py-[12px] max-w-[344px]" style={{ backgroundColor: T.white, borderRadius: R_BOT }}>
      <div className="flex flex-col">
        {lines.map((l, i) => (
          <p
            key={i}
            className="break-words [overflow-wrap:anywhere]"
            style={{ ...FONT.bodyL, fontWeight: l.w, color: l.note ? T.helper : T.ink, marginTop: i > 0 && (l.head || l.note) ? 8 : 0 }}
          >
            {l.t}
          </p>
        ))}
      </div>
    </div>
  )
}

// ─── 가이드 카드 ─────────────────────────────────────────────────────────
function GuideCard({ guide, onOpen }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={() => onOpen?.(guide)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-col gap-[16px] p-[16px] max-w-[344px] w-full text-left transition-shadow"
      style={{ backgroundColor: T.white, borderRadius: R_BOT, outline: hover ? `1.5px solid ${T.chipBorder}` : '1.5px solid transparent' }}
    >
      <p style={{ ...FONT.bodyMBold, color: T.brandBlue }}>📘 {guide.categoryLabel}</p>
      <div className="flex flex-col gap-[8px] w-full">
        <p className="break-words" style={{ ...FONT.headlineBold, color: T.navy }}>{guide.title}</p>
        <div className="flex flex-col gap-[12px] w-full">
          {guide.snippet && (
            <p className="break-words line-clamp-2" style={{ ...FONT.bodyM, color: T.helper }}>{guide.snippet}</p>
          )}
          <span className="flex items-center gap-[4px]">
            <span className="underline underline-offset-[3px]" style={{ ...FONT.bodyM, color: T.link }}>전체 가이드 보기</span>
            <MIcon name="open_in_new" size={24} color={T.link} />
          </span>
        </div>
      </div>
    </button>
  )
}

// ─── 기본 버튼 (네이비) ──────────────────────────────────────────────────
function PrimaryButton({ children, onClick, icon, full, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn('flex items-center justify-center gap-[4px] px-[32px] py-[16px] rounded-[16px] transition-all duration-150 hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed', full && 'w-full max-w-[344px]')}
      style={{ backgroundColor: T.navy }}
    >
      {icon && <MIcon name={icon} size={24} color={T.inkOnColor} />}
      <span style={{ ...FONT.bodyLBold, color: T.inkOnColor }}>{children}</span>
    </button>
  )
}

// ─── QR 칩 ───────────────────────────────────────────────────────────────
function Chip({ label, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="px-[20px] py-[8px] rounded-[24px] transition-colors duration-150"
      style={{ backgroundColor: hover ? T.contentBg : T.white, border: `1px solid ${T.chipBorder}`, boxShadow: T.shadowS }}
    >
      <span style={{ ...FONT.bodyLBold, color: T.brandBlue }}>{label}</span>
    </button>
  )
}

function ChipRow({ title, chips, onPick }) {
  if (!chips?.length) return null
  return (
    <div className="flex flex-col gap-[16px] items-center w-full">
      {title && <p className="w-full" style={{ ...FONT.bodyM, color: T.textSecondary }}>{title}</p>}
      <div className="flex flex-wrap gap-[8px] w-full">
        {chips.map((c, i) => (
          <Chip key={i} label={c} onClick={() => onPick(c)} />
        ))}
      </div>
    </div>
  )
}

// ─── 봇 답변 (아바타 + 말풍선 + 가이드/버튼/칩) ──────────────────────────
function BotMessage({ answer, onOpenGuide, onAction, onPick }) {
  return (
    <div className="flex flex-col gap-[32px] w-full animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex gap-[8px] w-full">
        <BotAvatar />
        <div className="flex-1 min-w-0 flex flex-col items-start" style={{ gap: answer.guide ? 8 : 16 }}>
          <BotBubble bubble={answer.bubble} />
          {answer.guide && <GuideCard guide={answer.guide} onOpen={onOpenGuide} />}
          {answer.action && <PrimaryButton full onClick={() => onAction(answer.action)}>{answer.action.label}</PrimaryButton>}
        </div>
      </div>
      {answer.chips && <ChipRow title={answer.chipsTitle} chips={answer.chips} onPick={onPick} />}
    </div>
  )
}

// ─── 타이핑 ──────────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-[8px] items-end">
      <BotAvatar />
      <div className="inline-flex items-center gap-[6px] px-[16px] py-[14px]" style={{ backgroundColor: T.white, borderRadius: R_BOT }}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 rounded-full animate-bounce" style={{ backgroundColor: T.helper, animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }} />
        ))}
      </div>
    </div>
  )
}

// ─── 서브메뉴 (카테고리 상세 FAQ) ────────────────────────────────────────
function SubMenuList({ categoryId, items, onPick }) {
  return (
    <div className="flex gap-[8px] w-full">
      <BotAvatar />
      <div className="flex-1 min-w-0 flex flex-col gap-[16px]">
        <BotBubble bubble={{ lead: `${getCategoryLabel(categoryId)}에서 자주 찾는 항목이에요.`, blocks: [{ text: '관련 문의 내용을 선택해 주세요.' }] }} />
        <div className="rounded-[16px] overflow-hidden w-full" style={{ boxShadow: T.shadowS }}>
          {items.map((qa, i) => (
            <button
              key={qa.id}
              type="button"
              onClick={() => onPick(qa)}
              className="w-full flex items-center gap-[16px] p-[16px] text-left transition-colors hover:bg-[#EDF5FF]"
              style={{ backgroundColor: T.white, borderBottom: i === items.length - 1 ? 'none' : `1px solid ${T.border}` }}
            >
              <span className="flex-1 min-w-0 break-words" style={{ ...FONT.bodyLBold, color: T.navy }}>
                {qa.q.replace(/[?？]\s*$/, '')}?
              </span>
              <MIcon name="chevron_right" size={24} color="rgba(22,22,22,0.3)" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── 입력 바 (Figma Inp: 텍스트 + 우하단 전송 버튼) ──────────────────────
function InputBar({ onSend }) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [showSug, setShowSug] = useState(true)
  const inputRef = useRef(null)
  const suggestions = useMemo(() => (text.trim().length >= 2 ? searchSuggestions(text, 4) : []), [text])
  const active = !!text.trim()

  const submit = (value) => {
    const v = (value ?? text).trim()
    if (!v) return
    onSend(v)
    setText('')
    setShowSug(false)
    inputRef.current?.focus()
  }

  return (
    <div className="shrink-0 p-[24px]" style={{ backgroundColor: T.contentBg }}>
      <div className="relative">
        {showSug && suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-2 rounded-[16px] overflow-hidden" style={{ backgroundColor: T.white, boxShadow: T.shadowXl, border: `1px solid ${T.border}` }}>
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => submit(s.text)}
                className="w-full text-left px-[16px] py-[10px] transition-colors hover:bg-[#EDF5FF]"
                style={{ borderTop: `1px solid ${T.border}`, ...FONT.bodyM, color: T.ink }}
              >
                {s.text}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); submit() }}
          className="flex flex-col gap-[16px] p-[16px] rounded-[16px]"
          style={{ backgroundColor: T.white, border: `1px solid ${focused ? T.brandBlue : T.border}`, transition: 'border-color 150ms' }}
        >
          <div className="flex items-center gap-[2px] w-full">
            <span className="w-px h-[24px] shrink-0" style={{ backgroundColor: T.ink }} />
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => { setText(e.target.value); setShowSug(true) }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="무엇이든 물어보세요."
              aria-label="질문 입력"
              className="flex-1 bg-transparent border-0 outline-none placeholder:text-[rgba(22,22,22,0.32)]"
              style={{ ...FONT.bodyL, color: T.ink }}
              autoComplete="off"
            />
          </div>
          <div className="flex justify-end w-full">
            <button
              type="submit"
              disabled={!active}
              aria-label="전송"
              className="flex items-center justify-center p-[12px] rounded-[8px] transition-colors disabled:cursor-not-allowed"
              style={{ backgroundColor: active ? T.brandBlue : T.disabled }}
            >
              <MIcon name="arrow_upward" size={24} color={active ? T.inkOnColor : T.placeholder} />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── 요청 폼 (문의/해결요청/오류신고) ────────────────────────────────────
function RequestForm({ type, onBack, onSubmit }) {
  const copy = FORM_COPY[type] || FORM_COPY.inquiry
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

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: T.contentBg }}>
      <div className="flex flex-col gap-[24px] p-[24px] min-h-full">
        <BackLink label="돌아가기" onClick={onBack} />
        <div className="flex flex-col gap-[8px]">
          <h2 style={{ ...FONT.title, color: T.ink }}>{copy.title}</h2>
          <p style={{ ...FONT.bodyL, color: T.helper }}>{copy.subtitle}</p>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={copy.placeholder}
          className="w-full rounded-[16px] p-[16px] resize-none outline-none placeholder:text-[rgba(22,22,22,0.32)]"
          style={{ minHeight: 260, backgroundColor: T.white, border: `1px solid ${T.border}`, ...FONT.bodyL, color: T.ink }}
        />

        <div className="flex flex-col gap-[8px]">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-[6px] rounded-[16px] py-[12px] transition-colors hover:bg-[#EDF5FF]"
            style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
          >
            <span style={{ ...FONT.bodyLBold, color: T.ink }}>이미지 첨부하기</span>
            <MIcon name="add" size={24} color={T.ink} />
          </button>
          <input ref={fileRef} type="file" accept={ATTACH_LIMIT.accept} multiple hidden onChange={(e) => onFiles(e.target.files)} />
          <p style={{ ...FONT.bodyM, color: T.helper }}>이미지만 첨부 가능 / 최대 2개 / 각 1MB 이하</p>
          {files.length > 0 && (
            <div className="flex flex-wrap gap-[8px] mt-1">
              {files.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full pl-3 pr-2 py-1" style={{ backgroundColor: T.white, border: `1px solid ${T.chipBorder}`, ...FONT.bodyM, color: T.brandBlue }}>
                  <span className="max-w-[160px] truncate">{f.name}</span>
                  <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="첨부 삭제">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
                  </button>
                </span>
              ))}
            </div>
          )}
          {err && <p style={{ ...FONT.bodyM, color: T.redText }}>{err}</p>}
        </div>

        <div className="flex flex-col gap-[16px] mt-auto pt-[8px]">
          <button
            type="button"
            disabled={!text.trim()}
            onClick={onSubmit}
            className="w-full flex items-center justify-center gap-[4px] rounded-[16px] py-[16px] transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: T.navy }}
          >
            <span style={{ ...FONT.bodyLBold, color: T.inkOnColor }}>{copy.submit}</span>
            <MIcon name="send" size={24} color={T.inkOnColor} />
          </button>
          {copy.note && <p style={{ ...FONT.bodyM, color: T.helper }}>• {copy.note}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── 접수완료 ────────────────────────────────────────────────────────────
function CompleteScreen({ onHome }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-[24px] gap-[16px]" style={{ backgroundColor: T.contentBg }}>
      <span className="flex items-center justify-center rounded-full animate-in zoom-in duration-300" style={{ width: 48, height: 48, backgroundColor: T.success }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <h2 style={{ ...FONT.title, color: T.ink }}>접수됐어요!</h2>
      <p style={{ ...FONT.bodyL, color: T.helper }}>
        담당자 확인 후 문자/이메일로 회신드려요.
        <br />
        챗봇으로 다시 오지 않으셔도 됩니다.
      </p>
      <button type="button" onClick={onHome} className="mt-[8px] flex items-center justify-center gap-[6px] px-[24px] py-[16px] rounded-[16px] transition-all hover:brightness-110 active:scale-[0.99]" style={{ backgroundColor: T.navy }}>
        <MIcon name="home" size={24} color={T.inkOnColor} />
        <span style={{ ...FONT.bodyLBold, color: T.inkOnColor }}>홈으로</span>
      </button>
    </div>
  )
}

// ─── 위젯 (뷰 라우터) ────────────────────────────────────────────────────
function ChatbotWidget({ chatbot, onOpenGuide }) {
  const isMobile = useIsMobile()
  const bodyRef = useRef(null)
  const { view } = chatbot

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [chatbot.messages, view])

  const widgetClass = isMobile
    ? 'fixed inset-0 z-50 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300'
    : 'fixed bottom-4 right-4 z-50 w-[480px] h-[860px] max-h-[calc(100dvh-2rem)] rounded-[24px] overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300'

  const isThread = view === VIEWS.ONBOARDING || view === VIEWS.CATEGORY || view === VIEWS.CHAT

  const handleOpenGuide = (guide) => {
    if (guide?.url) {
      if (/^https?:\/\//.test(guide.url)) window.open(guide.url, '_blank', 'noopener')
      else window.location.assign(guide.url)
    } else onOpenGuide?.(guide)
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="AMS 운영도우미 챗봇" className={widgetClass} style={{ backgroundColor: T.contentBg, boxShadow: isMobile ? 'none' : T.shadowXl }}>
      {isThread && (
        <WidgetHeader showHome={view !== VIEWS.ONBOARDING} onHome={chatbot.goHome} onError={() => chatbot.openForm('error')} onClose={chatbot.close} />
      )}

      {/* 카테고리·채팅은 배너를 헤더 아래 고정 (Figma) / 온보딩은 웰컴 뒤 스크롤 영역에 */}
      {(view === VIEWS.CATEGORY || view === VIEWS.CHAT) && <NoticeBanner />}

      {isThread && (
        <div ref={bodyRef} className="flex-1 overflow-y-auto flex flex-col" style={{ backgroundColor: T.contentBg }}>
          {view === VIEWS.ONBOARDING && <WelcomeHero userName={chatbot.userName} />}
          {view === VIEWS.ONBOARDING && <NoticeBanner />}

          {view === VIEWS.ONBOARDING && <CategoryGrid onPick={chatbot.openCategory} />}

          {view === VIEWS.CATEGORY && (
            <div className="flex flex-col gap-[24px] p-[24px]">
              <BackLink label="전체 카테고리" onClick={chatbot.backToCategories} />
              <SubMenuList categoryId={chatbot.activeCategory} items={chatbot.submenu} onPick={chatbot.askQa} />
            </div>
          )}

          {view === VIEWS.CHAT && (
            <div className="flex flex-col gap-[32px] p-[24px]">
              {chatbot.messages.map((m) => {
                if (m.role === MSG_TYPES.USER) return <UserBubble key={m.id} text={m.text} />
                if (m.role === MSG_TYPES.TYPING) return <TypingIndicator key={m.id} />
                return <BotMessage key={m.id} answer={m.answer} onOpenGuide={handleOpenGuide} onAction={chatbot.runAction} onPick={chatbot.ask} />
              })}
            </div>
          )}
        </div>
      )}

      {isThread && <InputBar onSend={chatbot.ask} />}

      {view === VIEWS.FORM && <RequestForm type={chatbot.formType} onBack={chatbot.backFromForm} onSubmit={chatbot.submitForm} />}
      {view === VIEWS.COMPLETE && <CompleteScreen onHome={chatbot.goHome} />}
    </div>
  )
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────
export function Chatbot({ contextKey = 'home', userName = '명준', onOpenGuide }) {
  const chatbot = useChatbot({ contextKey, userName })

  useEffect(() => {
    if (chatbot.isOpen) chatbot.markVisited()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatbot.isOpen])

  return (
    <>
      {!chatbot.isOpen && <ChatbotFAB onClick={chatbot.open} pulse={chatbot.isFirstVisit} />}
      {chatbot.isOpen && <ChatbotWidget chatbot={chatbot} onOpenGuide={onOpenGuide} />}
    </>
  )
}

export default Chatbot
