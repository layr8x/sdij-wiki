// src/hooks/useManagerFaq.js
// 챗봇/FAQ 가 참조하는 매니저 가이드 데이터를 런타임에 /api/faq 에서 실시간 수신.
//
// - 외부 업스트림(MANAGER_FAQ_URL) 이 설정돼 있으면 서버리스가 그쪽에서 받아옴
//   → 코드 재배포 없이 최신 FAQ 가 챗봇·FAQ 페이지에 반영(실시간).
// - 네트워크 실패 / API 미가용(로컬 preview 등) 시 번들 데이터로 즉시 폴백.

import { useQuery } from '@tanstack/react-query'
import { MANAGER_FAQ } from '@/data/managerFaq'

async function fetchManagerFaq() {
  const res = await fetch('/api/faq', { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`faq ${res.status}`)
  const json = await res.json()
  return Array.isArray(json.faq) && json.faq.length ? json.faq : MANAGER_FAQ
}

export function useManagerFaq() {
  const { data } = useQuery({
    queryKey: ['manager-faq'],
    queryFn: fetchManagerFaq,
    placeholderData: MANAGER_FAQ,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
  return data && data.length ? data : MANAGER_FAQ
}

export default useManagerFaq
