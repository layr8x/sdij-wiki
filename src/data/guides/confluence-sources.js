// src/data/guides/confluence-sources.js
// Hiconsy Confluence 가이드 SSOT — 챗봇 응답 인용 + 직접 링크
// 출처: AMS/2076704794, FVSOL/1378910256 (atlassian-realtime via Claude in Chrome SSO)
// 추출일: 2026-05-19 (메타 인덱스), 2026-05-20 (6개 핵심 페이지 본문 풀 추출)

import { FVSOL_BODIES, getFvsolBody, getFvsolBodiesByCategory } from './fvsol-bodies'
export { FVSOL_BODIES, getFvsolBody, getFvsolBodiesByCategory }

export const CONFLUENCE_BASE = 'https://hiconsy.atlassian.net/wiki/spaces'

/**
 * AMS 스페이스 핵심 가이드 (운영 SOP)
 */
export const AMS_GUIDES = [
  {
    id: '2076704794',
    space: 'AMS',
    title: '[회원상세]환불 팝업 내 환불계좌 추후 입력 기능 추가',
    category: 'refund',
    author: '김수민',
    updatedAt: '2026-04-20',
    updatedBy: '최현지',
    summary: '환불 처리 시 계좌정보 즉시 입력 어려운 상황에서도 환불 접수 가능하도록 "추후 입력" 체크박스 추가. 환불대기 상태 현금/가상계좌 환불 건 계좌 일괄 변경 기능 함께 적용.',
    body: `환불 처리 시 계좌정보를 즉시 입력하기 어려운 상황에서도 환불 접수가 가능하도록 환불계좌 '추후 입력' 기능이 추가되었습니다. 환불대기 상태의 현금/가상계좌 환불 건에 대해 계좌정보 일괄 변경 기능이 함께 적용되었습니다.

[적용경로 1: 환불계좌 추후 입력]
회원상세 > 수강정보(TAB) > [환불] 버튼 클릭 시 노출되는 환불 팝업

[변경사항]
- 환불처리 팝업 내 '추후 입력' 체크박스가 추가됨
- '추후 입력' 체크 시 계좌정보를 입력하지 않아도 환불 처리가 가능
- 추후 계좌 등록 또는 변경 시 환불상세의 계좌정보가 일괄 업데이트됨

[참고사항]
기본적으로는 환불계좌 정보를 입력하여 처리해야 하며 계좌 확인이 지연되는 등 불가피한 상황에서만 '추후 입력' 기능 사용 권장.

[적용경로 2: 환불계좌 일괄 업데이트]
회원상세 > 환불계좌 > [수정] 버튼 클릭 시 노출되는 환불계좌 정보 팝업

[변경사항]
환불대기 상태의 현금/가상계좌 환불 건에 대해 계좌 등록 또는 변경 시 환불상세 계좌정보가 자동으로 일괄 업데이트되도록 개선.

[일괄 업데이트 조건]
- 환불상태: 환불대기
- 결제방법: 현금 / 가상계좌`,
    url: 'https://hiconsy.atlassian.net/wiki/spaces/AMS/pages/2076704794',
    relatedContent: [
      '교재 상품의 청구 방식',
      '광고-마케팅 활용 동의 관련 전제품 현행 점검 및 수정',
      '회차패키지는 청구 및 금액 산정 기준',
      '상품/정책 세팅',
      '연결교재 등록/상세',
      '오프라인플랫폼 청구 정의 (작성중)',
    ],
  },
]

/**
 * FVSOL 업무 가이드 인덱스 (13 그룹)
 * 챗봇이 답변 시 인용/링크 가능한 SSOT 목록.
 */
export const FVSOL_GROUPS = [
  {
    id: 'auth',
    label: '계정/권한/관리',
    sheetCategory: 'okta',
    pages: [
      { id: '1320812651', title: '직원(OKTA) 계정 활성화 및 사용 가이드' },
      { id: '1488224329', title: 'VPN 접속가이드 (BI사용자)' },
      { id: '1588166699', title: '(내부용)옥타/권한 계정 신청 작업 안내' },
      { id: '1357643803', title: '강사/연구실 권한설정 및 기능사용 가이드' },
      { id: '1614381124', title: '(재종 전달용) 통합회원 ADMIN 운영 가이드' },
    ],
  },
  {
    id: 'enroll',
    label: '접수/모집',
    sheetCategory: 'enrollment',
    pages: [
      { id: '1570701313', title: '중복접수자 접수취소 및 취소안내문자발송 가이드' },
      { id: '1576140803', title: '로컬회원 생성 데이터 업로드 기능' },
      { id: '1513979921', title: '로컬회원/입반 생성 데이터 업로드 기능' },
      { id: '1419771906', title: '모집/접수 관리 메뉴얼' },
      { id: '1535803404', title: '로컬회원 생성 및 입반' },
    ],
  },
  {
    id: 'message',
    label: '메시지 관리',
    sheetCategory: 'message',
    pages: [
      { id: '1600651309', title: '20260415 AMS 광고성 정보 발송 가이드' },
      { id: '1614184500', title: '메시지 관리' },
      { id: '172098079', title: '문자 발송 비용절감' },
      { id: '1518108715', title: '통합회원 카톡채널 문의가이드' },
      { id: '1845723524', title: '카카오 채팅 상담 매뉴얼 — 카테고리별 케이스 & 답변 템플릿 (v1.0)' },
    ],
  },
  {
    id: 'course',
    label: '강좌(반) 관리',
    sheetCategory: 'course',
    pages: [
      { id: '1421836358', title: '강좌(반) 관리 메뉴얼' },
      { id: '1517944886', title: '강좌 일괄 등록 기능' },
    ],
  },
  {
    id: 'attendance',
    label: '수업운영 관리(입/퇴반/출결)',
    sheetCategory: 'attendance',
    pages: [
      { id: '1894645766', title: '(3차 ver) 회차별 출결/배부관리' },
      { id: '1555169309', title: '미납자 퇴반처리 방법' },
      { id: '1581580309', title: '(학원용)출결 앱 세팅 및 실행 가이드' },
      { id: '1693811041', title: '수업관리 가이드' },
    ],
  },
  {
    id: 'member',
    label: '회원관리',
    sheetCategory: 'member',
    pages: [
      { id: '1601110065', title: 'CTI 콜수신시 AMS 회원정보 자동호출' },
      { id: '809238559', title: '로컬회원 생성 (통합회원 미연동)' },
    ],
  },
  {
    id: 'billing',
    label: '청구/수납/결제/환불',
    sheetCategory: 'refund',
    pages: [
      { id: '1424392308', title: '청구/수납 관리 메뉴얼' },
      { id: '1873412132', title: 'AMS 청구·결제·환불 종합 매뉴얼' },
    ],
  },
  {
    id: 'myclass',
    label: '마이클래스',
    sheetCategory: 'myclass',
    pages: [
      { id: '1615560730', title: '마이클래스 학생 이용 가이드 [CS 실장용 내부 안내 문서]' },
      { id: '1611792532', title: '마이클래스 학부모 이용 가이드 [CS 실장용 내부 안내 문서]' },
      { id: '1689649167', title: '마이클래스 CS 분석 보고서_25.12.22-27' },
    ],
  },
  {
    id: 'player',
    label: '플레이어',
    sheetCategory: 'player',
    pages: [
      { id: '1661468675', title: '플레이어 가이드' },
    ],
  },
  {
    id: 'bi',
    label: 'BI / GA',
    sheetCategory: 'bi',
    pages: [
      { id: '1510998019', title: 'BI소개 & 가이드' },
      { id: '1534623777', title: '학원운영통계(센터장)' },
      { id: '1557266455', title: '알림추적 BI(플서실)' },
    ],
  },
  {
    id: 'kiosk',
    label: 'KIOSK',
    sheetCategory: 'myclass',
    pages: [
      { id: '1608876067', title: 'QR 프린터(XP-375B)설치 가이드' },
    ],
  },
]

/**
 * 카테고리 ID로 컨플 가이드 그룹 조회
 */
export function getConfluenceGroupsForCategory(sheetCategoryId) {
  return FVSOL_GROUPS.filter(g => g.sheetCategory === sheetCategoryId)
}

/**
 * AMS 운영 가이드 (특정 카테고리)
 */
export function getAmsGuidesForCategory(sheetCategoryId) {
  return AMS_GUIDES.filter(g => g.category === sheetCategoryId)
}

/**
 * 페이지 URL 생성
 */
export function buildConfluenceUrl(space, pageId) {
  return `${CONFLUENCE_BASE}/${space}/pages/${pageId}`
}

export const CONFLUENCE_STATS = {
  amsGuides: AMS_GUIDES.length,
  fvsolGroups: FVSOL_GROUPS.length,
  totalFvsolPages: FVSOL_GROUPS.reduce((s, g) => s + g.pages.length, 0),
  source: 'atlassian-realtime via Claude in Chrome SSO',
  extractedAt: '2026-05-19',
}
