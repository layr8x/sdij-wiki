#!/usr/bin/env node
// scripts/kakao-partner-dashboard.mjs
// 인증 불필요 로컬 대시보드 — service_role 로 읽어 채널별 조회/검색 + CSV 다운로드.
// 실행: npm run kakao:dashboard  → http://localhost:8787
import http from 'node:http';
import { getAdminClient } from './lib/supabase-admin.mjs';

const sb = getAdminClient();
const PORT = Number(process.env.KAKAO_DASHBOARD_PORT || 8787);
const CHANNELS = [
  { id: '_VGAQn', label: '마이클래스' },
  { id: '_TkpPG', label: 'LIVE' },
  { id: '_xfxilXn', label: 'C' },
];
const labelOf = (id) => (CHANNELS.find((c) => c.id === id) || {}).label || id;
const SENDER = { manager: '상담원', user: '고객', system: '시스템' };

function clean(s) {
  if (s == null) return '';
  let o = '';
  for (const c of String(s)) { const k = c.charCodeAt(0); o += (k < 32 || k === 127) ? ' ' : c; }
  return o.replace(/\s+/g, ' ').trim();
}
const cell = (s) => { const v = String(s == null ? '' : s); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
function kst(iso) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(iso)).replace('T', ' ');
  } catch { return iso; }
}

async function stats() {
  const out = {};
  for (const c of CHANNELS) {
    const { count } = await sb.from('kakao_partner_messages').select('*', { count: 'exact', head: true }).eq('profile_id', c.id);
    out[c.id] = count || 0;
  }
  return out;
}
async function messages(ch, q, limit, offset) {
  let query = sb.from('kakao_partner_messages').select('chat_id,sender_type,message,message_type,sent_at')
    .eq('profile_id', ch).order('sent_at', { ascending: false }).range(offset, offset + limit - 1);
  if (q) query = query.ilike('message', '%' + q + '%');
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((m) => ({ chat_id: m.chat_id, sender: SENDER[m.sender_type] || m.sender_type || '', at: kst(m.sent_at), msg: clean(m.message) }));
}
async function nickmap(ch) {
  const map = new Map();
  for (let f = 0; ; f += 1000) {
    const { data } = await sb.from('kakao_partner_chats').select('chat_id,nickname').eq('profile_id', ch).order('chat_id').range(f, f + 999);
    if (!data || !data.length) break;
    for (const r of data) map.set(String(r.chat_id), r.nickname || '');
    if (data.length < 1000) break;
  }
  return map;
}
async function exportCsv(res, ch) {
  const nick = await nickmap(ch);
  res.writeHead(200, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="kakao_' + encodeURIComponent(labelOf(ch)) + '.csv"' });
  res.write(String.fromCharCode(0xFEFF) + ['채널', '채팅ID', '보낸시각(KST)', '보낸이', '닉네임', '메시지유형', '메시지'].map(cell).join(',') + '\r\n');
  for (let f = 0; ; f += 1000) {
    const { data } = await sb.from('kakao_partner_messages').select('chat_id,sender_type,message,message_type,sent_at').eq('profile_id', ch).order('sent_at', { ascending: true }).range(f, f + 999);
    if (!data || !data.length) break;
    for (const m of data) {
      res.write([labelOf(ch), m.chat_id, kst(m.sent_at), SENDER[m.sender_type] || m.sender_type || '', nick.get(String(m.chat_id)) || '', m.message_type || '', clean(m.message)].map(cell).join(',') + '\r\n');
    }
    if (data.length < 1000) break;
  }
  res.end();
}

const PAGE = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>카카오 상담 대시보드</title>'
  + '<style>*{box-sizing:border-box}body{font:14px/1.5 -apple-system,system-ui,sans-serif;margin:0;color:#1a1a1a;background:#fafafa}'
  + 'header{padding:16px 24px;border-bottom:1px solid #e5e5e5;background:#fff}h1{font-size:18px;margin:0 0 4px}.sub{color:#888;font-size:12px}'
  + '.wrap{padding:20px 24px;max-width:1200px;margin:0 auto}.kpis{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}'
  + '.kpi{flex:1;min-width:160px;background:#fff;border:1px solid #e5e5e5;border-radius:10px;padding:14px 16px}.kpi .n{font-size:24px;font-weight:600}.kpi .l{color:#888;font-size:12px}'
  + '.bar{display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap}'
  + 'button.tab{border:1px solid #ddd;background:#fff;border-radius:20px;padding:6px 14px;cursor:pointer;font-size:13px}button.tab.on{background:#111;color:#fff;border-color:#111}'
  + 'input{flex:1;min-width:200px;border:1px solid #ddd;border-radius:8px;padding:8px 12px;font-size:13px}'
  + 'a.dl{margin-left:auto;background:#0043CE;color:#fff;text-decoration:none;padding:8px 14px;border-radius:8px;font-size:13px}'
  + 'table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e5e5;border-radius:10px;overflow:hidden}'
  + 'th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:13px;vertical-align:top}th{background:#f7f7f7;font-size:12px;color:#666}'
  + 'td.t{white-space:nowrap;color:#888;font-variant-numeric:tabular-nums}.bdg{display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;border:1px solid #ddd}'
  + '.bdg.고객{background:#eef;border-color:#ccd}.bdg.상담원{background:#e9f7ee;border-color:#bfe3cc}.bdg.시스템{background:#f3f3f3}'
  + '.more{display:block;margin:14px auto;padding:8px 16px;border:1px solid #ddd;background:#fff;border-radius:8px;cursor:pointer}'
  + '</style></head><body>'
  + '<header><h1>카카오 상담 대시보드</h1><div class="sub">파트너센터 3채널 · 로컬 전용(service_role) · 인증/배포 불필요</div></header>'
  + '<div class="wrap"><div class="kpis" id="kpis"></div>'
  + '<div class="bar" id="tabs"></div>'
  + '<div class="bar"><input id="q" placeholder="메시지 검색 후 Enter"><a class="dl" id="dl" href="#">이 채널 CSV 다운로드</a></div>'
  + '<table><thead><tr><th style="width:150px">시각(KST)</th><th style="width:70px">보낸이</th><th>메시지</th></tr></thead><tbody id="tb"></tbody></table>'
  + '<button class="more" id="more">더 보기</button></div>'
  + '<script>'
  + 'var CH=' + JSON.stringify(CHANNELS) + ';var cur=CH[0].id,off=0,q="";'
  + 'function esc(s){return (s||"").replace(/[&<>]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;"}[c]})}'
  + 'function setDL(){document.getElementById("dl").href="/api/export?channel="+cur}'
  + 'function tabs(){var h="";CH.forEach(function(c){h+=\'<button class="tab\'+(c.id===cur?" on":"")+\'" data-id="\'+c.id+\'">\'+c.label+\'</button>\'});document.getElementById("tabs").innerHTML=h;Array.prototype.forEach.call(document.querySelectorAll(".tab"),function(b){b.onclick=function(){cur=b.dataset.id;off=0;document.getElementById("tb").innerHTML="";tabs();setDL();load()}})}'
  + 'function kpis(){fetch("/api/stats").then(function(r){return r.json()}).then(function(s){var h="";CH.forEach(function(c){h+=\'<div class="kpi"><div class="n">\'+(s[c.id]||0).toLocaleString()+\'</div><div class="l">\'+c.label+\' 메시지</div></div>\'});document.getElementById("kpis").innerHTML=h})}'
  + 'function load(){fetch("/api/messages?channel="+cur+"&q="+encodeURIComponent(q)+"&limit=50&offset="+off).then(function(r){return r.json()}).then(function(rows){var tb=document.getElementById("tb");rows.forEach(function(m){var tr=document.createElement("tr");tr.innerHTML=\'<td class="t">\'+esc(m.at)+\'</td><td><span class="bdg \'+m.sender+\'">\'+esc(m.sender)+\'</span></td><td>\'+esc(m.msg)+\'</td>\';tb.appendChild(tr)});off+=rows.length;document.getElementById("more").style.display=rows.length<50?"none":"block"})}'
  + 'document.getElementById("q").addEventListener("keydown",function(e){if(e.key==="Enter"){q=this.value;off=0;document.getElementById("tb").innerHTML="";load()}});'
  + 'document.getElementById("more").onclick=load;'
  + 'tabs();setDL();kpis();load();'
  + '</script></body></html>';

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  try {
    if (u.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(PAGE); return; }
    if (u.pathname === '/api/stats') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(await stats())); return; }
    if (u.pathname === '/api/messages') {
      const ch = u.searchParams.get('channel') || CHANNELS[0].id;
      const q = u.searchParams.get('q') || '';
      const limit = Math.min(200, Number(u.searchParams.get('limit')) || 50);
      const offset = Number(u.searchParams.get('offset')) || 0;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(await messages(ch, q, limit, offset)));
      return;
    }
    if (u.pathname === '/api/export') { await exportCsv(res, u.searchParams.get('channel') || CHANNELS[0].id); return; }
    res.writeHead(404); res.end('not found');
  } catch (e) { res.writeHead(500); res.end(String(e && e.message || e)); }
}).listen(PORT, () => console.log('kakao dashboard: http://localhost:' + PORT));
