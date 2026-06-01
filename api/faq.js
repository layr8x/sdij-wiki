// api/faq.js — 매니저 FAQ 가이드 실시간 제공 엔드포인트
//
// 전략(외부 업스트림 프록시 + 클라이언트 번들 폴백):
//   - MANAGER_FAQ_URL 이 설정되면 그 외부 소스에서 실시간 fetch 해 반환
//     (예: ams.sdij.com 데이터 API, 구글시트 JSON export, 헤드리스 CMS 등)
//     · 인증 필요 시 MANAGER_FAQ_TOKEN 을 Bearer 로 전달
//   - 미설정/실패 시 빈 배열 반환 → 클라이언트가 번들 데이터로 폴백
//     (src/data/managerFaq.js). 서버리스가 src 를 import 하지 않으므로
//     배포 빌드가 안전하고, 외부 소스 연결만 환경변수로 켜면 된다.
//
// 응답: { faq: Array<{id,category,q,a,guideId}>, source, count, fetchedAt }

const UPSTREAM = process.env.MANAGER_FAQ_URL
const UPSTREAM_TOKEN = process.env.MANAGER_FAQ_TOKEN

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

async function fetchUpstream() {
  const res = await fetch(UPSTREAM, {
    headers: {
      Accept: 'application/json',
      ...(UPSTREAM_TOKEN ? { Authorization: `Bearer ${UPSTREAM_TOKEN}` } : {}),
    },
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`upstream ${res.status}`)
  const json = await res.json()
  return normalize(Array.isArray(json) ? json : json.faq ?? json.items ?? json.data)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  if (UPSTREAM) {
    try {
      const up = await fetchUpstream()
      if (up) {
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
        return res.status(200).json({ faq: up, source: 'upstream', count: up.length, fetchedAt: new Date().toISOString() })
      }
    } catch {
      // 외부 소스 실패 → 클라이언트 번들 폴백
    }
  }

  // 외부 소스 미설정/실패 → 빈 배열(클라이언트가 번들 사용)
  res.setHeader('Cache-Control', 'public, s-maxage=60')
  return res.status(200).json({ faq: [], source: 'bundled', count: 0, fetchedAt: new Date().toISOString() })
}
