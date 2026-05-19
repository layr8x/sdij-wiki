// supabase/functions/kakao-webhook/index.ts
// 카카오 i 오픈빌더 / 카카오 비즈니스 챗봇 webhook 수신 → 분류 → DB insert.
//
// 배포: supabase functions deploy kakao-webhook --no-verify-jwt
//   (--no-verify-jwt: 카카오는 Supabase JWT 를 보내지 않으므로 필수.
//    대신 URL 쿼리스트링 token 으로 인증)
//
// 환경변수 (Supabase Dashboard > Edge Functions > Secrets):
//   SUPABASE_URL                — 자동 주입
//   SUPABASE_SERVICE_ROLE_KEY   — 자동 주입
//   KAKAO_WEBHOOK_TOKEN         — 직접 설정 (랜덤 문자열, URL ?token=... 으로 전달)
//
// 카카오 등록 URL 예시:
//   https://<project>.supabase.co/functions/v1/kakao-webhook?token=<KAKAO_WEBHOOK_TOKEN>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { classifyMessage } from './classify.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SECRET_TOKEN = Deno.env.get('KAKAO_WEBHOOK_TOKEN');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// 카카오 i 오픈빌더 skill response 포맷
function kakaoReply(text: string) {
  return {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text } }],
    },
  };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// 다양한 payload 형태에서 필드 추출 (오픈빌더 / 챗봇 / 커스텀)
interface ExtractedFields {
  userKey: string | null;
  utterance: string;
  externalId: string | null;
  timestamp: string;
}

function extractFields(payload: any): ExtractedFields {
  // 카카오 i 오픈빌더 skill payload:
  //   { userRequest: { user: { id }, utterance, params: { timestamp } }, ... }
  const ur = payload?.userRequest;
  if (ur) {
    return {
      userKey: ur.user?.id ?? null,
      utterance: ur.utterance ?? '',
      externalId: payload?.action?.id ?? ur.block?.id ?? null,
      timestamp: ur.params?.timestamp ?? new Date().toISOString(),
    };
  }
  // 카카오 비즈니스 직접 webhook (가정 구조):
  //   { user_key, message, message_id, timestamp }
  return {
    userKey: payload?.user_key ?? payload?.userKey ?? null,
    utterance: payload?.message ?? payload?.text ?? '',
    externalId: payload?.message_id ?? payload?.messageId ?? null,
    timestamp: payload?.timestamp ?? new Date().toISOString(),
  };
}

Deno.serve(async (req: Request) => {
  // ─── 1. Method ────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    // healthcheck (카카오 webhook 등록 시 GET 으로 검증하는 채널 있음)
    return jsonResponse({ status: 'ok', service: 'kakao-webhook' });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // ─── 2. 인증 (URL ?token=...) ─────────────────────────────────────────
  if (SECRET_TOKEN) {
    const token = new URL(req.url).searchParams.get('token');
    if (token !== SECRET_TOKEN) {
      console.warn('[kakao-webhook] invalid token');
      return jsonResponse({ status: 'unauthorized' }, 401);
    }
  } else {
    console.warn('[kakao-webhook] KAKAO_WEBHOOK_TOKEN unset — running without auth');
  }

  // ─── 3. Parse ─────────────────────────────────────────────────────────
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ status: 'error', message: 'invalid JSON' }, 400);
  }

  const { userKey, utterance, externalId, timestamp } = extractFields(payload);
  if (!utterance || !userKey) {
    // 카카오가 빈 utterance 를 보낼 수 있음 (welcome 이벤트 등) — 200 으로 무시
    return jsonResponse(kakaoReply('안녕하세요! 문의 내용을 자세히 입력해주세요.'));
  }

  // ─── 4. 분류 + 저장 ────────────────────────────────────────────────────
  const classified = classifyMessage(utterance);

  const { error } = await supabase.from('kakao_messages').insert({
    user_key: userKey,
    message: utterance,
    received_at: timestamp,
    category: classified.category,
    category_label: classified.categoryLabel,
    sentiment: classified.sentiment,
    sentiment_score: classified.sentimentScore,
    raw_payload: payload,
    external_id: externalId,
  });

  if (error) {
    // 중복 external_id (23505) 는 무시 — 카카오 재전송 가능성
    if (error.code === '23505') {
      console.info('[kakao-webhook] duplicate external_id, skipped');
      return jsonResponse(kakaoReply('문의가 접수되었습니다.'));
    }
    console.error('[kakao-webhook] insert failed:', error);
    return jsonResponse({ status: 'error', message: error.message }, 500);
  }

  // ─── 5. 카테고리별 응답 (간단한 자동 안내) ─────────────────────────────
  const replyText = buildAutoReply(classified.category);
  return jsonResponse(kakaoReply(replyText));
});

function buildAutoReply(category: string): string {
  const replies: Record<string, string> = {
    'video-content':   '영상 재생 관련 문의 감사합니다. 잠시 후 상담원이 답변드리겠습니다.\n임시 가이드: https://ams-wiki.app/guide/video-troubleshoot',
    'qr-attendance':   'QR/출석 관련 문의 접수되었습니다. 카메라 권한 확인 가이드: https://ams-wiki.app/guide/qr-troubleshoot',
    'school-link':     '학원 등록 연동 안내드리겠습니다: https://ams-wiki.app/guide/school-link',
    'refund-payment':  '환불 문의는 영업일 기준 1일 내 상담원이 안내드립니다.',
    'parent-account':  '계정 통합 가이드: https://ams-wiki.app/guide/parent-account',
  };
  return replies[category] ?? '문의가 접수되었습니다. 빠르게 답변드리겠습니다.';
}
