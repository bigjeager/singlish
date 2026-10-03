import { ALL, inDict, trial, trialMeta } from './bank.js?v=p51';
import { track } from './track.js?v=p51';

const DICT_NAME = { ielts: '雅思', cet4: '四级', cet6: '六级', toefl: '托福' };
const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKS = 17;

const el = id => (typeof document === 'undefined' ? null : document.getElementById(id));
const pad = n => String(n).padStart(2, '0');
const ymdOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, k) => { const t = new Date(d); t.setDate(t.getDate() + k); return t; };
const isoLocalDay = iso => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : ymdOf(d); };
const levelOf = n => (n >= 10 ? 5 : n >= 7 ? 4 : n >= 5 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0);

let dayCount = new Map();
let reviewCount = new Map();
let checkinSet = new Set();
let userWords = [];
let retryT = 0;
let retryLeft = 0;
let lastArgs = null;
let detailDay = null;

function countsByDay(rows) {
  const learned = new Map(), reviewed = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r) continue;
    if (r.word && r.learned_at) {
      const k = isoLocalDay(r.learned_at);
      if (k) learned.set(k, (learned.get(k) || 0) + 1);
    }
    if (r.reviewed_at) {
      const k = isoLocalDay(r.reviewed_at);
      if (k) reviewed.set(k, (reviewed.get(k) || 0) + 1);
    }
  }
  return [learned, reviewed];
}

function dictWords(dict) {
  if (!Array.isArray(ALL) || !ALL.length) return null;
  return new Set(ALL.filter(e => inDict(e, dict || 'all')).map(e => e.word));
}

export function renderViz(userRows, checkinRows, plan, loggedIn) {
  lastArgs = [userRows, checkinRows, plan, loggedIn];
  const card = el('homeViz');
  if (!card) return;
  const show = !!loggedIn && !trial;
  card.hidden = !show;
  clearTimeout(retryT);
  retryLeft = 10;
  if (!show) return;
  userWords = Array.isArray(userRows) ? userRows : [];
  [dayCount, reviewCount] = countsByDay(userRows);
  checkinSet = new Set((Array.isArray(checkinRows) ? checkinRows : []).map(r => String(r?.day || '')));
  renderCheckins();
  renderRing(plan);
  renderHeatmap();
  const detail = el('hmDetail');
  if (detail) detailDay ? fillDetail(detailDay) : (detail.hidden = true);
}

function renderCheckins() {
  const ck = el('hmCheckins');
  if (!ck) return;
  const n = document.createElement('b');
  n.textContent = String(checkinSet.size);
  ck.replaceChildren('累计打卡 ', n, ' 天');
}

function renderRing(plan) {
  const pctEl = el('ringPct'), sub = el('ringSub'), cap = el('ringDict'), bar = el('ringBar');
  if (!pctEl || !bar) return;
  const dict = plan?.dict || 'all';
  const set = dictWords(dict);
  const total = set ? set.size : 0;
  const learned = set ? userWords.filter(r => r?.learned_at && set.has(r.word)).length : 0;
  const label = `${DICT_NAME[dict] || '全库'}词库`;
  if (!total || (!trial && trialMeta.count > 0 && total === trialMeta.count)) {
    pctEl.textContent = '--';
    if (sub) sub.textContent = '词库加载中';
    if (cap) cap.textContent = label;
    if (retryLeft-- > 0) retryT = setTimeout(() => lastArgs && renderViz(...lastArgs), 800);
    return;
  }
  const pct = learned / total;
  const tiny = learned > 0 && Math.round(pct * 100) === 0;
  const c = 2 * Math.PI * Number(bar.getAttribute('r'));
  bar.style.strokeDasharray = c.toFixed(1);
  bar.style.strokeDashoffset = (c * (1 - (tiny ? 0.02 : pct))).toFixed(1);
  pctEl.textContent = tiny ? (pct * 100).toFixed(1) + '%' : Math.round(pct * 100) + '%';
  if (sub) sub.textContent = `已学 ${learned} / 共 ${total} 词`;
  if (cap) cap.textContent = label;
}

function renderHeatmap() {
  const grid = el('hmGrid');
  if (!grid) return;
  const now = new Date();
  const today = ymdOf(now);
  const curWeekStart = addDays(now, -((now.getDay() + 6) % 7));
  const start = addDays(curWeekStart, -(WEEKS - 1) * 7);
  const frag = document.createDocumentFragment();
  for (let i = 0; i < WEEKS * 7; i++) {
    const d = addDays(start, i);
    const k = ymdOf(d);
    const n = dayCount.get(k) || 0;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hm-cell';
    b.dataset.level = levelOf(n);
    b.dataset.day = k;
    if (k > today) {
      b.classList.add('is-future');
      b.disabled = true;
      b.tabIndex = -1;
    } else {
      b.title = `${d.getMonth() + 1}月${d.getDate()}日 · ${n ? '学了 ' + n + ' 词' : '没学词'}`;
      b.setAttribute('aria-label', b.title);
    }
    frag.appendChild(b);
  }
  grid.replaceChildren(frag);
}

function fillDetail(k) {
  const box = el('hmDetail');
  if (!box) return;
  detailDay = k;
  const d = new Date(k + 'T00:00:00');
  const today = ymdOf(new Date());
  const rel = k === today ? ' · 今天' : k === ymdOf(addDays(new Date(), -1)) ? ' · 昨天' : '';
  const n = dayCount.get(k) || 0;
  const m = reviewCount.get(k) || 0;
  const date = document.createElement('b');
  date.textContent = `${d.getMonth() + 1}月${d.getDate()}日 周${WEEK_CN[d.getDay()]}${rel}`;
  const tag = document.createElement('span');
  tag.className = 'hm-tag' + (n === 0 && m === 0 ? ' is-zero' : checkinSet.has(k) ? ' is-hit' : '');
  tag.textContent = n === 0 && m === 0 ? '这天没学习' : checkinSet.has(k) ? '已打卡' : '未打卡';
  const nums = document.createElement('span');
  nums.className = 'hm-nums';
  nums.textContent = `学习 ${n} 词 · 复习 ${m} 词`;
  box.replaceChildren(date, tag, nums);
  box.hidden = false;
}

function showDetail(k) {
  const box = el('hmDetail');
  if (!box) return;
  if (detailDay === k) {
    detailDay = null;
    box.hidden = true;
    return;
  }
  fillDetail(k);
  track('home-day-detail', { day: k, words: dayCount.get(k) || 0, reviewed: reviewCount.get(k) || 0 });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const toggle = el('hmToggle'), card = el('homeViz');
  if (toggle && card) toggle.addEventListener('click', () => {
    const open = card.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  const grid = el('hmGrid');
  if (grid) grid.addEventListener('click', e => {
    const b = e.target.closest('.hm-cell');
    if (!b || b.disabled || !b.dataset.day) return;
    showDetail(b.dataset.day);
  });
}
