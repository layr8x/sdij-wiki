// src/data/officialQa.js
// 출처: 실장님 운영 시트 「AMS_챗봇_QA_관리」(Google Sheets 1v3FzWExwa00QD7-...)
// 추출: 2026-05-19 (Claude in Chrome SSO + gviz CSV)
// 8 카테고리 · 25 Q&A · 자가해결 라벨 포함
//
// 컬럼 구조:
//   q          : 사용자 질문 (FAQ 매칭 소스)
//   a          : 답변 본문 (단계 + ※ 주의사항)
//   selfSolve  : 'yes' | 'no' | 'partial'  → 챗봇 응답 분기 핵심
//   slackTitle : 자가해결 불가 시 슬랙 에스컬레이션 제목 (templated)
//   menuPath   : AMS 내부 메뉴 navigation (예: 'AMS → 청구·납부 → 환불 신청')
//   tip        : 한 줄 핵심 (UI 뱃지/툴팁)

export const OFFICIAL_QA_CATEGORIES = [
  { id: 'okta',        label: '로그인 / OKTA',     emoji: '🔐', confluenceGroup: '계정/권한/관리' },
  { id: 'refund',      label: '환불 / 취소',       emoji: '💰', confluenceGroup: '청구/수납/결제/환불' },
  { id: 'payment',     label: '수강료 / 결제',     emoji: '💳', confluenceGroup: '청구/수납/결제/환불' },
  { id: 'enrollment',  label: '입반 / 대기',       emoji: '📋', confluenceGroup: '접수/모집' },
  { id: 'attendance',  label: '출결 / 보강',       emoji: '📅', confluenceGroup: '수업운영관리(입/퇴반/출결)' },
  { id: 'member',      label: '회원 / 학생관리',   emoji: '👤', confluenceGroup: '회원관리' },
  { id: 'course',      label: '강좌 / 반관리',     emoji: '📚', confluenceGroup: '강좌(반)관리' },
  { id: 'message',     label: '문자 / 알림',       emoji: '💬', confluenceGroup: '메시지 관리' },
]

export const OFFICIAL_QA = [
  // ─── 🔐 로그인 / OKTA ────────────────────────────────────────
  {
    id: 'okta-01', category: 'okta',
    q: 'OKTA 앱을 삭제했는데 QR 코드가 없어요',
    a: 'OKTA 앱은 삭제 시 고유 Key값이 초기화됩니다. 재등록을 위해서는 관리자의 Reset 처리가 필요합니다.\n\n[처리 방법]\n그룹웨어 계정(이메일)을 플랫폼서비스실에 전달해 주시면 리셋 처리 후 QR 등록 화면이 다시 나타납니다.',
    selfSolve: 'no', slackTitle: 'OKTA Reset 요청', menuPath: '',
    tip: '기기 삭제 시 반드시 플서실 Reset 필요',
  },
  {
    id: 'okta-02', category: 'okta',
    q: '핸드폰을 바꿨는데 OKTA 앱 재등록이 안 돼요',
    a: '기기 변경 시에는 반드시 플랫폼서비스실에 Reset 처리를 요청해야 합니다.\n\n[처리 방법]\n① 그룹웨어 계정정보(이메일)를 플서실에 전달\n② Reset 처리 완료 후 앱 재설치\n③ OKTA 앱 → 계정 추가 → QR 스캔으로 재등록\n\n※ OKTA 앱은 재설치만으로는 복구되지 않습니다.',
    selfSolve: 'no', slackTitle: 'OKTA 기기변경 Reset 요청', menuPath: '',
    tip: '재설치만으로 복구 불가',
  },
  {
    id: 'okta-03', category: 'okta',
    q: 'AMS 접속이 안 됩니다',
    a: 'AMS 자체는 접속 제한이 없습니다. 아래 순서로 확인해 주세요.\n\n① WiFi 연결 확인 (교육용: sidae_Edu / PW: sidae1234!)\n② 모바일 데이터로 접속 시 내부망 차단으로 접속 불가\n③ 브라우저 캐시 삭제 후 재시도\n④ 위 방법으로 해결 안 될 경우 접속 화면 캡처 후 문의\n\n🔗 AMS 주소: ams.sdij.com',
    selfSolve: 'yes', slackTitle: '', menuPath: 'ams.sdij.com',
    tip: 'WiFi 연결 여부 먼저 확인',
  },
  {
    id: 'okta-04', category: 'okta',
    q: 'QR 코드 입력란이 나타났는데 어떻게 해야 하나요',
    a: 'OKTA 앱 최초 등록 시 나타나는 화면입니다.\n\n[등록 방법]\n① OKTA 앱 실행 → + 버튼 → 계정 추가\n② \'바코드 스캔\' 선택 후 화면의 QR 코드 스캔\n③ 등록 완료 후 6자리 코드 입력하여 로그인\n\n※ 최초 등록에 사용된 이메일 계정으로만 등록 가능합니다.',
    selfSolve: 'yes', slackTitle: '', menuPath: '',
    tip: '최초 1회 등록 프로세스',
  },

  // ─── 💰 환불 / 취소 ──────────────────────────────────────────
  {
    id: 'refund-01', category: 'refund',
    q: '카드 결제 취소는 어떻게 하나요',
    a: '환불은 퇴원 여부와 무관하게 진행 가능합니다.\n\n[처리 경로]\nAMS → 청구·납부 → 환불 신청 → 해당 결제 건 선택\n\n※ 부분 결제 건(신한캠+현금 혼합)은 직접 취소 불가\n※ 취소 가능 금액은 \'환불가능금액 확인\' 버튼으로 확인',
    selfSolve: 'yes', slackTitle: '', menuPath: 'AMS → 청구·납부 → 환불 신청',
    tip: '퇴원과 환불은 독립 처리',
  },
  {
    id: 'refund-02', category: 'refund',
    q: '환불대기 상태를 취소하고 싶어요',
    a: '환불대기 상태는 현재 직접 취소 기능이 제한되어 있습니다. (직접 취소 기능은 개발 예정 중)\n\n[임시 처리 방법]\n환불코드 번호와 함께 플서실에 취소 요청 주시면 처리해 드립니다.',
    selfSolve: 'no', slackTitle: '환불대기 취소 요청', menuPath: '',
    tip: '직접 취소 기능 개발 예정',
  },
  {
    id: 'refund-03', category: 'refund',
    q: '퇴원 없이 부분 결제만 카드 취소 가능한가요',
    a: '가능합니다. 퇴원 처리와 환불은 독립적으로 진행됩니다.\n\n[처리 경로]\nAMS → 청구·납부 → 환불처리 → 해당 납부코드 선택\n\n※ 신한캠퍼스로 일부 결제된 경우, 신한캠 매칭분은 별도 처리 필요',
    selfSolve: 'yes', slackTitle: '', menuPath: 'AMS → 청구·납부 → 환불처리',
    tip: '퇴원과 환불 독립 진행 가능',
  },
  {
    id: 'refund-04', category: 'refund',
    q: '가상계좌 입금인데 환불 처리는 어떻게 하나요',
    a: '가상계좌 환불은 계좌 정보 등록이 필요합니다.\n\n[처리 경로]\n① AMS → 청구·납부 → 환불신청\n② 환불계좌 등록 (학부모 계좌정보 수집 필요)\n③ 영업일 기준 3~5일 내 처리\n\n※ AMS의 가상계좌는 결제 건마다 다른 고유 계좌입니다.\n※ 2026.04.20부터 환불계좌 \'추후 입력\' 기능 추가 (회원상세 > 수강정보 > 환불 팝업 내 체크박스)',
    selfSolve: 'yes', slackTitle: '', menuPath: 'AMS → 청구·납부 → 환불신청',
    tip: '계좌 정보 수집 후 진행 / \'추후 입력\' 가능',
  },

  // ─── 💳 수강료 / 결제 ────────────────────────────────────────
  {
    id: 'payment-01', category: 'payment',
    q: '납부대기 학생에게 결제 문자를 보내려면',
    a: '[처리 경로]\nAMS → 청구·납부 → 납부대기 목록 → 대상 학생 선택 → \'결제 문자 발송\' 클릭\n\n※ 결제 URL 포함 문자와 단순 안내 문자 중 선택 가능\n※ 개인정보 동의가 완료된 학생에게만 발송 가능',
    selfSolve: 'yes', slackTitle: '', menuPath: 'AMS → 청구·납부 → 납부대기 목록',
    tip: '개인정보 동의 완료 필수',
  },
  {
    id: 'payment-02', category: 'payment',
    q: '신한캠퍼스 매칭 후 결제내역에 반영이 안 돼요',
    a: '분할 결제(신한캠+현금) 시 처리 순서가 중요합니다.\n\n[올바른 처리 순서]\n① 신한캠퍼스 매칭을 먼저 진행\n② 나머지 금액을 현금/카드로 추가 수납\n\n이미 반영 안 된 경우, 납부코드를 클릭하면 상품 상세 확인 가능합니다.',
    selfSolve: 'yes', slackTitle: '', menuPath: 'AMS → 청구·납부 → 납부코드 클릭',
    tip: '신한캠 먼저, 현금 나중 순서 필수',
  },
  {
    id: 'payment-03', category: 'payment',
    q: '가상계좌가 매번 다르게 발급되는 건가요',
    a: '네, 맞습니다. AMS는 고유 가상계좌 방식이 아닙니다.\n\n[안내]\n- 결제 건마다 새로운 가상계좌가 발급됩니다\n- 동일 학생이라도 납부코드마다 계좌번호가 다릅니다\n- 유효기간 내 미입금 시 자동 소멸됩니다\n\n원격 결제 필요 시: AMS 결제창 → 가상계좌 선택',
    selfSolve: 'yes', slackTitle: '', menuPath: 'AMS → 결제창 → 가상계좌 선택',
    tip: '건별 고유 계좌 / 만료 주의',
  },
  {
    id: 'payment-04', category: 'payment',
    q: '이미 부분 납부된 건을 추가 결제하려면',
    a: '부분 수납이 발생한 건은 AMS 결제창으로만 완납 처리 가능합니다.\n\n[처리 방법]\n① AMS → 해당 납부코드 클릭\n② \'완납처리\' 버튼 선택\n③ 결제수단 선택 (카드/현금/가상계좌)\n\n원격 결제 요청 시: AMS 결제창 → 가상계좌로만 진행 가능',
    selfSolve: 'yes', slackTitle: '', menuPath: 'AMS → 납부코드 → 완납처리',
    tip: '원격 결제는 가상계좌만 가능',
  },

  // ─── 📋 입반 / 대기 ──────────────────────────────────────────
  {
    id: 'enrollment-01', category: 'enrollment',
    q: '입반/대기 처리에서 정원이 실제와 다르게 보여요',
    a: '강좌-반-전형은 최초 생성 시에만 동기화되며, 이후에는 독립적으로 관리됩니다.\n\n[정원 변경 방법]\n전형관리 메뉴 → 해당 전형의 인원 숫자 클릭 → 수정\n\n※ 강좌관리 또는 반관리에서 정원을 변경해도 입반/대기처리 화면에는 반영되지 않습니다. 반드시 전형관리에서 수정해야 합니다.',
    selfSolve: 'yes', slackTitle: '', menuPath: 'AMS → 전형관리 → 인원 숫자 클릭',
    tip: '전형관리에서만 수정 유효',
  },
  {
    id: 'enrollment-02', category: 'enrollment',
    q: '대기 명단은 어디서 확인하나요',
    a: '[확인 경로]\nAMS → 전형관리 → 해당 강좌 선택 → 대기 탭\n\n또는\nAMS → 입반/대기처리 → 상단 필터에서 \'대기만 보기\' 선택\n\n※ 현재 입반/대기처리 화면에는 퇴원생 인원이 포함되어 보일 수 있습니다. (개선 작업 중)',
    selfSolve: 'yes', slackTitle: '', menuPath: 'AMS → 전형관리 → 대기 탭',
    tip: '퇴원생 포함 표시 버그 개선 중',
  },
  {
    id: 'enrollment-03', category: 'enrollment',
    q: '대기 학생이 없는데 대기 표시가 됩니다',
    a: '정원 설정과 현재 입반생 수를 먼저 확인해 주세요.\n\n[확인 경로]\nAMS → 전형관리 → 해당 전형 → 인원 현황\n\n입반/대기 처리 화면의 인원수는 퇴원생 포함 수치일 수 있습니다. 실제 재원생 기준으로는 전형관리에서 확인하세요.',
    selfSolve: 'yes', slackTitle: '', menuPath: 'AMS → 전형관리 → 인원 현황',
    tip: '퇴원생 포함 수치 오인 가능성',
  },
  {
    id: 'enrollment-04', category: 'enrollment',
    q: '대기에서 입반 처리하는 방법이 궁금해요',
    a: '[처리 경로]\nAMS → 입반/대기처리 → 강좌 검색 → 대기 탭 → 해당 학생 선택 → \'입반처리\' 클릭\n\n※ 입반 시 납부코드가 자동 생성됩니다. 결제 완료 전까지는 미납 상태로 표시됩니다.',
    selfSolve: 'yes', slackTitle: '', menuPath: 'AMS → 입반/대기처리 → 대기 탭',
    tip: '입반 후 납부코드 자동 생성',
  },

  // ─── 📅 출결 / 보강 ──────────────────────────────────────────
  {
    id: 'attendance-01', category: 'attendance',
    q: '출석을 결석으로 변경하고 싶어요',
    a: '[처리 경로]\nAMS → 출결관리 → 해당 수업 날짜 선택 → 학생 이름 더블클릭 → 상태 변경\n\n※ 출결 발생 후 일정 시간 이후에는 직접 변경이 제한될 수 있습니다\n※ 변경이 안 되는 경우 플서실에 요청해 주세요\n※ 결석 사유 입력은 변경 시 함께 기재 가능합니다',
    selfSolve: 'yes', slackTitle: '출결 변경 요청', menuPath: 'AMS → 출결관리 → 날짜 선택 → 더블클릭',
    tip: '시간 초과 시 플서실 요청',
  },
  {
    id: 'attendance-02', category: 'attendance',
    q: '보강코드를 잘못 부여했어요',
    a: '보강코드 그룹명 수정은 직접 가능합니다.\n\n[수정 경로]\nAMS → 보강코드 관리 → 해당 그룹 선택 → 이름 수정\n\n※ 이미 출결에 연결된 보강코드 삭제는 직접 처리가 어렵습니다. 삭제가 필요한 경우 보강코드 번호를 플서실에 전달해 주세요.',
    selfSolve: 'partial', slackTitle: '보강코드 삭제 요청', menuPath: 'AMS → 보강코드 관리',
    tip: '이름 수정은 직접 / 삭제는 플서실',
  },
  {
    id: 'attendance-03', category: 'attendance',
    q: '퇴원 후 출결기록이 사라졌어요',
    a: '퇴원 처리 시 해당 수업의 출결 데이터는 유지되지만 화면에서 보이지 않을 수 있습니다.\n\n[확인 방법]\nAMS → 출결관리 → 상단 필터에서 \'퇴원생 포함\' 옵션 선택\n\n이 방법으로도 확인이 안 되는 경우 학생 이름과 수업명을 플서실에 문의해 주세요.',
    selfSolve: 'yes', slackTitle: '퇴원생 출결기록 확인 요청', menuPath: 'AMS → 출결관리 → 퇴원생 포함 필터',
    tip: '데이터는 존재 / 필터 미선택 시 미표시',
  },

  // ─── 👤 회원 / 학생 관리 ─────────────────────────────────────
  {
    id: 'member-01', category: 'member',
    q: '로컬회원 일괄 업로드 시 학년은 어떻게 입력하나요',
    a: '[입력 형식]\n고1, 고2, 고3 / 중1, 중2, 중3 (다른 형식 입력 시 오류 발생)\n\n[업로드 방법]\nAMS → 회원관리 → 로컬회원 → 엑셀 양식 다운로드 → 양식에 맞게 작성 후 업로드',
    selfSolve: 'yes', slackTitle: '', menuPath: 'AMS → 회원관리 → 로컬회원 → 엑셀 업로드',
    tip: '형식 정확히 준수 필요',
  },
  {
    id: 'member-02', category: 'member',
    q: '로컬회원과 통합회원이 동일인인데 어떻게 처리하나요',
    a: '연동코드를 통해 로컬회원과 통합회원을 연결할 수 있습니다.\n\n[처리 경로]\nAMS → 회원관리 → 로컬회원 → 해당 학생 → \'통합회원 연동\' 클릭 → 통합회원 연동코드 입력\n\n※ 연동 후에는 통합회원 정보가 기준이 됩니다. 연동코드는 마이클래스 앱에서 확인 가능',
    selfSolve: 'yes', slackTitle: '', menuPath: 'AMS → 회원관리 → 로컬회원 → 통합회원 연동',
    tip: '연동코드는 마이클래스 앱에서 확인',
  },
  {
    id: 'member-03', category: 'member',
    q: '학생/학부모 전화번호가 같으면 저장이 안 됩니다',
    a: 'AMS는 학생 번호와 학부모 번호가 동일할 경우 저장을 차단합니다. (중복 등록 방지 정책)\n\n[처리 방법]\n실제 다른 번호로 등록하거나, 한 쪽은 빈값으로 처리 후 플서실에 예외 처리 요청',
    selfSolve: 'no', slackTitle: '학생/학부모 번호 동일 예외처리 요청', menuPath: '',
    tip: '시스템 중복 방지 정책',
  },
  {
    id: 'member-04', category: 'member',
    q: '개인정보 동의 문자가 발송이 안 됩니다',
    a: '개인정보 동의 버튼이 비활성화(회색)인 경우 아래를 확인해 주세요.\n\n[확인 사항]\n① 이미 동의 완료 상태인지 확인\n② 수신거부 상태 → 직접 해제 불가, 학부모 직접 철회 필요\n③ 로컬회원인 경우 → 통합회원과 연동 필요\n\n상기 방법으로 해결 안 될 경우 회원 번호와 함께 문의해 주세요.',
    selfSolve: 'yes', slackTitle: '개인정보 동의 발송 불가 문의', menuPath: 'AMS → 회원관리 → 개인정보 동의 상태 확인',
    tip: '수신거부는 학부모 직접 철회만 가능',
  },

  // ─── 📚 강좌 / 반 관리 ───────────────────────────────────────
  {
    id: 'course-01', category: 'course',
    q: '강좌에 선생님을 2명 등록하려면',
    a: '현재 강좌 1개에 강사 1명만 기본 등록됩니다.\n\n[처리 방법]\n강좌관리 → 해당 강좌 → 수정 → 강사 항목에서 추가 강사 등록 (콤보박스에서 강사명 검색 후 추가)\n\n지원이 안 되는 경우 플서실에 강좌명과 강사명을 전달해 주세요.',
    selfSolve: 'yes', slackTitle: '강좌 복수 강사 등록 요청', menuPath: 'AMS → 강좌관리 → 수정 → 강사 추가',
    tip: '기본 1명 / 추가 등록 가능',
  },
  {
    id: 'course-02', category: 'course',
    q: '폐강 처리한 강좌를 다시 되돌릴 수 있나요',
    a: '접수나 입반이 발생하지 않은 강좌는 복구 가능합니다.\n\n[처리 경로]\nAMS → 강좌관리 → 상태 필터: 폐강 선택 → 해당 강좌 → \'개강예정으로 변경\' 클릭\n\n※ 이미 입반생이 발생한 강좌의 폐강 복구는 플서실에 요청해 주세요.',
    selfSolve: 'yes', slackTitle: '폐강 강좌 복구 요청', menuPath: 'AMS → 강좌관리 → 상태 필터: 폐강',
    tip: '입반생 발생 전 강좌만 직접 복구 가능',
  },
  {
    id: 'course-03', category: 'course',
    q: '강좌 인원수 변경이 입반/대기처리에 반영 안 돼요',
    a: '강좌-반-전형의 인원은 독립적으로 관리됩니다. 강좌관리에서 수정해도 입반/대기처리 화면의 정원은 변경되지 않습니다.\n\n[올바른 변경 경로]\n전형관리 → 해당 전형 → 인원 숫자 클릭 → 수정\n\n이 경로로 수정해야 입반/대기처리 화면에 즉시 반영됩니다.',
    selfSolve: 'yes', slackTitle: '', menuPath: 'AMS → 전형관리 → 인원 숫자 클릭',
    tip: '강좌/반 수정은 전형관리에 미반영',
  },

  // ─── 💬 문자 / 알림 ──────────────────────────────────────────
  {
    id: 'message-01', category: 'message',
    q: '문자 발송이 안 됩니다 (개인정보 동의 버튼 회색)',
    a: '개인정보 동의가 완료되지 않으면 문자 발송이 차단됩니다.\n\n[해결 방법]\n① AMS → 해당 학생 → 개인정보동의 상태 확인\n② 미동의 상태: \'개인정보동의 문자 발송\' 클릭 → 학부모가 동의 완료해야 함\n③ 수신거부 상태: 학부모가 직접 철회해야만 해제 가능\n\n※ 관리자도 수신거부 상태를 임의로 해제할 수 없습니다.',
    selfSolve: 'yes', slackTitle: '개인정보 동의 발송 오류', menuPath: 'AMS → 학생 정보 → 개인정보 동의 상태',
    tip: '수신거부는 학부모 직접 철회만 가능',
  },
  {
    id: 'message-02', category: 'message',
    q: '문자 내용이 잘려서 발송됩니다',
    a: 'SMS는 한글 기준 90byte(약 45자), MMS는 2000자 제한이 있습니다.\n\n[해결 방법]\n① 내용을 줄여서 90byte 이하로 작성\n② 또는 MMS로 발송 유형 변경 (이미지 첨부 시 자동 MMS)\n\n부엉이 라이브러리 관련 문자 등 긴 내용은 복사 붙여넣기 시 자동 잘림 주의',
    selfSolve: 'yes', slackTitle: '', menuPath: 'AMS → 메시지 발송',
    tip: 'SMS 45자 제한 / MMS 자동 전환 가능',
  },
  {
    id: 'message-03', category: 'message',
    q: '학부모에게만 문자를 보내고 싶어요',
    a: '[발송 대상 설정 방법]\nAMS → 메시지 발송 → 발송 대상 선택 → \'학부모\'만 체크하고 \'학생\' 체크 해제\n\n단체 발송 시에도 동일하게 적용됩니다. 학부모 연락처가 미등록인 경우 발송 대상에서 제외됩니다.',
    selfSolve: 'yes', slackTitle: '', menuPath: 'AMS → 메시지 발송 → 발송 대상 선택',
    tip: '학부모 번호 미등록 시 발송 제외',
  },
]

// ─── 검색/매칭 유틸 ─────────────────────────────────────────────
const TOKEN_NORMALIZE = (s) => s.toLowerCase().replace(/[\s·\-/]+/g, '')

/**
 * 시트의 25 Q&A 풀에서 가장 유사한 항목 찾기 (간단한 키워드 매칭)
 * @returns {OfficialQA | null}
 */
export function matchOfficialQa(query) {
  if (!query || query.length < 2) return null
  const nq = TOKEN_NORMALIZE(query)
  let best = null
  let bestScore = 0
  for (const item of OFFICIAL_QA) {
    const nQ = TOKEN_NORMALIZE(item.q)
    // 키 토큰 추출 - 카테고리 / 질문에서 명사 단위 매칭
    const tokens = [
      ...item.q.split(/\s+/),
      ...(item.tip || '').split(/\s+/),
    ].map(TOKEN_NORMALIZE).filter(t => t.length >= 2)
    let score = 0
    for (const t of tokens) {
      if (nq.includes(t)) score += t.length
    }
    // 직접 포함 보너스
    if (nq.includes(nQ.slice(0, 6))) score += 10
    if (score > bestScore) { bestScore = score; best = item }
  }
  // 최소 점수 임계값
  return bestScore >= 4 ? { item: best, score: bestScore } : null
}

export function getQaByCategory(categoryId) {
  return OFFICIAL_QA.filter(q => q.category === categoryId)
}

export function getQaById(id) {
  return OFFICIAL_QA.find(q => q.id === id) || null
}

export const OFFICIAL_QA_STATS = {
  totalQa: OFFICIAL_QA.length,
  categories: OFFICIAL_QA_CATEGORIES.length,
  selfSolveYes: OFFICIAL_QA.filter(q => q.selfSolve === 'yes').length,
  selfSolveNo: OFFICIAL_QA.filter(q => q.selfSolve === 'no').length,
  selfSolvePartial: OFFICIAL_QA.filter(q => q.selfSolve === 'partial').length,
  source: '실장님 운영 시트 AMS_챗봇_QA_관리 (2026-05-19 추출)',
}
