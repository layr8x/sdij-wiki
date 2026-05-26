// src/lib/maskPII.js
// 화면 표시용 2차 PII 마스킹 (defense-in-depth).
// 데이터는 적재 시 이미 마스킹되지만(scripts/lib/kakao-sanitize.mjs), 레거시 행이나
// 만약의 누락에 대비해 표시 직전에도 한 번 더 가린다.
// 핵심 규칙은 데몬측 kakao-sanitize.mjs 와 동일하며, 양쪽 모두 테스트로 고정한다.

const NAME_LABELS =
  '회원명|가입자명|학생명|학생이름|학부모명|학부모이름|보호자명|자녀명|성함|이름'

const CARD_RE = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g
const RRN_RE = /\b\d{6}[-\s]?[1-4]\d{6}\b/g
const EMAIL_RE = /[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g
const MOBILE_RE = /(01[016-9])[-.\s]?(\d{3,4})[-.\s]?(\d{4})/g
const LANDLINE_RE = /(0\d{1,3})[-.\s](\d{3,4})[-.\s](\d{4})/g
const LABEL_NAME_RE = new RegExp(
  '(' + NAME_LABELS + ')(\\s*[:：]\\s*)([가-힣*]{1,4})',
  'g',
)
const HAS_PHONE_OR_EMAIL_RE =
  /(01[016-9][-.\s]?\d{3,4}[-.\s]?\d{4})|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/
const STANDALONE_NAME_RE = /(^|\n)[ \t]*([가-힣]{2,4})[ \t]*(?=\r?\n|$)/g

// 이름 마스킹: 외자→*, 2자→앞+*, 3자+→앞+가운데(*)+뒤.
export function maskName(name) {
  if (name == null) return name
  const s = String(name).trim()
  if (!s) return s
  const ch = [...s]
  if (ch.length === 1) return '*'
  if (ch.length === 2) return ch[0] + '*'
  return ch[0] + '*'.repeat(ch.length - 2) + ch[ch.length - 1]
}

// 본문 마스킹(이메일/전화/주민/카드/라벨이름/폼 단독줄 이름). 멱등.
export function maskBody(text) {
  if (text == null) return text
  let s = String(text)
  const formLike = HAS_PHONE_OR_EMAIL_RE.test(s)
  s = s.replace(CARD_RE, '[카드번호]')
  s = s.replace(RRN_RE, '[주민번호]')
  s = s.replace(EMAIL_RE, '***@$1')
  s = s.replace(MOBILE_RE, '$1-****-$3')
  s = s.replace(LANDLINE_RE, '$1-****-$3')
  s = s.replace(LABEL_NAME_RE, (_m, label, sep, name) => label + sep + maskName(name))
  if (formLike) {
    s = s.replace(STANDALONE_NAME_RE, (_m, pre, name) => pre + maskName(name))
  }
  return s
}
