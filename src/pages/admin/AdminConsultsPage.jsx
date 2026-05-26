// src/pages/admin/AdminConsultsPage.jsx — /admin/consults
// 카카오 파트너센터 3채널 상담 로그 뷰어 (kakao_partner_messages, RLS authenticated read).
import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import { maskBody, maskName } from '@/lib/maskPII'
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

const CHANNELS = [
  { id: '_VGAQn', label: '마이클래스' },
  { id: '_TkpPG', label: 'LIVE' },
  { id: '_xfxilXn', label: 'C' },
]
const PAGE_SIZE = 50
const NOW_Y = new Date().getFullYear()
const YEARS = [NOW_Y, NOW_Y - 1, NOW_Y - 2]
const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

const SENDER_META = {
  manager: { base: '상담원', variant: 'default', icon: Headset },
  user: { base: '고객', variant: 'secondary', icon: User },
  system: { base: '시스템', variant: 'outline', icon: Cog },
}

// 보낸이 표기: 상담원(차*희) / 고객(송유림) / 시스템
function senderText(m, nickMap) {
  const meta = SENDER_META[m.sender_type] || SENDER_META.system
  let name = ''
  if (m.sender_type === 'manager') name = m.manager_name || ''
  else if (m.sender_type === 'user') name = nickMap.get(String(m.chat_id)) || ''
  return name ? meta.base + '(' + name + ')' : meta.base
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

// 전체/년/월 → KST 기준 [gte, lt) ISO 범위
function periodRange(year, month) {
  if (year === 'all') return null
  const y = Number(year)
  const pad = (n) => String(n).padStart(2, '0')
  if (month === 'all') {
    return {
      gte: new Date(y + '-01-01T00:00:00+09:00').toISOString(),
      lt: new Date((y + 1) + '-01-01T00:00:00+09:00').toISOString(),
    }
  }
  const m = Number(month)
  const ny = m === 12 ? y + 1 : y
  const nm = m === 12 ? 1 : m + 1
  return {
    gte: new Date(y + '-' + pad(m) + '-01T00:00:00+09:00').toISOString(),
    lt: new Date(ny + '-' + pad(nm) + '-01T00:00:00+09:00').toISOString(),
  }
}

function useChannelCount(profileId) {
  return useQuery({
    queryKey: ['kakao-count', profileId],
    enabled: isSupabaseEnabled,
    retry: 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('kakao_partner_messages').select('*', { count: 'exact', head: true }).eq('profile_id', profileId)
      if (error) throw error
      return count ?? 0
    },
  })
}

function useNicknames(profileId) {
  return useQuery({
    queryKey: ['kakao-nick', profileId],
    enabled: isSupabaseEnabled,
    staleTime: 10 * 60 * 1000,
    retry: 0,
    queryFn: async () => {
      const map = new Map()
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from('kakao_partner_chats').select('chat_id, nickname').eq('profile_id', profileId)
          .order('chat_id', { ascending: true }).range(from, from + 999)
        if (error) throw error
        if (!data || !data.length) break
        for (const r of data) map.set(String(r.chat_id), maskName(r.nickname || ''))
        if (data.length < 1000) break
      }
      return map
    },
  })
}

function useMessages(profileId, query, year, month, limit) {
  return useQuery({
    queryKey: ['kakao-messages', profileId, query, year, month, limit],
    enabled: isSupabaseEnabled,
    placeholderData: keepPreviousData,
    retry: 0,
    queryFn: async () => {
      let q = supabase
        .from('kakao_partner_messages')
        .select('log_id, chat_id, sender_type, message, sent_at, manager_name:raw->manager->>name')
        .eq('profile_id', profileId)
        .order('sent_at', { ascending: false })
        .limit(limit)
      if (query.trim()) q = q.ilike('message', '%' + query.trim() + '%')
      const range = periodRange(year, month)
      if (range) q = q.gte('sent_at', range.gte).lt('sent_at', range.lt)
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
        {isLoading ? <Skeleton className="h-8 w-24" /> : (
          <div className="text-2xl font-semibold tabular-nums">
            {isError ? '—' : (data ?? 0).toLocaleString('ko-KR')}
            <span className="ml-1 text-sm font-normal text-muted-foreground">건</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const selCls = 'h-9 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-foreground/40'

export default function AdminConsultsPage() {
  const [channel, setChannel] = useState(CHANNELS[0].id)
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('all')
  const [month, setMonth] = useState('all')
  const [limit, setLimit] = useState(PAGE_SIZE)

  const { data: nickMap = new Map() } = useNicknames(channel)
  const { data: rows = [], isLoading, isFetching, isError, error } = useMessages(channel, query, year, month, limit)

  const reset = () => setLimit(PAGE_SIZE)
  const onChannel = (id) => { setChannel(id); reset() }
  const onSearch = (e) => { e.preventDefault(); setQuery(input); reset() }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">카카오 상담 로그</h1>
        <p className="mt-1 text-sm text-muted-foreground">파트너센터 3채널 실시간 수집 데이터 · 채널·기간·키워드 조회</p>
      </header>

      {!isSupabaseEnabled && (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          Supabase 환경변수(VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)가 설정되지 않았습니다.
        </CardContent></Card>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CHANNELS.map((ch) => <ChannelKpi key={ch.id} ch={ch} />)}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="채널 선택">
          {CHANNELS.map((ch) => (
            <button
              key={ch.id} onClick={() => onChannel(ch.id)} aria-pressed={channel === ch.id}
              className={'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors '
                + (channel === ch.id ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground')}
            >{ch.label}</button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <select className={selCls} value={year} onChange={(e) => { setYear(e.target.value); reset() }} aria-label="년도">
            <option value="all">전체기간</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select className={selCls} value={month} onChange={(e) => { setMonth(e.target.value); reset() }} disabled={year === 'all'} aria-label="월">
            <option value="all">전체월</option>
            {MONTHS.map((m) => <option key={m} value={m}>{Number(m)}월</option>)}
          </select>
        </div>

        <form onSubmit={onSearch} className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="메시지 검색 후 Enter"
            className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm outline-none focus:border-foreground/40" />
        </form>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            메시지{year !== 'all' ? ' · ' + year + '년' + (month !== 'all' ? ' ' + Number(month) + '월' : '') : ''}{query ? ' · "' + query + '"' : ''}
          </CardTitle>
          {isFetching && <span className="text-xs text-muted-foreground">불러오는 중…</span>}
        </CardHeader>
        <CardContent>
          {isError ? (
            <p className="py-10 text-center text-sm text-destructive">불러오기 실패: {error?.message || '오류'}</p>
          ) : isLoading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">조건에 맞는 메시지가 없습니다.</p>
          ) : (
            <ul className="divide-y">
              {rows.map((m) => {
                const meta = SENDER_META[m.sender_type] || SENDER_META.system
                const Icon = meta.icon
                return (
                  <li key={m.log_id} className="flex items-start gap-3 py-2.5">
                    <span className="w-24 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">{fmtKST(m.sent_at)}</span>
                    <Badge variant={meta.variant} size="sm" className="mt-0.5 shrink-0 max-w-[160px] truncate">
                      <Icon className="mr-1 size-3 shrink-0" />{senderText(m, nickMap)}
                    </Badge>
                    <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm text-foreground">
                      {maskBody(m.message) || <span className="text-muted-foreground">(본문 없음)</span>}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
          {!isLoading && !isError && rows.length >= limit && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>더 보기 (+{PAGE_SIZE})</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
