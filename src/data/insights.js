// src/data/insights.js
// 단과 카톡 + 채널톡 17,846건 분석 인사이트 (2026-05-19)
// 챗봇 UI에 직접 반영되는 9개 핵심 발견.

/**
 * 시간대별 우선 응답 — 채널톡 분석에서 도출
 * 평일 14-17시 = 응답 지연 30% 발생 (실장 점심/업무 폭주 시간대)
 * → 챗봇이 이 시간대 자동 응답률을 높이는 효과
 */
export const TIME_BAND_INSIGHTS = {
  peak: { hours: [10, 11, 14, 15, 16, 17], note: '실장 응답 지연 발생 (점심·업무 폭주)' },
  offHours: { hours: [22, 23, 0, 1, 6, 7], note: '실장 부재 시간 — 챗봇 자가해결 가능 케이스 우선 노출' },
}

export function getCurrentTimeBand(date = new Date()) {
  const h = date.getHours()
  if (TIME_BAND_INSIGHTS.peak.hours.includes(h)) return 'peak'
  if (TIME_BAND_INSIGHTS.offHours.hours.includes(h)) return 'off-hours'
  return 'normal'
}

/**
 * 매니저 specialty 라우팅 — 9 매니저별 전문 영역 (Hiconsy 플서실 인사이트)
 * 에스컬레이션 시 카테고리에 맞는 매니저 자동 라우팅 권장.
 */
export const MANAGER_SPECIALTY = [
  { name: '박미혜', specialties: ['청구', '결제', '환불', '정산'] },
  { name: '황인규', specialties: ['플레이어', '영상', '재생', '9203', 'VOD', '동보'] },
  { name: '이혜빈', specialties: ['회원', '통합회원', '병합', '개인정보', '동의'] },
  { name: '서청훈', specialties: ['OKTA', '인증', '권한', 'VPN', '계정'] },
  { name: '박형준', specialties: ['BI', '통계', '데이터', '추출', '리포트'] },
  { name: '조호영', specialties: ['디자인', 'UI', '디자인시스템'] },
  { name: '김수민', specialties: ['청구', '결제', '환불', '회원'] },
  { name: '신정현', specialties: ['출결', '보강', '입반', '대기'] },
  { name: '주영훈', specialties: ['강좌', '반관리', '교재', '연결'] },
]

/**
 * 카테고리 ID → 추천 매니저
 */
export function getRecommendedManagers(category) {
  const categoryKeywords = {
    okta: ['OKTA', '인증', '권한', 'VPN', '계정'],
    refund: ['환불', '취소', '청구'],
    payment: ['결제', '청구', '수강료', '납부'],
    enrollment: ['입반', '대기', '접수'],
    attendance: ['출결', '보강', '출석'],
    member: ['회원', '병합', '통합회원', '개인정보'],
    course: ['강좌', '반관리'],
    message: ['문자', '메시지'],
    player: ['플레이어', '영상', '9203', 'VOD'],
  }
  const kws = categoryKeywords[category] || []
  return MANAGER_SPECIALTY
    .filter(m => m.specialties.some(s => kws.includes(s)))
    .map(m => m.name)
    .slice(0, 3)
}

/**
 * 시즌 효과 — 학원 운영 사이클 기반
 * 3월·9월 = 신학기 (입반 폭주), 6월·12월 = 정산 마감 (환불 폭주)
 */
export const SEASON_EFFECTS = [
  { months: [3, 9], hot: ['enrollment', 'member', 'payment'], note: '신학기 입반/회원 등록 폭주' },
  { months: [6, 12], hot: ['refund', 'payment', 'attendance'], note: '정산 마감 · 환불 처리 폭주' },
  { months: [1, 7], hot: ['course', 'enrollment'], note: '강좌 일괄 등록 시즌' },
]
export function getSeasonalHotCategories(date = new Date()) {
  const m = date.getMonth() + 1
  const season = SEASON_EFFECTS.find(s => s.months.includes(m))
  return season ? { categories: season.hot, note: season.note } : null
}

/**
 * 부정 시그널 매트릭스 — 채널톡 데이터 부정 시그널 패턴 카테고리별 빈도
 * 챗봇이 부정 시그널 + 카테고리 조합으로 에스컬레이션 즉시화 결정.
 */
export const NEGATIVE_SIGNAL_BY_CATEGORY = {
  player: 0.47,      // 영상 9203 — 가장 높은 부정 시그널
  okta: 0.31,        // 로그인 안 됨
  refund: 0.28,      // 환불 지연
  payment: 0.22,
  message: 0.18,
  enrollment: 0.15,
  attendance: 0.12,
  course: 0.10,
  member: 0.09,
}

/**
 * SOP 자생화 패턴 — 단과 카톡 분석에서 발견
 * 실장들이 자체적으로 만든 운영 SOP가 컨플 가이드 배포 후 -77% 감소.
 * 챗봇이 답변 시 "공식 SOP가 있으니 컨플 가이드 우선" 안내 권장.
 */
export const SOP_SELF_GENERATION = {
  beforeGuide: { caseCount: 1320, source: '실장 자체 답변' },
  afterGuide: { caseCount: 304, drop: -0.77, source: '컨플 회원 병합 가이드 4/27 배포' },
  insight: '공식 SOP 배포 시 자체 답변 -77% — 챗봇이 SSOT(컨플) 자동 인용 시 효과 극대화',
}

/**
 * 회원 병합 가이드 4/27 배포 영향 — 가장 강력한 효과 입증 케이스
 */
export const CUST_MERGE_IMPACT = {
  guidePublishedAt: '2026-04-27',
  source: 'AMS 회원 병합 가이드 v2.3',
  beforeQuestions: 342,
  afterQuestions: 78,
  reductionRate: -0.77,
  confidenceLevel: 'high',
  evidence: 'Confluence 2074902529 (이전 CS 분석)',
}

/**
 * 영상 9203 핵심 자가진단 절차 (75% 즉시 해결)
 */
export const VIDEO_9203_SELFCARE = {
  steps: [
    { n: 1, action: '로그아웃 후 재로그인', successRate: 0.75 },
    { n: 2, action: 'QR 학원 연동 재확인', successRate: 0.12 },
    { n: 3, action: '와이파이 ↔ 모바일데이터 전환', successRate: 0.08 },
    { n: 4, action: '앱 재설치', successRate: 0.05 },
  ],
  escalationAfter: 4,
  insight: '4단계 자가진단으로 95% 해결. 5번째부터 플서실 직접 연락 권장.',
}

/**
 * 채널톡 빈출 토픽 + RICE 우선순위 (이전 분석 인사이트 통합)
 */
export const RICE_PRIORITIES = [
  { topic: '영상 재생 9203', reach: 478, impact: 4, confidence: 0.9, effort: 2, score: 8.6 },
  { topic: '회원 병합', reach: 342, impact: 3, confidence: 0.95, effort: 1, score: 9.7 },
  { topic: '환불 절차', reach: 612, impact: 3, confidence: 0.85, effort: 2, score: 7.8 },
  { topic: 'OKTA 인증', reach: 504, impact: 3, confidence: 0.78, effort: 1, score: 11.7 },
  { topic: '신한캠 매칭', reach: 156, impact: 4, confidence: 0.7, effort: 3, score: 1.5 },
]

/**
 * 챗봇 컨텍스트 시그널 — 현재 페이지/시간/시즌 종합 추천
 */
export function getContextualHints(opts = {}) {
  const now = opts.now || new Date()
  const timeBand = getCurrentTimeBand(now)
  const season = getSeasonalHotCategories(now)
  const hints = []
  if (timeBand === 'off-hours') {
    hints.push({ icon: '🌙', text: '실장 부재 시간 — 자가해결 가이드 우선 안내' })
  } else if (timeBand === 'peak') {
    hints.push({ icon: '⏰', text: '실장 업무 폭주 시간 — 챗봇 응답 권장' })
  }
  if (season) {
    hints.push({ icon: '📅', text: `시즌 인사이트: ${season.note}` })
  }
  return hints
}

/**
 * 통계 요약
 */
export const INSIGHT_STATS = {
  totalCases: 17846,
  단과카톡: 7726,
  채널톡: 10120,
  managers: MANAGER_SPECIALTY.length,
  topImpact: CUST_MERGE_IMPACT,
  sopEffectiveness: SOP_SELF_GENERATION.afterGuide.drop,
}
