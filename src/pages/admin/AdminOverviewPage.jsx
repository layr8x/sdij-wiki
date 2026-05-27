// src/pages/admin/AdminOverviewPage.jsx — /admin 대시보드
import { Link } from 'react-router-dom'
import {
  useDashboardStats,
  useModuleStats,
  useRecentGuides,
  useResponseTimeDistribution,
  useChatCategoryDistribution,
  useSentimentTrend,
} from '@/hooks/useGuides'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { getModuleTree } from '@/lib/db'
import {
  FileText,
  Eye,
  ThumbsUp,
  MagnifyingGlass as Search,
  PencilSimple as PencilLine,
} from '@phosphor-icons/react'

const KPI_ITEMS = [
  { key: 'totalGuides', label: '총 가이드', icon: FileText, suffix: '개' },
  { key: 'totalViews',  label: '누적 조회', icon: Eye,      suffix: '회' },
  { key: 'helpfulRate', label: '도움됨률', icon: ThumbsUp,  suffix: '%' },
  { key: 'searchCount', label: '검색 수',   icon: Search,   suffix: '회' },
]

function formatNumber(n) {
  if (typeof n !== 'number') return '—'
  return n.toLocaleString('ko-KR')
}

// 응답시간 버킷별 색상 (빠를수록 안전, 느릴수록 위험).
const BUCKET_TONE = {
  '0-5분':    'bg-emerald-500',
  '5-30분':   'bg-emerald-400',
  '30-60분':  'bg-amber-400',
  '1-3시간':  'bg-amber-500',
  '3-24시간': 'bg-orange-500',
  '24시간+':  'bg-red-500',
}

// 카테고리 id → 한글 라벨 매핑 (classify-kakao-csv.mjs 와 일치)
const CATEGORY_LABELS = {
  'video-content':     '영상재생/콘텐츠',
  'school-link':       '학원등록연동',
  'qr-attendance':     'QR/출석',
  'parent-account':    '학부모/계정통합',
  'refund-payment':    '환불/결제',
  'enrollment':        '수강신청/대기',
  'app-access':        '앱 접근/실행',
  'login-auth':        '로그인/인증',
  'app-bug':           '앱 버그/오류',
  'textbook-delivery': '교재/배송',
  'class-info':        '강좌/수업 정보',
  'misc':              '기타',
}

export default function AdminOverviewPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: moduleStats = {}, isLoading: modsLoading } = useModuleStats()
  const { data: recents = [], isLoading: recentsLoading } = useRecentGuides(8)
  const { data: rtDist, isLoading: rtLoading } = useResponseTimeDistribution(90)
  const { data: catDist, isLoading: catLoading } = useChatCategoryDistribution(90)
  const { data: sentTrend, isLoading: sentLoading } = useSentimentTrend(30)

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AMS Wiki 전체 현황을 한눈에 확인합니다.
          </p>
        </div>
        <Button asChild>
          <Link to="/editor">
            <PencilLine className="mr-1.5 size-4" />
            새 가이드 작성
          </Link>
        </Button>
      </header>

      {/* KPI 카드 */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {KPI_ITEMS.map((item) => {
          const Icon = item.icon
          const value = stats?.[item.key]
          return (
            <Card key={item.key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {item.label}
                </CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-semibold tabular-nums">
                    {formatNumber(value)}<span className="ml-1 text-sm font-normal text-muted-foreground">{item.suffix}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 모듈별 가이드 분포 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">모듈별 가이드 분포</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {modsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))
            ) : (
              getModuleTree().map((mod) => {
                const count = moduleStats[mod.id] || 0
                const max = Math.max(...Object.values(moduleStats), 1)
                const pct = Math.round((count / max) * 100)
                return (
                  <div key={mod.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{mod.label}</span>
                      <span className="tabular-nums text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* 카카오 상담 응답시간 분포 (최근 90일) */}
        {(rtLoading || (rtDist && rtDist.length > 0)) && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">카카오 상담 응답시간 분포 (최근 90일)</CardTitle>
              <p className="text-xs text-muted-foreground">
                학부모 메시지 후 직원 첫 응답까지 걸린 시간을 6개 구간으로 집계.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {rtLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))
              ) : (
                rtDist.map((row) => {
                  const maxPct = Math.max(...rtDist.map(r => r.pct), 1)
                  const widthPct = (row.pct / maxPct) * 100
                  const tone = BUCKET_TONE[row.bucket] || 'bg-primary'
                  return (
                    <div key={row.bucket} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{row.bucket}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatNumber(row.cnt)}건 · {row.pct}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full transition-all ${tone}`}
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        )}

        {/* 카카오 상담 카테고리 분포 (AI 분류) */}
        {(catLoading || (catDist && catDist.length > 0)) && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">카카오 상담 카테고리 분포 (최근 90일, AI 분류)</CardTitle>
              <p className="text-xs text-muted-foreground">
                채팅방을 Claude AI 가 12개 카테고리로 자동 분류. 부정 감정 비율도 함께 표시.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {catLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))
              ) : (
                catDist.map((row) => {
                  const maxPct = Math.max(...catDist.map(r => r.pct), 1)
                  const widthPct = (row.pct / maxPct) * 100
                  const label = CATEGORY_LABELS[row.category] || row.category
                  const isHot = row.negativeRate >= 30
                  return (
                    <div key={row.category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatNumber(row.cnt)}건 · {row.pct}%
                          {row.negativeRate > 0 && (
                            <span className={isHot ? 'ml-2 text-red-500' : 'ml-2 text-muted-foreground'}>
                              · 부정 {row.negativeRate}%
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full transition-all ${isHot ? 'bg-red-500' : 'bg-primary'}`}
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        )}

        {/* 카카오 감정 추세 (일별) */}
        {(sentLoading || (sentTrend && sentTrend.length > 0)) && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">학부모 감정 추세 (최근 30일)</CardTitle>
              <p className="text-xs text-muted-foreground">
                일별 학부모 메시지의 긍정·중립·부정 비율. 부정이 갑자기 늘어나면 위험 신호.
              </p>
            </CardHeader>
            <CardContent>
              {sentLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="flex h-32 items-end gap-1">
                  {sentTrend.map((d) => {
                    const total = d.positive + d.neutral + d.negative
                    if (total === 0) return <div key={d.day} className="flex-1" />
                    const posH = (d.positive / total) * 100
                    const neuH = (d.neutral / total) * 100
                    const negH = (d.negative / total) * 100
                    return (
                      <div
                        key={d.day}
                        className="flex flex-1 flex-col-reverse justify-end overflow-hidden rounded-sm bg-muted"
                        title={`${d.day} · 긍정 ${d.positive} / 중립 ${d.neutral} / 부정 ${d.negative}`}
                      >
                        <div className="bg-red-500" style={{ height: `${negH}%` }} />
                        <div className="bg-muted-foreground/40" style={{ height: `${neuH}%` }} />
                        <div className="bg-emerald-500" style={{ height: `${posH}%` }} />
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="mt-2 flex items-center justify-end gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-emerald-500" /> 긍정</span>
                <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-muted-foreground/40" /> 중립</span>
                <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-red-500" /> 부정</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 최근 업데이트 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">최근 업데이트</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/guides">전체 보기</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recents.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                최근 업데이트된 가이드가 없습니다.
              </p>
            ) : (
              <ul className="divide-y">
                {recents.slice(0, 6).map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-2 py-2">
                    <Link
                      to={`/editor?id=${g.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {g.title}
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{g.type}</Badge>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {g.updated || g.updated_at?.slice(0, 10) || '—'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
