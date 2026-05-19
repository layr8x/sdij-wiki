// src/data/guides/fvsol-bodies/index.js
// FVSOL 컨플 풀 본문 (?raw import — Vite)
// 추출일: 2026-05-20 · 6개 핵심 페이지 풀 본문 + 나머지 메타 인덱스

import body1873412132 from './1873412132.md?raw'
import body1845723524 from './1845723524.md?raw'
import body1614381124 from './1614381124.md?raw'
import body1424392308 from './1424392308.md?raw'
import body1693811041 from './1693811041.md?raw'
import body1894645766 from './1894645766.md?raw'

export const FVSOL_BODIES = {
  '1873412132': { id: '1873412132', title: 'AMS 청구·결제·환불 종합 매뉴얼', body: body1873412132, category: 'refund' },
  '1845723524': { id: '1845723524', title: '카카오 채팅 상담 매뉴얼 v1.0', body: body1845723524, category: 'message' },
  '1614381124': { id: '1614381124', title: '중복 계정 통합 프로세스', body: body1614381124, category: 'member' },
  '1424392308': { id: '1424392308', title: '청구/수납 관리 메뉴얼', body: body1424392308, category: 'payment' },
  '1693811041': { id: '1693811041', title: '수업관리 가이드', body: body1693811041, category: 'attendance' },
  '1894645766': { id: '1894645766', title: '(3차 ver) 회차별 출결/배부관리', body: body1894645766, category: 'attendance' },
}

export function getFvsolBody(id) {
  return FVSOL_BODIES[id] || null
}

export function getFvsolBodiesByCategory(categoryId) {
  return Object.values(FVSOL_BODIES).filter(b => b.category === categoryId)
}

export const FVSOL_BODY_STATS = {
  totalLoaded: Object.keys(FVSOL_BODIES).length,
  totalFvsolPages: 130,
  loadedRatio: '5%',  // 6/130
  note: '핵심 6개 페이지 풀 본문. 나머지는 confluence-sources.js의 메타 인덱스에서 링크 참조.',
}
