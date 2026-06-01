// src/components/chatbot/chatbotConfig.js
// AMS 운영도우미 챗봇 — 디자인 토큰 + 정적 설정 (Figma v4-260601 "업데이트")
//
// Figma: AMS Wiki — 챗봇 시나리오 (6PSg6RlWrjpnNYk1zirmUp / 830:5936)
// v4 변경: 대화형 단일 스레드(칩 메뉴 구동) · 공지 둥근 카드 · 폼 인라인 ·
//          body-l 20px · 배경 #f4f4f4 · 말풍선 8px · 아바타/입력바/헤더액션 없음.

import { OFFICIAL_QA_CATEGORIES } from '@/data/officialQa'

// ─── 색 토큰 (Figma 변수 → HEX) ──────────────────────────────────────────
export const T = {
  navy: '#001D6C', // button/secondary — 헤더·기본 버튼
  navyHover: '#00256E',
  brandBlue: '#0043CE', // background/brand — 유저 말풍선 · 칩 텍스트
  bg: '#F4F4F4', // background/secondary — 위젯/콘텐츠 배경
  white: '#FFFFFF', // background/primary — 봇 말풍선 · 칩 · 입력
  surfaceHover: '#E8E8E8', // background/secondary-hover — 첨부 파일 칩
  ink: '#161616', // text/primary
  inkOnColor: '#F4F4F4', // text/on-color
  helper: 'rgba(22,22,22,0.56)', // text/helper
  placeholder: 'rgba(22,22,22,0.32)', // text/placeholder
  border: 'rgba(22,22,22,0.08)', // border/primary
  borderStrong: 'rgba(22,22,22,0.24)', // border/secondary — 취소 버튼
  disabled: 'rgba(22,22,22,0.08)', // button/disabled
  link: '#003CE0', // link/enabled
  noticeBg: '#EDF5FF', // tag/blue/background — 공지 카드
  noticeBorder: '#D0E2FF', // tag/blue/border — 공지 카드 · 파랑 칩
  chipBlueText: '#0043CE', // tag/blue/color
  chipRedBorder: '#FFD7D9', // tag/red/border
  chipRedText: '#A2191F', // tag/red/color
  tealBg: '#D9FBFB', // BETA
  tealBorder: '#9EF0F0',
  tealText: '#005D5D',
  // 그림자 (Figma shadow/s · shadow/xl)
  shadowS:
    '0px 0px 0.5px rgba(0,0,0,0.08), 0px 1px 0.5px rgba(0,0,0,0.06), 0px 2px 1px rgba(0,0,0,0.04), 0px 4px 1px rgba(0,0,0,0.02)',
  shadowXl:
    '0px 4px 16px rgba(0,0,0,0.08), 0px 16px 16px rgba(0,0,0,0.06), 0px 32px 32px rgba(0,0,0,0.04), 0px 64px 32px rgba(0,0,0,0.02)',
}

// ─── 타이포 (Figma v4 토큰 — body-l 20px) ────────────────────────────────
const ss = { fontFeatureSettings: '"ss06" 1, "ss10" 1, "ss05" 1' }
export const FONT = {
  ss,
  bodyL: { fontSize: '20px', lineHeight: '32px', fontWeight: 400, ...ss }, // body-l base
  bodyLBold: { fontSize: '20px', lineHeight: '32px', fontWeight: 600, ...ss },
  headline: { fontSize: '20px', lineHeight: '32px', fontWeight: 400, ...ss }, // headline-m
  headlineBold: { fontSize: '20px', lineHeight: '32px', fontWeight: 600, ...ss },
  bodyM: { fontSize: '16px', lineHeight: '28px', fontWeight: 400, ...ss }, // body-m
  bodyMBold: { fontSize: '16px', lineHeight: '28px', fontWeight: 600, ...ss },
  caption: { fontSize: '14px', lineHeight: '24px', fontWeight: 600, ...ss }, // caption-l (BETA)
}

// ─── 공지 카드 ───────────────────────────────────────────────────────────
export const SYSTEM_NOTICE = { emoji: '📢', text: '2026년 6월 - 기능 업데이트 안내' }

// ─── 칩 메뉴 (Figma: 카테고리 5 + 오류신고) ──────────────────────────────
export const CHIP_MENU = [
  { id: 'okta', label: '로그인/OKTA' },
  { id: 'refund', label: '환불/취소' },
  { id: 'payment', label: '수강료/결제' },
  { id: 'enrollment', label: '입반/대기' },
  { id: 'attendance', label: '출결/보강' },
  { id: 'error', label: '오류신고', variant: 'red' },
]

export function getCategoryLabel(id) {
  return CHIP_MENU.find((c) => c.id === id)?.label || OFFICIAL_QA_CATEGORIES.find((c) => c.id === id)?.label || id
}

// ─── 인사/확인 카피 ──────────────────────────────────────────────────────
export const GREETING = '안녕하세요, 명준님 👋\n무엇을 도와드릴까요?'
export const CONFIRM = {
  done: '접수됐어요! ✅\n담당자 확인 후 개별 연락드려요.',
  more: '더 궁금하신 부분이 있으신가요?',
}
// 하단 검색바 / 검색 결과
export const SEARCH_PLACEHOLDER = '검색어를 입력해 주세요.'
export const GUIDE_LINK_LABEL = '관련 가이드 보기'
export const NO_RESULT = '요청하신 내용을 찾을 수 없어요.\n다른 키워드로 검색해 주세요.'

// ─── 폼 카피 (인라인 — 문의등록 / 오류신고) ──────────────────────────────
// userLabel: 폼을 띄울 때 표시되는 사용자 말풍선
// intro    : 폼 위 봇 안내 말풍선(선택)
// link     : 봇 안내 아래 "전체 가이드 보기" 링크(선택)
export const FORM_COPY = {
  inquiry: {
    userLabel: '가이드 안내 및 문제 해결이 어려운 문의일 경우',
    placeholder:
      '어떤 도움이 필요하세요?\n상황과 요청을 구체적으로 적어주세요.\n\n예) ○○○ 학생 환불 계좌를 변경해야 해요.\n학부모 요청이고 신분 확인했어요.',
  },
  error: {
    userLabel: '오류신고',
    intro: '허위·중복 신고로 인해 정말 필요한 업무 처리가 지연될 수 있어요. 신고 전 가이드를 한 번 더 확인해 주세요.',
    link: { label: '전체 가이드 보기', url: '/guides' },
    placeholder:
      '발견한 오류 내용을 작성해 주세요.\n\n예) 회원조회에서 정원이 실제와 다르게 보여요.\n일반 처리 후 목록을 새로고침하면 발생해요.',
  },
}

// 이미지 첨부 제약 (Figma: 이미지만 / 최대 2개 / 각 1MB 이하)
export const ATTACH_LIMIT = { maxCount: 2, maxBytes: 1024 * 1024, accept: 'image/*' }
