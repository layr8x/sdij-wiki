// src/data/managerFaq.js
// 매니저 FAQ 원본 가이드 (https://ams.sdij.com/wiki/manager/faq 와 동일 콘텐츠)
//
// 단일 원본(Single Source of Truth): FAQ 페이지(FaqPage)와 챗봇이 같은 데이터를
// 참조한다. 내용을 한 곳에서 고치면 FAQ 페이지·챗봇에 동시 반영된다.
//
// 향후 외부 실시간 연동: api/faq.js(서버리스)가 MANAGER_FAQ_URL 환경변수가
// 설정되면 외부(예: ams.sdij.com 데이터 API)에서 받아오고, 없으면 아래 번들을
// 폴백으로 사용한다. 챗봇/FAQ 페이지는 항상 최신 데이터를 런타임에 받는다.

export const MANAGER_FAQ = [
  { id: 'mfaq-1', category: '결제/환불', q: '카드 전환결제는 어떻게 진행하나요?', a: '전환결제는 기존 결제를 취소하는 게 아니라 새 결제를 먼저 생성하는 구조입니다. 회원상세 > 결제내역 탭에서 전환할 결제를 체크 후 [전환결제] 버튼을 클릭하세요. 신규 결제 완료 후 PG카드는 자동 환불, VAN/현금/가상계좌는 환불대기 상태에서 직접 처리가 필요합니다.', guideId: 'payment-switch' },
  { id: 'mfaq-2', category: '결제/환불', q: '수강료 환불 기준이 어떻게 되나요?', a: '학원법 기준입니다: ① 개강 전 취소 → 전액 환불 ② 총 교습시간 1/3 경과 전 → 수강료 2/3 환불 ③ 1/2 경과 전 → 수강료 1/2 환불 ④ 1/2 경과 후 → 환불 불가. 1/2 이후 예외 적용이 필요한 경우 반드시 실장 전결이 필요합니다.', guideId: 'refund-policy' },
  { id: 'mfaq-3', category: '결제/환불', q: '가상계좌 입금 기한이 지났는데 입금이 됐어요.', a: '입금 기한 경과 후 입금된 건은 시스템에서 자동 취소 처리됩니다. 재발급이 필요한 경우 청구/수납 관리에서 가상계좌를 재발급한 뒤 안내 문자를 다시 발송해 주세요.', guideId: 'virtual-account-guide' },
  { id: 'mfaq-4', category: '결제/환불', q: '전환결제 후 취소 요청이 들어왔어요.', a: '전환결제 건은 환불취소가 불가능합니다. 이 사실을 학부모에게 안내하고, 불가피한 경우 실장에게 에스컬레이션하세요.', guideId: 'payment-switch' },
  { id: 'mfaq-5', category: '결제/환불', q: '입금대기 상태의 가상계좌를 전환결제 할 수 있나요?', a: '불가합니다. 가상계좌 입금 대기 중인 결제건은 전환결제 버튼이 비활성화됩니다. 입금완료 처리 후 전환결제를 진행하거나, 해당 결제를 취소하고 새로운 결제수단으로 재결제를 안내하세요.', guideId: 'payment-switch' },
  { id: 'mfaq-6', category: '고객 관리', q: '두 개의 계정을 하나로 합칠 수 있나요?', a: '네, AMS 어드민 > 고객(원생) 관리 > 회원조회에서 [회원 병합] 기능을 사용할 수 있습니다. FROM(이관 원본)과 TO(이관 대상) 회원을 설정하면 입반, 접수, 결제, 환불, 대기번호, 상담이력이 모두 이관됩니다.', guideId: 'member-merge' },
  { id: 'mfaq-7', category: '고객 관리', q: '통합회원과 로컬계정이 중복일 때 어떻게 처리하나요?', a: 'AMS 데이터 유무에 따라 처리 방법이 다릅니다. 통합계정에 AMS 데이터가 없으면 학부모가 마이클래스에서 직접 연동하도록 안내하면 됩니다. 통합계정에 이미 AMS 데이터가 있는 경우는 개발팀 요청이 필요합니다.', guideId: 'duplicate-account' },
  { id: 'mfaq-8', category: '고객 관리', q: '학생이 질병으로 수강을 잠시 중단하고 싶어해요.', a: '휴강 처리를 진행하세요. 회원상세 > 입반정보 탭 > [휴강처리] 버튼에서 시작일과 예상 복강일을 입력합니다. 질병의 경우 [의료사유 휴강]으로 선택하고 진단서를 첨부받는 것을 권장합니다.', guideId: 'student-suspension' },
  { id: 'mfaq-9', category: '고객 관리', q: '병합 후 FROM 회원 계정은 어떻게 처리하나요?', a: 'FROM 회원이 로컬계정인 경우 병합 시 자동 탈퇴 처리됩니다. 로컬계정이 아닌 경우 핸드폰 번호를 010-0000-0000으로 변경하고 "미사용" 태그를 부여하면 회원 검색 결과에서 제외됩니다.', guideId: 'member-merge' },
  { id: 'mfaq-10', category: '수업 운영', q: 'QR 코드를 안 가져왔을 때 어떻게 출석 처리하나요?', a: '수동 출석 처리가 가능합니다. AMS 어드민 > 수업운영관리 > 출결 관리 > 수동 출석에서 해당 학생을 검색하여 출석 상태로 변경하세요.', guideId: 'qr-trouble' },
  { id: 'mfaq-11', category: '수업 운영', q: '중도 입반 학생의 수강료는 어떻게 계산되나요?', a: '시스템이 남은 수업 일수를 기준으로 자동 일할 계산(Proration)을 수행합니다. 청구 생성 팝업에서 [자동 계산] 옵션이 체크되어 있는지 확인하세요.', guideId: 'billing-guide' },
  { id: 'mfaq-12', category: '수업 운영', q: '전반을 진행하려는데 오류가 납니다.', a: '주요 원인: ① 전반 전 강좌에서 선택 회차 이후에 출석상태 존재 → 출결 처리 후 재시도 ② 배부 회차 종료 교재에 수령예정 교재 존재 → 수령처리 후 재시도 ③ 혜택 변경 필요 → 퇴반 후 입반으로 진행.', guideId: 'class-transfer' },
  { id: 'mfaq-13', category: '수업 운영', q: '미납 학생 퇴반처리는 어떻게 하나요?', a: '수업관리 상세에서 입반생 목록을 불러온 후, 납부잔여회차가 0인 학생들을 확인하세요. 퇴반처리할 학생들을 체크 후 퇴반일 선택 → [퇴반처리] 클릭.', guideId: 'unpaid-withdraw' },
  { id: 'mfaq-14', category: '모집/접수', q: '대기번호가 있는 학생의 자리가 생겼어요.', a: '빠른 대기번호를 먼저 확인하세요 (병합 이관된 대기번호가 우선). 해당 회원에게 입반 의사를 확인한 후 [입반 전환] 버튼을 클릭하면 됩니다.', guideId: 'waitlist-manage' },
  { id: 'mfaq-15', category: '모집/접수', q: '동일 회원이 같은 강좌에 중복 접수되어 있어요.', a: '접수현황에서 기존 접수 내역을 확인 후 하나를 취소해야 합니다. 대기번호가 있는 건을 취소할 때는 기존 순번이 초기화됩니다.', guideId: 'recruit-application' },
  { id: 'mfaq-16', category: '강좌/교재', q: '청구 생성 팝업에서 교재 옵션이 표시되지 않아요.', a: '강좌에 교재가 연결되지 않았거나 비활성화 상태일 수 있습니다. 강좌관리 > 해당 강좌 > [교재 연결] 탭에서 상태를 재확인하세요.', guideId: 'textbook-register' },
  { id: 'mfaq-17', category: '강좌/교재', q: '강좌 생성 시 "중복된 강의실/시간대" 오류가 나요.', a: '동일 강의실에 동일 시간대의 강좌가 이미 존재하는 경우입니다. 강의실 또는 수업 시간대를 변경하세요.', guideId: 'course-create' },
]

export const MANAGER_FAQ_CATEGORIES = [...new Set(MANAGER_FAQ.map((f) => f.category))]

const norm = (s) => (s || '').toLowerCase().replace(/[\s·,./?!()[\]'"]+/g, '')

/** 질문/답변 본문에서 질의어를 토큰 단위로 매칭 — 점수순 상위 N개.
 *  list 인자로 런타임(실시간) 데이터를 넘길 수 있고, 없으면 번들을 쓴다. */
export function searchManagerFaq(query, limit = 5, list = MANAGER_FAQ) {
  const nq = norm(query)
  if (nq.length < 1) return []
  const scored = []
  for (const f of list) {
    const nQ = norm(f.q)
    const nA = norm(f.a)
    let score = 0
    if (nQ.includes(nq)) score += 100
    if (nA.includes(nq)) score += 30
    // 질의어 토큰(2자+)별 부분 매칭
    for (const t of query.split(/\s+/).map(norm).filter((t) => t.length >= 2)) {
      if (nQ.includes(t)) score += 10
      else if (nA.includes(t)) score += 4
    }
    if (score > 0) scored.push({ f, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.f)
}

export function bestManagerFaq(query, list = MANAGER_FAQ) {
  return searchManagerFaq(query, 1, list)[0] || null
}

/** 인기/대표 FAQ (빈 검색창 포커스 시 추천) — 카테고리별 1개씩 */
export function popularManagerFaq(limit = 5, list = MANAGER_FAQ) {
  const out = []
  const seen = new Set()
  for (const f of list) {
    if (seen.has(f.category)) continue
    seen.add(f.category)
    out.push(f)
    if (out.length >= limit) break
  }
  return out
}
