// src/hooks/useManagerFaq.js
// 챗봇/FAQ 가 참조하는 매니저 가이드 데이터.
//
// - 기본: 앱 내 번들 데이터(src/data/managerFaq.js)를 단일 원본으로 사용.
// - 실시간(선택): 빌드 시 VITE_MANAGER_FAQ_URL 에 외부 JSON 주소를 넣으면
//   클라이언트가 런타임에 그 주소에서 최신 FAQ 를 받아온다(서버리스 함수 불필요).
//   네트워크 실패/미설정 시 번들 데이터로 즉시 폴백.
//
// 서버리스 함수(api/faq.js)를 쓰지 않는 이유: Vercel Hobby 플랜은 배포당
// 서버리스 함수가 12개로 제한되며, 기존 12개(confluence·jira·oauth·sync 등)로
// 이미 한도에 도달해 있어 함수를 추가하면 배포가 실패한다. 클라이언트 직접
// fetch 방식은 함수를 추가하지 않으므로 한도 안에서 실시간 참조가 가능하다.

import { useQuery } from '@tanstack/react-query'
import { MANAGER_FAQ } from '@/data/managerFaq'

const UPSTREAM = import.meta.env.VITE_MANAGER_FAQ_URL

// 외부 응답을 표준 스키마로 정규화 (필드명이 달라도 흡수)
function normalize(items) {
  if (!Array.isArray(items)) return null
  const out = items
    .map((it, i) => ({
      id: String(it.id ?? it.guideId ?? `mfaq-${i + 1}`),
      category: String(it.category ?? it.group ?? '기타'),
      q: String(it.q ?? it.question ?? it.title ?? '').trim(),
      a: String(it.a ?? it.answer ?? it.content ?? it.body ?? '').trim(),
      guideId: it.guideId ?? it.guide_id ?? it.slug ?? null,
    }))
    .filter((it) => it.q && it.a)
  return out.length ? out : null
}

async function fetchManagerFaq() {
  const res = await fetch(UPSTREAM, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`faq ${res.status}`)
  const json = await res.json()
  return normalize(Array.isArray(json) ? json : (json.faq ?? json.items ?? json.data)) || MANAGER_FAQ
}

export function useManagerFaq() {
  const { data } = useQuery({
    queryKey: ['manager-faq'],
    queryFn: fetchManagerFaq,
    enabled: Boolean(UPSTREAM), // 외부 주소가 설정된 경우에만 네트워크 호출
    placeholderData: MANAGER_FAQ,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
  return data && data.length ? data : MANAGER_FAQ
}

export default useManagerFaq
