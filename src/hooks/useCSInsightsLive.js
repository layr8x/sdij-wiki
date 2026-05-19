// src/hooks/useCSInsightsLive.js
// 카카오 webhook 실시간 통계 + 정적 csInsights 메타데이터 머지.
//
// 데이터 흐름:
//   학부모 카톡 → 카카오 채널 → Edge Function (kakao-webhook)
//   → public.kakao_messages 테이블 → public.kakao_category_stats 뷰
//   → 이 hook → React 컴포넌트
//
// Supabase 미설정 또는 빈 테이블이면 정적 csInsights.CUSTOMER_CATEGORIES 그대로 반환.

import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseEnabled } from '../lib/supabase'
import { CUSTOMER_CATEGORIES } from '../data/csInsights'

// ─── DB 뷰 → 정적 메타 머지 ─────────────────────────────────────────────
function mergeWithStatic(liveRows) {
  if (!liveRows || liveRows.length === 0) {
    return { source: 'static', categories: CUSTOMER_CATEGORIES, lastReceivedAt: null }
  }

  const liveById = new Map(liveRows.map((r) => [r.id, r]))
  let lastReceivedAt = null

  const merged = CUSTOMER_CATEGORIES.map((cat) => {
    const live = liveById.get(cat.id)
    if (!live) return cat
    if (live.last_received_at && (!lastReceivedAt || live.last_received_at > lastReceivedAt)) {
      lastReceivedAt = live.last_received_at
    }
    return {
      ...cat,
      count: live.count,
      share: Number(live.share),
      negativeRate: Number(live.negative_rate),
      avgSentimentScore: live.avg_sentiment_score != null ? Number(live.avg_sentiment_score) : undefined,
    }
  })

  // live 에만 있는 신규 카테고리 (룰셋 변경 후) — 메타 미스인 채로 append
  const knownIds = new Set(CUSTOMER_CATEGORIES.map((c) => c.id))
  for (const live of liveRows) {
    if (!knownIds.has(live.id)) {
      merged.push({
        id: live.id,
        label: live.label,
        count: live.count,
        share: Number(live.share),
        negativeRate: Number(live.negative_rate),
        rank: merged.length + 1,
        wikiMapping: null,
        actionableType: 'unknown',
        actionNote: '(메타 미정의 — csInsights.js 에 추가 필요)',
      })
    }
  }

  // count 내림차순 정렬 + rank 재산정
  merged.sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
  merged.forEach((c, i) => { c.rank = i + 1 })

  return { source: 'live', categories: merged, lastReceivedAt }
}

// ─── 카테고리 통계 (90일 윈도우, 뷰 직접 쿼리) ──────────────────────────
export function useCSInsightsLive({ refetchInterval = 60_000 } = {}) {
  return useQuery({
    queryKey: ['cs-insights', 'live'],
    queryFn: async () => {
      if (!isSupabaseEnabled) return mergeWithStatic(null)
      const { data, error } = await supabase
        .from('kakao_category_stats')
        .select('*')
      if (error) {
        // 마이그레이션 미적용 등 — 정적 폴백
        if (import.meta.env.DEV) console.warn('[useCSInsightsLive] fallback to static:', error.message)
        return mergeWithStatic(null)
      }
      return mergeWithStatic(data)
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchInterval,
    refetchOnWindowFocus: true,
  })
}

// ─── 일별 볼륨 트렌드 (kakao_daily_volume 뷰) ───────────────────────────
export function useKakaoDailyVolume() {
  return useQuery({
    queryKey: ['cs-insights', 'daily-volume'],
    queryFn: async () => {
      if (!isSupabaseEnabled) return []
      const { data, error } = await supabase
        .from('kakao_daily_volume')
        .select('*')
        .limit(90)
      if (error) {
        if (import.meta.env.DEV) console.warn('[useKakaoDailyVolume] fallback:', error.message)
        return []
      }
      return data ?? []
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  })
}
