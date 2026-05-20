// src/pages/admin/AdminConsultsPage.jsx — /admin/consults
// 카카오 파트너센터 3채널 상담 로그 뷰어 (kakao_partner_messages, anon read).
import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  MagnifyingGlass as Search,
  ChatText as MessageSquare,
  User,
  Headset,
  Gear as Cog,
} from '@phosphor-icons/react'

// 채널 ID → 표시명
const CHANNELS = [
  { id: '_VGAQn', label: '마이클래스' },
  { id: '_TkpPG', label: '라이브' },
  { id: '_xfxilXn', label: '시대인재 C' },
]
const PAGE_SIZE = 50

const SENDER = {
  manager: { label: '상담원', variant: 'default', icon: Headset },
  user: { label: '고객', variant: 'secondary', icon: User },
  system: { label: '자동', variant: 'outline', icon: Cog },
}

const fmtKST = (iso) => {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(iso))
  } catch { return iso.slice(0, 16).replace('T', ' ') }
}

// 채널별 메시지 수 (KPI)
function useChannelCount(profileId) {
  return useQuery({
    queryKey: ['kakao-count', profileId],
    enabled: isSupabaseEnabled,
    retry: 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('kakao_partner_messages')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId)
      if (error) throw error
      return count ?? 0
    },
  })
}

// 선택 채널 메시지 목록 (검색 + 페이지네이션)
function useMessages(profileId, query, limit) {
  return useQuery({
    queryKey: ['kakao-messages', profileId, query, limit],
    enabled: isSupabaseEnabled,
    placeholderData: keepPreviousData,
    retry: 0,
    queryFn: async () => {
      let q = supabase
        .from('kakao_partner_messages')
        .select('log_id, chat_id, sender_type, message, sent_at')
        .eq('profile_id', profileId)
        .order('sent_at', { ascending: false })
        .limit(limit)
      if (query.trim()) q = q.ilike('message', `%${query.trim()}%`)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })
}

function ChannelKpi({ ch }) {
  const { data, isLoading, isError } = useChannelCount(ch.id)
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{ch.label}</CardTitle>
        <MessageSquare className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-semibold tabular-nums">
            {isError ? '—' : (data ?? 0).toLocaleString('ko-KR')}
            <span className="ml-1 text-sm font-normal text-muted-foreground">건</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function AdminConsultsPage() {
  const [channel, setChannel] = useState(CHANNELS[0].id)
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)

  const { data: rows = [], isLoading, isFetching, isError, error } = useMessages(channel, query, limit)
  const onChannel = (id) => { setChannel(id); setLimit(PAGE_SIZE) }
  const onSearch = (e) => { e.preventDefault(); setQuery(input); setLimit(PAGE_SIZE) }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">카카오 상담 로그</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            파트너센터 3채널 실시간 수집 데이터 · 채널·키워드로 조회
          </p>
        </div>
      </header>

      {!isSupabaseEnabled && (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          Supabase 환경변수(VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)가 설정되지 않았습니다.
        </CardContent></Card>
      )}

      {/* 채널별 KPI */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CHANNELS.map((ch) => <ChannelKpi key={ch.id} ch={ch} />)}
      </section>

      {/* 채널 탭 + 검색 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="채널 선택">
          {CHANNELS.map((ch) => (
            <button
              key={ch.id}
              onClick={() => onChannel(ch.id)}
              aria-pressed={channel === ch.id}
              className={
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
                (channel === ch.id
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground')
              }
            >
              {ch.label}
            </button>
          ))}
        </div>
        <form onSubmit={onSearch} className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지 내용 검색 후 Enter"
            className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm outline-none focus:border-foreground/40"
          />
        </form>
      </div>

      {/* 메시지 목록 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            메시지 {query ? `· "${query}" 검색` : ''}
          </CardTitle>
          {isFetching && <span className="text-xs text-muted-foreground">불러오는 중…</span>}
        </CardHeader>
        <CardContent>
          {isError ? (
            <p className="py-10 text-center text-sm text-destructive">
              불러오기 실패: {error?.message || '알 수 없는 오류'}
            </p>
          ) : isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {query ? '검색 결과가 없습니다.' : '메시지가 없습니다.'}
            </p>
          ) : (
            <ul className="divide-y">
              {rows.map((m) => {
                const s = SENDER[m.sender_type] || SENDER.system
                const Icon = s.icon
                return (
                  <li key={m.log_id} className="flex items-start gap-3 py-2.5">
                    <span className="w-24 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">
                      {fmtKST(m.sent_at)}
                    </span>
                    <Badge variant={s.variant} size="sm" className="mt-0.5 shrink-0">
                      <Icon className="mr-1 size-3" />{s.label}
                    </Badge>
                    <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm text-foreground">
                      {m.message || <span className="text-muted-foreground">(본문 없음)</span>}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}

          {!isLoading && !isError && rows.length >= limit && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                더 보기 (+{PAGE_SIZE})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
