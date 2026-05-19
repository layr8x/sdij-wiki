// src/data/categories.js
// AMS Wiki — FVSOL 22 카테고리 정식 정의 (v5)
//
// 출처: Confluence FVSOL ■ 업무 가이드 (1378910256) 자식 22개
// 회의 결정 (2026-05-19): 5/26 1차 노출 = AMS 메뉴 트리와 동기
// 작성 워크보드: Confluence 2086764550 (담당자별 5/25 마감)
//
// 기존 mockData.js의 7개 module 라벨을 포섭하면서 22 카테고리로 확장.
// 사이드바·홈 카테고리 카드·챗봇 컨텍스트 매칭에서 모두 참조한다.

/**
 * 카테고리 정의
 * @typedef {Object} Category
 * @property {string} id           — URL slug (예: 'recruit', 'course-book')
 * @property {string} name         — 표시명 (한글)
 * @property {string} icon         — Phosphor 아이콘 이름 또는 이모지
 * @property {string} parent       — 상위 카테고리 id (null = 최상위)
 * @property {string} owner        — 콘텐츠 책임자 (워크보드 2086764550 기준)
 * @property {'active'|'planned'|'beta'|'old'} status
 * @property {number} expectedDocs — 5/25 마감 기준 신규 작성 예정 가이드 수
 * @property {string} amsMenu      — 매칭되는 AMS 사이드바 메뉴 (있을 시)
 * @property {string} chatbotKey   — useChatbot의 contextKey와 매칭
 * @property {string} desc         — 한 줄 설명
 */
export const CATEGORIES = [
  // ── 운영 핵심 (7개) — 기존 mockData.module과 매핑 ──────────────────────
  {
    id: 'recruit',
    name: '모집/접수 관리',
    icon: 'UserPlus',
    parent: null,
    owner: '조은영',
    status: 'active',
    expectedDocs: 5,
    amsMenu: '모집/접수 관리',
    chatbotKey: 'home',
    desc: '모집 공고 · 일괄접수 · 전형 · 반 관리',
  },
  {
    id: 'course-book',
    name: '강좌/교재 관리',
    icon: 'BookOpen',
    parent: null,
    owner: '조호영 · 최현지',
    status: 'active',
    expectedDocs: 7,
    amsMenu: '강좌/교재 관리',
    chatbotKey: 'home',
    desc: '강좌 · 보강코드 · 추가영상 · 교재 그룹',
  },
  {
    id: 'operation',
    name: '수업운영 관리',
    icon: 'GraduationCap',
    parent: null,
    owner: '조호영',
    status: 'active',
    expectedDocs: 6,
    amsMenu: '수업운영 관리',
    chatbotKey: 'class-mgmt',
    desc: '수업관리 · 출결 · 입/퇴반 처리',
  },
  {
    id: 'billing',
    name: '청구/수납/결제/환불',
    icon: 'CreditCard',
    parent: null,
    owner: '김수민',
    status: 'active',
    expectedDocs: 5,
    amsMenu: '청구/수납 관리',
    chatbotKey: 'bill-list',
    desc: '청구 · 납부 · 신한캠퍼스 · 환불 · VAN',
  },
  {
    id: 'customer',
    name: '고객(원생) 관리',
    icon: 'Users',
    parent: null,
    owner: '조호영',
    status: 'active',
    expectedDocs: 4,
    amsMenu: '고객(원생) 관리',
    chatbotKey: 'cust-search',
    desc: '회원조회 · 회원병합 · 상담 · FAQ · 공지',
  },
  {
    id: 'message',
    name: '메시지발송 관리',
    icon: 'EnvelopeSimple',
    parent: null,
    owner: '조은영',
    status: 'active',
    expectedDocs: 4,
    amsMenu: '메시지발송 관리',
    chatbotKey: 'home',
    desc: '메시지 · 템플릿 · 080 수신거부 · 그룹',
  },
  {
    id: 'system',
    name: '공통/시스템',
    icon: 'Gear',
    parent: null,
    owner: '명준',
    status: 'active',
    expectedDocs: 3,
    amsMenu: null,
    chatbotKey: 'home',
    desc: '용어 사전 · CS 대응 매뉴얼 · 공지사항',
  },

  // ── 신규 확장 (7개) — 5/26 1차 또는 6월 1주 추가 ──────────────────────
  {
    id: 'scholar',
    name: '장학혜택 관리',
    icon: 'Ticket',
    parent: null,
    owner: '김수민',
    status: 'beta',
    expectedDocs: 1,
    amsMenu: '장학혜택 관리',
    chatbotKey: 'home',
    desc: '쿠폰 관리',
  },
  {
    id: 'sales',
    name: '매출/정산 관리',
    icon: 'ChartLineUp',
    parent: null,
    owner: '김수민',
    status: 'planned',
    expectedDocs: 3,
    amsMenu: '매출/정산 관리',
    chatbotKey: 'home',
    desc: '정산 · 상품정산정보 · 수업통계',
  },
  {
    id: 'institute',
    name: '학원정보 관리',
    icon: 'Building',
    parent: null,
    owner: '조호영',
    status: 'planned',
    expectedDocs: 3,
    amsMenu: '학원관리',
    chatbotKey: 'home',
    desc: '학원 · 지점 · 공간/시설 · 영역/과목',
  },
  {
    id: 'myclass',
    name: '마이클래스',
    icon: 'DeviceMobile',
    parent: null,
    owner: '명준',
    status: 'beta',
    expectedDocs: 3,
    amsMenu: null,
    chatbotKey: 'player',
    desc: '학생·학부모 앱 · 영상 재생 · 학원 연동',
  },
  {
    id: 'kiosk',
    name: 'KIOSK',
    icon: 'Monitor',
    parent: null,
    owner: '미정',
    status: 'planned',
    expectedDocs: 2,
    amsMenu: null,
    chatbotKey: 'home',
    desc: '학원 내 출결·결제 키오스크',
  },
  {
    id: 'qr-app',
    name: '출결QR앱',
    icon: 'QrCode',
    parent: null,
    owner: '미정',
    status: 'beta',
    expectedDocs: 2,
    amsMenu: null,
    chatbotKey: 'player',
    desc: 'QR 출결 모바일 앱 · 브릿지관 연동',
  },
  {
    id: 'player',
    name: '플레이어',
    icon: 'Play',
    parent: null,
    owner: '명준',
    status: 'beta',
    expectedDocs: 2,
    amsMenu: null,
    chatbotKey: 'player',
    desc: '영상 재생 · 9203 오류 자가진단',
  },

  // ── 분석/메타 (4개) ───────────────────────────────────────────────────
  {
    id: 'ga',
    name: 'GA',
    icon: 'ChartBar',
    parent: 'system',
    owner: '명준',
    status: 'planned',
    expectedDocs: 1,
    amsMenu: null,
    chatbotKey: 'home',
    desc: 'Google Analytics 4 분석 가이드',
  },
  {
    id: 'bi',
    name: 'BI',
    icon: 'ChartPieSlice',
    parent: 'system',
    owner: '명준',
    status: 'planned',
    expectedDocs: 1,
    amsMenu: null,
    chatbotKey: 'home',
    desc: 'BigQuery · 대시보드',
  },
  {
    id: 'cs-manual',
    name: '카카오 채팅 상담 매뉴얼',
    icon: 'ChatCircleText',
    parent: 'system',
    owner: '플랫폼팀',
    status: 'active',
    expectedDocs: 1,
    amsMenu: null,
    chatbotKey: 'home',
    desc: '카테고리별 케이스 & 답변 템플릿 v1.0',
  },
  {
    id: 'cs-analysis',
    name: '마이클래스 CS 분석 보고서',
    icon: 'NoteBook',
    parent: 'system',
    owner: '명준',
    status: 'active',
    expectedDocs: 1,
    amsMenu: null,
    chatbotKey: 'home',
    desc: '운영 데이터 인사이트 (25.12 ~ 26.5)',
  },

  // ── 보존/참고 (3개) ───────────────────────────────────────────────────
  {
    id: 'integrated-member',
    name: '통합회원 카톡채널 문의가이드',
    icon: 'UsersThree',
    parent: 'customer',
    owner: '플랫폼팀',
    status: 'active',
    expectedDocs: 1,
    amsMenu: null,
    chatbotKey: 'cust-merge',
    desc: '통합/로컬 회원 카톡 문의 응답 가이드',
  },
  {
    id: 'internal-review',
    name: '참고- 내부 검토사항',
    icon: 'BookmarkSimple',
    parent: 'system',
    owner: '플랫폼팀',
    status: 'old',
    expectedDocs: 0,
    amsMenu: null,
    chatbotKey: 'home',
    desc: '내부 검토 자료 (비공개 참고)',
  },
  {
    id: 'old',
    name: 'OLD',
    icon: 'Archive',
    parent: null,
    owner: '플랫폼팀',
    status: 'old',
    expectedDocs: 0,
    amsMenu: null,
    chatbotKey: 'home',
    desc: 'deprecated 가이드 보관',
  },
]

/**
 * 기존 mockData.js의 module 라벨 → 신규 카테고리 id 매핑.
 * 기존 가이드(GUIDES)의 .module 값을 .categoryId로 변환할 때 사용.
 */
export const MODULE_TO_CATEGORY = {
  '모집/접수 관리': 'recruit',
  '강좌/교재 관리': 'course-book',
  '수업운영관리': 'operation',
  '청구/수납/결제/환불': 'billing',
  '고객(원생) 관리': 'customer',
  '메시지발송 관리': 'message',
  '공통/시스템': 'system',
}

/**
 * 카테고리 id → 객체 lookup
 */
export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

/**
 * 사이드바 그룹 정의 (folder 구조)
 */
export const CATEGORY_GROUPS = [
  {
    label: '운영',
    items: ['recruit', 'course-book', 'operation', 'billing', 'customer', 'message', 'scholar'],
  },
  {
    label: '플랫폼 / 분석',
    items: ['sales', 'institute', 'myclass', 'kiosk', 'qr-app', 'player', 'ga', 'bi'],
  },
  {
    label: '문서',
    items: ['cs-manual', 'cs-analysis', 'integrated-member', 'system'],
  },
  {
    label: '보존',
    items: ['internal-review', 'old'],
  },
]

/**
 * 가이드 객체에 categoryId 부착하는 헬퍼.
 * mockData/inquiryGuides/csGuides 모두에서 사용 가능.
 */
export function attachCategoryId(guide) {
  if (guide.categoryId) return guide
  if (guide.module && MODULE_TO_CATEGORY[guide.module]) {
    return { ...guide, categoryId: MODULE_TO_CATEGORY[guide.module] }
  }
  return guide
}

/**
 * 상태별 통계
 */
export function getCategoryStats() {
  const stats = { active: 0, beta: 0, planned: 0, old: 0, totalExpectedDocs: 0 }
  for (const c of CATEGORIES) {
    stats[c.status] = (stats[c.status] || 0) + 1
    stats.totalExpectedDocs += c.expectedDocs
  }
  return stats
}
