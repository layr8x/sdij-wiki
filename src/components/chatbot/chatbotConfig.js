// src/components/chatbot/chatbotConfig.js
// AMS 운영도우미 챗봇 — 디자인 토큰 + 정적 설정 (Figma v3-260601 "회의내용반영")
//
// Figma: AMS Wiki — 챗봇 시나리오 (6PSg6RlWrjpnNYk1zirmUp / 493-2)
// 토큰 출처: IBM Carbon 매핑 + 디자인 변수 (button/secondary, tag/blue, tag/teal …)
//
// 이 모듈은 "색·간격·카피" 같은 정적 데이터만 담는다.
// 동작(상태머신)은 useChatbot.js, 표현(렌더)은 Chatbot.jsx 가 담당.

import { OFFICIAL_QA_CATEGORIES } from '@/data/officialQa'

// ─── 디자인 토큰 (Figma 변수 → HEX) ──────────────────────────────────────
export const T = {
  // 브랜드 — button/secondary (네이비). 헤더·웰컴·기본 버튼·메뉴 라벨.
  navy: '#001D6C',
  navyHover: '#00258A',
  // background/brand (밝은 파랑). 사용자 말풍선.
  brandBlue: '#0043CE',
  // tag/blue — 콘텐츠 영역 배경 / 칩 / 가이드 카테고리
  contentBg: '#EDF5FF',
  chipBg: '#FFFFFF',
  chipBorder: '#D0E2FF',
  chipText: '#0043CE',
  linkBlue: '#0043CE',
  // tag/teal — BETA 뱃지 / 공지 배너
  tealBg: '#D9FBFB',
  tealBorder: '#9EF0F0',
  tealText: '#005D5D',
  // tag/red — 긴급 배너
  redBg: '#FFF1F1',
  redBorder: '#FFD7D9',
  redText: '#A2191F',
  // 중립
  white: '#FFFFFF',
  surface: '#F4F4F4', // background/secondary — 아이콘 칩
  ink: '#161616', // text/primary
  inkOnColor: '#F4F4F4', // text/on-color (네이비/파랑 위 글자)
  textSecondary: 'rgba(22,22,22,0.72)',
  helper: 'rgba(22,22,22,0.56)',
  placeholder: 'rgba(22,22,22,0.32)',
  border: 'rgba(22,22,22,0.08)', // border/primary
  borderStrong: 'rgba(22,22,22,0.16)',
  disabled: 'rgba(22,22,22,0.08)', // button/disabled
  // support — 접수완료 체크
  success: '#0E6027',
  avatarBg: '#78A9FF', // 봇 아바타 원형 (light blue)
  // 그림자 (Figma shadow/s · shadow/xl)
  shadowS:
    '0px 0px 0.5px rgba(0,0,0,0.08), 0px 1px 0.5px rgba(0,0,0,0.06), 0px 2px 1px rgba(0,0,0,0.04), 0px 4px 1px rgba(0,0,0,0.02)',
  shadowXl:
    '0px 4px 16px rgba(0,0,0,0.08), 0px 16px 16px rgba(0,0,0,0.06), 0px 32px 32px rgba(0,0,0,0.04), 0px 64px 32px rgba(0,0,0,0.02)',
}

// ─── 타이포 스케일 (Figma 토큰 → 위젯 렌더 px) ───────────────────────────
// Figma 원본은 480px 폭. 위젯은 ~420px 라 한 호 작게 매핑(가독·균형 유지).
export const FONT = {
  title: '26px', // title-m 32 → 26 (웰컴/폼 제목/접수완료)
  titleLh: '36px',
  headline: '19px', // headline-m 20 → 19 (서브타이틀)
  headlineLh: '28px',
  bodyL: '17px', // body-l 18 → 17 (말풍선/메뉴/버튼/칩/배너)
  bodyLLh: '28px',
  bodyM: '15px', // body-m 16 → 15 (헤더 액션/헬퍼/연관 추천)
  bodyMLh: '24px',
  caption: '13px', // caption-l 14 → 13 (BETA)
  captionLh: '18px',
  ss: { fontFeatureSettings: '"ss06" 1, "ss10" 1, "ss05" 1' }, // Pretendard 한글 글리프
}

// ─── 시스템 공지 배너 ────────────────────────────────────────────────────
// level: 'notice'(평시·teal) | 'emergency'(긴급·red) | 'off'
// 운영 중엔 notice 가 기본. 점검/장애 시 emergency 로 전환.
export const SYSTEM_NOTICE = {
  level: 'notice',
  notice: { emoji: '📢', text: '2026년 6월 — 기능 업데이트 안내' },
  emergency: { emoji: '🚨', text: '[긴급] 6/2(월) 02:00~04:00 시스템 점검 — 로그인 일시 중단' },
}

export function getActiveNotice() {
  if (SYSTEM_NOTICE.level === 'emergency') return { ...SYSTEM_NOTICE.emergency, level: 'emergency' }
  if (SYSTEM_NOTICE.level === 'notice') return { ...SYSTEM_NOTICE.notice, level: 'notice' }
  return null
}

// ─── 카테고리 그리드 (Figma 8 타일) ──────────────────────────────────────
// officialQa.js 의 8 카테고리와 1:1. icon 은 Chatbot.jsx 의 아이콘 맵 키.
export const CATEGORY_TILES = [
  { id: 'okta', label: '로그인/OKTA', icon: 'lock' },
  { id: 'refund', label: '환불/취소', icon: 'receipt' },
  { id: 'payment', label: '수강료/결제', icon: 'card' },
  { id: 'enrollment', label: '입반/대기', icon: 'userplus' },
  { id: 'attendance', label: '출결/보강', icon: 'calendar' },
  { id: 'member', label: '회원/학생 관리', icon: 'idcard' },
  { id: 'course', label: '강좌/반 관리', icon: 'cap' },
  { id: 'message', label: '문자/알림', icon: 'bell' },
]

export function getCategoryLabel(id) {
  return OFFICIAL_QA_CATEGORIES.find((c) => c.id === id)?.label || id
}

// ─── 폼 카피 (문의 등록 / 해결방법 요청 / 오류 신고) ─────────────────────
export const FORM_COPY = {
  inquiry: {
    title: '문의 등록하기',
    subtitle: '운영팀에서 확인이 필요한 부분을 요청해 주세요.',
    placeholder: '문의 내용을 작성해 주세요.\n\n예) 회원조회 화면에서 특정 학생이 검색되지 않아요.',
    note: '답변은 위키 반영 후 문자/이메일로 안내드립니다.',
    submit: '보내기',
  },
  solution: {
    title: '해결방법 요청',
    subtitle: '필요한 가이드를 요청하면 운영팀이 콘텐츠를 추가해드려요.',
    placeholder: '필요한 해결방법이나 가이드를 작성해 주세요.\n\n예) 가상계좌 부분환불 처리 절차가 궁금해요.',
    note: '답변은 위키 반영 후 문자/이메일로 안내드립니다.',
    submit: '보내기',
  },
  error: {
    title: '오류 신고',
    subtitle: '발견한 오류를 알려주시면 운영팀이 바로 확인해요.',
    placeholder:
      '발견한 오류 내용을 작성해 주세요.\n\n예) 회원조회에서 정원이 실제와 다르게 보여요.\n일반 처리 후 목록을 새로고침하면 발생해요.',
    note: '허위·중복 신고로 인해 정말 필요한 업무 처리가 지연될 수 있어요. 신고 전 가이드를 한 번 더 확인해 주세요.',
    submit: '보내기',
  },
}

// ─── 연관 추천 칩 (결과 없음 03-5 "이런 걸 찾으셨나요?") ─────────────────
export const RELATED_SUGGESTIONS = [
  '카드 결제 취소는 어떻게 하나요',
  '대기에서 입반 처리하는 방법',
  '로컬회원 일괄 업로드 학년 형식',
  'OKTA 앱 재등록이 안 돼요',
  '문자 발송이 안 됩니다',
]

// 이미지 첨부 제약 (오류신고/문의 폼)
export const ATTACH_LIMIT = { maxCount: 2, maxBytes: 1024 * 1024, accept: 'image/*' }
