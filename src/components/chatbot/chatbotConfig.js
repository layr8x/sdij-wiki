// src/components/chatbot/chatbotConfig.js
// AMS 운영도우미 챗봇 — 디자인 토큰 + 정적 설정 (Figma v3-260601 "회의내용반영")
//
// Figma: AMS Wiki — 챗봇 시나리오 (6PSg6RlWrjpnNYk1zirmUp / 493-2)
// 모든 값(색·폰트·간격·텍스트)은 시안 변수/노드와 1:1. 임의 변형 금지.

import { OFFICIAL_QA_CATEGORIES } from '@/data/officialQa'

// ─── 색 토큰 (Figma 변수 → HEX) ──────────────────────────────────────────
export const T = {
  navy: '#001D6C', // button/secondary
  navyHover: '#00256E',
  brandBlue: '#0043CE', // background/brand · tag/blue/color · text/interactive
  contentBg: '#EDF5FF', // tag/blue/background
  white: '#FFFFFF', // background/primary
  surface: '#F4F4F4', // background/secondary · text/on-color
  ink: '#161616', // text/primary · button/tertiary · background/inverse
  inkOnColor: '#F4F4F4', // text/on-color · text/inverse
  textSecondary: 'rgba(22,22,22,0.72)', // text/secondary
  helper: 'rgba(22,22,22,0.56)', // text/helper
  placeholder: 'rgba(22,22,22,0.32)', // text/placeholder
  border: 'rgba(22,22,22,0.08)', // border/primary
  disabled: 'rgba(22,22,22,0.08)', // button/disabled
  link: '#003CE0', // link/enabled
  chipBorder: '#D0E2FF', // tag/blue/border
  tealBg: '#D9FBFB', // tag/teal/background
  tealBorder: '#9EF0F0', // tag/teal/border
  tealText: '#005D5D', // tag/teal/color
  redBg: '#FFF1F1', // tag/red/background
  redBorder: '#FFD7D9', // tag/red/border
  redText: '#A2191F',
  success: '#24A148', // 접수완료 체크
  avatarBg: '#78A9FF',
  // 그림자 (Figma shadow/s · shadow/xl)
  shadowS:
    '0px 0px 0.5px rgba(0,0,0,0.08), 0px 1px 0.5px rgba(0,0,0,0.06), 0px 2px 1px rgba(0,0,0,0.04), 0px 4px 1px rgba(0,0,0,0.02)',
  shadowXl:
    '0px 4px 16px rgba(0,0,0,0.08), 0px 16px 16px rgba(0,0,0,0.06), 0px 32px 32px rgba(0,0,0,0.04), 0px 64px 32px rgba(0,0,0,0.02)',
}

// ─── 타이포 (Figma 토큰 값 그대로) ───────────────────────────────────────
const ss = { fontFeatureSettings: '"ss06" 1, "ss10" 1, "ss05" 1' }
export const FONT = {
  ss,
  title: { fontSize: '32px', lineHeight: '48px', fontWeight: 600, ...ss }, // title-m
  headline: { fontSize: '20px', lineHeight: '32px', fontWeight: 400, ...ss }, // headline-m base
  headlineBold: { fontSize: '20px', lineHeight: '32px', fontWeight: 600, ...ss },
  bodyL: { fontSize: '18px', lineHeight: '32px', fontWeight: 400, ...ss }, // body-l base
  bodyLBold: { fontSize: '18px', lineHeight: '32px', fontWeight: 600, ...ss },
  bodyM: { fontSize: '16px', lineHeight: '28px', fontWeight: 400, ...ss }, // body-m base
  bodyMBold: { fontSize: '16px', lineHeight: '28px', fontWeight: 600, ...ss },
  caption: { fontSize: '14px', lineHeight: '24px', fontWeight: 600, ...ss }, // caption-l bold
}

// ─── 시스템 공지 배너 (notice·teal | emergency·red | off) ────────────────
export const SYSTEM_NOTICE = {
  level: 'notice',
  notice: { emoji: '📢', text: '2026년 6월 - 기능 업데이트 안내' },
  emergency: { emoji: '🚨', text: '[긴급] 6/2(월) 02:00~04:00 시스템 점검 - 로그인 일시 중단' },
}
export function getActiveNotice() {
  if (SYSTEM_NOTICE.level === 'emergency') return { ...SYSTEM_NOTICE.emergency, level: 'emergency' }
  if (SYSTEM_NOTICE.level === 'notice') return { ...SYSTEM_NOTICE.notice, level: 'notice' }
  return null
}

// ─── 카테고리 그리드 (Figma 8 타일 — officialQa 와 1:1, Material 아이콘) ──
export const CATEGORY_TILES = [
  { id: 'okta', label: '로그인/OKTA', icon: 'lock' },
  { id: 'refund', label: '환불/취소', icon: 'credit_card_off' },
  { id: 'payment', label: '수강료/결제', icon: 'credit_card' },
  { id: 'enrollment', label: '입반/대기', icon: 'person_add' },
  { id: 'attendance', label: '출결/보강', icon: 'fact_check' },
  { id: 'member', label: '회원/학생 관리', icon: 'badge' },
  { id: 'course', label: '강좌/반 관리', icon: 'school' },
  { id: 'message', label: '문자/알림', icon: 'notifications' },
]
export function getCategoryLabel(id) {
  // 상세화면 봇 인트로용 — 타일의 짧은 라벨 우선, 없으면 officialQa 라벨
  return CATEGORY_TILES.find((c) => c.id === id)?.label || OFFICIAL_QA_CATEGORIES.find((c) => c.id === id)?.label || id
}

// ─── 폼 카피 (문의 등록 / 해결방법 요청 / 오류 신고) ─────────────────────
export const FORM_COPY = {
  inquiry: {
    title: '문의 등록하기',
    subtitle: '운영팀에서 확인이 필요한 부분을 요청해 주세요.',
    placeholder: '문의 내용을 작성해 주세요.\n\n예) 회원조회 화면에서 특정 학생이 검색되지 않아요.',
    note: '',
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

// ─── 연관 추천 칩 (결과 없음 03-5 "이런 걸 찾으셨나요?") — Figma 라벨 그대로
export const RELATED_SUGGESTIONS = [
  '반 목록 조회/수정',
  '로컬회원/입반생성 업로드',
  '대기접수 상태 유지 처리',
  '관리자용 대기순번 기능',
  '모집 등록/수정',
]

// 이미지 첨부 제약 (Figma: 이미지만 / 최대 2개 / 각 1MB 이하)
export const ATTACH_LIMIT = { maxCount: 2, maxBytes: 1024 * 1024, accept: 'image/*' }
