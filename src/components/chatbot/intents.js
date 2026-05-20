// src/components/chatbot/intents.js
// AMS Wiki 챗봇 — 의도 분석 + 응답 생성 + 인용 메타 + Trust Calibration (v5)
//
// 출처: 채널톡/단과 카톡 17,846건 분석 + 컨플 카카오 매뉴얼 v1.0(1845723524)
//        + 실장님 운영 시트 「AMS_챗봇_QA_관리」 25 Q&A · 8 카테고리 (2026-05-19)
//        + FVSOL 컨플 업무 가이드 인덱스 (1378910256) 매핑
//
// 적용 권위자 패턴 (2026-05-19 v5):
//  - Perplexity 2025: 인라인 [1] 시각 인용 + 호버 미리보기 → citations[] 메타
//  - Cathy Pearl (Google Conversation Design): Multi-turn memory + sample dialogues
//  - Maggie Appleton 2025: "Beyond Conversational" — preset / refine 패턴
//  - NIST Trust Calibration 2025: confidence badge + "추정" 라벨 → CONFIDENCE_BANDS
//  - Erika Hall (Mule): Grice's Cooperative Maxim — 능력/한계 고지
//  - Steve Krug: Don't Make Me Think — 즉시 인지 가능한 위트포인트
//  - v5 추가: 실장님 시트의 「자가해결 여부」 라벨을 응답 분기 핵심 신호로 채택
//    (가능 → 자가해결 카드, 불가 → 즉시 EscalationCTA + 슬랙 제목 자동, 부분 → 양분)

import {
  OFFICIAL_QA,
  OFFICIAL_QA_CATEGORIES,
  matchOfficialQa as matchOfficialQaRaw,
  getQaByCategory,
} from '@/data/officialQa'
import {
  AMS_GUIDES,
  FVSOL_GROUPS,
  getConfluenceGroupsForCategory,
  getAmsGuidesForCategory,
  buildConfluenceUrl,
} from '@/data/guides/confluence-sources'

export {
  OFFICIAL_QA, OFFICIAL_QA_CATEGORIES, getQaByCategory,
  AMS_GUIDES, FVSOL_GROUPS,
  getConfluenceGroupsForCategory, getAmsGuidesForCategory, buildConfluenceUrl,
}

/**
 * v5+ 신규: 시트 카테고리 → 관련 Confluence 가이드 자동 인용 빌더
 * 챗봇 답변 마지막에 "관련 가이드 N개 (FVSOL)" 형태로 자동 표시.
 */
export function getRelatedGuidesForQa(qa) {
  if (!qa || !qa.category) return []
  const fvsolGroups = getConfluenceGroupsForCategory(qa.category)
  const amsGuides = getAmsGuidesForCategory(qa.category)
  const related = []
  for (const g of fvsolGroups) {
    for (const p of g.pages.slice(0, 3)) {
      related.push({
        kind: 'fvsol', space: 'FVSOL', id: p.id, title: p.title,
        group: g.label, url: buildConfluenceUrl('FVSOL', p.id),
      })
    }
  }
  for (const a of amsGuides) {
    related.push({
      kind: 'ams', space: 'AMS', id: a.id, title: a.title,
      group: '운영 SOP', updatedAt: a.updatedAt, url: a.url,
    })
  }
  return related.slice(0, 5)
}

/**
 * 의도 분석 규칙 — 키워드 매칭 + 컨피던스 스코어
 * 1차 (FAQ 하드코딩) 단계에서 사용.
 * 2차 (RAG)에서는 LLM이 본 규칙을 대체.
 */
export const INTENT_RULES = [
  {
    intent: 'cust-merge',
    keywords: ['병합', '이관', '통합회원', '로컬회원', '중복계정', '계정 통합', '회원통합'],
    docSlug: 'cust-merge-v2',
    confidence: 0.92,
    category: '고객(원생) 관리',
    title: '회원 병합 / 계정 이관',
  },
  {
    intent: 'class-withdraw',
    keywords: ['퇴반', '입반', '출결마감', '퇴원'],
    docSlug: 'class-withdraw',
    confidence: 0.88,
    category: '수업운영 관리',
    title: '퇴반 처리 가이드',
  },
  {
    intent: 'bill-refund',
    keywords: ['환불', '중복결제', '승인번호', '환불대기'],
    docSlug: 'bill-refund',
    confidence: 0.85,
    category: '청구/수납 관리',
    title: '환불요청 처리',
  },
  {
    intent: 'video-error',
    keywords: ['영상', '재생', '9203', '플레이어', '로딩', 'VOD'],
    docSlug: 'player-trouble-9203',
    confidence: 0.86,
    category: '플레이어',
    title: '영상 재생 자가진단',
  },
  {
    intent: 'okta-auth',
    keywords: ['okta', '옥타', '로그인', '인증', '비밀번호', '비번', '인증메일'],
    docSlug: 'okta-trouble',
    confidence: 0.78,
    category: '인증',
    title: 'OKTA 인증 가이드',
  },
  {
    intent: 'app-install',
    keywords: ['앱 설치', '어플 설치', '재설치', '가입하기', '활성화 안돼'],
    docSlug: 'app-install',
    confidence: 0.84,
    category: '앱/디바이스',
    title: '앱 설치 가이드',
  },
  {
    intent: 'unpaid',
    keywords: ['미납', '연체', '납부기한', '미납 학생'],
    docSlug: 'bill-unpaid',
    confidence: 0.78,
    category: '청구/수납 관리',
    title: '미납 조회',
    isData: true, // NL2SQL (4차) 대상
  },
  {
    intent: 'qr-attend',
    keywords: ['QR', '출결', '출석', '브릿지관'],
    docSlug: 'qr-attendance',
    confidence: 0.82,
    category: '출결QR앱',
    title: 'QR 출결 가이드',
  },
  {
    intent: 'book-link',
    keywords: ['교재', '교재 연결', '교재배부'],
    docSlug: 'book-link',
    confidence: 0.80,
    category: '강좌/교재 관리',
    title: '교재 연결 가이드',
  },
]

/**
 * 부정/긴급 시그널 감지 — 본 분석 채널톡 데이터의 부정 시그널 패턴 그대로.
 * 시스템 오류 카테고리에서 42.1% 발생.
 */
export const NEGATIVE_SIGNAL_PATTERN =
  /안\s*돼|안돼|왜\s*안|아직|언제|급해|급한|빨리|지연|불편|불만|당장|즉시|문제|에러|오류|먹통|망함|짜증|화나|미치/

/**
 * 사용자 입력에서 의도 + 컨피던스 + 부정 시그널을 추출.
 * v5: OFFICIAL_QA(실장님 시트 25 Q&A) 우선 매칭 → fallback to INTENT_RULES.
 * 반환: { intent, confidence, isNegative, doc?, officialQa? }
 */
export function detectIntent(text) {
  if (!text || typeof text !== 'string') {
    return { intent: null, confidence: 0, isNegative: false }
  }
  const lower = text.toLowerCase().replace(/\s+/g, ' ').trim()
  const isNegative = NEGATIVE_SIGNAL_PATTERN.test(text)

  // v5: 실장님 시트 매칭 우선 (정확도 ↑, 자가해결 라벨 활용)
  const officialMatch = matchOfficialQaRaw(text)
  if (officialMatch && officialMatch.score >= 6) {
    const { item, score } = officialMatch
    return {
      intent: `qa-${item.id}`,
      confidence: Math.min(0.95, 0.70 + score * 0.02),
      isNegative,
      officialQa: item,
      source: 'sheet',
    }
  }

  // 보조: 기존 9 INTENT_RULES
  for (const rule of INTENT_RULES) {
    if (rule.keywords.some(k => lower.includes(k.toLowerCase()))) {
      return {
        intent: rule.intent,
        confidence: rule.confidence,
        isNegative,
        rule,
        source: 'rules',
      }
    }
  }
  return { intent: null, confidence: 0, isNegative }
}

/**
 * v5: 자가해결 라벨로 응답 분기 의사결정
 * @returns {'self-solve' | 'escalate' | 'partial'}
 */
export function decideResponseMode(officialQa) {
  if (!officialQa) return 'self-solve'
  if (officialQa.selfSolve === 'no') return 'escalate'
  if (officialQa.selfSolve === 'partial') return 'partial'
  return 'self-solve'
}

/**
 * 컨피던스 임계값 — 70% 미만이면 명확화 질문 또는 에스컬레이션 (Watson 표준)
 */
export const CONFIDENCE_THRESHOLD = 0.70

/**
 * 컨텍스트별 추천 Quick Reply 후보 (현재 사용자가 보고 있는 화면 기준)
 * AMS 메뉴 ID와 매칭. Layout/Page에서 useChatbot에 전달.
 */
export const CONTEXT_QUICK_REPLIES = {
  home: ['회원 병합 방법', '영상 재생 오류', '청구 등록'],
  'cust-search': ['퇴반 처리', '회원 병합', '미납 청구 안내문'],
  'cust-merge': ['로컬↔통합 이관 절차', '미사용 처리 방법', '중복 계정 통합'],
  'class-mgmt': ['퇴반 처리', '입반 처리', '출결 마감'],
  'bill-list': ['청구 등록', '환불 절차', '중복 결제 처리'],
  'bill-refund': ['환불 승인 기준', '환불계좌 등록', '환불 대기 취소'],
  player: ['영상 재생 9203', '학원 연동 확인', '재로그인 방법'],
  default: ['회원 병합 방법', '영상 재생 오류', '청구 등록'],
}

export function getQuickRepliesForContext(contextKey) {
  return CONTEXT_QUICK_REPLIES[contextKey] || CONTEXT_QUICK_REPLIES.default
}

/**
 * Trust Calibration 밴드 (NIST 2025 + Lena C 2026)
 * 모든 컨피던스 응답에 시각화된 신뢰도 라벨 부착 — 사용자가 over/under-reliance 회피 가능
 */
export const CONFIDENCE_BANDS = [
  { min: 0.90, label: '높은 정확도', tone: 'success', note: '같은 답을 ≥90% 사용자에게 제공한 적 있음' },
  { min: 0.75, label: '신뢰 가능', tone: 'info', note: '대부분의 경우 정확하나 일부 케이스 다를 수 있음' },
  { min: 0.60, label: '추정 답변', tone: 'warning', note: '의도 매칭 정확도 낮음 — 검증 권장' },
  { min: 0,    label: '불확실', tone: 'error', note: '바로 사람에게 문의 권장' },
]
export function getConfidenceBand(confidence) {
  return CONFIDENCE_BANDS.find(b => confidence >= b.min) || CONFIDENCE_BANDS[CONFIDENCE_BANDS.length - 1]
}

/**
 * Perplexity 스타일 인용 메타 (v4 신규)
 * 응답 본문의 [1] [2] 마커와 매칭. 카테고리/제목/views/updated를 포함하여 호버 미리보기 가능.
 */
export const CITATION_SOURCES = {
  'cust-merge-v2': {
    n: 1, type: 'guide', category: '고객(원생) 관리',
    title: 'AMS 회원 병합 가이드 v2.3', views: 342,
    updated: '2026-04-27', url: '/guides/member-merge',
    snippet: '4단계 절차 — 권한 확인 → 회원 검색 → 데이터 매핑 → 미사용 처리. 4/27 가이드 배포 후 단톡 문의 -77%.',
  },
  'class-withdraw': {
    n: 2, type: 'guide', category: '수업운영 관리',
    title: '퇴반 처리 가이드 (출결·정산 영향)', views: 893,
    updated: '2026-04-15', url: '/guides/attendance-process',
    snippet: '회원조회 화면 상단 "퇴반처리" 버튼. 미래 시점 처리 시 출석 필요 대상 수업일 익일 기준.',
  },
  'bill-refund': {
    n: 3, type: 'guide', category: '청구/수납 관리',
    title: '환불 승인 기준 판단 가이드', views: 612,
    updated: '2026-03-28', url: '/guides/refund-policy',
    snippet: '1차 승인(지점) → 환불 처리(본사 정산팀) → VAN 거래이력 반영 → 정산 마감.',
  },
  'player-trouble-9203': {
    n: 4, type: 'guide', category: '플레이어',
    title: '영상 재생 9203 오류 자가진단', views: 478,
    updated: '2026-05-10', url: '/guides/qr-trouble',
    snippet: '로그아웃 후 재로그인 → QR 학원 연동 재확인 → 와이파이/모바일데이터 전환 테스트.',
  },
  'okta-trouble': {
    n: 5, type: 'guide', category: '인증',
    title: 'OKTA 인증 가이드', views: 504,
    updated: '2026-04-22', url: '/guides/payment-method',
    snippet: '스팸함 확인 → 가입 이메일 오기재 점검 → 관리자 일괄 발송 요청.',
  },
}
export function getCitation(slug) {
  return CITATION_SOURCES[slug] || null
}

/**
 * 자동완성 후보 (Smart Suggestions — Linear AI 패턴)
 * 사용자가 2자 이상 입력 시 매칭되는 의도의 대표 질문을 prefix 매칭 또는 fuzzy 매칭.
 */
export const SUGGESTION_TEMPLATES = [
  { id: 's-merge-1', text: '회원 병합 어떻게 하나요?', intent: 'cust-merge' },
  { id: 's-merge-2', text: '로컬회원을 통합회원으로 이관하려면?', intent: 'cust-merge' },
  { id: 's-merge-3', text: '중복계정 두 개를 합치는 방법', intent: 'cust-merge' },
  { id: 's-withdraw-1', text: '퇴반 처리 절차', intent: 'class-withdraw' },
  { id: 's-withdraw-2', text: '미래 시점 퇴반 시 출결은?', intent: 'class-withdraw' },
  { id: 's-refund-1', text: '환불 승인 기준 알려주세요', intent: 'bill-refund' },
  { id: 's-refund-2', text: '중복결제 환불 절차', intent: 'bill-refund' },
  { id: 's-video-1', text: '영상 재생 9203 오류', intent: 'video-error' },
  { id: 's-video-2', text: '영상이 로딩만 되고 재생 안 됨', intent: 'video-error' },
  { id: 's-okta-1', text: 'OKTA 인증 메일이 안 옵니다', intent: 'okta-auth' },
  { id: 's-app-1', text: '앱 설치가 안 돼요', intent: 'app-install' },
  { id: 's-unpaid-1', text: '오늘 미납 학생 보여줘', intent: 'unpaid' },
]
export function searchSuggestions(query, max = 5) {
  if (!query || query.length < 2) return []
  const q = query.toLowerCase().trim()
  return SUGGESTION_TEMPLATES
    .filter(s => s.text.toLowerCase().includes(q) ||
                 s.text.replace(/\s/g, '').toLowerCase().includes(q.replace(/\s/g, '')))
    .slice(0, max)
}

/**
 * RAG 시뮬레이션 응답 (2차 데모용) — 실제로는 LLM + Vector DB가 처리.
 */
// eslint-disable-next-line no-unused-vars
export function generateRagResponse(intent, query) {
  // 풀 데이터 — 컨플 가이드 본문 + 채널톡 1,116 chat 케이스 분석 통합
  const responses = {
    'cust-merge': `<b>회원 병합 4단계 절차</b><br>
① <b>권한 확인</b> — 본인 지점 회원만 처리 가능. 다른 지점은 해당 담당자에게 요청.<br>
② <b>회원 검색</b> — FROM(이관 원본) + TO(이관 대상) 회원명·회원번호 입력.<br>
③ <b>[회원 병합하기]</b> 클릭 — FROM이 로컬계정이면 자동 탈퇴 처리.<br>
④ <b>결과 확인</b> — 입반·접수·결제·환불·대기번호·상담이력 모두 이관.<br><br>
⚠️ <b>통합회원은 본인 인증 계정</b>이라 관리자가 임의 미사용·탈퇴 불가. 4/27 가이드 배포 후 단톡 문의 -77%.`,

    'class-withdraw': `<b>퇴반 처리 가이드</b><br>
회원조회 화면 상단 <b>"퇴반처리"</b> 버튼으로 진행.<br><br>
⚠️ <b>미래 시점</b> 처리 시 → 출석 필요 대상 수업일 <b>익일 기준</b> 설정 (정산 누락 방지).<br>
⚠️ 퇴반일 이후 수업분은 <b>환불 대상</b>. 환불계좌 미등록 시 처리 지연.<br><br>
관련: 환불요청 처리 메뉴와 자동 연동. 출결 마감 ↔ 정산 흐름 확인.`,

    'video-error': `<b>영상 재생 9203 오류 자가진단</b><br>
대부분 학원 연동 또는 네트워크 이슈.<br><br>
① <b>로그아웃 후 재로그인</b> — 75% 케이스 즉시 해결<br>
② <b>QR 학원 연동 재확인</b> — 브릿지관 등록 여부 점검<br>
③ <b>와이파이 ↔ 모바일데이터 전환</b><br>
④ <b>앱 재설치</b> — 캐시 손상 케이스<br><br>
✗ 4단계 후에도 안 되면 → 9203 코드 + 학생 ID로 플랫폼팀 문의. 부정 시그널 47% (즉각 에스컬레이션 권장).`,

    'okta-auth': `<b>OKTA 인증 메일 안 옴 처리</b><br>
① <b>스팸 메일함 확인</b> (도메인 차단 빈번)<br>
② <b>가입 이메일 오기재 점검</b> — 0 누락, _ 위치 등<br>
③ <b>관리자 일괄 발송 요청</b> — 익일 오전 OKTA 앱 인증<br><br>
⚠️ OKTA 앱은 <b>최초 인증에 고유 Key</b> 보유 — 삭제하면 처음부터. 함부로 재설치 금지.`,

    'app-install': `<b>앱 가입 활성화 실패 — 3단계 진단</b><br>
① <b>본인인증 휴대폰 명의 일치</b> 확인 (학부모 명의 등록 시 학생번호 별도)<br>
② <b>기존 가입 이력 확인</b> — "존재하는 아이디" 메시지면 비밀번호 찾기<br>
③ <b>비밀번호 5시간 잠금</b> — 여러 번 실패 시 5시간 대기 또는 본인인증 재설정<br><br>
✓ 신규 가입 → 인증 메일 → OKTA 앱 → 학원 연동 순서.`,

    'bill-refund': `<b>환불 승인 처리 흐름</b><br>
① <b>1차 승인 (지점 실장 전결)</b> — 학원법 + 사내 정책 기준<br>
② <b>환불 처리 (본사 정산팀)</b> — 환불계좌 등록 필수<br>
③ <b>VAN 거래이력 반영</b><br>
④ <b>정산 마감</b><br><br>
⚠️ 규정 외 환불 (예외 케이스)은 반드시 실장 전결. 중복 결제는 결제 취소 → 재결제 안내 후 미사용 처리.`,

    'qr-attend': `<b>QR 출결 인식 실패 트러블슈팅</b><br>
① <b>브릿지관 연동 여부 확인</b> — 학원 정보 메뉴에서 활성화<br>
② <b>QR 코드 재발급</b> — 회원조회 > QR스티커 출력<br>
③ <b>학생 앱 학원 연동 재확인</b><br><br>
브릿지관 연동률 10% (분석 기준) → 시스템 안정화 필요 영역.`,

    'book-link': `<b>교재 연결 가이드</b><br>
① <b>교재 그룹 생성</b> — 강좌/교재 관리 > 교재상품 > 그룹<br>
② <b>강좌에 연결</b> — 강좌 상세 화면에서 교재 그룹 선택<br>
③ <b>배부현황 확인</b> — 회원조회 > 배부현황 탭<br><br>
2026 교재 도입 시 교재 청구가 분리됨. 청구관리에서 교재상품 별도 청구 생성.`,
  }
  return responses[intent] || '관련 가이드를 찾고 있어요. 자세한 내용은 가이드 페이지에서 확인하세요.'
}

/**
 * 케이스별 다중 분기 응답 (Maggie Appleton "Beyond Conversational" 패턴)
 * 단일 응답 대신 사용자 케이스에 따라 다른 답.
 */
export const CASE_BRANCHES = {
  'cust-merge': [
    { case: '로컬 2개, 1개만 AMS 데이터 있음', action: '데이터 있는 쪽 유지, 없애는 계정 핸드폰 010-0000-0000 변경 + "미사용" 태그' },
    { case: '둘 다 AMS 데이터 (한쪽 결제 있음)', action: '결제 취소 → 재결제 안내 → 재결제 확인 후 한쪽 미사용 처리' },
    { case: '통합 1개 + 로컬 1개 (통합 데이터 없음)', action: '회원이 직접 통합회원 로그인 후 계정 연동 → 자동 병합' },
    { case: '동일 강좌에 양쪽 입반', action: '결제/수강 내역 없는 쪽 퇴반 → 재시도' },
  ],
  'video-error': [
    { case: '9203 코드 (라이브 강좌)', action: 'QR 학원 연동 → 와이파이/모바일 전환 → 재로그인' },
    { case: '재생 클릭해도 무반응', action: '브라우저 캐시 삭제 → 다른 브라우저 시도' },
    { case: '소리만 안 들림', action: '시스템 음량 + 브라우저 탭 음소거 확인' },
    { case: '특정 영상만 안 됨', action: '강사실 영상 등록 상태 확인 → 채널톡 신고' },
  ],
  'bill-refund': [
    { case: '중복결제 (자동 환불)', action: '승인번호 확인 → 정산팀 자동 처리 (1-3일)' },
    { case: '학원법 기준 환불', action: '수강 회차 기준 자동 산정 → 실장 전결 → 환불' },
    { case: '규정 외 예외', action: '반드시 실장 전결 → 본사 정산팀 별도 승인' },
  ],
}
export function getCaseBranches(intent) {
  return CASE_BRANCHES[intent] || null
}

/**
 * 가이드 풀 메타 (Citation 매칭 + 더 보기 페이지 라우팅)
 */
export const FULL_GUIDES = {
  'cust-merge-v2': {
    title: 'AMS 회원 병합 가이드 v2.3',
    category: '고객(원생) 관리',
    badge: '🔥 인기 · -77% 효과 입증',
    updated: '2026-04-27',
    views: 342, helpfulRate: 92,
    author: '김명준',
    path: 'AMS > 고객(원생) 관리 > 회원조회',
  },
  'class-withdraw': {
    title: '퇴반 처리 가이드 (출결·정산 영향)',
    category: '수업운영 관리',
    updated: '2026-04-15',
    views: 893, helpfulRate: 89,
    author: '김수민',
    path: 'AMS > 고객(원생) 관리 > 회원조회 > 수강정보',
  },
  'player-trouble-9203': {
    title: '영상 재생 9203 오류 자가진단',
    category: '플레이어',
    badge: '🆕 신규',
    updated: '2026-05-10',
    views: 478, helpfulRate: 88,
    author: '명준',
    path: '마이클래스 > 라이브 강좌',
  },
}
export function getFullGuide(slug) {
  return FULL_GUIDES[slug] || null
}

/**
 * NL2SQL 샘플 응답 (4차 데모용) — 실제로는 Anthropic Tool Use API + 권한 화이트리스트.
 */
export const NL2SQL_SAMPLES = {
  unpaid: {
    title: '오늘 미납 학생 (대치단과 기준)',
    headers: ['회원ID', '학생명', '강좌', '미납액', '미납일'],
    rows: [
      ['12345', '차주희', '강은양T 국어', '340,000원', '2026-03-01'],
      ['12352', '박민성', '강기원T 미적분', '340,000원', '2026-03-01'],
      ['12361', '김현우', '이세경T 지구과학', '3,500원', '2026-01-08'],
    ],
    sql: `SELECT m.id, m.name, c.title, b.amount, b.due_date
FROM billing b
JOIN member m ON b.member_id = m.id
JOIN course c ON b.course_id = c.id
WHERE b.status = 'unpaid'
  AND m.branch = '대치단과'
  AND b.due_date <= CURRENT_DATE
LIMIT 100`,
    note: '🔒 권한 검증 완료 · 대치단과 회원만 · 개인정보 마스킹 미적용',
  },
}
