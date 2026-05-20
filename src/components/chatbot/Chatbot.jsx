// src/components/chatbot/Chatbot.jsx
// AMS Wiki 챗봇 통합 컴포넌트 — FAB + Widget + 모든 sub-component
//
// 디자인 토큰:
//  - 브랜드 #161616, 포인트 #0043CE (사용자 지정)
//  - Pretendard (Onyx 정책)
//  - shadcn/ui Button/Avatar/Badge/ScrollArea/Separator 활용
//
// 사용법 (Layout.jsx 또는 App.jsx):
//   import { Chatbot } from '@/components/chatbot'
//   <Chatbot contextKey="cust-search" userName="명준" />

import { useState, useRef, useEffect } from 'react'
import {
  ChatCircleText,
  X,
  ArrowsClockwise,
  ArrowUp,
  ThumbsUp,
  ThumbsDown,
  WarningCircle,
  Lightbulb,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useChatbot, CHATBOT_STAGES, MSG_TYPES } from './useChatbot'
import { searchSuggestions } from './intents'

const CHATBOT_BRAND = '#161616'
const CHATBOT_POINT = '#0043CE'
const CHATBOT_POINT_HOVER = '#0033A0'
const CHATBOT_POINT_SOFT = '#EDF1FB'
const CHATBOT_POINT_BORDER = '#B5CAF1'

// v4 디자인 디벨롭: 모바일 반응형 + 다크모드 감지
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

// ─── FAB (모바일 분기 + 호버 펄스 마이크로 인터랙션) ─────────────────────
function ChatbotFAB({ onClick, hasNotification = false }) {
  const isMobile = useIsMobile()
  return (
    <>
      {/* 호버 시 잔잔한 펄스 — 첫 사용자에게 발견성 ↑ */}
      <style>{`
        @keyframes chatbot-fab-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 67, 206, 0.4), 0 8px 24px rgba(0,0,0,0.18); }
          50%      { box-shadow: 0 0 0 12px rgba(0, 67, 206, 0), 0 8px 24px rgba(0,0,0,0.18); }
        }
        .chatbot-fab-pulse { animation: chatbot-fab-pulse 2.4s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .chatbot-fab-pulse { animation: none; }
        }
      `}</style>
      <button
        type="button"
        onClick={onClick}
        aria-label="AMS Wiki 챗봇 열기 (Cmd+/)"
        className={cn(
          'fixed z-50',
          isMobile ? 'bottom-5 right-5 h-12 w-12' : 'bottom-6 right-6 h-14 w-14',
          'rounded-full flex items-center justify-center',
          'shadow-lg hover:shadow-xl',
          'transition-all duration-200 ease-out',
          'hover:scale-105 active:scale-95',
          'text-white',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200',
          hasNotification && 'chatbot-fab-pulse'
        )}
        style={{ backgroundColor: CHATBOT_POINT }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = CHATBOT_POINT_HOVER)}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = CHATBOT_POINT)}
      >
        <ChatCircleText size={isMobile ? 22 : 24} weight="fill" />
        {hasNotification && (
          <span
            className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full ring-2 ring-background"
            style={{ backgroundColor: '#DA1E28' }}
            aria-hidden
          />
        )}
      </button>
    </>
  )
}

// ─── Header ─────────────────────────────────────────────────────────────
function ChatbotHeader({ onClose, onReset }) {
  return (
    <div
      className="relative flex items-center gap-3 px-5 py-4 overflow-hidden"
      style={{ backgroundColor: CHATBOT_BRAND, color: 'white' }}
    >
      {/* Point radial glow */}
      <div
        className="absolute -top-10 -right-10 h-32 w-32 rounded-full blur-2xl opacity-30 pointer-events-none"
        style={{ backgroundColor: CHATBOT_POINT }}
      />
      <Avatar
        className="h-9 w-9 ring-2 relative shrink-0"
        style={{ '--tw-ring-color': `${CHATBOT_POINT}40` }}
      >
        <AvatarFallback
          style={{ backgroundColor: CHATBOT_POINT, color: 'white' }}
          className="font-bold text-sm"
        >
          AW
        </AvatarFallback>
      </Avatar>
      <div className="relative flex-1 min-w-0">
        <div className="text-sm font-bold tracking-tight leading-tight">AMS Wiki</div>
        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80 mt-0.5 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          AI Agent · 응답 중
        </div>
      </div>
      <div className="relative flex gap-1">
        <button
          onClick={onReset}
          className="h-7 w-7 rounded-md flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-white/10 transition-all"
          aria-label="새 대화 시작"
        >
          <ArrowsClockwise size={16} />
        </button>
        <button
          onClick={onClose}
          className="h-7 w-7 rounded-md flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-white/10 transition-all"
          aria-label="닫기 (Esc)"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

// ─── Mode Selector (개발용 — 4단계 데모) ─────────────────────────────────
function ChatbotModeSelector({ stage, onChange, devMode }) {
  if (!devMode) return null
  const modes = [
    { id: CHATBOT_STAGES.FAQ, label: '1차', sub: 'FAQ' },
    { id: CHATBOT_STAGES.RAG, label: '2차', sub: 'RAG' },
    { id: CHATBOT_STAGES.TICKET, label: '3차', sub: '게시판' },
    { id: CHATBOT_STAGES.NL2SQL, label: '4차', sub: 'NL2SQL' },
  ]
  return (
    <div className="flex gap-1 px-3 py-1.5 border-b bg-muted/40 overflow-x-auto">
      {modes.map(m => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={cn(
            'px-2.5 py-1 rounded text-[10.5px] font-medium border whitespace-nowrap transition-all',
            stage === m.id
              ? 'text-white border-transparent'
              : 'bg-background border-border text-muted-foreground hover:text-foreground'
          )}
          style={stage === m.id ? { backgroundColor: CHATBOT_BRAND } : {}}
        >
          {m.label} <b style={{ color: stage === m.id ? CHATBOT_POINT_BORDER : CHATBOT_POINT }}>{m.sub}</b>
        </button>
      ))}
    </div>
  )
}

// ─── Message Bubble ──────────────────────────────────────────────────────
function MessageBubble({ role, children, meta, className }) {
  const isUser = role === 'user'
  return (
    <div
      className={cn(
        'mb-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-1 duration-300',
        isUser ? 'ml-auto text-right' : 'mr-auto',
        className
      )}
    >
      <div
        className={cn(
          'inline-block px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed text-left'
        )}
        style={
          isUser
            ? { backgroundColor: CHATBOT_POINT, color: 'white', borderBottomRightRadius: 4 }
            : { backgroundColor: 'var(--muted)', color: 'var(--foreground)', borderBottomLeftRadius: 4 }
        }
      >
        {typeof children === 'string' ? (
          <span dangerouslySetInnerHTML={{ __html: children }} />
        ) : (
          children
        )}
      </div>
      {meta && (
        <div className="text-[10px] text-muted-foreground/80 mt-1 px-1.5 font-medium">
          {meta}
        </div>
      )}
    </div>
  )
}

// ─── Context Banner ──────────────────────────────────────────────────────
function ContextBanner({ contextLabel }) {
  return (
    <div
      className="rounded-lg px-3 py-2.5 text-[11.5px] flex items-center gap-1.5 leading-relaxed"
      style={{
        backgroundColor: CHATBOT_POINT_SOFT,
        border: `1px solid ${CHATBOT_POINT_BORDER}`,
        color: 'var(--foreground)',
      }}
    >
      <span className="font-bold" style={{ color: CHATBOT_POINT }}>◆</span>
      <span>
        현재 <b>{contextLabel}</b> 화면을 보고 계세요.
      </span>
    </div>
  )
}

// ─── Capability Box ─────────────────────────────────────────────────────
function CapabilityBox() {
  return (
    <div className="rounded-lg border bg-muted/60 px-3 py-3 text-[11.5px] leading-relaxed space-y-2">
      <div className="flex gap-2">
        <span style={{ color: CHATBOT_POINT }} className="font-bold shrink-0">✓</span>
        <div>
          <b className="text-foreground">도와드릴 수 있어요</b>
          <br />
          가이드 검색 · FAQ 답변 · 회원 조회 (개인정보 제외)
        </div>
      </div>
      <div className="flex gap-2">
        <span className="text-destructive font-bold shrink-0">✗</span>
        <div>
          <b className="text-foreground">직접 처리는 어려워요</b>
          <br />
          결제 환불 · 회원정보 수정 · 권한 변경
        </div>
      </div>
    </div>
  )
}

// ─── Quick Replies ──────────────────────────────────────────────────────
function QuickReplies({ replies, onClick }) {
  if (!replies?.length) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2.5">
      {replies.map((reply, i) => (
        <button
          key={i}
          onClick={() => onClick(reply)}
          className={cn(
            'rounded-full border bg-background px-3 py-1.5 text-[11.5px] font-medium',
            'text-foreground/80 transition-all duration-150',
            'hover:text-white hover:border-transparent'
          )}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = CHATBOT_POINT
            e.currentTarget.style.color = 'white'
            e.currentTarget.style.borderColor = CHATBOT_POINT
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = ''
            e.currentTarget.style.color = ''
            e.currentTarget.style.borderColor = ''
          }}
        >
          {reply}
        </button>
      ))}
    </div>
  )
}

// ─── Guide Card ─────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
function GuideCard({ category, title, docSlug, confidence, onOpen }) {
  return (
    <button
      onClick={() => onOpen?.(docSlug)}
      className="w-full text-left mt-2.5 rounded-lg border bg-background p-3 transition-all hover:shadow-sm"
      style={{ borderLeft: `3px solid ${CHATBOT_POINT}` }}
    >
      <div
        className="text-[10px] font-bold uppercase tracking-wider"
        style={{ color: CHATBOT_POINT }}
      >
        📘 {category}
      </div>
      <div className="text-[13px] font-semibold mt-1 leading-snug text-foreground">{title}</div>
      <div className="text-[11.5px] mt-1 underline" style={{ color: CHATBOT_POINT }}>
        가이드 열기 →
      </div>
    </button>
  )
}

// ─── Data Card (NL2SQL / 티켓 미리보기) ──────────────────────────────────
function DataCard({ title, kind, data }) {
  if (kind === 'ticket-preview') {
    return (
      <div className="mt-2.5 rounded-lg border bg-background p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <span style={{ color: CHATBOT_POINT }}>📋</span>
          {title}
        </div>
        <table className="w-full text-[11.5px]">
          <tbody>
            <tr className="border-t">
              <td className="py-1.5 pr-2 font-bold w-20">제목</td>
              <td className="py-1.5">{data.title}</td>
            </tr>
            <tr className="border-t">
              <td className="py-1.5 pr-2 font-bold">분류</td>
              <td className="py-1.5">{data.category}</td>
            </tr>
            <tr className="border-t">
              <td className="py-1.5 pr-2 font-bold">요청자</td>
              <td className="py-1.5">{data.author}</td>
            </tr>
            <tr className="border-t">
              <td className="py-1.5 pr-2 font-bold">관련 가이드</td>
              <td className="py-1.5">{data.relatedGuide || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  if (kind === 'nl2sql') {
    return (
      <div className="mt-2.5 rounded-lg border bg-background p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <span style={{ color: CHATBOT_POINT }}>📊</span>
          {title}
        </div>
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="bg-muted">
              {data.headers.map(h => (
                <th key={h} className="px-2 py-1.5 text-left font-semibold text-[10.5px]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={i} className="border-t">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={cn('px-2 py-1.5', j >= 3 ? 'text-right tabular-nums' : '')}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 text-[10px] text-muted-foreground">{data.note}</div>
        <details className="mt-2">
          <summary
            className="cursor-pointer text-[10.5px] font-medium"
            style={{ color: CHATBOT_POINT }}
          >
            🔍 생성된 SQL 보기
          </summary>
          <pre
            className="mt-2 p-2.5 rounded-md text-[10.5px] overflow-x-auto leading-relaxed"
            style={{ backgroundColor: CHATBOT_BRAND, color: '#E0E0E0' }}
          >
            {data.sql}
          </pre>
        </details>
      </div>
    )
  }

  return null
}

// ─── v4: 본문 + 인라인 [1] 인용 마커 결합 렌더러 ────────────────────────
// "...찾았어요 [1]." 같은 패턴에서 [1]을 InlineCitationMarker로 치환.
function BotHtmlWithCitations({ html, citations }) {
  if (!citations?.length) {
    return <span dangerouslySetInnerHTML={{ __html: html }} />
  }
  // [n] 마커 분리 — citations[i].n과 매칭
  const parts = html.split(/(\[\d+\])/g)
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[(\d+)\]$/)
        if (m) {
          const n = parseInt(m[1])
          const cite = citations.find(c => c.n === n)
          return <InlineCitationMarker key={i} n={n} citation={cite} />
        }
        return <span key={i} dangerouslySetInnerHTML={{ __html: part }} />
      })}
    </>
  )
}

// ─── v4: Streaming Text (Claude/ChatGPT 패턴) ────────────────────────────
// HTML을 토큰 단위로 점진 표시 — perceived performance 개선.
// React 19 호환: setState를 effect 안에서 직접 호출하지 않고 RAF 콜백에서만 호출.
function StreamingText({ html, onComplete, speed = 14 }) {
  const [shown, setShown] = useState('')
  const rafRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let idx = 0
    let last = 0
    const tick = (now) => {
      if (cancelled) return
      if (now - last >= speed) {
        const next = idx + 2
        if (next >= html.length) {
          setShown(html)
          onComplete?.()
          return
        }
        setShown(html.substring(0, next))
        idx = next
        last = now
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [html, speed, onComplete])

  return (
    <span dangerouslySetInnerHTML={{ __html: shown }} aria-live="polite" />
  )
}

// ─── v4: Inline Citation Marker (Perplexity 패턴) ────────────────────────
function InlineCitationMarker({ n, citation }) {
  const [hover, setHover] = useState(false)
  if (!citation) return null
  return (
    <span
      className="relative inline-block align-super text-[10px] font-bold ml-0.5 cursor-help"
      style={{ color: CHATBOT_POINT }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      tabIndex={0}
      role="button"
      aria-label={`인용 ${n}: ${citation.title}`}
    >
      [{n}]
      {hover && (
        <span
          className="absolute z-50 left-0 top-5 w-64 bg-background border rounded-lg shadow-lg p-3 text-left text-foreground"
          style={{ borderColor: CHATBOT_POINT_BORDER }}
        >
          <span className="block text-[9px] font-bold tracking-wider uppercase" style={{ color: CHATBOT_POINT }}>
            📘 {citation.category}
          </span>
          <span className="block text-[12px] font-semibold mt-1 leading-snug">
            {citation.title}
          </span>
          <span className="block text-[10.5px] text-muted-foreground mt-1 leading-relaxed">
            {citation.snippet}
          </span>
          <span className="block text-[9px] text-muted-foreground/80 mt-1.5">
            👁 {citation.views.toLocaleString()} · {citation.updated}
          </span>
        </span>
      )}
    </span>
  )
}

// ─── v4: Citation List (Perplexity 하단 소스 리스트) ─────────────────────
function CitationList({ citations }) {
  if (!citations?.length) return null
  return (
    <div className="mt-3 rounded-lg border p-2.5" style={{ borderColor: CHATBOT_POINT_BORDER, backgroundColor: CHATBOT_POINT_SOFT }}>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: CHATBOT_POINT }}>
        🔗 출처
      </div>
      {citations.map((c, i) => (
        <div key={i} className="flex gap-2 items-start mb-1 last:mb-0">
          <span className="text-[10px] font-bold flex-shrink-0" style={{ color: CHATBOT_POINT }}>[{c.n}]</span>
          <span className="text-[11px] text-foreground/85 leading-snug">
            <a href={c.url} className="font-semibold hover:underline">{c.title}</a>
            <span className="text-muted-foreground"> · {c.category} · 👁 {c.views.toLocaleString()}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── v4: Confidence Badge (Trust Calibration / NIST 2025) ───────────────
function ConfidenceBadge({ band, confidence }) {
  const colors = {
    success: { bg: '#D8F3DC', text: '#2D6A4F', icon: '✓' },
    info:    { bg: CHATBOT_POINT_SOFT, text: CHATBOT_POINT, icon: 'ℹ' },
    warning: { bg: '#FEF3C7', text: '#92400E', icon: '⚠' },
    error:   { bg: '#FEE2E2', text: '#B91C1C', icon: '⚠' },
  }
  const c = colors[band.tone] || colors.info
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10.5px] font-medium mt-1"
      style={{ backgroundColor: c.bg, color: c.text }}
      title={band.note}
      role="status"
      aria-label={`AI 신뢰도: ${band.label} (${Math.round(confidence * 100)}%)`}
    >
      <span aria-hidden>{c.icon}</span>
      <span className="font-bold">{band.label}</span>
      <span className="opacity-70">· {Math.round(confidence * 100)}%</span>
    </div>
  )
}

// ─── v4: Onboarding Tour (Intercom Fin 패턴) ────────────────────────────
function OnboardingTour({ onComplete }) {
  const steps = [
    {
      icon: '👋',
      title: '안녕하세요, AMS Wiki 도우미입니다',
      body: '운영 가이드와 자주 묻는 질문을 빠르게 찾아드려요. 채널톡 1,116개 케이스에서 학습된 9가지 패턴으로 응답합니다.',
    },
    {
      icon: '✨',
      title: '신뢰도를 직접 확인하세요',
      body: '모든 답변에 정확도 라벨이 표시됩니다. "추정 답변"이라고 표시되면 사람에게 한 번 더 확인하세요. (NIST Trust Calibration 표준)',
    },
    {
      icon: '⌨️',
      title: '⌘ + / 단축키로 언제든 호출',
      body: 'AMS 어디서든 ⌘ + / 로 도우미 열기 / 닫기. Esc로 닫기. 답변에 [1] [2] 마커 호버하면 출처 미리보기.',
    },
  ]
  const [step, setStep] = useState(0)
  const s = steps[step]

  return (
    <div className="rounded-xl border bg-background p-4 mb-3 max-w-[90%] mr-auto"
         style={{ borderColor: CHATBOT_POINT_BORDER }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{s.icon}</span>
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: CHATBOT_POINT }}>
            온보딩 {step + 1} / {steps.length}
          </div>
          <div className="text-[14px] font-bold text-foreground mt-0.5 leading-snug">
            {s.title}
          </div>
        </div>
      </div>
      <p className="text-[12px] text-foreground/85 leading-relaxed">{s.body}</p>
      <div className="flex items-center mt-3 gap-2">
        <div className="flex-1 flex gap-1">
          {steps.map((_, i) => (
            <span key={i}
                  className="h-1.5 rounded-full flex-1"
                  style={{ backgroundColor: i <= step ? CHATBOT_POINT : '#E0E0E0' }} />
          ))}
        </div>
        {step < steps.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="px-3 py-1.5 rounded-md text-[11.5px] font-semibold text-white"
            style={{ backgroundColor: CHATBOT_POINT }}
          >
            다음 →
          </button>
        ) : (
          <button
            type="button"
            onClick={onComplete}
            className="px-3 py-1.5 rounded-md text-[11.5px] font-semibold text-white"
            style={{ backgroundColor: CHATBOT_POINT }}
          >
            시작하기 ✓
          </button>
        )}
      </div>
    </div>
  )
}

// ─── v4: Autocomplete Suggestions (Linear AI 패턴) ──────────────────────
function AutocompleteSuggestions({ query, onSelect }) {
  const suggestions = searchSuggestions(query, 4)
  if (suggestions.length === 0) return null
  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border bg-background shadow-lg overflow-hidden z-10"
      style={{ borderColor: CHATBOT_POINT_BORDER }}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-muted/50" style={{ color: CHATBOT_POINT }}>
        <Lightbulb size={11} weight="fill" className="inline mr-1" />
        자동완성
      </div>
      {suggestions.map(s => (
        <button
          type="button"
          key={s.id}
          onClick={() => onSelect(s.text)}
          className="w-full text-left px-3 py-2 text-[12px] text-foreground hover:bg-muted/60 border-t first:border-t-0"
        >
          {s.text}
        </button>
      ))}
    </div>
  )
}

// ─── Typing Indicator ───────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="mr-auto mb-3 inline-flex items-center gap-1 px-3.5 py-3 bg-muted rounded-2xl"
         style={{ borderBottomLeftRadius: 4 }}>
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse" style={{ animationDelay: '0ms' }} />
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse" style={{ animationDelay: '200ms' }} />
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse" style={{ animationDelay: '400ms' }} />
    </div>
  )
}

// ─── Escalation CTA ─────────────────────────────────────────────────────
function EscalationCTA({ reason, onEscalate, slackTitle, tip }) {
  const labels = {
    'low-confidence': '명확하지 않으면 직접 문의',
    'negative-signal': '긴급해 보이세요. 바로 도움이 필요하시면',
    'negative-feedback': '플랫폼팀에 직접 문의',
    'self-solve-impossible': '직접 처리가 불가한 항목이에요',
    'partial-escalate': '아래 부분은 플서실 요청이 필요해요',
  }
  return (
    <div
      className="mt-2.5 flex flex-col gap-1.5 px-3 py-2.5 rounded-lg bg-muted/60 text-[11.5px]"
      style={{ borderLeft: '3px solid #F1C21B', border: '1px solid var(--border)', borderLeftWidth: '3px', borderLeftColor: '#F1C21B' }}
    >
      <div className="flex items-center gap-2">
        <WarningCircle size={14} className="text-amber-600 shrink-0" />
        <span className="font-medium text-foreground">{labels[reason] || '문의가 필요해요'}</span>
        <button
          onClick={onEscalate}
          className="ml-auto px-3 py-1 rounded text-[11px] font-medium text-white"
          style={{ backgroundColor: CHATBOT_BRAND }}
        >
          Slack 문의
        </button>
      </div>
      {slackTitle && (
        <div className="text-[10.5px] text-muted-foreground pl-5 leading-snug">
          <span className="opacity-70">제목 자동입력 → </span>
          <code className="px-1.5 py-0.5 rounded bg-background border text-foreground/85 font-mono text-[10px]">
            {slackTitle}
          </code>
        </div>
      )}
      {tip && (
        <div className="text-[10.5px] text-muted-foreground pl-5 leading-snug">
          💡 {tip}
        </div>
      )}
    </div>
  )
}

// ─── Official QA (v5: 실장님 시트 정형 응답) ────────────────────────────
function OfficialQaCard({ qa, category, mode }) {
  const modeMeta = {
    'self-solve':  { tone: 'success', label: '✓ 직접 처리 가능', barColor: '#198038' },
    'escalate':    { tone: 'error',   label: '⚑ 플서실 요청 필요', barColor: '#DA1E28' },
    'partial':     { tone: 'warning', label: '◐ 일부 직접 가능',  barColor: '#F1C21B' },
  }
  const m = modeMeta[mode] || modeMeta['self-solve']
  return (
    <div
      className="rounded-lg bg-card overflow-hidden"
      style={{ border: '1px solid var(--border)', borderLeft: `3px solid ${m.barColor}` }}
    >
      <div className="px-3.5 py-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          {category && (
            <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ color: CHATBOT_POINT, backgroundColor: 'var(--accent, #EDF1FB)' }}>
              {category.emoji} {category.label}
            </span>
          )}
          <span className="text-[10.5px] font-medium" style={{ color: m.barColor }}>
            {m.label}
          </span>
        </div>
        <div className="text-[13px] font-semibold text-foreground mb-1.5 leading-snug">{qa.q}</div>
        <div className="text-[12.5px] text-foreground/85 leading-relaxed whitespace-pre-line">{qa.a}</div>
      </div>
    </div>
  )
}

// ─── Menu Path Card (v5: AMS 메뉴 경로 시각화) ──────────────────────────
function MenuPathCard({ menuPath, tip }) {
  if (!menuPath) return null
  const segs = menuPath.split(/\s*[→>]\s*/).filter(Boolean)
  return (
    <div className="rounded-lg bg-card px-3.5 py-2.5"
         style={{ border: '1px solid var(--border)' }}>
      <div className="text-[10.5px] font-semibold mb-1.5"
           style={{ color: CHATBOT_POINT }}>
        🧭 메뉴 경로
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {segs.map((seg, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <code className="px-1.5 py-0.5 rounded text-[11px] font-mono"
                  style={{ backgroundColor: 'var(--accent, #EDF1FB)', color: CHATBOT_BRAND }}>
              {seg}
            </code>
            {i < segs.length - 1 && <span className="text-muted-foreground text-[10px]">→</span>}
          </span>
        ))}
      </div>
      {tip && (
        <div className="mt-2 text-[11px] text-muted-foreground leading-snug">
          💡 {tip}
        </div>
      )}
    </div>
  )
}

// ─── Feedback ───────────────────────────────────────────────────────────
function FeedbackRow({ onSubmit }) {
  const [submitted, setSubmitted] = useState(null)
  const handle = (helpful) => {
    setSubmitted(helpful)
    onSubmit?.(helpful)
  }
  return (
    <div className="flex gap-1.5 mt-2">
      <button
        onClick={() => handle(true)}
        disabled={submitted !== null}
        className={cn(
          'h-6 w-6 rounded-full border bg-background flex items-center justify-center transition-all',
          submitted === true && 'bg-blue-50 border-blue-600'
        )}
        aria-label="도움 됐어요"
      >
        <ThumbsUp size={11} weight={submitted === true ? 'fill' : 'regular'} />
      </button>
      <button
        onClick={() => handle(false)}
        disabled={submitted !== null}
        className={cn(
          'h-6 w-6 rounded-full border bg-background flex items-center justify-center transition-all',
          submitted === false && 'bg-red-50 border-red-600'
        )}
        aria-label="아쉬워요"
      >
        <ThumbsDown size={11} weight={submitted === false ? 'fill' : 'regular'} />
      </button>
    </div>
  )
}

// ─── Input + Autocomplete (Linear AI 패턴) ──────────────────────────────
function ChatbotInput({ onSend, placeholder }) {
  const [text, setText] = useState('')
  const inputRef = useRef(null)
  const [showSuggestions, setShowSuggestions] = useState(true)

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!text.trim()) return
    onSend(text)
    setText('')
    inputRef.current?.focus()
  }
  const handleSuggestionSelect = (suggested) => {
    setText('')
    onSend(suggested)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative border-t border-[#E8E8E8] px-3.5 py-3 bg-background"
    >
      {showSuggestions && text.length >= 2 && (
        <AutocompleteSuggestions
          query={text}
          onSelect={handleSuggestionSelect}
        />
      )}
      <div className="flex items-center gap-2 h-11 rounded-full border border-[#E8E8E8] bg-[#F7F7F7] pl-4 pr-1.5 focus-within:border-[#0043CE] focus-within:bg-white transition-colors">
        <input
          ref={inputRef}
          value={text}
          onChange={e => { setText(e.target.value); setShowSuggestions(true) }}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder || '무엇이든 물어보세요'}
          className="flex-1 bg-transparent border-0 outline-none text-[13px] text-[#1A1A1A] placeholder:text-[#999999]"
          autoComplete="off"
          aria-label="챗봇 질문 입력"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="전송"
          className="h-8 w-8 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-40 hover:opacity-90"
          style={{ backgroundColor: CHATBOT_POINT }}
        >
          <ArrowUp size={14} weight="bold" />
        </button>
      </div>
    </form>
  )
}

// ─── Footer ─────────────────────────────────────────────────────────────
function ChatbotFooter({ contextLabel }) {
  return (
    <div className="text-center text-[9px] font-medium tracking-wider px-3.5 py-1.5 bg-muted/60 text-muted-foreground/80">
      ⌨️ ⌘ + / · 컨텍스트: {contextLabel} · WCAG 2.2 AA
    </div>
  )
}

// ─── Main Widget ────────────────────────────────────────────────────────
function ChatbotWidget({ chatbot, contextLabel, devMode, onOpenGuide }) {
  const bodyRef = useRef(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [chatbot.messages])

  // 모바일: 풀스크린 / 데스크탑: 우측 하단 카드
  const widgetClass = isMobile
    ? 'fixed inset-0 z-50 rounded-none flex flex-col bg-background animate-in fade-in slide-in-from-bottom-4 duration-300'
    : 'fixed bottom-24 right-6 z-50 w-[400px] h-[640px] max-h-[calc(100vh-7rem)] rounded-2xl overflow-hidden flex flex-col bg-background border shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AMS Wiki 챗봇"
      className={widgetClass}
    >
      <ChatbotHeader onClose={chatbot.close} onReset={chatbot.reset} />
      <ChatbotModeSelector
        stage={chatbot.stage}
        onChange={chatbot.setStage}
        devMode={devMode}
      />

      <div
        ref={bodyRef}
        className="flex-1 overflow-y-auto px-4 py-4 bg-background"
      >
        {/* v4: Onboarding Tour — 첫 방문자에게만 표시 (LocalStorage 기억) */}
        {chatbot.needsOnboarding && (
          <OnboardingTour onComplete={chatbot.completeOnboarding} />
        )}
        {chatbot.messages.map((msg) => (
          <ChatbotMessage
            key={msg.id}
            msg={msg}
            contextLabel={contextLabel}
            chatbot={chatbot}
            onOpenGuide={onOpenGuide}
          />
        ))}
      </div>

      <ChatbotInput
        onSend={chatbot.sendUserMessage}
        placeholder="가이드·FAQ 질문 또는 자유 입력"
      />
      <ChatbotFooter contextLabel={contextLabel} />
    </div>
  )
}

// ─── Message Router ─────────────────────────────────────────────────────
function ChatbotMessage({ msg, contextLabel, chatbot, onOpenGuide }) {
  switch (msg.type) {
    case MSG_TYPES.BOT_CONTEXT_BANNER:
      return <MessageBubble role="bot"><ContextBanner contextLabel={contextLabel} /></MessageBubble>

    case MSG_TYPES.BOT_TEXT:
      return (
        <MessageBubble role="bot" meta="AMS Wiki">
          <BotHtmlWithCitations html={msg.html} citations={msg.citations || []} />
        </MessageBubble>
      )

    case MSG_TYPES.BOT_STREAMING:
      // Claude/ChatGPT 패턴 — 토큰별 점진 표시
      return (
        <MessageBubble role="bot" meta="AMS Wiki · streaming">
          <StreamingText html={msg.html} speed={12} />
        </MessageBubble>
      )

    case MSG_TYPES.BOT_CITATION_LIST:
      return (
        <div className="mb-3 max-w-[88%]">
          <CitationList citations={msg.citations} />
        </div>
      )

    case MSG_TYPES.BOT_CONFIDENCE:
      return (
        <div className="mb-3 ml-1">
          <ConfidenceBadge band={msg.band} confidence={msg.confidence} />
        </div>
      )

    case MSG_TYPES.USER_TEXT:
      return <MessageBubble role="user" meta="방금">{msg.text}</MessageBubble>

    case MSG_TYPES.BOT_CAPABILITY:
      return <MessageBubble role="bot"><CapabilityBox /></MessageBubble>

    case MSG_TYPES.BOT_TYPING:
      return <TypingIndicator />

    case MSG_TYPES.QUICK_REPLIES:
      return (
        <div className="mb-3">
          <QuickReplies replies={msg.replies} onClick={chatbot.sendQuickReply} />
        </div>
      )

    case MSG_TYPES.BOT_GUIDE_CARD:
      return (
        <div className="mb-3 max-w-[85%]">
          <GuideCard
            category={msg.category}
            title={msg.title}
            docSlug={msg.docSlug}
            confidence={msg.confidence}
            onOpen={onOpenGuide}
          />
        </div>
      )

    case MSG_TYPES.BOT_DATA_CARD:
      return (
        <div className="mb-3 max-w-[92%]">
          <DataCard title={msg.title} kind={msg.kind} data={msg.data} />
        </div>
      )

    case MSG_TYPES.FEEDBACK:
      return (
        <div className="mb-3 ml-1">
          <FeedbackRow onSubmit={(helpful) => chatbot.submitFeedback(msg.intentId, helpful)} />
        </div>
      )

    case MSG_TYPES.BOT_ESCALATION:
      return (
        <div className="mb-3 max-w-[90%]">
          <EscalationCTA
            reason={msg.reason}
            slackTitle={msg.slackTitle}
            tip={msg.tip}
            onEscalate={() => chatbot.escalate(msg.originalQuery, 'slack')}
          />
        </div>
      )

    case MSG_TYPES.BOT_OFFICIAL_QA:
      return (
        <div className="mb-3 max-w-[92%]">
          <OfficialQaCard qa={msg.qa} category={msg.category} mode={msg.mode} />
        </div>
      )

    case MSG_TYPES.BOT_MENU_PATH:
      return (
        <div className="mb-3 max-w-[92%]">
          <MenuPathCard menuPath={msg.menuPath} tip={msg.tip} />
        </div>
      )

    case MSG_TYPES.BOT_RELATED_GUIDES:
      return (
        <div className="mb-3 max-w-[92%]">
          <RelatedGuidesCard guides={msg.guides} category={msg.category} />
        </div>
      )

    case MSG_TYPES.BOT_CONTEXTUAL_HINT:
      return (
        <div className="mb-3 max-w-[92%]">
          <ContextualHints hints={msg.hints} />
        </div>
      )

    default:
      return null
  }
}

// ─── Related Guides Card (v5+: Confluence 자동 인용) ─────────────────────
function RelatedGuidesCard({ guides, category }) {
  if (!guides || guides.length === 0) return null
  return (
    <div className="rounded-lg bg-card px-3.5 py-2.5" style={{ border: '1px solid var(--border)' }}>
      <div className="text-[10.5px] font-semibold mb-2" style={{ color: CHATBOT_POINT }}>
        📚 관련 컨플루언스 가이드 {category?.label ? `· ${category.emoji} ${category.label}` : ''}
      </div>
      <div className="space-y-1.5">
        {guides.map((g, i) => (
          <a key={i} href={g.url} target="_blank" rel="noopener noreferrer"
             className="flex items-start gap-2 text-[12px] hover:bg-muted/30 rounded px-1.5 py-1 -mx-1.5 transition-colors">
            <span className="text-[10px] font-mono text-muted-foreground shrink-0 mt-0.5">[{g.space}]</span>
            <span className="flex-1 text-foreground leading-snug">{g.title}</span>
            {g.updatedAt && <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{g.updatedAt}</span>}
          </a>
        ))}
      </div>
    </div>
  )
}

// ─── Contextual Hints (v5+: 시간/시즌/매니저 힌트) ────────────────────────
function ContextualHints({ hints }) {
  if (!hints || hints.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      {hints.map((h, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11.5px]"
             style={{ backgroundColor: 'var(--accent, #EDF1FB)', color: CHATBOT_POINT }}>
          <span className="text-[14px]">{h.icon}</span>
          <span className="font-medium">{h.text}</span>
        </div>
      ))}
    </div>
  )
}

// ─── PUBLIC API ─────────────────────────────────────────────────────────
/**
 * AMS Wiki 챗봇 메인 컴포넌트
 *
 * @param {string} contextKey - 현재 사용자 컨텍스트 (예: 'cust-search', 'class-mgmt')
 * @param {string} contextLabel - 표시용 라벨 (예: '회원조회')
 * @param {string} userName - 사용자 이름
 * @param {boolean} devMode - 4단계 모드 셀렉터 표시 (개발/시연용)
 * @param {(slug: string) => void} onOpenGuide - 가이드 카드 클릭 핸들러 (라우터 이동)
 */
export function Chatbot({
  contextKey = 'home',
  contextLabel = '홈',
  userName = '명준',
  devMode = false,
  onOpenGuide,
}) {
  const chatbot = useChatbot({ contextKey, userName })

  return (
    <>
      {!chatbot.isOpen && (
        <ChatbotFAB onClick={chatbot.open} hasNotification={chatbot.messages.length === 0} />
      )}
      {chatbot.isOpen && (
        <ChatbotWidget
          chatbot={chatbot}
          contextLabel={contextLabel}
          devMode={devMode}
          onOpenGuide={onOpenGuide}
        />
      )}
    </>
  )
}

export default Chatbot
