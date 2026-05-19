#!/usr/bin/env node
// 단과톡방 25.11.03 ~ 26.05.11 (6.5개월) KakaoTalk export 파싱 + 심층 분석
import fs from 'node:fs';

const PATH = process.env.DANGUA_TXT ||
  '/Users/layr8x/Library/Application Support/Claude/local-agent-mode-sessions/60b1cdb6-51c7-412d-bf67-13eca0e665ec/a0920c98-0b1a-4b0d-85ad-b8db77d32766/local_6d744ee6-3535-4799-b92b-99906a45de0b/uploads/단과톡방 25.11.03-26.05.11.txt';

const raw = fs.readFileSync(PATH, 'utf8');
const lines = raw.split(/\r?\n/);

// 파싱: 날짜 + [발신자] [시간] 본문
const DATE_RE = /^---+ (\d{4})년 (\d{1,2})월 (\d{1,2})일 .요일 ---+$/;
const MSG_RE = /^\[(.+?)\] \[(오전|오후) (\d{1,2}):(\d{2})\] (.*)$/;

let curDate = null;
const messages = [];
let buf = null;

function flush() {
  if (buf) { messages.push(buf); buf = null; }
}

for (const ln of lines) {
  const dm = ln.match(DATE_RE);
  if (dm) {
    flush();
    curDate = `${dm[1]}-${String(dm[2]).padStart(2, '0')}-${String(dm[3]).padStart(2, '0')}`;
    continue;
  }
  const mm = ln.match(MSG_RE);
  if (mm) {
    flush();
    let h = Number(mm[3]);
    if (mm[2] === '오후' && h !== 12) h += 12;
    if (mm[2] === '오전' && h === 12) h = 0;
    const time = `${String(h).padStart(2, '0')}:${mm[4]}:00`;
    buf = {
      datetime: `${curDate} ${time}`,
      sender: mm[1].trim(),
      message: mm[5],
    };
  } else if (buf && ln.trim() && !ln.includes('들어왔습니다') && !ln.includes('나갔습니다') && !ln.includes('부방장')) {
    buf.message += '\n' + ln;
  }
}
flush();

console.error(`[parse] ${messages.length} messages from ${lines.length} lines`);
console.error(`[parse] date range: ${messages[0]?.datetime} ~ ${messages[messages.length-1]?.datetime}`);

// 분류 규칙 (단과 직원 이슈)
const STAFF_RULES = {
  '계정이관/통합': /(이관|통합|로컬 미사용|통합계정|중복 ?계정|회원이관|통합 ?처리|통합 ?회원|aip|AIP)/i,
  '출결 시스템': /(출석|결석|지각|QR|qr|출석부|체크인|출결|입실)/i,
  '결제/환불 오류': /(환불|결제|결제 ?오류|중복 ?결제|결제 ?취소|환급)/i,
  '수강료/청구 오류': /(수강료|청구|미납|학원비|청구서|영수증|cms|CMS)/i,
  '영상/콘텐츠': /(영상|재생|업로드|복습영상|VOD|vod|동영상|시청)/i,
  '회원검색/학사정보': /(회원검색|학사정보|학사 ?관리|학적|회원 ?정보|회원조회)/i,
  '대기/수강신청': /(대기|신청 ?접수|수강신청|수강 ?신청|등록|예약)/i,
  '강좌·반 운영': /(강좌|반|시간표|이동|반 ?이동|반 ?변경|개강|폐강)/i,
  '교재·자료': /(교재|문제집|자료|프린트|교재비)/i,
  '권한·접근': /(권한|접근|OKTA|okta|옥타|인증|로그인|접속)/i,
  '시스템 오류·버그': /(오류|에러|버그|먹통|안 ?돼|되지 않|작동 ?안|작동안|문제)/i,
  '기타': /^/,
};

const NEG = /(안 ?돼|안되|안 되|안 ?됨|되지 않|되지않|왜|아직|또|다시|짜증|불편|이상|문제|오류|에러|버그|먹통|튕|렉|느려|급|화|당황|불안|곤란|답답|일주일|며칠|몇 ?일|망|확인.{0,4}안|미)/i;

function classify(msg) {
  if (!msg) return '기타';
  for (const [k, re] of Object.entries(STAFF_RULES)) {
    if (k === '기타') continue;
    if (re.test(msg)) return k;
  }
  return '기타';
}

function isNeg(msg) {
  return msg && NEG.test(msg);
}

// 발신자 파싱: "[지점/부서] [이름]" or "플랫폼서비스실 이름" or "정산팀 이름"
function parseSender(s) {
  // 패턴: "지점/부서 이름" or "지점이름 학년 이름"
  if (s.startsWith('플랫폼서비스실')) return { dept: '플랫폼서비스실', branch: '본사', name: s.replace('플랫폼서비스실', '').trim() };
  if (s.startsWith('정산팀')) return { dept: '정산팀', branch: '본사', name: s.replace('정산팀', '').trim() };
  // "대치 고3 이름", "목동 윤연진", "대치 수학스쿨 이해연"
  const tokens = s.split(/\s+/);
  if (tokens.length >= 2) {
    // 지점이름과 학년 패턴 추출
    let branch = tokens[0];
    let grade = null;
    let name = null;
    if (tokens.length >= 3 && /^(고\d|중\d|초\d|수학스쿨|국어스쿨|특목|N수|재수|단과)$/i.test(tokens[1])) {
      grade = tokens[1];
      name = tokens.slice(2).join(' ');
    } else if (tokens.length >= 3 && /(고\d|수학|국어|영어|과탐|사탐)/.test(tokens[1])) {
      grade = tokens[1];
      name = tokens.slice(2).join(' ');
    } else {
      name = tokens.slice(1).join(' ');
    }
    // "대치고3", "강남대성" 같이 붙어있는 케이스
    return { dept: '단과(현강)', branch, grade, name };
  }
  return { dept: '기타', branch: '?', name: s };
}

// 데이터 집계
const enriched = messages.map((m) => {
  const sender = parseSender(m.sender);
  return {
    ...m,
    ...sender,
    category: classify(m.message),
    neg: isNeg(m.message),
    is_staff: sender.dept === '플랫폼서비스실' || sender.dept === '정산팀',
    is_branch: sender.dept === '단과(현강)',
  };
});

// 1. 카테고리 분포
const byCat = {};
for (const e of enriched) {
  if (!byCat[e.category]) byCat[e.category] = { count: 0, neg: 0 };
  byCat[e.category].count++;
  if (e.neg) byCat[e.category].neg++;
}
const total = enriched.length;
const categoryStats = Object.entries(byCat)
  .map(([cat, v]) => ({
    category: cat,
    count: v.count,
    pct: ((v.count / total) * 100).toFixed(1),
    neg_pct: ((v.neg / v.count) * 100).toFixed(1),
  }))
  .sort((a, b) => b.count - a.count);

// 2. 월별 메시지
const monthly = {};
for (const e of enriched) {
  const ym = e.datetime.slice(0, 7);
  monthly[ym] = (monthly[ym] || 0) + 1;
}
const monthlyArr = Object.entries(monthly).map(([ym, n]) => ({ ym, n })).sort((a, b) => a.ym.localeCompare(b.ym));

// 3. 발신자별 (지점 + 부서)
const bySender = {};
for (const e of enriched) {
  const key = e.sender;
  if (!bySender[key]) bySender[key] = { count: 0, dept: e.dept, branch: e.branch, grade: e.grade, name: e.name, neg: 0 };
  bySender[key].count++;
  if (e.neg) bySender[key].neg++;
}
const senderArr = Object.entries(bySender).map(([k, v]) => ({ sender: k, ...v })).sort((a, b) => b.count - a.count);

// 4. 부서별 (지점/부서 단위)
const byBranch = {};
for (const e of enriched) {
  const key = e.dept === '단과(현강)' ? e.branch : e.dept;
  if (!byBranch[key]) byBranch[key] = { count: 0, neg: 0 };
  byBranch[key].count++;
  if (e.neg) byBranch[key].neg++;
}
const branchArr = Object.entries(byBranch).map(([k, v]) => ({
  branch: k,
  count: v.count,
  pct: ((v.count / total) * 100).toFixed(1),
  neg_pct: ((v.neg / v.count) * 100).toFixed(1),
})).sort((a, b) => b.count - a.count);

// 5. 부서별 카테고리 매트릭스 (top 카테고리 X top 지점)
const matrix = {};
const topBranches = branchArr.slice(0, 10).map((b) => b.branch);
const topCats = categoryStats.slice(0, 8).map((c) => c.category);
for (const b of topBranches) {
  matrix[b] = {};
  for (const c of topCats) matrix[b][c] = 0;
}
for (const e of enriched) {
  const b = e.dept === '단과(현강)' ? e.branch : e.dept;
  if (matrix[b] && matrix[b][e.category] !== undefined) {
    matrix[b][e.category]++;
  }
}

// 6. 시간대 분포 (KST)
const hourly = Array(24).fill(0);
for (const e of enriched) {
  const h = Number(e.datetime.slice(11, 13));
  hourly[h]++;
}

// 7. 요일 분포
const dows = Array(7).fill(0);
for (const e of enriched) {
  const d = new Date(e.datetime + '+09:00').getDay();
  dows[d]++;
}

// 8. 대표 메시지 — 카테고리별 (긴 메시지 우선)
const reprByCat = {};
for (const cat of Object.keys(STAFF_RULES)) {
  if (cat === '기타') continue;
  reprByCat[cat] = enriched
    .filter((e) => e.category === cat && e.message.length > 30 && e.is_branch)
    .sort((a, b) => b.message.length - a.message.length)
    .slice(0, 3)
    .map((e) => ({ from: e.sender, msg: e.message.slice(0, 200), date: e.datetime.slice(0, 10) }));
}

// 9. 플서실 응답 패턴 — 지점 질문 → 플서실 응답 페어
const pairs = [];
for (let i = 0; i < enriched.length - 1; i++) {
  if (enriched[i].is_branch && enriched[i].message.length > 20) {
    // 다음 플서실 메시지 찾기 (10턴 이내)
    for (let j = i + 1; j < Math.min(i + 10, enriched.length); j++) {
      if (enriched[j].is_staff) {
        const wait = (new Date(enriched[j].datetime + '+09:00') - new Date(enriched[i].datetime + '+09:00')) / 60000;
        if (wait > 0 && wait < 60 * 24 * 3) { // 3일 내
          pairs.push({ from_branch: enriched[i].branch, category: enriched[i].category, wait_min: wait });
        }
        break;
      }
    }
  }
}
pairs.sort((a, b) => a.wait_min - b.wait_min);
const respMedian = pairs.length ? pairs[Math.floor(pairs.length / 2)].wait_min : null;
const respAvg = pairs.length ? pairs.reduce((s, p) => s + p.wait_min, 0) / pairs.length : null;
const respP90 = pairs.length ? pairs[Math.floor(pairs.length * 0.9)].wait_min : null;
const respWithin30 = pairs.filter((p) => p.wait_min <= 30).length;

const out = {
  total_messages: enriched.length,
  date_range: { start: messages[0]?.datetime, end: messages[messages.length-1]?.datetime },
  unique_senders: senderArr.length,
  staff_msgs: enriched.filter((e) => e.is_staff).length,
  branch_msgs: enriched.filter((e) => e.is_branch).length,
  category_stats: categoryStats,
  monthly: monthlyArr,
  top_senders: senderArr.slice(0, 20),
  branch_stats: branchArr,
  category_branch_matrix: { branches: topBranches, categories: topCats, data: matrix },
  hourly,
  dow_count: dows,
  representative_by_cat: reprByCat,
  response_stats: pairs.length ? {
    n: pairs.length,
    p50: respMedian?.toFixed(1),
    avg: respAvg?.toFixed(1),
    p90: respP90?.toFixed(1),
    within_30min: respWithin30,
    within_30min_pct: ((respWithin30 / pairs.length) * 100).toFixed(1),
  } : null,
};

fs.writeFileSync('/tmp/dangua_analysis.json', JSON.stringify(out, null, 2));
console.error(`[done] /tmp/dangua_analysis.json`);
console.log(JSON.stringify({
  total: out.total_messages,
  date: out.date_range,
  uniq_senders: out.unique_senders,
  branch_msgs: out.branch_msgs,
  staff_msgs: out.staff_msgs,
  top_cats: categoryStats.slice(0, 8),
  top_branches: branchArr.slice(0, 10),
  response: out.response_stats,
}, null, 2));
