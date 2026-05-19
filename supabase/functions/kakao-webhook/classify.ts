// supabase/functions/kakao-webhook/classify.ts
// scripts/classify-kakao-csv.mjs 의 룰셋을 Deno (Edge Function) 용으로 포팅.
// 룰셋이 바뀌면 양쪽을 함께 갱신해야 함. (TODO: 단일 소스 추출)

export interface Classification {
  category: string;
  categoryLabel: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
}

interface CategoryRule {
  id: string;
  label: string;
  keywords: string[];
}

export const CATEGORY_RULES: CategoryRule[] = [
  { id: 'video-content', label: '영상재생/콘텐츠',
    keywords: ['영상', '재생', 'VOD', '동영상', '복습', '버퍼링', '스트리밍', '플레이', '안 나와', '안나와', '끊김', '로딩'] },
  { id: 'school-link', label: '학원등록연동',
    keywords: ['연동', '학원 등록', '학원등록', '연결', '인증코드', '학원 정보', '연결이 안'] },
  { id: 'qr-attendance', label: 'QR/출석',
    keywords: ['QR', '큐알', '출석', '출결', '체크', '인식', '카메라', '출석부'] },
  { id: 'parent-account', label: '학부모/계정통합',
    keywords: ['학부모', '계정', '통합', '병합', '아이디', '로그인', '회원가입', '본인인증', 'PASS', '인증번호'] },
  { id: 'refund-payment', label: '환불/결제',
    keywords: ['환불', '결제', '카드', '취소', '청구', '수강료', '납부', '가상계좌', '신한', '중복결제', '승인'] },
  { id: 'enrollment', label: '수강신청/대기',
    keywords: ['수강신청', '신청', '대기', '예약', '접수', '등록'] },
  { id: 'app-access', label: '앱 접근/실행',
    keywords: ['앱', '실행', '진입', '접속', '안 들어가', '안들어가'] },
  { id: 'login-auth', label: '로그인/인증',
    keywords: ['비밀번호', '비번', '아이디 찾기', 'OTP', '로그아웃'] },
  { id: 'app-bug', label: '앱 버그/오류',
    keywords: ['오류', '에러', '버그', '먹통', '튕김', '튕겨', '안됨', '작동 안'] },
  { id: 'textbook-delivery', label: '교재/배송',
    keywords: ['교재', '배송', '배부', '책', '도착', '받지 못', '미수령'] },
  { id: 'class-info', label: '강좌/수업 정보',
    keywords: ['강좌', '수업', '시간표', '강사', '강의실', '커리큘럼'] },
];

const NEGATIVE_KEYWORDS = [
  '화나', '짜증', '답답', '실망', '불만', '컴플', '컴플레인', '항의',
  '안돼', '안 돼', '안됨', '왜 안', '도대체', '제발', '망',
  'ㅠ', 'ㅜ', '아니', '진짜', '도저히',
];
const POSITIVE_KEYWORDS = [
  '감사', '고맙', '좋아요', '확인', '해결', '잘 됐', '잘됐', '👍', 'ㅎㅎ',
];

export function classifyMessage(text: string): Classification {
  if (!text || typeof text !== 'string') {
    return { category: 'misc', categoryLabel: '기타', sentiment: 'neutral', sentimentScore: 0 };
  }
  const lower = text.toLowerCase();

  let category = 'misc';
  let categoryLabel = '기타';
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((k) => lower.includes(k.toLowerCase()))) {
      category = rule.id;
      categoryLabel = rule.label;
      break;
    }
  }

  let neg = 0, pos = 0;
  for (const k of NEGATIVE_KEYWORDS) if (lower.includes(k)) neg++;
  for (const k of POSITIVE_KEYWORDS) if (lower.includes(k)) pos++;
  const score = pos - neg;
  const sentiment: Classification['sentiment'] =
    score >= 1 ? 'positive' : score <= -1 ? 'negative' : 'neutral';

  return { category, categoryLabel, sentiment, sentimentScore: score };
}
