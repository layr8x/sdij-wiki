// src/components/chatbot/Chatbot.jsx
// AMS 운영도우미 챗봇 — Figma v3-260601 "회의내용반영" 시나리오 전면 반영
//
// 디자인 시스템 (IBM Carbon 매핑):
//  - 네이비 #001D6C(헤더·웰컴·기본 버튼) · 브랜드 블루 #0043CE(유저 말풍선·칩)
//  - 콘텐츠 배경 #EDF5FF · 테얼 공지 / 레드 긴급 배너 · Pretendard
//  - 둥근 모서리: 위젯 24px · 카드/버튼/말풍선 16px · 아이콘칩 8px · 칩 pill
//
// 화면(view): onboarding · category · chat · form · complete  (useChatbot.js)
// 사용법:  <Chatbot contextKey="home" userName="명준" onOpenGuide={fn} />

import { useState, useRef, useEffect, useMemo } from 'react'
import {
  ChatCircleDots,
  X,
  House,
  Bug,
  ArrowLeft,
  CaretRight,
  ArrowUp,
  ArrowSquareOut,
  Check,
  Plus,
  PaperPlaneRight,
  LockKey,
  Receipt,
  CreditCard,
  UserPlus,
  CalendarCheck,
  IdentificationCard,
  GraduationCap,
  Bell,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useChatbot, VIEWS, MSG_TYPES } from './useChatbot'
import { searchSuggestions } from './intents'
import {
  T,
  FONT,
  CATEGORY_TILES,
  getCategoryLabel,
  getActiveNotice,
  FORM_COPY,
  ATTACH_LIMIT,
} from './chatbotConfig'

// ─── 반응형 (모바일 풀스크린 분기) ───────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isMobile
}

// ─── 카테고리 아이콘 맵 ──────────────────────────────────────────────────
const CATEGORY_ICONS = {
  lock: LockKey,
  receipt: Receipt,
  card: CreditCard,
  userplus: UserPlus,
  calendar: CalendarCheck,
  idcard: IdentificationCard,
  cap: GraduationCap,
  bell: Bell,
}

// ─── 봇 아바타 (Figma: light-blue 원형 + 화이트 스마일) ───────────────────
function BotAvatar({ size = 32 }) {
  return (
    <div
      className="shrink-0 rounded-full flex items-center justify-center"
      style={{ width: size, height: size, backgroundColor: T.avatarBg }}
      aria-hidden
    >
      <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 24 24" fill="none">
        <circle cx="8.5" cy="10" r="1.4" fill="#fff" />
        <circle cx="15.5" cy="10" r="1.4" fill="#fff" />
        <path
          d="M8 14.2c1.1 1.2 2.5 1.8 4 1.8s2.9-.6 4-1.8"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

// ─── FAB (네이비 + 호버 펄스) ────────────────────────────────────────────
function ChatbotFAB({ onClick, pulse }) {
  const isMobile = useIsMobile()
  return (
    <>
      <style>{`
        @keyframes ams-fab-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(0,67,206,0.40), 0 8px 24px rgba(0,0,0,0.18); }
          50%     { box-shadow: 0 0 0 12px rgba(0,67,206,0), 0 8px 24px rgba(0,0,0,0.18); }
        }
        .ams-fab-pulse { animation: ams-fab-pulse 2.4s ease-out infinite; }
        @media (prefers-reduced-motion: reduce){ .ams-fab-pulse{ animation:none; } }
      `}</style>
      <button
        type="button"
        onClick={onClick}
        aria-label="AMS 운영도우미 열기 (⌘+/)"
        className={cn(
          'fixed z-50 rounded-full flex items-center justify-center text-white',
          'shadow-lg hover:shadow-xl transition-all duration-200 ease-out hover:scale-105 active:scale-95',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200',
          isMobile ? 'bottom-5 right-5 h-14 w-14' : 'bottom-6 right-6 h-14 w-14',
          pulse && 'ams-fab-pulse'
        )}
        style={{ backgroundColor: T.navy }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = T.navyHover)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = T.navy)}
      >
        <ChatCircleDots size={26} weight="fill" />
        {pulse && (
          <span
            className="absolute top-2.5 right-2.5 h-2.5 w-2.5 rounded-full ring-2 ring-white"
            style={{ backgroundColor: '#DA1E28' }}
            aria-hidden
          />
        )}
      </button>
    </>
  )
}

// ─── 헤더 액션 (처음으로 / 오류신고) ─────────────────────────────────────
function HeaderAction({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-md opacity-90 hover:opacity-100 transition-opacity"
      style={{ color: T.inkOnColor }}
    >
      <Icon size={18} weight="fill" />
      <span className="whitespace-nowrap" style={{ fontSize: '14px', fontWeight: 600, ...FONT.ss }}>{label}</span>
    </button>
  )
}

// ─── WidgetHeader (네이비) ───────────────────────────────────────────────
function WidgetHeader({ showHome, onHome, onError, onClose }) {
  return (
    <div
      className="shrink-0 flex items-center gap-2 px-4 py-3.5"
      style={{ backgroundColor: T.navy }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="whitespace-nowrap shrink-0" style={{ color: T.inkOnColor, fontSize: '19px', ...FONT.ss }}>
          <b style={{ fontWeight: 600 }}>AMS</b>
          <span style={{ fontWeight: 400 }}> 운영도우미</span>
        </span>
        <span
          className="rounded-[4px] px-1.5 leading-none flex items-center"
          style={{
            backgroundColor: T.tealBg,
            border: `0.8px solid ${T.tealBorder}`,
            color: T.tealText,
            fontSize: FONT.caption,
            fontWeight: 600,
            height: 22,
            ...FONT.ss,
          }}
        >
          BETA
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {showHome && <HeaderAction icon={House} label="처음으로" onClick={onHome} />}
        <HeaderAction icon={Bug} label="오류신고" onClick={onError} />
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기 (Esc)"
          className="ml-0.5 h-7 w-7 rounded-md flex items-center justify-center opacity-80 hover:opacity-100 hover:bg-white/10 transition-all"
          style={{ color: T.inkOnColor }}
        >
          <X size={20} />
        </button>
      </div>
    </div>
  )
}

// ─── 웰컴 히어로 (온보딩) ────────────────────────────────────────────────
function WelcomeHero({ userName }) {
  return (
    <div className="shrink-0 px-6 pt-6 pb-7 flex flex-col gap-2" style={{ backgroundColor: T.navy }}>
      <p style={{ color: T.inkOnColor, fontSize: FONT.title, lineHeight: FONT.titleLh, fontWeight: 600, ...FONT.ss }}>
        안녕하세요, {userName}님 👋
      </p>
      <p style={{ color: T.inkOnColor, opacity: 0.6, fontSize: FONT.headline, lineHeight: FONT.headlineLh, ...FONT.ss }}>
        무엇을 도와드릴까요?
      </p>
    </div>
  )
}

// ─── 공지/긴급 배너 ──────────────────────────────────────────────────────
function NoticeBanner() {
  const notice = getActiveNotice()
  if (!notice) return null
  const emergency = notice.level === 'emergency'
  return (
    <button
      type="button"
      className="shrink-0 w-full flex items-center gap-2 px-4 h-12 text-left transition-colors"
      style={{
        backgroundColor: emergency ? T.redBg : T.tealBg,
        borderBottom: `1px solid ${emergency ? T.redBorder : T.tealBorder}`,
      }}
    >
      <span style={{ fontSize: FONT.headline }}>{notice.emoji}</span>
      <span
        className="flex-1 min-w-0 truncate"
        style={{ color: T.ink, fontSize: FONT.bodyL, fontWeight: 600, ...FONT.ss }}
      >
        {notice.text}
      </span>
      <CaretRight size={20} style={{ color: T.ink, opacity: 0.5 }} />
    </button>
  )
}

// ─── 뒤로가기 링크 ───────────────────────────────────────────────────────
function BackLink({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 group"
      style={{ color: T.ink }}
    >
      <ArrowLeft size={20} />
      <span className="underline underline-offset-4 decoration-from-font" style={{ fontSize: FONT.bodyL, ...FONT.ss }}>
        {label}
      </span>
    </button>
  )
}

// ─── 메뉴 타일 (카테고리 그리드) ─────────────────────────────────────────
function MenuTile({ id, label, icon, onClick }) {
  const Icon = CATEGORY_ICONS[icon] || ChatCircleDots
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex items-center gap-3 p-2 rounded-[16px] text-left transition-all duration-150 w-full"
      style={{
        backgroundColor: T.white,
        boxShadow: T.shadowS,
        transform: hover ? 'translateY(-1px)' : 'none',
        outline: hover ? `1.5px solid ${T.chipBorder}` : '1.5px solid transparent',
      }}
    >
      <span
        className="shrink-0 flex items-center justify-center rounded-[8px]"
        style={{ width: 48, height: 48, backgroundColor: T.surface }}
      >
        <Icon size={26} weight="duotone" style={{ color: T.navy }} />
      </span>
      <span className="flex-1 min-w-0" style={{ color: T.navy, fontSize: FONT.bodyL, fontWeight: 600, ...FONT.ss }}>
        {label}
      </span>
    </button>
  )
}

function CategoryGrid({ onPick }) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <p style={{ color: T.ink, fontSize: FONT.bodyL, ...FONT.ss }}>카테고리에서 찾기</p>
      <div className="grid grid-cols-2 gap-4">
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
      <div
        className="max-w-[82%] px-4 py-3 rounded-[16px] rounded-tr-[2px]"
        style={{ backgroundColor: T.brandBlue, color: T.inkOnColor, fontSize: FONT.bodyL, lineHeight: FONT.bodyLLh, fontWeight: 600, ...FONT.ss }}
      >
        <span className="break-words [overflow-wrap:anywhere]">{text}</span>
      </div>
    </div>
  )
}

function BotBubbleBody({ bubble }) {
  return (
    <div style={{ fontSize: FONT.bodyL, lineHeight: FONT.bodyLLh, ...FONT.ss }}>
      {bubble.lead && (
        <p style={{ color: T.ink, fontWeight: 600 }} className="break-words">
          {bubble.lead}
        </p>
      )}
      {bubble.blocks?.length > 0 && (
        <div className="mt-1.5 flex flex-col gap-0.5">
          {bubble.blocks.map((b, i) => (
            <p
              key={i}
              className="break-words"
              style={{ color: T.ink, fontWeight: b.heading ? 600 : 400, marginTop: b.heading ? 6 : 0 }}
            >
              {b.text}
            </p>
          ))}
        </div>
      )}
      {bubble.notes?.length > 0 && (
        <div className="mt-2 flex flex-col gap-0.5">
          {bubble.notes.map((n, i) => (
            <p key={i} className="break-words" style={{ color: T.helper, fontSize: FONT.bodyM, lineHeight: FONT.bodyMLh }}>
              {n.startsWith('🔗') ? n : `※ ${n}`}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 가이드 카드 (전체 가이드 보기) ──────────────────────────────────────
function GuideCard({ guide, onOpen }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={() => onOpen?.(guide)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="w-full text-left rounded-[16px] p-4 flex flex-col gap-1.5 transition-all duration-150"
      style={{
        backgroundColor: T.white,
        boxShadow: T.shadowS,
        outline: hover ? `1.5px solid ${T.chipBorder}` : '1.5px solid transparent',
      }}
    >
      <span style={{ color: T.chipText, fontSize: FONT.bodyM, fontWeight: 600, ...FONT.ss }}>
        {guide.categoryEmoji} {guide.categoryLabel}
      </span>
      <span className="break-words" style={{ color: T.ink, fontSize: FONT.bodyL, fontWeight: 600, lineHeight: FONT.bodyLLh, ...FONT.ss }}>
        {guide.title}
      </span>
      {guide.snippet && (
        <span
          className="break-words line-clamp-2"
          style={{ color: T.helper, fontSize: FONT.bodyM, lineHeight: FONT.bodyMLh, ...FONT.ss }}
        >
          {guide.snippet}
        </span>
      )}
      <span className="inline-flex items-center gap-1 mt-0.5" style={{ color: T.linkBlue, fontSize: FONT.bodyM, fontWeight: 600, ...FONT.ss }}>
        <span className="underline underline-offset-4">전체 가이드 보기</span>
        <ArrowSquareOut size={16} weight="bold" />
      </span>
    </button>
  )
}

// ─── 기본 버튼 (네이비, 풀폭) ────────────────────────────────────────────
function PrimaryButton({ children, onClick, icon: Icon, disabled, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center justify-center gap-2 rounded-[16px] px-8 py-3.5 transition-all duration-150',
        'hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed',
        className
      )}
      style={{ backgroundColor: T.navy, color: T.inkOnColor, fontSize: FONT.bodyL, fontWeight: 600, ...FONT.ss }}
    >
      {Icon && <Icon size={20} weight="fill" />}
      {children}
    </button>
  )
}

// ─── QR 칩 행 (연관/재확인) ──────────────────────────────────────────────
function ChipRow({ title, chips, onPick }) {
  if (!chips?.length) return null
  return (
    <div className="flex flex-col gap-3 w-full">
      {title && <p style={{ color: T.textSecondary, fontSize: FONT.bodyM, ...FONT.ss }}>{title}</p>}
      <div className="flex flex-wrap gap-2">
        {chips.map((c, i) => (
          <Chip key={i} label={c} onClick={() => onPick(c)} />
        ))}
      </div>
    </div>
  )
}

function Chip({ label, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="rounded-full px-5 py-2 transition-all duration-150"
      style={{
        backgroundColor: hover ? T.contentBg : T.chipBg,
        border: `1px solid ${hover ? T.chipText : T.chipBorder}`,
        color: T.chipText,
        fontSize: FONT.bodyL,
        fontWeight: 600,
        boxShadow: T.shadowS,
        ...FONT.ss,
      }}
    >
      {label}
    </button>
  )
}

// ─── 봇 답변 (아바타 + 말풍선 + 가이드/버튼/칩) ──────────────────────────
function BotMessage({ answer, onOpenGuide, onAction, onPick }) {
  return (
    <div className="flex gap-2 w-full animate-in fade-in slide-in-from-bottom-1 duration-300">
      <BotAvatar />
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="self-start max-w-[88%]">
          <div
            className="px-4 py-3 rounded-[16px] rounded-tl-[2px]"
            style={{ backgroundColor: T.white, boxShadow: T.shadowS }}
          >
            <BotBubbleBody bubble={answer.bubble} />
          </div>
        </div>
        {answer.guide && <GuideCard guide={answer.guide} onOpen={onOpenGuide} />}
        {answer.action && (
          <PrimaryButton onClick={() => onAction(answer.action)}>{answer.action.label}</PrimaryButton>
        )}
        {answer.chips && (
          <div className="pt-2">
            <ChipRow title={answer.chipsTitle} chips={answer.chips} onPick={onPick} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 타이핑 인디케이터 ───────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-2 items-end">
      <BotAvatar />
      <div
        className="inline-flex items-center gap-1.5 px-4 py-3.5 rounded-[16px] rounded-tl-[2px]"
        style={{ backgroundColor: T.white, boxShadow: T.shadowS }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full animate-bounce"
            style={{ backgroundColor: T.helper, animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── 서브메뉴 (카테고리 상세 FAQ 목록) ───────────────────────────────────
function SubMenuList({ categoryId, items, onPick }) {
  return (
    <div className="flex gap-2 w-full">
      <BotAvatar />
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="self-start max-w-[88%]">
          <div className="px-4 py-3 rounded-[16px] rounded-tl-[2px]" style={{ backgroundColor: T.white, boxShadow: T.shadowS }}>
            <p style={{ color: T.ink, fontSize: FONT.bodyL, lineHeight: FONT.bodyLLh, fontWeight: 600, ...FONT.ss }}>
              {getCategoryLabel(categoryId)}에서 자주 찾는 항목이에요.
              <br />
              관련 문의 내용을 선택해 주세요.
            </p>
          </div>
        </div>
        <div className="rounded-[16px] overflow-hidden" style={{ backgroundColor: T.white, boxShadow: T.shadowS }}>
          {items.map((qa, i) => (
            <button
              key={qa.id}
              type="button"
              onClick={() => onPick(qa)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#EDF5FF]"
              style={{ borderTop: i === 0 ? 'none' : `1px solid ${T.border}` }}
            >
              <span className="flex-1 min-w-0 break-words" style={{ color: T.navy, fontSize: FONT.bodyL, fontWeight: 600, lineHeight: FONT.bodyLLh, ...FONT.ss }}>
                {qa.q.replace(/[?？]\s*$/, '')}?
              </span>
              <CaretRight size={20} style={{ color: T.navy, opacity: 0.4 }} className="shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── 입력 바 (+ 자동완성) ────────────────────────────────────────────────
function InputBar({ onSend }) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [showSug, setShowSug] = useState(true)
  const inputRef = useRef(null)
  const suggestions = useMemo(() => (text.trim().length >= 2 ? searchSuggestions(text, 4) : []), [text])

  const submit = (value) => {
    const v = (value ?? text).trim()
    if (!v) return
    onSend(v)
    setText('')
    setShowSug(false)
    inputRef.current?.focus()
  }

  return (
    <div className="shrink-0 p-4" style={{ backgroundColor: T.contentBg }}>
      <div className="relative">
        {showSug && suggestions.length > 0 && (
          <div
            className="absolute bottom-full left-0 right-0 mb-2 rounded-[16px] overflow-hidden"
            style={{ backgroundColor: T.white, boxShadow: T.shadowXl, border: `1px solid ${T.border}` }}
          >
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => submit(s.text)}
                className="w-full text-left px-4 py-2.5 transition-colors hover:bg-[#EDF5FF]"
                style={{ borderTop: `1px solid ${T.border}`, color: T.ink, fontSize: FONT.bodyM, ...FONT.ss }}
              >
                {s.text}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="flex items-center gap-2 rounded-[16px] px-4 py-3"
          style={{
            backgroundColor: T.white,
            border: `1px solid ${focused ? T.brandBlue : T.border}`,
            transition: 'border-color 150ms',
          }}
        >
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setShowSug(true)
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="무엇이든 물어보세요."
            aria-label="질문 입력"
            className="flex-1 bg-transparent border-0 outline-none"
            style={{ color: T.ink, fontSize: FONT.bodyL, ...FONT.ss }}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="전송"
            className="shrink-0 flex items-center justify-center rounded-[8px] transition-all disabled:cursor-not-allowed"
            style={{
              width: 40,
              height: 40,
              backgroundColor: text.trim() ? T.brandBlue : T.disabled,
              color: text.trim() ? T.inkOnColor : T.placeholder,
            }}
          >
            <ArrowUp size={20} weight="bold" />
          </button>
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
    const picked = Array.from(list)
    const next = [...files]
    for (const f of picked) {
      if (next.length >= ATTACH_LIMIT.maxCount) {
        setErr(`이미지는 최대 ${ATTACH_LIMIT.maxCount}개까지 첨부할 수 있어요.`)
        break
      }
      if (!f.type.startsWith('image/')) {
        setErr('이미지 파일만 첨부할 수 있어요.')
        continue
      }
      if (f.size > ATTACH_LIMIT.maxBytes) {
        setErr('각 이미지는 1MB 이하만 첨부할 수 있어요.')
        continue
      }
      next.push(f)
    }
    setFiles(next.slice(0, ATTACH_LIMIT.maxCount))
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: T.contentBg }}>
      <div className="p-6 flex flex-col gap-5 min-h-full">
        <BackLink label="돌아가기" onClick={onBack} />
        <div className="flex flex-col gap-2">
          <h2 style={{ color: T.ink, fontSize: FONT.title, lineHeight: FONT.titleLh, fontWeight: 600, ...FONT.ss }}>
            {copy.title}
          </h2>
          <p style={{ color: T.helper, fontSize: FONT.bodyL, lineHeight: FONT.bodyLLh, ...FONT.ss }}>{copy.subtitle}</p>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={copy.placeholder}
          className="w-full rounded-[16px] p-4 resize-none outline-none"
          style={{
            minHeight: 240,
            backgroundColor: T.white,
            border: `1px solid ${T.border}`,
            color: T.ink,
            fontSize: FONT.bodyL,
            lineHeight: FONT.bodyLLh,
            ...FONT.ss,
          }}
        />

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 rounded-[16px] py-3 transition-colors hover:bg-[#EDF5FF]"
            style={{ backgroundColor: T.white, border: `1px solid ${T.border}`, color: T.ink, fontSize: FONT.bodyL, fontWeight: 600, ...FONT.ss }}
          >
            이미지 첨부하기 <Plus size={20} weight="bold" />
          </button>
          <input ref={fileRef} type="file" accept={ATTACH_LIMIT.accept} multiple hidden onChange={(e) => onFiles(e.target.files)} />
          <p style={{ color: T.helper, fontSize: FONT.bodyM, ...FONT.ss }}>이미지만 첨부 가능 / 최대 2개 / 각 1MB 이하</p>
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {files.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full pl-3 pr-2 py-1"
                  style={{ backgroundColor: T.white, border: `1px solid ${T.chipBorder}`, color: T.chipText, fontSize: FONT.bodyM, ...FONT.ss }}
                >
                  <span className="max-w-[160px] truncate">{f.name}</span>
                  <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="첨부 삭제">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {err && <p style={{ color: T.redText, fontSize: FONT.bodyM, ...FONT.ss }}>{err}</p>}
        </div>

        <div className="flex flex-col gap-3 mt-auto pt-2">
          <PrimaryButton icon={PaperPlaneRight} disabled={!text.trim()} onClick={onSubmit}>
            {copy.submit}
          </PrimaryButton>
          <p style={{ color: T.helper, fontSize: FONT.bodyM, lineHeight: FONT.bodyMLh, ...FONT.ss }}>• {copy.note}</p>
        </div>
      </div>
    </div>
  )
}

// ─── 접수완료 ────────────────────────────────────────────────────────────
function CompleteScreen({ onHome }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4" style={{ backgroundColor: T.contentBg }}>
      <span
        className="flex items-center justify-center rounded-full animate-in zoom-in duration-300"
        style={{ width: 48, height: 48, backgroundColor: T.success }}
      >
        <Check size={26} weight="bold" color="#fff" />
      </span>
      <h2 style={{ color: T.ink, fontSize: FONT.title, lineHeight: FONT.titleLh, fontWeight: 600, ...FONT.ss }}>접수됐어요!</h2>
      <p style={{ color: T.helper, fontSize: FONT.bodyL, lineHeight: FONT.bodyLLh, ...FONT.ss }}>
        담당자 확인 후 문자/이메일로 회신드려요.
        <br />
        챗봇으로 다시 오지 않으셔도 됩니다.
      </p>
      <div className="mt-2">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center justify-center gap-2 rounded-[16px] px-8 py-3.5 transition-all hover:brightness-110 active:scale-[0.99]"
          style={{ backgroundColor: T.navy, color: T.inkOnColor, fontSize: FONT.bodyL, fontWeight: 600, ...FONT.ss }}
        >
          <House size={20} weight="fill" /> 홈으로
        </button>
      </div>
    </div>
  )
}

// ─── 메인 위젯 (뷰 라우터) ───────────────────────────────────────────────
function ChatbotWidget({ chatbot, onOpenGuide }) {
  const isMobile = useIsMobile()
  const bodyRef = useRef(null)
  const { view } = chatbot

  // 새 메시지 시 스크롤 하단 고정
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [chatbot.messages, view])

  const widgetClass = isMobile
    ? 'fixed inset-0 z-50 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300'
    : 'fixed bottom-24 right-6 z-50 w-[420px] h-[680px] max-h-[calc(100vh-7rem)] rounded-[24px] overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300'

  const showHeader = view === VIEWS.ONBOARDING || view === VIEWS.CATEGORY || view === VIEWS.CHAT
  const showInput = view === VIEWS.ONBOARDING || view === VIEWS.CATEGORY || view === VIEWS.CHAT

  const handleOpenGuide = (guide) => {
    if (guide?.url) {
      if (/^https?:\/\//.test(guide.url)) window.open(guide.url, '_blank', 'noopener')
      else window.location.assign(guide.url)
    } else if (onOpenGuide) {
      onOpenGuide(guide)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AMS 운영도우미 챗봇"
      className={widgetClass}
      style={{ backgroundColor: T.contentBg, boxShadow: isMobile ? 'none' : T.shadowXl }}
    >
      {showHeader && (
        <WidgetHeader
          showHome={view !== VIEWS.ONBOARDING}
          onHome={chatbot.goHome}
          onError={() => chatbot.openForm('error')}
          onClose={chatbot.close}
        />
      )}
      {view === VIEWS.ONBOARDING && <WelcomeHero userName={chatbot.userName} />}

      {/* ─── 본문 ─── */}
      {(view === VIEWS.ONBOARDING || view === VIEWS.CATEGORY || view === VIEWS.CHAT) && (
        <div ref={bodyRef} className="flex-1 overflow-y-auto flex flex-col" style={{ backgroundColor: T.contentBg }}>
          <NoticeBanner />

          {view === VIEWS.ONBOARDING && <CategoryGrid onPick={chatbot.openCategory} />}

          {view === VIEWS.CATEGORY && (
            <div className="p-6 flex flex-col gap-6">
              <BackLink label="전체 카테고리" onClick={chatbot.backToCategories} />
              <SubMenuList categoryId={chatbot.activeCategory} items={chatbot.submenu} onPick={chatbot.askQa} />
            </div>
          )}

          {view === VIEWS.CHAT && (
            <div className="p-6 flex flex-col gap-6">
              {chatbot.messages.map((m) => {
                if (m.role === MSG_TYPES.USER) return <UserBubble key={m.id} text={m.text} />
                if (m.role === MSG_TYPES.TYPING) return <TypingIndicator key={m.id} />
                return (
                  <BotMessage
                    key={m.id}
                    answer={m.answer}
                    onOpenGuide={handleOpenGuide}
                    onAction={chatbot.runAction}
                    onPick={chatbot.ask}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}

      {view === VIEWS.FORM && (
        <RequestForm type={chatbot.formType} onBack={chatbot.backFromForm} onSubmit={chatbot.submitForm} />
      )}
      {view === VIEWS.COMPLETE && <CompleteScreen onHome={chatbot.goHome} />}

      {showInput && <InputBar onSend={chatbot.ask} />}
    </div>
  )
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────
/**
 * AMS 운영도우미 챗봇
 * @param {string}  contextKey   현재 화면 컨텍스트 키
 * @param {string}  contextLabel 표시용 라벨(미사용 — 호환 유지)
 * @param {string}  userName     사용자 이름
 * @param {boolean} devMode      (호환 유지 — 현재 미사용)
 * @param {Function} onOpenGuide 가이드 카드 클릭 핸들러
 */
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
