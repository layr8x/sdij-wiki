// src/data/insights.js
// 단과오플 + 채널톡 14,493건 분석 인사이트 (2026-05-20 갱신)
// 출처: 단과오플_분석리포트_20260520.md, 채널톡마이클래스_분석리포트_20260520.md
// 챗봇 UI에 직접 반영되는 12개 핵심 발견 (CRISP-DM + RICE + 5 Whys).

/**
 * 시간대별 부정율 (실데이터 계산값 — 채널톡 사용자 메시지 기준)
 * peak 부정율: 21시 27.7% (최고), 20시 21.2%, 23시 19.0%, 08시 19.6%, 09시 18.6%
 * peak 볼륨: 10시 476, 17시 475, 14시 455 (학원 출/하원 직후)
 */
export const TIME_BAND_INSIGHTS = {
  // 부정율 ≥ 18% 시간대 — 자가해결 우선 노출 + 매니저 라우팅 강화
  highNegative: { hours: [8, 9, 15, 20, 21, 22, 23, 0], note: '부정 시그널 ≥ 18%' },
  // 볼륨 peak — 응답 지연 위험 (실장 업무 폭주)
  volumePeak: { hours: [10, 11, 14, 15, 16, 17, 18], note: '메시지 폭주 — 챗봇 우선 응답 권장' },
  // CS 부재 시간 — 챗봇 자가해결 필수
  offHours: { hours: [0, 1, 2, 3, 4, 5, 6, 7, 23], note: 'CS 응대 시간 외 — 자가해결 챗봇 필수' },
  // 야간 좌절 peak (21시 27.7%)
  nightFrustration: { hours: [20, 21, 22, 23], note: '야간 학습 직후 좌절 — 즉시 자가해결 가이드' },
}

export function getCurrentTimeBand(date = new Date()) {
  const h = date.getHours()
  if (TIME_BAND_INSIGHTS.nightFrustration.hours.includes(h)) return 'night-frustration'
  if (TIME_BAND_INSIGHTS.highNegative.hours.includes(h)) return 'high-negative'
  if (TIME_BAND_INSIGHTS.offHours.hours.includes(h)) return 'off-hours'
  if (TIME_BAND_INSIGHTS.volumePeak.hours.includes(h)) return 'volume-peak'
  return 'normal'
}

/**
 * 요일 패턴 — 채널톡 분석 (월요일 18.4% 폭주)
 * 월: 862 (1위) > 화: 729 > 금: 711 > 토: 709 > 수: 623 > 목: 576 > 일: 485
 */
export const WEEKDAY_PATTERNS = {
  monday: { volumeShare: 0.184, label: '월요일 폭주', note: '주말 누적 → 월요일 오전 9-10시 인력 boost 필요' },
  friday: { volumeShare: 0.152, label: '금요일 2위', note: '주말 직전 마무리 문의' },
  weekend: { volumeShare: 0.255, label: '주말', note: '학부모 문의 비중 ↑' },
}

export function getWeekdaySignal(date = new Date()) {
  const day = date.getDay() // 0=일, 1=월, ...
  if (day === 1) return WEEKDAY_PATTERNS.monday
  if (day === 5) return WEEKDAY_PATTERNS.friday
  if (day === 0 || day === 6) return WEEKDAY_PATTERNS.weekend
  return null
}

/**
 * 매니저 specialty 라우팅 — 9 매니저별 전문 영역
 * 단과 카톡 응답자 부하 분석에 따라 분산 라우팅 권장.
 * 현재 황인규 QA 45.8% 응답 SPOF — 분산 필요.
 */
export const MANAGER_SPECIALTY = [
  { name: '박미혜', specialties: ['청구', '결제', '환불', '정산'] },
  { name: '황인규', specialties: ['플레이어', '영상', '재생', '9203', 'VOD', '동보', 'OKTA'] },
  { name: '이혜빈', specialties: ['회원', '통합회원', '병합', '개인정보', '동의'] },
  { name: '서청훈', specialties: ['OKTA', '인증', '권한', 'VPN', '계정'] },
  { name: '박형준', specialties: ['BI', '통계', '데이터', '추출', '리포트'] },
  { name: '조호영', specialties: ['디자인', 'UI', '디자인시스템'] },
  { name: '김수민', specialties: ['청구', '결제', '환불', '회원'] },
  { name: '신정현', specialties: ['출결', '보강', '입반', '대기'] },
  { name: '주영훈', specialties: ['강좌', '반관리', '교재', '연결'] },
  { name: '김명준', specialties: ['UX', 'UI', '데이터', '통합회원', '챗봇'] },
]

export function getRecommendedManagers(category) {
  const categoryKeywords = {
    okta: ['OKTA', '인증', '권한', 'VPN', '계정'],
    refund: ['환불', '취소', '청구'],
    payment: ['결제', '청구', '수강료', '납부'],
    payment_refund: ['결제', '환불', '청구'],
    enrollment: ['입반', '대기', '접수'],
    attendance: ['출결', '보강', '출석'],
    member: ['회원', '병합', '통합회원', '개인정보'],
    member_data: ['회원', '병합', '통합회원'],
    course: ['강좌', '반관리'],
    message: ['문자', '메시지'],
    messaging: ['문자', '메시지'],
    player: ['플레이어', '영상', '9203', 'VOD'],
    video_playback: ['영상', '플레이어', '9203'],
    login_account: ['OKTA', '인증', '계정'],
  }
  const kws = categoryKeywords[category] || []
  return MANAGER_SPECIALTY
    .filter(m => m.specialties.some(s => kws.includes(s)))
    .map(m => m.name)
    .slice(0, 3)
}

/**
 * 시즌 효과 — 실데이터 검증
 * 채널톡 12-1월 = 전체의 80% (신학기 + 신규 가입 폭증)
 * 단과 1-2월 = 입반·교재 배부·결제 트리플 콜리전
 */
export const SEASON_EFFECTS = [
  { months: [12, 1, 2], hot: ['login_account', 'myclass_app', 'enrollment', 'payment_refund'], note: '신학기·신규 가입 폭증 — capacity 2-3배 필요', impact: 'critical' },
  { months: [3, 9], hot: ['enrollment', 'member', 'payment'], note: '신학기 입반/회원 등록', impact: 'high' },
  { months: [6, 12], hot: ['refund', 'payment', 'attendance'], note: '정산 마감 · 환불 처리', impact: 'high' },
  { months: [7], hot: ['course', 'enrollment'], note: '강좌 일괄 등록 시즌', impact: 'medium' },
]
export function getSeasonalHotCategories(date = new Date()) {
  const m = date.getMonth() + 1
  const season = SEASON_EFFECTS.find(s => s.months.includes(m))
  return season ? { categories: season.hot, note: season.note, impact: season.impact } : null
}

/**
 * 부정 시그널 매트릭스 — 채널톡 실측값 (2026-05-20)
 * payment_refund 63.6% = 압도 1위 → 즉시 사람 핸드오프
 * 카테고리: [실측 부정율, 메시지 수, 부정 시그널 수]
 */
export const NEGATIVE_SIGNAL_BY_CATEGORY = {
  payment_refund: { rate: 0.636, total: 118, negative: 75, action: 'IMMEDIATE_HUMAN_HANDOFF' },
  video_playback: { rate: 0.256, total: 484, negative: 124, action: 'SELF_DIAGNOSE_THEN_HUMAN' },
  schedule_attendance: { rate: 0.214, total: 257, negative: 55, action: 'GUIDE_FIRST' },
  login_account: { rate: 0.202, total: 827, negative: 167, action: 'SELF_SERVE' },
  registration: { rate: 0.162, total: 308, negative: 50, action: 'GUIDE_FIRST' },
  parent_inquiry: { rate: 0.114, total: 70, negative: 8, action: 'HUMAN_PREFERRED' },
  myclass_app: { rate: 0.060, total: 634, negative: 38, action: 'SELF_DIAGNOSE' },
  consultation: { rate: 0.075, total: 187, negative: 14, action: 'NORMAL' },
}

/**
 * 응답 SLA (채널톡 실측값)
 * 중앙값 3분, 평균 21.4분, P95 28.6분
 * myclass_app 평균 87.7분 — long-tail 최악 (트러블슈팅 장기화)
 */
export const SLA_STATS = {
  overall: { median_min: 3.0, mean_min: 21.4, p75_min: 7.7, p90_min: 17.9, p95_min: 28.6, over60_pct: 1.9 },
  byCategory: {
    parent_inquiry: { median: 0.9, mean: 1.1 },
    bug_error: { median: 2.3, mean: 2.3 },
    registration: { median: 2.3, mean: 6.3 },
    video_playback: { median: 2.4, mean: 8.8 },
    general: { median: 2.8, mean: 5.4 },
    consultation: { median: 3.4, mean: 4.9 },
    myclass_app: { median: 3.5, mean: 87.7, alert: 'long-tail 트러블슈팅 장기화 — 인앱 로그 자동 업로드 필요' },
    login_account: { median: 3.6, mean: 6.8 },
    schedule_attendance: { median: 4.8, mean: 7.7 },
    payment_refund: { median: 8.3, mean: 8.6 },
  },
  source: '채널톡 myclass_kakao_chats_251222-260310.csv',
}

/**
 * 응답자 SPOF — 단과 카톡 분석
 * 황인규 QA 1,092회 (45.8%) — 단일 응답 SPOF
 * TOP 2 QA가 59% 처리. 결원 시 운영 마비.
 */
export const RESPONDER_LOAD = {
  spof: { name: '플랫폼서비스실 황인규 QA', count: 1092, share: 0.458 },
  top2Share: 0.59,
  top4Share: 0.733,
  insight: 'QA 2명이 59% 응답 — 분산 라우팅 즉시 필요',
  source: '단과오플_정제데이터_20260520.csv',
}

/**
 * 최다 질문자 — 단과 카톡 분석
 * 목동 윤연진 813회 (26.0%) — 단일 인물 1/4 점유. 5 Whys 분석 필요.
 */
export const TOP_QUESTIONERS = [
  { name: '목동 윤연진', count: 813, share: 0.260, note: '목동 지점 데이터 무결성 5 Whys 분석 필요' },
  { name: '대치 고3 이지호', count: 114, share: 0.036 },
  { name: '목동정산 김완진', count: 95, share: 0.030 },
  { name: '대치고3 최명희', count: 86, share: 0.028 },
]

/**
 * SOP 자생화 패턴 — 단과 카톡 분석 (이전 분석 보존)
 * 실장들이 자체 만든 SOP가 컨플 가이드 배포 후 -77% 감소.
 */
export const SOP_SELF_GENERATION = {
  beforeGuide: { caseCount: 1320, source: '실장 자체 답변' },
  afterGuide: { caseCount: 304, drop: -0.77, source: '컨플 회원 병합 가이드 4/27 배포' },
  insight: '공식 SOP 배포 시 자체 답변 -77% — 챗봇이 SSOT(컨플) 자동 인용 시 효과 극대화',
}

/**
 * 회원 병합 가이드 4/27 배포 영향
 */
export const CUST_MERGE_IMPACT = {
  guidePublishedAt: '2026-04-27',
  source: 'AMS 회원 병합 가이드 v2.3',
  beforeQuestions: 342,
  afterQuestions: 78,
  reductionRate: -0.77,
  confidenceLevel: 'high',
  evidence: 'Confluence 2074902529',
}

/**
 * 영상 9203 자가진단 (75% 즉시 해결) — 4단계 lazy escalation
 */
export const VIDEO_9203_SELFCARE = {
  steps: [
    { n: 1, action: '로그아웃 후 재로그인', successRate: 0.75 },
    { n: 2, action: 'QR 학원 연동 재확인', successRate: 0.12 },
    { n: 3, action: '와이파이 ↔ 모바일데이터 전환', successRate: 0.08 },
    { n: 4, action: '앱 재설치', successRate: 0.05 },
  ],
  escalationAfter: 4,
  insight: '4단계 자가진단으로 95% 해결. 5단계부터 플서실 직접 연락.',
}

/**
 * RICE 우선순위 — 2026-05-20 분석 기반 액션
 * 양 데이터셋 (단과 + 채널톡) 통합 액션 9종.
 * RICE = (Reach × Impact × Confidence) / Effort
 */
export const RICE_PRIORITIES = [
  { id: 'payment-handoff', topic: '결제·환불 즉시 사람 핸드오프', reach: 200, impact: 3, confidence: 0.9, effort: 2, score: 270.0, source: '채널톡 payment_refund 부정율 63.6%' },
  { id: 'login-selfdiag', topic: '로그인/계정 자가진단 챗봇', reach: 1500, impact: 3, confidence: 0.8, effort: 5, score: 72.0, source: '채널톡 login_account 827건' },
  { id: 'monday-boost', topic: '월요일 9-10시 인력 boost', reach: 800, impact: 2, confidence: 0.9, effort: 2, score: 72.0, source: '월요일 18.4% 폭주' },
  { id: 'form-prefill', topic: '본인확인 양식 자동 prefill', reach: 1500, impact: 2, confidence: 0.7, effort: 3, score: 70.0, source: '채널톡 양식 키워드 빈도 ≥ 240' },
  { id: 'sla-dashboard', topic: 'SLA 모니터링 대시보드', reach: 80, impact: 2, confidence: 0.9, effort: 3, score: 48.0, source: '단과 부정율 12-13시·21시 peak' },
  { id: 'night-selfserve', topic: '야간(20-22시) 자가해결 알림', reach: 800, impact: 3, confidence: 0.8, effort: 4, score: 48.0, source: '채널톡 21시 부정율 27.7%' },
  { id: 'response-routing', topic: 'QA 외 4명 (박미혜·신정현·김명준·조호영) 라우팅 명시', reach: 80, impact: 3, confidence: 0.6, effort: 5, score: 28.8, source: '단과 황인규 SPOF 45.8%' },
  { id: 'refund-followup', topic: '환불 라이프사이클 자동 안내톡 (24/72h)', reach: 200, impact: 2, confidence: 0.7, effort: 10, score: 28.0, source: '단과 환불대기 59건' },
  { id: 'video-env-diag', topic: '영상 재생 환경 자동 진단 + 9203 추천', reach: 900, impact: 2, confidence: 0.7, effort: 7, score: 18.0, source: '채널톡 video_playback 부정율 25.6%' },
]

/**
 * 즉시 핸드오프 룰 — 부정율 ≥ 50% 카테고리는 챗봇 응답 스킵
 */
export const ESCALATION_RULES = {
  IMMEDIATE_HUMAN_HANDOFF: {
    categories: ['payment_refund'],
    trigger: 'category match',
    note: 'payment_refund 부정율 63.6% — 챗봇 응답 스킵, 즉시 결제팀 알람',
  },
  HIGH_NEGATIVE_HANDOFF: {
    threshold: 0.25, // 부정율 25% 이상
    trigger: 'category negativeRate ≥ 25%',
    note: 'video_playback / schedule_attendance — 자가해결 1회 시도 후 즉시 핸드오프',
  },
  NIGHT_FRUSTRATION_HANDOFF: {
    timeBand: 'night-frustration',
    trigger: '20:00 ≤ hour ≤ 23:00 + negative signal',
    note: '야간 부정 시그널 → 다음 day 첫 출근자 직접 follow-up 예약',
  },
}

/**
 * 챗봇 컨텍스트 시그널 — 시간/요일/시즌 종합
 * Chatbot.jsx에서 import해서 ContextBanner에 자동 노출.
 */
export function getContextualHints(opts = {}) {
  const now = opts.now || new Date()
  const timeBand = getCurrentTimeBand(now)
  const weekday = getWeekdaySignal(now)
  const season = getSeasonalHotCategories(now)
  const hints = []
  if (timeBand === 'night-frustration') {
    hints.push({ icon: '🌙', text: '야간 시간대 — CS 응대 시간 외, 자가해결 챗봇 우선', priority: 'high' })
  } else if (timeBand === 'off-hours') {
    hints.push({ icon: '🌙', text: 'CS 응대 시간 외 — 자가해결 가이드 우선', priority: 'high' })
  } else if (timeBand === 'volume-peak') {
    hints.push({ icon: '⏰', text: '메시지 폭주 시간 — 챗봇 응답이 더 빠를 수 있음', priority: 'medium' })
  } else if (timeBand === 'high-negative') {
    hints.push({ icon: '⚠️', text: '문의가 누적되는 시간대 — 챗봇 셀프서브 권장', priority: 'medium' })
  }
  if (weekday?.label === '월요일 폭주') {
    hints.push({ icon: '📈', text: '월요일 — 평소보다 응답이 길 수 있음', priority: 'medium' })
  }
  if (season?.impact === 'critical') {
    hints.push({ icon: '🔥', text: `시즌 인사이트: ${season.note}`, priority: 'high' })
  } else if (season) {
    hints.push({ icon: '📅', text: `시즌 인사이트: ${season.note}`, priority: 'low' })
  }
  return hints
}

/**
 * 카테고리별 챗봇 응답 모드 결정 (분석 인사이트 기반)
 */
export function getResponseMode(category, hasNegative = false) {
  const rule = NEGATIVE_SIGNAL_BY_CATEGORY[category]
  if (!rule) return 'NORMAL'
  if (rule.action === 'IMMEDIATE_HUMAN_HANDOFF') return 'ESCALATE_IMMEDIATELY'
  if (hasNegative && rule.rate >= 0.25) return 'ESCALATE_AFTER_ONE_TRY'
  if (rule.action === 'SELF_SERVE') return 'SELF_SERVE_FIRST'
  return 'NORMAL'
}

/**
 * 통계 요약 (2026-05-20 갱신)
 */
export const INSIGHT_STATS = {
  totalCases: 14493,             // 단과 5,689 + 채널톡 8,804
  단과오플: 5689,                  // 정제 메시지 (2025-11-03 ~ 2026-05-11)
  채널톡: 8804,                    // 정제 메시지 (2025-12-22 ~ 2026-03-10)
  채널톡_고유대화: 1119,
  채널톡_부정시그널: 640,
  단과_부정시그널: 614,
  채널톡_응답SLA중앙값_분: 3.0,
  managers: MANAGER_SPECIALTY.length,
  riceActions: RICE_PRIORITIES.length,
  topImpact: CUST_MERGE_IMPACT,
  topPainCategory: 'payment_refund',  // 부정율 63.6%
  topVolumeCategory: 'login_account', // 827건
  analyzedAt: '2026-05-20',
  source: '단과오플_분석리포트_20260520.md, 채널톡마이클래스_분석리포트_20260520.md',
}
