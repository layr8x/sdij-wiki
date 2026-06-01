// src/components/common/Layout.jsx — shadcn/ui sidebar-07 block 기반
// 2026-05-19 v5: AMS Wiki 챗봇 통합 (feature-flag 격리)
import { Outlet, useLocation } from 'react-router-dom'
import { useMemo, lazy, Suspense, Component } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import GlobalHeaderActions from './GlobalHeaderActions'

// ─── 챗봇 feature flag ────────────────────────────────────────────────
// 기본: 활성. 위젯이 본 앱 마운트를 막을 경우 false로 빠르게 비활성화.
// 영구 비활성은 .env에 VITE_CHATBOT_ENABLED=false
const CHATBOT_ENABLED = import.meta.env.VITE_CHATBOT_ENABLED !== 'false'

// 챗봇은 lazy + ErrorBoundary 격리 — 위젯 자체 에러가 본 앱을 죽이지 않도록
const Chatbot = lazy(() =>
  import('@/components/chatbot').then(m => ({ default: m.Chatbot }))
)

/** 챗봇 전용 silent ErrorBoundary — 에러 시 아무것도 렌더링 안 함 (앱 보호) */
class ChatbotErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('[Chatbot] 위젯 마운트 실패 — 본 앱은 영향 없음:', error, info)
    }
  }
  render() {
    return this.state.hasError ? null : this.props.children
  }
}

/**
 * 라우트 경로 → 챗봇 컨텍스트 매핑.
 * 챗봇이 현재 화면을 인지하고 컨텍스트 기반 Quick Reply를 제공하기 위한 키.
 * intents.js의 getQuickRepliesForContext()와 동기.
 */
function deriveChatbotContext(pathname) {
  if (pathname === '/' || pathname === '') return { key: 'home', label: '홈' }
  if (pathname.startsWith('/faq')) return { key: 'home', label: 'FAQ' }
  if (pathname.startsWith('/updates')) return { key: 'home', label: '기능 업데이트' }
  if (pathname.startsWith('/feedback')) return { key: 'home', label: '피드백' }

  // /guides/:slug 또는 /guides
  if (pathname.startsWith('/guides/member-merge')) return { key: 'cust-merge', label: '회원 병합 가이드' }
  if (pathname.startsWith('/guides/refund')) return { key: 'bill-refund', label: '환불 가이드' }
  if (pathname.startsWith('/guides/attendance')) return { key: 'class-mgmt', label: '출결 처리 가이드' }
  if (pathname.startsWith('/guides/enrollment')) return { key: 'class-mgmt', label: '입반 처리 가이드' }
  if (pathname.startsWith('/guides/qr-trouble')) return { key: 'player', label: 'QR 출석 트러블슈팅' }
  if (pathname.startsWith('/guides/payment')) return { key: 'bill-list', label: '결제 수단 가이드' }
  if (pathname.startsWith('/guides/policy')) return { key: 'home', label: '정책 가이드' }
  if (pathname.startsWith('/guides/response')) return { key: 'home', label: 'CS 대응 매뉴얼' }
  if (pathname.startsWith('/guides/waitlist')) return { key: 'class-mgmt', label: '대기번호 가이드' }
  if (pathname.startsWith('/guides/recruit')) return { key: 'home', label: '모집 접수 가이드' }
  if (pathname.startsWith('/guides/')) return { key: 'home', label: '가이드' }
  if (pathname === '/guides') return { key: 'home', label: '가이드 목록' }

  // /modules/:category
  if (pathname.startsWith('/modules/customer')) return { key: 'cust-search', label: '고객 관리' }
  if (pathname.startsWith('/modules/billing')) return { key: 'bill-list', label: '청구/수납' }
  if (pathname.startsWith('/modules/operation')) return { key: 'class-mgmt', label: '수업운영' }
  if (pathname.startsWith('/modules/course')) return { key: 'home', label: '강좌/교재' }
  if (pathname.startsWith('/modules/recruit')) return { key: 'home', label: '모집/접수' }
  if (pathname.startsWith('/modules/message')) return { key: 'home', label: '메시지 발송' }
  if (pathname.startsWith('/modules/system')) return { key: 'home', label: '공통/시스템' }
  if (pathname.startsWith('/modules/')) return { key: 'home', label: '모듈' }

  if (pathname.startsWith('/admin')) return { key: 'home', label: '관리자' }
  if (pathname.startsWith('/editor')) return { key: 'home', label: '에디터' }
  if (pathname.startsWith('/settings')) return { key: 'home', label: '설정' }

  return { key: 'home', label: '홈' }
}

export default function Layout() {
  const { pathname } = useLocation()
  const chatbotCtx = useMemo(() => deriveChatbotContext(pathname), [pathname])

  // devMode = 개발 환경에서만 4단계 셀렉터 노출
  const devMode = import.meta.env.DEV

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 px-4">
          <SidebarTrigger className="-ml-1" />
          <GlobalHeaderActions />
        </header>
        <main className="flex-1">
          <Outlet />
        </main>

        {/*
          AMS Wiki 챗봇 (4단계 로드맵 — 6월 1주 FAQ 베타 → Q4 NL2SQL)
          ErrorBoundary + Suspense로 격리 — 위젯 자체 에러가 본 앱을 죽이지 않음.
          ⌘ + / 단축키로 토글, Esc로 닫기.
        */}
        {CHATBOT_ENABLED && (
          <ChatbotErrorBoundary>
            <Suspense fallback={null}>
              <Chatbot
                contextKey={chatbotCtx.key}
                contextLabel={chatbotCtx.label}
                userName="명준"
                devMode={devMode}
                onOpenGuide={(slug) => {
                  window.location.assign(`/guides/${slug}`)
                }}
              />
            </Suspense>
          </ChatbotErrorBoundary>
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}
