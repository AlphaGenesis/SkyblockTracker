'use strict';
const { fmt, signed, parse, todoState, occurrences } = L;
const T = window.__TAURI__; // undefined when opened in a plain browser
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = (n) => String(n).padStart(2, '0');
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const byId = (list, id) => list.find((x) => x.id === id);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dKey = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const hm = (d) => pad(d.getHours()) + ':' + pad(d.getMinutes());
const localISO = (d) => dKey(d) + 'T' + hm(d);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dayStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const monday = (d) => addDays(dayStart(d), -((new Date(d).getDay() + 6) % 7));
const dateLabel = (s) => { const d = new Date(s); return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); };
const shortDate = (s) => { const d = new Date(s); return MONTHS[d.getMonth()] + ' ' + d.getDate(); };
const toShort = (n) => (n == null ? '' : n >= 1e9 ? +(n / 1e9).toFixed(6) + 'b' : n >= 1e6 ? +(n / 1e6).toFixed(6) + 'm' : n >= 1e3 ? +(n / 1e3).toFixed(6) + 'k' : String(n));
const dur = (ms) => { const m = Math.max(1, Math.ceil(ms / 6e4)); const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60); return d ? d + 'd ' + h + 'h' : h ? h + 'h ' + (m % 60) + 'm' : m + 'm'; };

/* ---------- icons ---------- */
const ic = (d, s = 18, w = 1.8) => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const P = {
  all: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  mayor: '<path d="M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-2 11H5z"/>',
  skins: '<path d="M8.5 3.5L3.5 6.5l2 4 2-1v11h9v-11l2 1 2-4-5-3c-.5 1.6-1.9 2.5-3.5 2.5S9 5.1 8.5 3.5z"/>',
  other: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  lowball: '<path d="M20 12.5l-7.5 7.5L4 11.5V4h7.5z"/><circle cx="8" cy="8" r="1.3"/><path d="M13 10v5.5M10.8 13.5l2.2 2.2 2.2-2.2"/>',
  passive: '<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6"/><path d="M5 12v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  todo: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 12.5l3 3 5-6"/>',
  stats: '<path d="M5 20V11M11 20V5M17 20v-6M3 20.5h18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  repeat: '<path d="M17 3l3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13"/><path d="M7 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/>',
  up: '<path d="M4 16l6-6 4 4 6-7"/><path d="M15 7h5v5"/>',
  down: '<path d="M4 8l6 6 4-4 6 7"/><path d="M15 17h5v-5"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-9 8.5"/>',
  gem: '<path d="M6.5 4h11l3.5 5-9 11L3 9z"/><path d="M3 9h18M9.5 4L12 20l2.5-16"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3.5 4v4h4M12 8v4.5l3 2"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 2.5h5"/>',
  flame: '<path d="M12 3c.8 3 5 5.2 5 10a5 5 0 0 1-10 0c0-2.6 1.4-4.2 2.6-5.2 0 2 .9 3.2 2.4 3.2 0-3-.9-5.2 0-8z"/>',
  chevDown: '<path d="M6 9l6 6 6-6"/>',
  chevUp: '<path d="M6 15l6-6 6 6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  folder: '<path d="M3.5 6.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
};
Object.assign(P, {
  sword: '<path d="M20 4l-9.5 9.5M20 4h-4.5M20 4v4.5"/><path d="M6.5 13l4.5 4.5M8.7 15.3L4 20"/>',
  pickaxe: '<path d="M5 19l8.5-8.5"/><path d="M6.5 7C10 4 15 3.5 20 4c.5 5 0 10-3 13.5"/>',
  fish: '<path d="M3.5 12c3-4 7-5.5 10.5-4.5 2 .6 3.8 2.1 5 4.5-1.2 2.4-3 3.9-5 4.5-3.5 1-7.5-.5-10.5-4.5z"/><path d="M3.5 12l-1.5-3M3.5 12L2 15"/><circle cx="15" cy="11" r=".9"/>',
  paw: '<circle cx="6.5" cy="10" r="1.8"/><circle cx="10" cy="6" r="1.8"/><circle cx="14.5" cy="6" r="1.8"/><circle cx="18" cy="10" r="1.8"/><path d="M8 17.5c0-3 1.8-5.5 4.2-5.5s4.3 2.5 4.3 5.3c0 2.2-2 2.7-4.3 1.9-2.2.8-4.2.5-4.2-1.7z"/>',
  potion: '<path d="M10 3h4M10.5 3v5L6 16a3 3 0 0 0 2.6 4.5h6.8A3 3 0 0 0 18 16l-4.5-8V3"/><path d="M7.5 14h9"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 21H20"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>',
  heart: '<path d="M12 20s-7.5-4.5-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3c0 5.5-7.5 10-7.5 10z"/>',
  skull: '<path d="M5 11a7 7 0 0 1 14 0v3l-2 1v4H7v-4l-2-1z"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><path d="M11 19v-2M13 19v-2"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8.5-8.5M16 7l2.5 2.5M14 9l2 2"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z"/>',
  chest: '<rect x="3.5" y="9" width="17" height="11" rx="1.5"/><path d="M3.5 9a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4M3.5 13h17"/><rect x="10.5" y="11.5" width="3" height="3" rx=".5"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19l8-8"/>',
  bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20.5h7M10 17h4v3.5h-4z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
});
const CAT_ICONS = ['other', 'mayor', 'skins', 'lowball', 'gem', 'star', 'sword', 'pickaxe', 'fish', 'paw', 'potion', 'book', 'coin', 'heart', 'skull', 'key', 'shield', 'chest', 'leaf', 'bolt', 'flame', 'trophy', 'eye'];
const coin = (s = 18) => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#f5c542"/><circle cx="8" cy="8" r="4.4" fill="none" stroke="#c48a12" stroke-width="1.4"/></svg>`;

const PASSIVE = { label: 'Passive', ink: '#93c5fd', tint: 'rgba(96,165,250,.16)' };
// [key, label, ink]; the tinted background is derived from the ink
const COLORS = Object.fromEntries([
  ['violet', 'Violet', '#c4b5fd'], ['purple', 'Purple', '#d8b4fe'], ['fuchsia', 'Fuchsia', '#f0abfc'], ['pink', 'Pink', '#f9a8d4'],
  ['rose', 'Rose', '#fda4af'], ['red', 'Red', '#fca5a5'], ['orange', 'Orange', '#fdba74'], ['amber', 'Amber', '#fcd34d'],
  ['gold', 'Gold', '#f5c542'], ['lime', 'Lime', '#bef264'], ['green', 'Green', '#86efac'], ['emerald', 'Emerald', '#6ee7b7'],
  ['teal', 'Teal', '#5eead4'], ['cyan', 'Cyan', '#67e8f9'], ['blue', 'Blue', '#93c5fd'], ['slate', 'Slate', '#cbd5e1'],
].map(([k, label, ink]) => {
  const n = parseInt(ink.slice(1), 16);
  return [k, { label, ink, bg: `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},.2)` }];
}));

/* ---------- storage ---------- */
let db;
let saveBlocked = false;
let saving = Promise.resolve();
const EMPTY = () => {
  const p = uid();
  return { profiles: [{ id: p, name: 'Main' }], activeProfile: p, prefs: { period: 'all', from: '', to: '', catView: 'list', catMetric: 'invested', chart: { style: 'bars', group: 'day', sign: 'all', hidden: [] } }, categories: [], flips: [], timers: [], presets: [], calendars: [{ id: uid(), name: 'Events', color: 'violet', visible: true }], events: [], todos: [], passive: [] };
};
// Old fixed categories, kept as ids so files from v1.0 still load.
const LEGACY_CATS = { mayor: ['Mayor', 'gold'], skins: ['Skins', 'violet'], other: ['Other', 'teal'], lowball: ['Lowball', 'orange'] };

function migrate(raw) {
  const d = Object.assign(EMPTY(), raw);
  if (!raw.profiles) { // v1.0 file: one implicit profile, fixed categories, single tick per to do
    const p = d.activeProfile;
    d.flips.forEach((f) => (f.profileId = p));
    d.passive.forEach((x) => (x.profileId = p));
    d.categories = Object.entries(LEGACY_CATS).filter(([k]) => d.flips.some((f) => f.cat === k)).map(([k, [name, color]]) => ({ id: k, name, color, icon: k }));
    d.todos.forEach((t) => { t.shared = false; t.done = t.doneAt ? { [p]: { doneAt: t.doneAt, entryId: t.entryId } } : {}; delete t.doneAt; delete t.entryId; });
  }
  if (!byId(d.profiles, d.activeProfile)) d.activeProfile = d.profiles[0].id;
  d.prefs = Object.assign(EMPTY().prefs, d.prefs);
  d.prefs.chart = Object.assign(EMPTY().prefs.chart, d.prefs.chart);
  return d;
}

async function load() {
  try {
    const raw = T ? await T.core.invoke('load_data') : localStorage.getItem('sbt') || '';
    db = raw ? migrate(JSON.parse(raw)) : EMPTY();
    saveBlocked = false;
  } catch (e) {
    // never overwrite a file we could not read
    saveBlocked = true;
    db = EMPTY();
    alert('Could not read your saved data (data.json). Changes will NOT be saved this session, so the file stays untouched.\n\n' + e);
  }
}
function save() {
  if (saveBlocked) return;
  const json = JSON.stringify(db);
  saving = saving.then(() => (T ? T.core.invoke('save_data', { json }) : localStorage.setItem('sbt', json))).catch((e) => alert('Saving failed: ' + e));
}
function commit() { save(); render(); }

/* ---------- ui state ---------- */
const ui = { sort: { key: 'date', dir: -1 }, pOpen: false, catsOpen: true, view: 'inv', cat: 'all', tab: 'all', q: '', sel: new Set(), anchor: new Date(), calMode: 'week', passiveOpen: false };
const ROW = 48; // px per hour in the week grid

const derive = (f) => {
  const cost = f.unit === 'lot' ? f.price : f.price * f.qty;
  const sold = f.sell != null;
  return Object.assign({}, f, { cost, sold, pnl: sold ? f.sell - (f.fees || 0) - cost : 0 });
};
const myFlips = () => db.flips.filter((f) => f.profileId === db.activeProfile).map(derive);
const myPassive = () => db.passive.filter((p) => p.profileId === db.activeProfile);
const profileName = (id) => byId(db.profiles, id)?.name || 'deleted profile';
const catMeta = (id) => {
  const c = byId(db.categories, id);
  if (!c) return { label: 'No category', ink: '#9d9ab0', tint: 'rgba(157,154,176,.14)', icon: 'other' };
  const col = COLORS[c.color] || COLORS.violet;
  return { label: c.name, ink: col.ink, tint: col.bg, icon: c.icon };
};
// a shared to do has one tick for everyone ('*'); otherwise each profile has its own
const tickKey = (t) => (t.shared ? '*' : db.activeProfile);
const tickRec = (t) => (t.done || {})[tickKey(t)];
const todoNow = (t, now = Date.now()) => todoState({ start: t.start, every: t.every, unit: t.unit, sbYear: t.sbYear, doneAt: tickRec(t)?.doneAt }, now);
const visibleCals = () => new Set(db.calendars.filter((c) => c.visible).map((c) => c.id));
const visibleOccs = (from, to, q = '') => {
  const vis = visibleCals();
  const ql = q.trim().toLowerCase();
  const out = [];
  for (const ev of db.events) {
    if (!ev.calendars.some((id) => vis.has(id))) continue;
    if (ql && !(ev.name + ' ' + (ev.note || '')).toLowerCase().includes(ql)) continue;
    for (const o of occurrences(ev, from, to)) out.push({ ev, start: o.start, end: o.end });
  }
  return out.sort((a, b) => a.start - b.start);
};

/* ---------- sidebar ---------- */
function sideHtml() {
  const flips = myFlips();
  const navBtn = (on, icon, label, extra, attrs) =>
    `<button type="button" class="nav ${on ? 'on' : ''}" aria-pressed="${on}" ${attrs}>${ic(icon)}<span class="grow ell">${label}</span>${extra}</button>`;
  const catBtn = (k, label, icon) => {
    const n = k === 'all' ? flips.length : flips.filter((f) => f.cat === k).length;
    return navBtn(ui.view === 'inv' && ui.cat === k, P[icon], label, `<span class="count">${n}</span>`, `data-act="nav" data-view="inv" data-cat="${k}" style="--ink:${catMeta(k).ink}"`);
  };
  const today = dayStart(new Date());
  const nToday = visibleOccs(today.getTime(), addDays(today, 1).getTime()).length;
  const nDue = db.todos.filter((t) => !todoNow(t).done).length;
  const net = sum(flips.filter((f) => f.sold), (f) => f.pnl);
  return `
  <div class="brand"><img class="logo" src="logo.png" alt=""><div><b>Skyblock</b><i>Tracker</i></div></div>
  <div class="pmenu">
    <button type="button" class="profile" data-act="pmenu" aria-haspopup="menu" aria-expanded="${ui.pOpen}" aria-label="Profile: ${esc(profileName(db.activeProfile))}">${ic(P.user, 17)}<span class="grow ell">${esc(profileName(db.activeProfile))}</span>${ic(ui.pOpen ? P.chevUp : P.chevDown, 16, 2)}</button>
    ${ui.pOpen ? `<div class="pdrop" role="menu" aria-label="Profiles">
      ${db.profiles.map((p) => { const on = p.id === db.activeProfile; return `<div class="pitem ${on ? 'on' : ''}">
        <button type="button" role="menuitemradio" aria-checked="${on}" data-act="pickProfile" data-id="${p.id}"><span class="dot" style="background:${on ? 'var(--accent2)' : '#4a4759'}"></span><span class="ell">${esc(p.name)}</span></button>
        <button type="button" class="iconbtn" data-act="renameProfile" data-id="${p.id}" aria-label="Rename profile ${esc(p.name)}">${ic(P.gear, 15)}</button></div>`; }).join('')}
      <button type="button" role="menuitem" class="pnew" data-act="newProfile">${ic(P.plus, 15, 2)}New profile</button>
    </div>` : ''}
  </div>
  <nav aria-label="Main">
    <div class="group">
      <div class="allrow"><button type="button" class="nav ${ui.view === 'inv' && ui.cat === 'all' ? 'on' : ''}" data-act="nav" data-view="inv" data-cat="all">${ic(P.all)}<span class="grow ell">All investments</span><span class="count">${flips.length}</span></button><button type="button" class="iconbtn fold" data-act="toggleAll" aria-expanded="${ui.catsOpen}" aria-label="${ui.catsOpen ? 'Collapse' : 'Expand'} categories">${ic(ui.catsOpen ? P.chevUp : P.chevDown, 15, 2)}</button></div>
      ${ui.catsOpen ? `${db.categories.length ? `<div class="sub" aria-label="Categories. Drag to reorder, or Alt + Up/Down.">${db.categories.map((c) => `<div class="navrow" draggable="true" data-cat-id="${c.id}">${catBtn(c.id, esc(c.name), c.icon)}<button type="button" class="iconbtn" data-act="editCat" data-id="${c.id}" aria-label="Rename category ${esc(c.name)}">${ic(P.edit, 14)}</button></div>`).join('')}</div>` : ''}
        <button type="button" class="pnew createcat" data-act="newCat">${ic(P.plus, 15, 2)}Create category</button>` : ''}
    </div>
    ${navBtn(ui.view === 'history', P.history, 'History', `<span class="count">${flips.filter((f) => f.sold).length}</span>`, 'data-act="nav" data-view="history"')}
    <div class="group">
      ${navBtn(ui.view === 'cal', P.cal, 'Calendar', `<span class="hint">${nToday} today</span>`, 'data-act="nav" data-view="cal"')}
      ${navBtn(ui.view === 'todo', P.todo, 'To Do', nDue ? `<span class="hint">${nDue} to do</span>` : '', 'data-act="nav" data-view="todo"')}
      ${navBtn(ui.view === 'timers', P.timer, 'Timers', timerHint(), 'data-act="nav" data-view="timers"')}
      ${navBtn(ui.view === 'stats', P.stats, 'Stats', '', 'data-act="nav" data-view="stats"')}
    </div>
  </nav>
  <div class="total">
    <span class="small muted">Total invested</span>
    <div class="big">${fmt(sum(flips, (f) => f.cost))}${coin()}</div>
    <span class="small ${net >= 0 ? 'pos' : 'neg'}" style="font-weight:500">${signed(net)} net realized</span>
  </div>
  ${navBtn(ui.view === 'settings', P.settings, 'Settings', '', 'data-act="nav" data-view="settings"')}
  <button type="button" class="nav kofi" data-act="kofi" aria-label="Support me on Ko-fi (opens your browser)">
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path d="M3 6.5h14.5a3.5 3.5 0 0 1 0 7H16.6A6.5 6.5 0 0 1 10.5 18h-1A6.5 6.5 0 0 1 3 11.5z" fill="#fff"/><path d="M16.8 8.6h.7a1.4 1.4 0 0 1 0 2.8h-.7z" fill="#29abe0"/><path d="M9.9 14.6s-3.4-2.1-3.4-4.2a1.7 1.7 0 0 1 3.4-.6 1.7 1.7 0 0 1 3.4.6c0 2.1-3.4 4.2-3.4 4.2z" fill="#ff5e5b"/></svg>
    <span class="grow">Support me on Ko-fi</span></button>`;
}

/* ---------- investments ---------- */
function viewInv() {
  if (ui.cat !== 'all' && !byId(db.categories, ui.cat)) ui.cat = 'all';
  const all = myFlips();
  const inCat = all.filter((f) => ui.cat === 'all' || f.cat === ui.cat);
  const ql = ui.q.trim().toLowerCase();
  const shown = inCat
    .filter((f) => (ui.tab === 'all' || (ui.tab === 'open' ? !f.sold : f.sold)) && (!ql || (f.name + ' ' + (f.note || '')).toLowerCase().includes(ql)))
    .sort((a, b) => { const k = SORTS[ui.sort.key].get, x = k(a), y = k(b); return (x < y ? -1 : x > y ? 1 : 0) * ui.sort.dir; });
  const th = (k, label) => {
    const on = ui.sort.key === k;
    return `<button type="button" class="th ${on ? 'on' : ''}" data-act="sortBy" data-v="${k}" aria-label="Sort by ${label}">${label}${on ? ic(ui.sort.dir > 0 ? P.chevUp : P.chevDown, 12, 2.4) : ''}</button>`;
  };
  const s = SORTS[ui.sort.key];
  const open = inCat.filter((f) => !f.sold), closed = inCat.filter((f) => f.sold);
  const wins = closed.filter((f) => f.pnl > 0), losses = closed.filter((f) => f.pnl < 0);
  const profit = sum(wins, (f) => f.pnl), loss = sum(losses, (f) => f.pnl), net = profit + loss;
  const closedCost = sum(closed, (f) => f.cost);
  const roi = closedCost ? (net / closedCost) * 100 : 0;
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const heading = ui.cat === 'all' ? 'All investments' : esc(catMeta(ui.cat).label);
  for (const id of ui.sel) if (!all.some((f) => f.id === id)) ui.sel.delete(id);
  const selList = [...ui.sel].map((id) => derive(byId(db.flips, id)));

  const tabs = [['all', 'All', inCat.length], ['open', 'In progress', open.length], ['sold', 'Completed', closed.length]]
    .map(([k, l, n]) => `<button type="button" role="tab" aria-selected="${ui.tab === k}" data-act="tab" data-v="${k}">${l}<span>${n}</span></button>`).join('');

  const row = (f) => {
    const m = catMeta(f.cat), on = ui.sel.has(f.id);
    return `<div class="row ${on ? 'on' : ''}">
      <button type="button" class="check ${on ? 'on' : ''}" data-act="sel" data-id="${f.id}" aria-pressed="${on}" aria-label="Select ${esc(f.name)}">${on ? ic(P.check, 14, 3) : ''}</button>
      <div class="item"><div class="ico" style="background:${m.tint};color:${m.ink}">${flipIcon(f, m, 24)}</div>
        <div style="display:flex;flex-direction:column;gap:4px;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;min-width:0"><span class="ell" style="font-weight:600;font-size:15px">${esc(f.name)}</span><span class="pill" style="background:${m.tint};color:${m.ink}">${esc(m.label)}</span></div>
          <span class="small muted">Bought ${dateLabel(f.bought)}</span></div></div>
      <div><div style="display:flex;align-items:center;gap:6px">${coin(15)}<span class="num" style="font-weight:600;font-size:15px">${fmt(f.price)}</span></div><span class="small muted">per ${f.unit === 'lot' ? 'lot' : 'item'}</span></div>
      <div><div class="num" style="font-weight:600;font-size:15px">${f.qty}</div><span class="small muted">qty</span></div>
      <span class="clamp" style="color:${f.note ? 'var(--nav)' : 'var(--muted2)'}">${f.note ? esc(f.note) : 'No note'}</span>
      <div>${f.shot ? `<button type="button" class="shot" data-act="shot" data-id="${f.id}" aria-label="Open screenshot of ${esc(f.name)}"><img src="${esc(f.shot)}" alt=""></button>` : '<span style="color:var(--muted2)">—</span>'}</div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start">${f.sold
        ? `<span class="disp num ${f.pnl >= 0 ? 'pos' : 'neg'}" style="font-size:17px">${signed(f.pnl)}</span><span class="small muted">Sold ${fmt(f.sell)} · ${shortDate(f.soldAt)}</span>`
        : `<span class="status"><span class="dot" style="width:6px;height:6px;background:var(--gold)"></span>In progress</span><span class="small muted">Cost ${fmt(f.cost)}${f.target ? ' · target ' + fmt(f.target) + (f.targetUnit === 'each' ? ' each' : '') : ''}</span>`}</div>
      <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px">
        <button type="button" class="btn ghost sm" data-act="sell" data-id="${f.id}">${f.sold ? 'Sale' : 'Sell'}</button>
        <button type="button" class="iconbtn" data-act="editFlip" data-id="${f.id}" aria-label="Edit ${esc(f.name)}">${ic(P.edit, 17)}</button></div>
    </div>`;
  };

  return `
  <div class="top"><div><h1>${heading}</h1><p>Track every flip from purchase to sale. Profit and loss are calculated when you close it.</p></div>
    <button type="button" class="btn" data-act="newFlip">${ic(P.plus, 18, 2)}New flip</button></div>
  <div class="cards">
    <div class="card"><span>Invested</span><div class="big">${fmt(sum(inCat, (f) => f.cost))}${coin()}</div><span class="small muted">${open.length} open · ${fmt(sum(open, (f) => f.cost))} tied up</span></div>
    <div class="card"><span>Profit</span><div class="big pos">${ic(P.up, 20, 2)}${fmt(profit)}</div><span class="small muted">${plural(wins.length, 'winning flip')}</span></div>
    <div class="card"><span>Losses</span><div class="big neg">${ic(P.down, 20, 2)}${fmt(loss)}</div><span class="small muted">${plural(losses.length, 'losing flip')}</span></div>
    <div class="card"><span>Net result</span><div class="big ${net > 0 ? 'pos' : net < 0 ? 'neg' : ''}">${signed(net)}</div><span class="small muted">${closed.length ? 'ROI ' + (roi >= 0 ? '+' : '−') + Math.abs(roi).toFixed(1) + '% on closed flips' : 'No closed flips yet'}</span></div>
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
    <div class="seg" role="tablist" aria-label="Flip status">${tabs}</div>
    <span class="small muted" style="font-size:13px">Sorted by ${s.label} · ${ui.sort.dir > 0 ? s.asc : s.desc}${ui.sort.key !== 'date' ? ' <button type="button" class="link" data-act="sortBy" data-v="date">Reset</button>' : ''}</span></div>
  <div class="table"><div class="rows">
    <div class="row head"><span></span><span>${th('name', 'Item')}</span><span>${th('price', 'Buy price')}</span><span>${th('qty', 'Qty')}</span><span>Note</span><span>Screenshot</span><span>Status</span><span></span></div>
    ${shown.map(row).join('') || '<div class="empty"><b style="font-size:15px">No flips here yet</b><span class="muted">Log your next purchase to start tracking it.</span></div>'}
  </div></div>
  ${selList.length ? `<div class="selbar">
    <span class="check on">${ic(P.check, 14, 3)}</span><span style="font-weight:500">${plural(selList.length, 'flip')} selected</span>
    <button type="button" class="link" data-act="clearSel">Clear</button><span class="grow"></span>
    <button type="button" class="btn ghost sm" data-act="delSel">${ic(P.trash, 16)}Delete</button>
    ${selList.length === 1 ? `<button type="button" class="btn ghost sm" data-act="editFlip" data-id="${selList[0].id}">${ic(P.edit, 16)}Edit</button>
    <button type="button" class="btn sm" data-act="sell" data-id="${selList[0].id}">${selList[0].sold ? 'Edit sale' : 'Mark as sold'}</button>`
    : selList.some((f) => !f.sold) ? `<button type="button" class="btn sm" data-act="sellMany">Sell ${plural(selList.filter((f) => !f.sold).length, 'flip')}</button>` : ''}
  </div>` : ''}`;
}

// column sorts; first click uses the most useful direction (A→Z, highest first)
const SORTS = {
  date: { get: (f) => String(f.bought), label: 'purchase date', asc: 'oldest first', desc: 'newest first', first: -1 },
  name: { get: (f) => f.name.toLowerCase(), label: 'item', asc: 'A → Z', desc: 'Z → A', first: 1 },
  price: { get: (f) => f.price, label: 'buy price', asc: 'lowest first', desc: 'highest first', first: -1 },
  qty: { get: (f) => f.qty, label: 'quantity', asc: 'lowest first', desc: 'highest first', first: -1 },
};

/* ---------- calendar ---------- */
function layoutDay(items) {
  // side-by-side columns for overlapping events
  items.sort((a, b) => a.s - b.s || b.e - a.e);
  let cols = [], group = [], groupEnd = -Infinity;
  const flush = () => { const n = cols.length; group.forEach((i) => (i.n = n)); group = []; cols = []; };
  for (const it of items) {
    if (group.length && it.s >= groupEnd) { flush(); groupEnd = -Infinity; }
    let c = cols.findIndex((end) => end <= it.s);
    if (c < 0) { c = cols.length; cols.push(0); }
    cols[c] = it.e; it.col = c; group.push(it); groupEnd = Math.max(groupEnd, it.e);
  }
  flush();
  return items;
}

function viewCal() {
  const now = new Date(), todayK = dKey(now);
  const a = ui.anchor;
  let label, body;
  if (ui.calMode === 'week') {
    const start = monday(a), end = addDays(start, 6);
    label = start.getMonth() === end.getMonth()
      ? `${MONTHS[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
      : `${MONTHS[start.getMonth()]} ${start.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
    const occs = visibleOccs(start.getTime(), addDays(start, 7).getTime(), ui.q);
    const days = [...Array(7)].map((_, i) => addDays(start, i));
    const col = (d) => {
      const from = d.getTime(), to = addDays(d, 1).getTime();
      const items = layoutDay(occs.filter((o) => o.start < to && o.end > from).map((o) => ({ o, s: Math.max(o.start, from), e: Math.min(o.end, to) })));
      const evs = items.map((it) => {
        const c = COLORS[it.o.ev.color] || COLORS.violet;
        const top = ((it.s - from) / 36e5) * ROW + 1, h = Math.max(20, ((it.e - it.s) / 36e5) * ROW - 3);
        return `<button type="button" class="ev" data-act="editEvent" data-id="${it.o.ev.id}" style="top:${top}px;height:${h}px;left:calc(${(it.col / it.n) * 100}% + 3px);width:calc(${100 / it.n}% - 6px);background:${c.bg}">
          <b>${esc(it.o.ev.name)}${it.o.ev.repeat ? ' ' + ic(P.repeat, 10, 2.2) : ''}</b>${h >= 38 ? `<i style="color:${c.ink}">${hm(new Date(it.o.start))} – ${hm(new Date(it.o.end))}</i>` : ''}</button>`;
      }).join('');
      const isToday = dKey(d) === todayK;
      const nowLine = isToday ? `<div class="now" style="top:${(now.getHours() + now.getMinutes() / 60) * ROW}px"></div>` : '';
      return `<div class="daycol ${isToday ? 'today' : ''}" data-act="slot" data-day="${dKey(d)}" aria-label="${DOWS[(d.getDay() + 6) % 7]} ${d.getDate()}: click an empty slot to add an event">${evs}${nowLine}</div>`;
    };
    body = `<section class="week" aria-label="Week of ${label}">
      <div class="wgrid whead"><span></span>${days.map((d, i) => `<div class="${dKey(d) === todayK ? 'today' : ''}"><span class="dow">${DOWS[i]}</span><span class="n">${d.getDate()}</span></div>`).join('')}</div>
      <div class="wscroll" id="wscroll"><div class="wgrid">
        <div class="hours">${[...Array(24)].map((_, h) => `<span>${h ? pad(h) + ':00' : ''}</span>`).join('')}</div>
        ${days.map(col).join('')}
      </div></div></section>`;
  } else {
    label = MONTHS_LONG[a.getMonth()] + ' ' + a.getFullYear();
    const gStart = monday(new Date(a.getFullYear(), a.getMonth(), 1));
    const occs = visibleOccs(gStart.getTime(), addDays(gStart, 42).getTime(), ui.q);
    const cells = [...Array(42)].map((_, i) => {
      const d = addDays(gStart, i), k = dKey(d);
      const list = occs.filter((o) => dKey(new Date(o.start)) === k);
      const chips = list.slice(0, 3).map((o) => { const c = COLORS[o.ev.color] || COLORS.violet; return `<button type="button" class="chipev" data-act="editEvent" data-id="${o.ev.id}" style="background:${c.bg}">${hm(new Date(o.start))} ${esc(o.ev.name)}</button>`; }).join('');
      return `<div class="mcell ${d.getMonth() !== a.getMonth() ? 'out' : ''} ${k === todayK ? 'today' : ''}" data-act="mcell" data-day="${k}"><span class="n">${d.getDate()}</span>${chips}${list.length > 3 ? `<span class="small muted">+${list.length - 3} more</span>` : ''}</div>`;
    }).join('');
    body = `<section class="week" aria-label="${label}"><div class="mgrid">${DOWS.map((d) => `<span class="dow">${d}</span>`).join('')}${cells}</div></section>`;
  }

  // mini month
  const mStart = monday(new Date(a.getFullYear(), a.getMonth(), 1));
  const wk = monday(a).getTime();
  const mini = [...Array(42)].map((_, i) => {
    const d = addDays(mStart, i);
    const cls = [dKey(d) === todayK ? 'today' : '', ui.calMode === 'week' && monday(d).getTime() === wk ? 'wk' : '', d.getMonth() !== a.getMonth() ? 'out' : ''].join(' ');
    return `<button type="button" class="${cls}" data-act="miniDay" data-day="${dKey(d)}" aria-label="${dateLabel(d)}">${d.getDate()}</button>`;
  }).join('');

  const evCount = (id) => db.events.filter((e) => e.calendars.includes(id)).length;
  const cals = db.calendars.map((c) => `<div class="calitem">
      <label><input type="checkbox" data-calvis="${c.id}" ${c.visible ? 'checked' : ''}><span class="dot" style="background:${(COLORS[c.color] || COLORS.violet).ink}"></span><span class="ell grow">${esc(c.name)}</span><span class="small muted">${evCount(c.id)}</span></label>
      <button type="button" class="iconbtn" data-act="editCal" data-id="${c.id}" aria-label="Edit calendar ${esc(c.name)}">${ic(P.edit, 15)}</button></div>`).join('');

  const nowMs = Date.now();
  const next = visibleOccs(nowMs, nowMs + 30 * 864e5, ui.q).filter((o) => o.start >= nowMs).slice(0, 5);
  const when = (o) => { const d = new Date(o.start); return (dKey(d) === todayK ? 'Today' : DOWS[(d.getDay() + 6) % 7] + ' ' + shortDate(d)) + ' · ' + hm(d); };
  const upnext = next.map((o) => `<button type="button" class="upnext" data-act="editEvent" data-id="${o.ev.id}"><span class="dot" style="background:${(COLORS[o.ev.color] || COLORS.violet).ink}"></span><span class="grow" style="min-width:0;display:flex;flex-direction:column;gap:2px"><span class="ell" style="font-weight:500">${esc(o.ev.name)}</span><span class="small muted">${when(o)}</span></span>${o.ev.repeat ? `<span class="muted" title="Repeats">${ic(P.repeat, 15)}</span>` : ''}</button>`).join('');

  return `
  <div class="top"><div><h1>Calendar</h1><p>Tick the calendars you want to see. They stack in the same view.</p></div>
    <div style="display:flex;align-items:center;flex-wrap:wrap;gap:10px">
      <div style="display:flex;align-items:center;gap:2px;height:44px;padding:0 4px;border-radius:12px;background:var(--card);border:1px solid var(--cardline)">
        <button type="button" class="iconbtn" data-act="calMove" data-d="-1" aria-label="Previous">${ic(P.left, 16, 2)}</button>
        <span style="padding:0 8px;font-weight:600;white-space:nowrap">${label}</span>
        <button type="button" class="iconbtn" data-act="calMove" data-d="1" aria-label="Next">${ic(P.right, 16, 2)}</button></div>
      <button type="button" class="btn ghost" data-act="calToday">Today</button>
      <div class="seg" role="tablist" aria-label="View">
        <button type="button" role="tab" aria-selected="${ui.calMode === 'week'}" data-act="calMode" data-v="week">Week</button>
        <button type="button" role="tab" aria-selected="${ui.calMode === 'month'}" data-act="calMode" data-v="month">Month</button></div>
      <button type="button" class="btn" data-act="newEvent">${ic(P.plus, 18, 2)}New event</button>
    </div></div>
  <div class="calwrap">
    <div class="calside">
      <section class="panel"><h2>${MONTHS_LONG[a.getMonth()]} ${a.getFullYear()}</h2><div class="mini">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x) => `<span>${x}</span>`).join('')}${mini}</div></section>
      <section class="panel"><div style="display:flex;align-items:center"><h2 class="grow">Calendars</h2><button type="button" class="iconbtn" data-act="newCal" aria-label="New calendar">${ic(P.plus, 17, 2)}</button></div>
        <div style="display:flex;flex-direction:column;gap:2px">${cals}</div></section>
      <section class="panel"><h2>Up next</h2>${upnext || '<span class="small muted">Nothing in the next 30 days.</span>'}</section>
    </div>
    ${body}
  </div>`;
}

/* ---------- to do ---------- */
function viewTodo() {
  const now = Date.now();
  const ql = ui.q.trim().toLowerCase();
  const items = db.todos.filter((t) => !ql || t.name.toLowerCase().includes(ql)).map((t) => ({ t, st: todoNow(t, now) }))
    .sort((x, y) => x.st.done - y.st.done || x.st.next - y.st.next);
  const due = items.filter((i) => !i.st.done).length;
  const mine = myPassive();
  const week = sum(mine.filter((p) => new Date(p.at).getTime() >= now - 7 * 864e5), (p) => p.amount);
  const earned = (id) => sum(mine.filter((p) => p.todoId === id), (p) => p.amount);
  const doneLabel = (t) => { const by = tickRec(t)?.by; return t.shared && by && by !== db.activeProfile ? 'Claimed by ' + esc(profileName(by)) : 'Done'; };
  const row = ({ t, st }) => `<div class="todo ${st.done ? 'done' : ''}">
      <button type="button" class="tick ${st.done ? 'on' : ''}" data-act="tick" data-id="${t.id}" aria-pressed="${st.done}" aria-label="Done: ${esc(t.name)}">${st.done ? ic(P.check, 16, 3) : ''}</button>
      <div class="grow" style="min-width:0;display:flex;flex-direction:column;gap:4px">
        <div style="display:flex;align-items:center;gap:8px;min-width:0"><span class="tname ell" style="font-weight:600;font-size:15px">${esc(t.name)}</span>${t.passive ? `<span class="pill" style="background:${PASSIVE.tint};color:${PASSIVE.ink}">Passive</span>` : ''}${t.shared ? '<span class="pill" style="background:var(--chip);color:var(--nav)">Shared</span>' : ''}</div>
        <span class="small muted">${t.sbYear ? 'Every Skyblock year (124h)' : `${L.everyText(t.every, t.unit)} · from ${shortDate(t.start)}, ${hm(new Date(t.start))}`}</span></div>
      <div style="text-align:right;display:flex;flex-direction:column;gap:2px">
        <span class="${st.done ? 'pos' : ''}" style="font-weight:600">${st.done ? doneLabel(t) : 'To do'}</span>
        <span class="small muted">Resets in ${dur(st.next - now)}</span>
        ${t.passive ? `<span class="small" style="color:${PASSIVE.ink}">${fmt(earned(t.id))} earned</span>` : ''}</div>
      <button type="button" class="iconbtn" data-act="editTodo" data-id="${t.id}" aria-label="Edit ${esc(t.name)}">${ic(P.edit, 17)}</button>
    </div>`;
  return `
  <div class="top"><div><h1>To Do</h1><p>Recurring tasks. Each one comes back on its own schedule.</p></div>
    <button type="button" class="btn" data-act="newTodo">${ic(P.plus, 18, 2)}New to do</button></div>
  <div class="cards">
    <div class="card"><span>To do now</span><div class="big">${due}</div><span class="small muted">of ${items.length} tasks</span></div>
    <div class="card"><span>Done</span><div class="big pos">${items.length - due}</div><span class="small muted">until their next reset</span></div>
    <div class="card"><span>Passive · last 7 days</span><div class="big" style="color:${PASSIVE.ink}">${fmt(week)}${coin()}</div><span class="small muted">from passive tasks</span></div>
  </div>
  <div style="display:flex;flex-direction:column;gap:8px">${items.map(row).join('') || '<div class="empty"><b style="font-size:15px">No tasks yet</b><span class="muted">Add a recurring task, like collecting your minions every 12 hours.</span></div>'}</div>`;
}

/* ---------- stats ---------- */
const PERIODS = [['7', '7 days', 7], ['30', '30 days', 30], ['90', '90 days', 90], ['365', '1 year', 365], ['all', 'All time'], ['custom', 'Custom']];
const bLabel = (s, g) => { const d = new Date(s); return g === 'month' ? MONTHS[d.getMonth()] + (d.getMonth() === 0 ? ' ' + d.getFullYear() : '') : g === 'week' ? shortDate(d) : String(d.getDate()); };
const bTitle = (s, g) => { const d = new Date(s); return g === 'month' ? MONTHS_LONG[d.getMonth()] + ' ' + d.getFullYear() : g === 'week' ? 'Week of ' + dateLabel(d) : dateLabel(d); };

// SVG chart of buckets. style: bars | line | cumul | stack. keys: [[key, {label, ink}]] in stack order.
function chartSvg(bks, style, group, keys, cd) {
  const W = 800, H = 260, L0 = 56, R = 8, T = 14, B = 24, iw = W - L0 - R, ih = H - T - B, n = bks.length;
  let run = 0;
  const vals = style === 'cumul' ? bks.map((b) => (run += b.total)) : bks.map((b) => b.total);
  const pos = (b) => sum(Object.values(b.byKey).filter((v) => v > 0), (v) => v), neg = (b) => sum(Object.values(b.byKey).filter((v) => v < 0), (v) => v);
  const range = style === 'stack' ? [bks.map(pos), bks.map(neg)] : style === 'candle' ? [cd.map((k) => k.hi), cd.map((k) => k.lo)] : [vals, vals];
  let hi = Math.max(0, ...range[0]), lo = Math.min(0, ...range[1]);
  if (hi === lo) hi = lo + 1;
  const y = (v) => T + ((hi - v) / (hi - lo)) * ih, slot = iw / n, x = (i) => L0 + slot * (i + 0.5), bw = Math.max(2, Math.min(28, slot * 0.7));
  // 0 always; other ticks only if they don't collide with an already kept one
  const ticks = [0];
  for (const t of [hi, lo, (hi + lo) / 2]) if (ticks.every((k) => Math.abs(y(k) - y(t)) > 18)) ticks.push(t);
  let g = ticks.map((t) => `<line x1="${L0}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" class="${t === 0 ? 'zero' : 'grid'}"/><text x="${L0 - 8}" y="${y(t) + 4}" text-anchor="end">${t ? signed(t) : '0'}</text>`).join('');
  const step = Math.ceil(n / 12);
  g += bks.map((b, i) => (i % step ? '' : `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${bLabel(b.start, group)}</text>`)).join('');
  if (style === 'bars') g += bks.map((b, i) => b.total ? `<rect x="${x(i) - bw / 2}" y="${Math.min(y(b.total), y(0))}" width="${bw}" height="${Math.abs(y(b.total) - y(0))}" rx="3" fill="${b.total > 0 ? 'var(--green)' : 'var(--red)'}"/>` : '').join('');
  if (style === 'line' || style === 'cumul') {
    const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(' L');
    const color = style === 'cumul' ? (run >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--accent2)';
    if (style === 'cumul') g += `<path d="M${x(0)},${y(0)} L${pts} L${x(n - 1)},${y(0)} Z" fill="${color}" opacity=".15"/>`;
    g += `<path d="M${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>`;
    if (n <= 60) g += vals.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="${color}"/>`).join('');
  }
  if (style === 'stack') g += bks.map((b, i) => {
    let up = 0, dn = 0, out = '';
    for (const [k, m] of keys) {
      const v = b.byKey[k];
      if (!v) continue;
      const a = v > 0 ? up : dn, z = a + v;
      out += `<rect x="${x(i) - bw / 2}" y="${Math.min(y(a), y(z))}" width="${bw}" height="${Math.abs(y(z) - y(a))}" fill="${m.ink}"/>`;
      v > 0 ? (up = z) : (dn = z);
    }
    return out;
  }).join('');
  if (style === 'candle') g += cd.map((k, i) => {
    const color = k.c >= k.o ? 'var(--green)' : 'var(--red)', top = y(Math.max(k.o, k.c));
    return `<line x1="${x(i)}" x2="${x(i)}" y1="${y(k.hi)}" y2="${y(k.lo)}" stroke="${color}" stroke-width="1.5"/>`
      + `<rect x="${x(i) - bw / 2}" y="${top}" width="${bw}" height="${Math.max(1.5, y(Math.min(k.o, k.c)) - top)}" rx="1.5" fill="${color}"/>`;
  }).join('');
  // hover targets with the exact numbers
  g += bks.map((b, i) => {
    const parts = style === 'stack' ? keys.filter(([k]) => b.byKey[k]).map(([k, m]) => `\n${m.label}: ${signed(b.byKey[k])}`).join('')
      : style === 'candle' ? `\nOpen ${signed(cd[i].o)} · Close ${signed(cd[i].c)}\nHigh ${signed(cd[i].hi)} · Low ${signed(cd[i].lo)}` : '';
    const head = style === 'candle' ? '' : `: ${signed(style === 'cumul' ? vals[i] : b.total)}${style === 'cumul' ? ' total' : ''}`;
    return `<rect x="${L0 + slot * i}" y="${T}" width="${slot}" height="${ih}" fill="transparent"><title>${esc(bTitle(b.start, group))}${head}${esc(parts)}</title></rect>`;
  }).join('');
  const summary = bks.filter((b) => b.total).map((b) => `${signed(b.total)} ${bTitle(b.start, group)}`).join(', ') || 'no realized results';
  return `<svg viewBox="0 0 ${W} ${H}" class="chartsvg" role="img" aria-label="Realized result: ${esc(summary)}">${g}</svg>`;
}

// "By category" panel as a donut (pie) or horizontal bars. rows: [{label, ink, inv, res}]
function catChart(rows, view, metric) {
  const items = rows.map((r) => ({ ...r, v: metric === 'invested' ? r.inv : r.res })).filter((r) => r.v);
  if (!items.length) return `<span class="small muted">Nothing ${metric === 'invested' ? 'invested' : 'realized'} in this period.</span>`;
  const val = (v) => (metric === 'invested' ? fmt(v) : signed(v));
  if (view === 'bars') {
    const max = Math.max(...items.map((r) => Math.abs(r.v)));
    return items.sort((a, b) => b.v - a.v).map((r) => `<div class="catrow"><div style="display:flex;align-items:center;gap:8px"><span class="dot" style="background:${r.ink}"></span><span class="grow" style="font-weight:500">${esc(r.label)}</span><span class="num ${metric === 'result' ? (r.v > 0 ? 'pos' : 'neg') : ''}" style="font-weight:600">${val(r.v)}</span></div>
      <div class="track" style="height:12px"><div style="width:${(Math.abs(r.v) / max) * 100}%;background:${r.v < 0 ? 'var(--red)' : r.ink}"></div></div></div>`).join('');
  }
  // pie: only positive amounts can be slices
  const slices = items.filter((r) => r.v > 0), total = sum(slices, (r) => r.v);
  if (!total) return '<span class="small muted">No positive results to show as a pie in this period.</span>';
  const R = 82, r0 = 52, cx = 90, cy = 90, pt = (a, rad) => `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`;
  let a = -Math.PI / 2;
  const arcs = slices.map((s) => {
    const share = s.v / total, title = `<title>${esc(s.label)}: ${val(s.v)} (${(share * 100).toFixed(1)}%)</title>`;
    if (share > 0.9999) return `<circle cx="${cx}" cy="${cy}" r="${(R + r0) / 2}" fill="none" stroke="${s.ink}" stroke-width="${R - r0}">${title}</circle>`;
    const b = a + share * 2 * Math.PI, large = b - a > Math.PI ? 1 : 0;
    const d = `M${pt(a, R)} A${R},${R} 0 ${large} 1 ${pt(b, R)} L${pt(b, r0)} A${r0},${r0} 0 ${large} 0 ${pt(a, r0)} Z`;
    a = b;
    return `<path d="${d}" fill="${s.ink}" stroke="var(--card)" stroke-width="1.5">${title}</path>`;
  }).join('');
  const legend = slices.sort((x, y) => y.v - x.v).map((s) => `<div style="display:flex;align-items:center;gap:8px"><span class="dot" style="background:${s.ink}"></span><span class="grow ell">${esc(s.label)}</span><span class="num" style="font-weight:600">${val(s.v)}</span><span class="small muted num" style="width:44px;text-align:right">${Math.round((s.v / total) * 100)}%</span></div>`).join('');
  const negNote = items.some((r) => r.v < 0) ? '<span class="small muted">Categories with a loss are left out of the pie. Use Bars to see them.</span>' : '';
  return `<div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
      <svg viewBox="0 0 180 180" width="170" height="170" role="img" aria-label="${metric === 'invested' ? 'Invested' : 'Result'} by category">${arcs}
        <text x="${cx}" y="${cy - 2}" text-anchor="middle" class="pietotal">${val(total)}</text><text x="${cx}" y="${cy + 16}" text-anchor="middle" class="pielbl">${metric === 'invested' ? 'invested' : 'gained'}</text></svg>
      <div style="flex:1;min-width:160px;display:flex;flex-direction:column;gap:8px">${legend}</div></div>${negNote}`;
}

function viewStats() {
  const pr = db.prefs, today = dayStart(new Date()), tomorrow = addDays(today, 1).getTime();
  const ms = (s) => new Date(s).getTime();
  const flips = myFlips(), allPass = myPassive();
  // period -> [from, to)
  let from, to = tomorrow;
  const preset = PERIODS.find((p) => p[0] === pr.period && p[2]);
  if (preset) from = addDays(today, -(preset[2] - 1)).getTime();
  else if (pr.period === 'custom') {
    const a = new Date((pr.from || dKey(addDays(today, -29))) + 'T00:00').getTime(), b = addDays(new Date((pr.to || dKey(today)) + 'T00:00'), 1).getTime();
    [from, to] = a < b ? [a, b] : [b - 864e5, a + 864e5];
  } else from = Math.min(today.getTime() - 13 * 864e5, ...flips.map((f) => ms(f.bought)), ...allPass.map((p) => ms(p.at)));
  const inR = (s) => { const t = ms(s); return t >= from && t < to; };
  const bought = flips.filter((f) => inR(f.bought));
  const closed = flips.filter((f) => f.sold && inR(f.soldAt));
  const pass = allPass.filter((p) => inR(p.at));
  const wins = closed.filter((f) => f.pnl > 0), losses = closed.filter((f) => f.pnl < 0);
  const profit = sum(wins, (f) => f.pnl), loss = sum(losses, (f) => f.pnl), passive = sum(pass, (p) => p.amount);
  const net = profit + loss + passive;
  const closedCost = sum(closed, (f) => f.cost);
  const roi = closedCost ? ((profit + loss) / closedCost) * 100 : 0;
  const open = flips.filter((f) => !f.sold);
  const invested = sum(bought, (f) => f.cost);
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const pct = (x) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(1) + '%';

  // realized chart: closed flips by category + passive, with the chart filters
  const c = pr.chart, hidden = new Set(c.hidden);
  const keys = db.categories.map((x) => [x.id, catMeta(x.id)]).concat([['passive', PASSIVE]]);
  const evs = flips.filter((f) => f.sold).map((f) => ({ t: ms(f.soldAt), key: f.cat, v: f.pnl }))
    .concat(allPass.map((p) => ({ t: ms(p.at), key: 'passive', v: p.amount })))
    .filter((e) => !hidden.has(e.key) && (c.sign === 'all' || (c.sign === 'gain' ? e.v > 0 : e.v < 0)));
  const bks = L.buckets(evs, from, to, c.group);
  const seg = (k, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button type="button" aria-pressed="${c[k] === v}" data-act="chartSet" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const catFilter = `<div class="chips small" role="group" aria-label="Categories shown">${keys.map(([k, m]) => `<label><input type="checkbox" data-chartcat="${k}" ${hidden.has(k) ? '' : 'checked'}><span><span class="dot" style="background:${m.ink}"></span>${esc(m.label)}</span></label>`).join('')}</div>`;
  const pseg = (k, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button type="button" aria-pressed="${pr[k] === v}" data-act="prefSet" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const catData = db.categories.map(({ id }) => {
    const m = catMeta(id);
    return { label: m.label, ink: m.ink, inv: sum(bought.filter((f) => f.cat === id), (f) => f.cost), res: sum(closed.filter((f) => f.cat === id), (f) => f.pnl) };
  }).concat([{ label: 'Passive', ink: PASSIVE.ink, inv: 0, res: sum(pass, (p) => p.amount) }]);
  const chartTitle = { bars: 'Realized profit & loss', line: 'Realized profit & loss', cumul: 'Cumulative realized result', candle: 'Running total (candles)', stack: 'Realized result by category' }[c.style];

  // by category
  const catRows = db.categories.map(({ id: k }) => {
    const m = catMeta(k);
    const inv = sum(bought.filter((f) => f.cat === k), (f) => f.cost);
    const p = sum(closed.filter((f) => f.cat === k), (f) => f.pnl);
    const share = invested ? (inv / invested) * 100 : 0;
    return `<div class="catrow"><div style="display:flex;align-items:center;gap:8px"><span class="dot" style="background:${m.ink}"></span><span class="grow" style="font-weight:500">${esc(m.label)}</span><span class="num ${p > 0 ? 'pos' : p < 0 ? 'neg' : 'muted'}" style="font-weight:600">${signed(p)}</span></div>
      <div class="track"><div style="width:${share}%;background:${m.ink}"></div></div><span class="small muted">${fmt(inv)} invested · ${Math.round(share)}%</span></div>`;
  }).join('');
  const groups = {};
  pass.forEach((p) => { const name = (byId(db.todos, p.todoId) || p).name; const g = (groups[p.todoId] = groups[p.todoId] || { name, n: 0, total: 0 }); g.n++; g.total += p.amount; });
  const detail = Object.values(groups).sort((a, b) => b.total - a.total)
    .map((g) => `<div style="display:flex;gap:8px;padding:4px 0 4px 16px"><span class="grow ell">${esc(g.name)}</span><span class="small muted">${g.n}×</span><span class="num pos" style="font-weight:600">+${fmt(g.total)}</span></div>`).join('');
  const passiveRow = `<button type="button" class="catrow" data-act="togglePassive" aria-expanded="${ui.passiveOpen}">
      <div style="display:flex;align-items:center;gap:8px"><span class="dot" style="background:${PASSIVE.ink}"></span><span class="grow" style="font-weight:500">Passive ${ic(ui.passiveOpen ? '<path d="M6 15l6-6 6 6"/>' : '<path d="M6 9l6 6 6-6"/>', 14, 2)}</span><span class="num ${passive > 0 ? 'pos' : 'muted'}" style="font-weight:600">${signed(passive)}</span></div>
      <span class="small muted">${plural(pass.length, 'completion')} from passive tasks · click for details</span></button>
    ${ui.passiveOpen ? detail || '<span class="small muted" style="padding-left:16px">No passive income in this period.</span>' : ''}`;

  const top = wins.slice().sort((a, b) => b.pnl - a.pnl).slice(0, 5)
    .map((f, i) => `<tr><td>${i + 1}</td><td>${esc(f.name)}</td><td>${fmt(f.cost)}</td><td>${fmt(f.sell)}</td><td class="pos">${signed(f.pnl)}</td><td class="pos">${pct((f.pnl / f.cost) * 100)}</td></tr>`).join('');
  const worst = losses.slice().sort((a, b) => a.pnl - b.pnl).slice(0, 3)
    .map((f) => `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--cardline)"><div class="grow" style="display:flex;flex-direction:column;gap:2px"><span style="font-weight:600">${esc(f.name)}</span><span class="small muted">${fmt(f.cost)} → ${fmt(f.sell)}</span></div><div style="text-align:right;display:flex;flex-direction:column;gap:2px"><span class="neg num" style="font-weight:700">${signed(f.pnl)}</span><span class="small muted">${pct((f.pnl / f.cost) * 100)}</span></div></div>`).join('');

  const tab = ([k, l]) => `<button type="button" role="tab" aria-selected="${pr.period === k}" data-act="period" data-v="${k}">${l}</button>`;
  return `
  <div class="top"><div><h1>Stats</h1><p>${esc(profileName(db.activeProfile))} · where your coins went, and what came back.</p></div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
      <div class="seg" role="tablist" aria-label="Period">${PERIODS.map(tab).join('')}</div>
      ${pr.period === 'custom' ? `<div style="display:flex;align-items:center;gap:8px"><input class="in" type="date" data-pref="from" value="${esc(dKey(new Date(from)))}" aria-label="From" style="width:auto;height:36px"><span class="muted">→</span><input class="in" type="date" data-pref="to" value="${esc(dKey(new Date(to - 864e5)))}" aria-label="To" style="width:auto;height:36px"></div>` : ''}
    </div></div>
  <div class="cards">
    <div class="card"><span>Invested</span><div class="big">${fmt(invested)}${coin()}</div><span class="small muted">${plural(bought.length, 'flip')}</span></div>
    <div class="card"><span>Profit</span><div class="big pos">${signed(profit)}</div><span class="small muted">${plural(wins.length, 'winning flip')}</span></div>
    <div class="card"><span>Losses</span><div class="big neg">${signed(loss)}</div><span class="small muted">${plural(losses.length, 'losing flip')}</span></div>
    <div class="card"><span>Passive</span><div class="big" style="color:${PASSIVE.ink}">${signed(passive)}</div><span class="small muted">${plural(pass.length, 'completion')}</span></div>
    <div class="card"><span>Net result</span><div class="big ${net > 0 ? 'pos' : net < 0 ? 'neg' : ''}">${signed(net)}</div><span class="small muted">${closed.length ? 'ROI ' + pct(roi) + ' on closed' : 'flips + passive'}</span></div>
    <div class="card"><span>Win rate</span><div class="big">${closed.length ? Math.round((wins.length / closed.length) * 100) + '%' : '—'}</div><span class="small muted">${wins.length} of ${closed.length} closed</span></div>
    <div class="card"><span>Still open</span><div class="big">${fmt(sum(open, (f) => f.cost))}</div><span class="small muted">${plural(open.length, 'flip')} in progress</span></div>
  </div>
  <div class="split">
    <section class="panel wide"><div style="display:flex;align-items:baseline;gap:12px"><h2 class="grow">${chartTitle}</h2><span class="small muted">${bTitle(bks[0].start, c.group)} – ${shortDate(new Date(to - 864e5))}</span></div>
      <div class="chartbar">${seg('style', [['bars', 'Bars'], ['line', 'Line'], ['cumul', 'Cumulative'], ['candle', 'Candles'], ['stack', 'Stacked']])}${seg('group', [['day', 'Day'], ['week', 'Week'], ['month', 'Month']])}${seg('sign', [['all', 'All'], ['gain', 'Gains'], ['loss', 'Losses']])}</div>
      ${catFilter}
      ${chartSvg(bks, c.style, c.group, keys, c.style === 'candle' ? L.candles(evs, bks, to) : null)}</section>
    <section class="panel"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><h2 class="grow">By category</h2>
        <div class="chartbar">${pseg('catView', [['list', 'List'], ['pie', 'Pie'], ['bars', 'Bars']])}${pr.catView === 'list' ? '' : pseg('catMetric', [['invested', 'Invested'], ['result', 'Result']])}</div></div>
      ${pr.catView === 'list' ? catRows + passiveRow : catChart(catData, pr.catView, pr.catMetric)}</section>
  </div>
  <div class="split">
    <section class="panel wide"><h2>Most profitable items</h2>${top ? `<table><thead><tr><th>#</th><th>Item</th><th>Bought</th><th>Sold</th><th>Profit</th><th>ROI</th></tr></thead><tbody>${top}</tbody></table>` : '<span class="small muted">No winning flips in this period.</span>'}</section>
    <section class="panel"><h2>Biggest losses</h2>${worst || '<span class="small muted">No losing flips in this period.</span>'}</section>
  </div>`;
}

/* ---------- history ---------- */
function viewHistory() {
  const ql = ui.q.trim().toLowerCase();
  const sold = myFlips().filter((f) => f.sold && (!ql || (f.name + ' ' + (f.note || '')).toLowerCase().includes(ql)))
    .sort((a, b) => String(b.soldAt).localeCompare(String(a.soldAt)));
  const pct = (x) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(1) + '%';
  const months = [];
  for (const f of sold) {
    const d = new Date(f.soldAt), k = d.getFullYear() + '-' + d.getMonth();
    if (!months.length || months[months.length - 1].k !== k) months.push({ k, label: MONTHS_LONG[d.getMonth()] + ' ' + d.getFullYear(), list: [] });
    months[months.length - 1].list.push(f);
  }
  const row = (f) => {
    const m = catMeta(f.cat);
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:10px;min-width:0"><span class="ico" style="width:32px;height:32px;border-radius:9px;background:${m.tint};color:${m.ink}">${flipIcon(f, m, 17)}</span>
        <span style="display:flex;flex-direction:column;min-width:0"><b class="ell">${esc(f.name)}</b><span class="small" style="color:${m.ink}">${esc(m.label)}</span></span></div></td>
      <td>${fmt(f.cost)}<div class="small muted">${shortDate(f.bought)} · ${f.qty} × ${fmt(f.price)}${f.unit === 'lot' ? ' lot' : ''}</div></td>
      <td>${fmt(f.sell)}<div class="small muted">${shortDate(f.soldAt)}, ${hm(new Date(f.soldAt))}</div></td>
      <td class="muted">${f.fees ? fmt(f.fees) : '—'}</td>
      <td><b class="${f.pnl >= 0 ? 'pos' : 'neg'}">${signed(f.pnl)}</b><div class="small muted">${pct((f.pnl / f.cost) * 100)}</div></td>
      <td style="text-align:right;white-space:nowrap"><button type="button" class="btn ghost sm" data-act="sell" data-id="${f.id}">Edit sale</button>
        <button type="button" class="iconbtn" style="display:inline-grid" data-act="editFlip" data-id="${f.id}" aria-label="Edit purchase of ${esc(f.name)}">${ic(P.edit, 17)}</button></td></tr>`;
  };
  const body = months.map((g) => {
    const tot = sum(g.list, (f) => f.pnl);
    return `<tr class="mhead"><td colspan="4">${g.label} <span class="muted small">· ${g.list.length} flip${g.list.length === 1 ? '' : 's'}</span></td><td colspan="2"><b class="${tot >= 0 ? 'pos' : 'neg'}">${signed(tot)}</b></td></tr>${g.list.map(row).join('')}`;
  }).join('');
  return `
  <div class="top"><div><h1>History</h1><p>${esc(profileName(db.activeProfile))} · every closed flip, newest first. Fix a wrong value with Edit sale or the pencil.</p></div></div>
  ${sold.length ? `<section class="panel" style="padding:8px 16px"><div class="table" style="margin:0"><table class="hist"><thead><tr><th>Item</th><th>Bought</th><th>Sold</th><th>Fees</th><th>Result</th><th></th></tr></thead><tbody>${body}</tbody></table></div></section>`
    : `<div class="empty"><b style="font-size:15px">No closed flips${ql ? ' match your search' : ' yet'}</b><span class="muted">Flips show up here once you sell them.</span></div>`}`;
}

/* ---------- timers ---------- */
const FORGE_LOOK = { icon: 'flame', ink: '#fdba74', bg: 'rgba(251,146,60,.16)' };
const myTimers = () => db.timers.filter((t) => t.profileId === db.activeProfile);
const whenText = (ms) => { const d = new Date(ms); return (dKey(d) === dKey(new Date()) ? 'Today' : DOWS[(d.getDay() + 6) % 7] + ' ' + shortDate(d)) + ' · ' + hm(d); };
function timerHint() {
  const now = Date.now(), list = myTimers();
  const ready = list.filter((t) => +new Date(t.end) <= now).length;
  return ready ? `<span class="hint pos">${ready} ready</span>` : list.length ? `<span class="hint">${list.length} running</span>` : '';
}
function viewTimers() {
  const now = Date.now(), ql = ui.q.trim().toLowerCase();
  const list = myTimers().filter((t) => !ql || t.item.toLowerCase().includes(ql)).sort((a, b) => new Date(a.end) - new Date(b.end));
  const row = (t) => {
    const s = +new Date(t.start), e = +new Date(t.end), ready = now >= e;
    const pct = e > s ? Math.min(100, Math.max(0, ((now - s) / (e - s)) * 100)) : 100;
    const look = t.kind === 'custom' ? { icon: t.icon, ...(COLORS[t.color] || COLORS.violet) } : FORGE_LOOK;
    return `<div class="todo">
      <div class="ico" style="background:${look.bg};color:${look.ink}">${t.kind === 'forge' && itemImg(t.item) ? `<img class="pix" src="${itemImg(t.item)}" alt="" style="width:30px;height:30px">` : ic(P[look.icon] || P.timer, 22)}</div>
      <div class="grow" style="min-width:0;display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;align-items:center;gap:8px;min-width:0"><span class="ell" style="font-weight:600;font-size:15px">${esc(t.item)}</span>${t.kind === 'custom' ? '' : `<span class="pill" style="background:var(--chip);color:var(--nav)">×${t.qty}</span>`}${t.qf ? `<span class="pill" style="background:rgba(94,234,212,.13);color:#5eead4">Quick Forge ${t.qf} · −${L.qfPct(t.qf)}%</span>` : ''}</div>
        <div class="track" role="progressbar" aria-label="Progress" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><div style="width:${pct}%;background:${ready ? 'var(--green)' : 'var(--accent)'}"></div></div></div>
      <div style="text-align:right;display:flex;flex-direction:column;gap:2px;min-width:150px">
        <span class="${ready ? 'pos' : ''}" style="font-weight:600">${ready ? 'Ready' : 'Ready in ' + dur(e - now)}</span>
        <span class="small muted">${ready ? 'since' : 'at'} ${whenText(e)}</span></div>
      <button type="button" class="btn ${ready ? '' : 'ghost'} sm" data-act="removeTimer" data-id="${t.id}">${ready ? 'Collect' : 'Cancel'}</button>
    </div>`;
  };
  return `
  <div class="top"><div><h1>Timers</h1><p>${esc(profileName(db.activeProfile))} · you get a notification when a timer is done.</p></div></div>
  <div style="display:flex;gap:14px;flex-wrap:wrap">
    <button type="button" class="tile" data-act="newForge"><span class="ico" style="background:${FORGE_LOOK.bg};color:${FORGE_LOOK.ink}">${ic(P.flame, 24)}</span><span style="display:flex;flex-direction:column;gap:2px;text-align:left"><b style="font-size:15px">Forge</b><span class="small muted">${FORGE_ITEMS.length} recipes · Quick Forge applied</span></span></button>
    ${db.presets.map((p) => { const c = COLORS[p.color] || COLORS.violet; return `<div class="tilewrap">
      <button type="button" class="tile" data-act="startPreset" data-id="${p.id}" aria-label="Start ${esc(p.name)} timer (${L.secText(p.min * 60)})"><span class="ico" style="background:${c.bg};color:${c.ink}">${ic(P[p.icon] || P.timer, 24)}</span><span style="display:flex;flex-direction:column;gap:2px;text-align:left"><b style="font-size:15px">${esc(p.name)}</b><span class="small muted">${L.secText(p.min * 60)} · click to start</span></span></button>
      <button type="button" class="iconbtn" data-act="editPreset" data-id="${p.id}" aria-label="Edit preset ${esc(p.name)}">${ic(P.edit, 15)}</button></div>`; }).join('')}
    <button type="button" class="tile" data-act="newCustom"><span class="ico" style="background:var(--chip);color:var(--accent2)">${ic(P.plus, 24, 2)}</span><span style="display:flex;flex-direction:column;gap:2px;text-align:left"><b style="font-size:15px">Custom</b><span class="small muted">Any name and duration</span></span></button>
  </div>
  <div style="display:flex;flex-direction:column;gap:8px">${list.map(row).join('') || '<div class="empty"><b style="font-size:15px">No timers running</b><span class="muted">Click Forge and pick what you put in.</span></div>'}</div>`;
}

function forgeModal() {
  const prof = byId(db.profiles, db.activeProfile), qf = prof.quickForge || 0;
  const form = openModal(`<form novalidate>${dHead('Forge', 'Pick what you put in the forge. Your Quick Forge perk is applied to the timer.')}
    <div class="dbody">
      <div class="field"><label class="flabel" for="fsearch">Item</label><input class="in" id="fsearch" placeholder="Search ${FORGE_ITEMS.length} forge recipes…" autofocus>
        <div class="flist" role="radiogroup" aria-label="Forge item">${FORGE_ITEMS.map(([n, s], i) => `<label class="fitem" data-name="${esc(n.toLowerCase())}"><input type="radio" name="item" value="${i}">${itemImg(n) ? `<img class="pix" src="${itemImg(n)}" alt="" width="22" height="22" loading="lazy">` : `<span class="fnoimg">${ic(P.flame, 16)}</span>`}<span class="grow">${esc(n)}</span><span class="small muted">${L.secText(s)}</span></label>`).join('')}</div></div>
      <div class="box"><div class="switchrow"><div class="grow"><label for="hasqf" style="font-weight:500">Quick Forge (HOTM perk)</label><div class="small muted">Remembered for this profile.</div></div><input type="checkbox" class="switch" id="hasqf" name="hasqf" ${qf ? 'checked' : ''}></div>
        <div class="qf-opts"><span class="flabel">Level</span>${stepper('qf', qf || 20, 'Quick Forge level', 1, 20)}<span class="small" id="qfpct" style="color:#5eead4"></span></div></div>
      <div class="cols">
        <div class="field"><span class="flabel">Quantity</span>${stepper('qty', 1, 'Quantity', 1, 7)}<span class="small muted">Forge slots run at the same time.</span></div>
        <label class="field"><span>Started</span><input class="in" type="datetime-local" name="start" value="${localISO(new Date())}"></label>
      </div>
      <div class="box" id="fres"></div>
      <span class="err" role="alert"></span>
    </div>${dFoot('Start timer')}</form>`);
  const calc = () => {
    const fd = new FormData(form), it = FORGE_ITEMS[fd.get('item')];
    const lvl = fd.get('hasqf') ? Math.min(20, Math.max(1, parseInt(fd.get('qf'), 10) || 1)) : 0;
    const start = fd.get('start') ? new Date(fd.get('start')).getTime() : NaN;
    return { it, lvl, start, end: it && start ? L.forgeEnd(start, it[1], lvl) : NaN, qty: intOf(fd.get('qty')) };
  };
  const update = () => {
    const c = calc();
    $('#qfpct').textContent = '−' + L.qfPct(Math.min(20, Math.max(1, parseInt(form.elements.qf.value, 10) || 1))) + '% forge time';
    $('#fres').innerHTML = !c.it ? '<span class="muted">Pick an item.</span>'
      : `<div style="display:flex;align-items:center;gap:12px"><span class="grow"><b>${esc(c.it[0])}</b> ×${c.qty}<br><span class="small muted">Takes ${L.secText((c.end - c.start) / 1000)}${c.lvl ? ` instead of ${L.secText(c.it[1])}` : ''}</span></span><span style="text-align:right"><span class="small muted">Ready</span><br><b>${isNaN(c.end) ? '—' : whenText(c.end)}</b></span></div>`;
  };
  $('#fsearch').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    form.querySelectorAll('.fitem').forEach((x) => (x.hidden = !!q && !x.dataset.name.includes(q)));
  });
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.onsubmit = (e) => {
    e.preventDefault();
    const c = calc();
    if (!c.it) return setErr(form, 'Pick the item you put in the forge.');
    if (isNaN(c.start)) return setErr(form, 'Pick when you started it.');
    prof.quickForge = c.lvl;
    db.timers.push({ id: uid(), profileId: db.activeProfile, kind: 'forge', item: c.it[0], qty: c.qty, qf: c.lvl, start: new Date(c.start).toISOString(), end: new Date(c.end).toISOString(), notified: c.end <= Date.now() });
    closeModal(); commit();
  };
  update();
}
// Custom timer. preset given -> edit that preset; otherwise start a one-off timer (optionally saved as a preset).
function customModal(preset) {
  const isPreset = !!preset;
  const p = preset || { name: '', icon: 'timer', color: 'violet', min: 60 };
  const icons = ['timer'].concat(CAT_ICONS);
  const form = openModal(`<form novalidate>${dHead(isPreset ? 'Edit preset' : 'Custom timer', isPreset ? 'Click the tile to start this timer.' : 'Any name and duration. Save it as a preset to start it in one click next time.')}
    <div class="dbody">
      <label class="field"><span>Name</span><input class="in" name="name" value="${esc(p.name)}" placeholder="e.g. Kuudra key" autofocus></label>
      ${dhm(p.min, 'minutes', 'Duration')}
      ${isPreset ? '' : `<label class="field"><span>Started</span><input class="in" type="datetime-local" name="start" value="${localISO(new Date())}"></label>`}
      <div class="field"><span class="flabel">Color</span>${swatches(p.color)}</div>
      <div class="field"><span class="flabel">Icon</span><div class="chips icons" role="radiogroup" aria-label="Icon">${icons.map((k) => `<label title="${k}"><input type="radio" name="icon" value="${k}" ${k === p.icon ? 'checked' : ''} aria-label="${k}"><span>${ic(P[k], 20)}</span></label>`).join('')}</div></div>
      ${isPreset ? '' : '<div class="box"><div class="switchrow"><div class="grow"><label for="savep" style="font-weight:500">Save as preset</label><div class="small muted">Adds a tile next to Forge to start it in one click.</div></div><input type="checkbox" class="switch" id="savep" name="savep"></div></div>'}
      <span class="err" role="alert"></span>
    </div>${dFoot(isPreset ? 'Save preset' : 'Start timer', isPreset && 'Delete')}</form>`);
  form.querySelector('[data-del]')?.addEventListener('click', () => {
    if (!confirm(`Delete the preset "${p.name}"? Running timers are kept.`)) return;
    db.presets = db.presets.filter((x) => x.id !== p.id); closeModal(); commit();
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form), name = fd.get('name').trim(), min = readMin(fd);
    if (!name) return setErr(form, 'Give the timer a name.');
    if (min < 1) return setErr(form, 'The duration must be at least 1 minute.');
    const look = { name, min, icon: fd.get('icon'), color: fd.get('color') };
    if (isPreset) Object.assign(byId(db.presets, p.id), look);
    else {
      const start = new Date(fd.get('start')).getTime();
      if (isNaN(start)) return setErr(form, 'Pick when it started.');
      if (fd.get('savep')) db.presets.push(Object.assign({ id: uid() }, look));
      startCustom(look, start);
    }
    closeModal(); commit();
  };
}
function startCustom(p, start = Date.now()) {
  const end = start + p.min * 6e4;
  db.timers.push({ id: uid(), profileId: db.activeProfile, kind: 'custom', item: p.name, icon: p.icon, color: p.color, qty: 1, start: new Date(start).toISOString(), end: new Date(end).toISOString(), notified: end <= Date.now() });
}
function checkTimers() {
  const now = Date.now();
  let changed = false;
  for (const t of db.timers) {
    if (t.notified || +new Date(t.end) > now) continue;
    t.notified = changed = true;
    if (t.kind === 'custom') notify('Timer done', `${t.item} · ${profileName(t.profileId)}`);
    else notify('Forge ready', `${t.item} ×${t.qty} · ${profileName(t.profileId)}`);
  }
  if (changed) save();
}

/* ---------- settings ---------- */
let dataPath = '';
function viewSettings() {
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const profiles = db.profiles.map((p) => {
    const on = p.id === db.activeProfile;
    return `<div class="calitem"><span class="dot" style="background:${on ? 'var(--accent2)' : '#3a3848'}"></span><span class="grow ell" style="font-weight:500">${esc(p.name)}${on ? ' <span class="small muted">· active</span>' : ''}</span>
      <span class="small muted">${plural(db.flips.filter((f) => f.profileId === p.id).length, 'flip')}</span>
      <button type="button" class="iconbtn" style="opacity:1" data-act="editProfile" data-id="${p.id}" aria-label="Edit profile ${esc(p.name)}">${ic(P.edit, 15)}</button></div>`;
  }).join('');
  const cats = db.categories.map((c) => {
    const m = catMeta(c.id);
    return `<div class="calitem"><span class="ico" style="width:30px;height:30px;border-radius:8px;background:${m.tint};color:${m.ink}">${ic(P[m.icon], 16)}</span><span class="grow ell" style="font-weight:500">${esc(c.name)}</span>
      <span class="small muted">${plural(db.flips.filter((f) => f.cat === c.id).length, 'flip')}</span>
      <button type="button" class="iconbtn" style="opacity:1" data-act="editCat" data-id="${c.id}" aria-label="Edit category ${esc(c.name)}">${ic(P.edit, 15)}</button></div>`;
  }).join('');
  return `
  <div class="top"><div><h1>Settings</h1><p>Profiles, investment categories and your data file.</p></div></div>
  <div class="split">
    <section class="panel"><div style="display:flex;align-items:center"><h2 class="grow">Profiles</h2><button type="button" class="btn ghost sm" data-act="newProfile">${ic(P.plus, 16, 2)}New profile</button></div>
      <span class="small muted">Each profile has its own flips, passive income and stats. Calendar and To Do are shared.</span>${profiles}</section>
    <section class="panel"><div style="display:flex;align-items:center"><h2 class="grow">Categories</h2><button type="button" class="btn ghost sm" data-act="newCat">${ic(P.plus, 16, 2)}New category</button></div>
      <span class="small muted">Shared by every profile.</span>${cats || '<span class="small muted">No categories yet. Create one to start logging flips.</span>'}</section>
  </div>
  <section class="panel"><h2>Data</h2>
    <span class="small muted">Everything is saved in one JSON file. To edit it by hand: open the folder, edit <b>data.json</b>, save it, then click Reload. Don't change anything in the app while you edit, or the app will overwrite your edits. A copy of the previous version is kept as data.json.bak.</span>
    <code style="padding:10px 12px;border-radius:10px;background:var(--field);border:1px solid var(--fieldline);user-select:text;word-break:break-all">${esc(dataPath)}</code>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="btn ghost" data-act="openData" ${T ? '' : 'disabled'}>${ic(P.folder, 17)}Open data folder</button><button type="button" class="btn ghost" data-act="reloadData">Reload from file</button></div>
  </section>`;
}

/* ---------- render ---------- */
const VIEWS = { inv: viewInv, history: viewHistory, cal: viewCal, todo: viewTodo, timers: viewTimers, stats: viewStats, settings: viewSettings };
const PLACEHOLDER = { inv: 'Search items or notes…', history: 'Search sold items…', cal: 'Search events…', todo: 'Search tasks…', timers: 'Search timers…', stats: 'Search…', settings: 'Search…' };
function render() {
  $('#side').innerHTML = sideHtml();
  const main = $('#view');
  const st = main.scrollTop, ws = $('#wscroll')?.scrollTop;
  main.innerHTML = VIEWS[ui.view]();
  main.scrollTop = st;
  const w = $('#wscroll');
  if (w) w.scrollTop = ws ?? Math.max(0, new Date().getHours() - 2) * ROW;
  $('#q').placeholder = PLACEHOLDER[ui.view];
  $('#q').disabled = ui.view === 'stats' || ui.view === 'settings';
}

/* ---------- modals ---------- */
let opener = null;
let modalCleanup = null; // set by a modal that adds document-level listeners
function runCleanup() { if (modalCleanup) { modalCleanup(); modalCleanup = null; } }
function openModal(html, cls = '') {
  runCleanup();
  opener = document.activeElement;
  const m = $('#modal');
  m.innerHTML = `<section class="dialog ${cls}" role="dialog" aria-modal="true" aria-labelledby="dlg-t">${html}</section>`;
  m.hidden = false;
  m.querySelectorAll('input, textarea, form').forEach((x) => x.setAttribute('autocomplete', 'off')); // no saved suggestions
  (m.querySelector('[autofocus]') || m.querySelector('input:not([type=hidden]),select,textarea,button'))?.focus();
  return m.querySelector('form');
}
function closeModal() {
  runCleanup();
  const m = $('#modal');
  m.hidden = true;
  m.innerHTML = '';
  if (opener && document.contains(opener)) opener.focus();
}
const dHead = (title, sub) => `<div class="dhead"><div class="grow"><h2 id="dlg-t">${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div><button type="button" class="iconbtn" data-act="close" aria-label="Close">${ic(P.close)}</button></div>`;
const dFoot = (saveLabel, del) => `<div class="dfoot">${del ? `<button type="button" class="btn danger" data-del>${ic(P.trash, 16)}${del}</button>` : ''}<span class="grow"></span><button type="button" class="btn ghost" data-act="close">Cancel</button><button type="submit" class="btn">${saveLabel}</button></div>`;
const radios = (name, opts, val, label) => `<div class="chips" role="radiogroup" aria-label="${label}">${opts.map(([v, l, dot]) => `<label><input type="radio" name="${name}" value="${v}" ${v === val ? 'checked' : ''}><span>${dot ? `<span class="dot" style="background:${dot}"></span>` : ''}${l}</span></label>`).join('')}</div>`;
const swatches = (val) => `<div class="chips sw" role="radiogroup" aria-label="Color">${Object.entries(COLORS).map(([k, c]) => `<label title="${c.label}"><input type="radio" name="color" value="${k}" ${k === val ? 'checked' : ''} aria-label="${c.label}"><span><span class="dot" style="width:18px;height:18px;background:${c.ink}"></span></span></label>`).join('')}</div>`;
const stepper = (name, val, label, min = 1, max = 999) => `<div class="stepper" role="group" aria-label="${label}"><button type="button" data-step="-1" aria-label="Decrease ${label}">−</button><input name="${name}" type="number" min="${min}" max="${max}" value="${val}" aria-label="${label}"><button type="button" data-step="1" aria-label="Increase ${label}">+</button></div>`;
// interval picker: days / hours / minutes, stored as total minutes
const dhm = (every, unit, label = 'Every') => {
  const s = L.splitMin(Math.round((every * L.UNIT_MS[unit]) / 6e4));
  return `<div class="dhm" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span class="flabel">${label}</span>
    ${stepper('ed', s.d, 'Days', 0)}<span class="small muted">d</span>${stepper('eh', s.h, 'Hours', 0, 23)}<span class="small muted">h</span>${stepper('em', s.m, 'Minutes', 0, 59)}<span class="small muted">min</span></div>`;
};
const sbBox = (on) => `<div class="chips"><label><input type="checkbox" name="sby" ${on ? 'checked' : ''}><span>${ic(P.star, 16)}Every Skyblock year<small class="muted">· 124h</small></span></label></div>`;
// "Every Skyblock year" fills and locks the start and the interval
function sbToggle(form, isEvent) {
  const el = form.elements, on = el.sby.checked;
  ['ed', 'eh', 'em', 'start'].concat(isEvent ? ['date'] : []).forEach((n) => (el[n].readOnly = on));
  form.querySelectorAll('.dhm [data-step]').forEach((b) => (b.disabled = on));
  if (!on) return;
  const s = L.splitMin(L.SB_YEAR_MIN), a = new Date(L.SB_YEAR_ANCHOR);
  el.ed.value = s.d; el.eh.value = s.h; el.em.value = s.m;
  if (!isEvent) { el.start.value = localISO(a); return; }
  let len = (new Date('2000-01-01T' + el.end.value) - new Date('2000-01-01T' + el.start.value)) / 6e4;
  if (!(len > 0)) len = 60; // keep the event's length, default 1h
  el.date.value = dKey(a); el.start.value = hm(a); el.end.value = hm(new Date(a.getTime() + len * 6e4));
}
const readMin = (fd) => (parseInt(fd.get('ed'), 10) || 0) * 1440 + (parseInt(fd.get('eh'), 10) || 0) * 60 + (parseInt(fd.get('em'), 10) || 0);
const intOf = (v, min = 1) => Math.max(min, parseInt(v, 10) || min);
const setErr = (form, msg) => { form.querySelector('.err').textContent = msg; };

// a flip shows its item image if it has one, else its category icon
const flipIcon = (f, m, size) => (f.img ? `<img class="pix" src="${esc(f.img)}" alt="" style="width:${size + 8}px;height:${size + 8}px">` : ic(P[m.icon], size));
// item name -> icon path, from the bundled item list (items.js)
const ITEM_BY_NAME = new Map(ITEMS.map(([n, file]) => [n.toLowerCase(), file]));
const itemImg = (name) => { const file = ITEM_BY_NAME.get(String(name).trim().toLowerCase()); return file ? 'items/' + file : null; };
function itemMatches(q, max = 8) {
  q = q.trim().toLowerCase();
  if (q.length < 2) return [];
  const starts = [], has = [];
  for (const r of ITEMS) {
    const n = r[0].toLowerCase();
    if (n.startsWith(q)) starts.push(r); else if (n.includes(q)) has.push(r);
    if (starts.length >= max) break;
  }
  return starts.concat(has).slice(0, max);
}

function readImage(file, maxW = 1600, type = 'image/jpeg') {
  // shortcut: screenshots are stored as resized JPEGs inside data.json; move them to separate files if the data gets slow (hundreds of shots)
  return new Promise((res, rej) => {
    if (!file || !file.type.startsWith('image/')) return rej(new Error('Not an image'));
    if (file.size > 10e6) return rej(new Error('Image is larger than 10 MB'));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxW / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL(type, 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Could not read the image')); };
    img.src = url;
  });
}

function flipModal(f) {
  const isEdit = !!f;
  if (!db.categories.length) {
    openModal(`${dHead('Create a category first', 'Flips are sorted into categories you create, like Mayor or Skins.')}
      <div class="dfoot"><span class="grow"></span><button type="button" class="btn ghost" data-act="close">Cancel</button><button type="button" class="btn" data-act="newCat">New category</button></div>`);
    return;
  }
  f = f || { name: '', cat: ui.cat === 'all' ? db.categories[0].id : ui.cat, price: null, unit: 'each', qty: 1, bought: localISO(new Date()), target: null, note: '', shot: null };
  let shot = f.shot;
  const form = openModal(`<form novalidate>${dHead(isEdit ? 'Edit flip' : 'New flip', "Log a purchase. You'll enter the sell price when you close it.")}
    <div class="dbody">
      <div class="field"><label class="flabel" for="iname">Item name</label>
        <div class="namerow"><button type="button" class="iconpick" id="iconprev" aria-label="Choose the item image" aria-expanded="false" aria-controls="ipick" title="Choose an image"></button>
          <div style="flex:1;position:relative"><input class="in" id="iname" name="name" value="${esc(f.name)}" placeholder="Type an item, e.g. Crown of Avarice" autofocus role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="sugg">
            <div class="sugg" id="sugg" role="listbox" aria-label="Item suggestions" hidden></div></div></div>
        <div class="ipick" id="ipick" hidden><input class="in" id="isearch" placeholder="Search ${ITEMS.filter((r) => r[1]).length.toLocaleString('en')} item images…" aria-label="Search item images"><div class="igrid" id="igrid" role="listbox" aria-label="Item images"></div></div>
        <div id="imgline" class="small muted" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"></div></div>
      <div class="field"><span class="flabel">Category</span>${radios('cat', db.categories.map((c) => [c.id, esc(c.name), catMeta(c.id).ink]), f.cat, 'Category')}</div>
      <div class="cols">
        <div class="field"><label class="flabel" for="price">Buy price</label><input class="in" id="price" name="price" value="${esc(toShort(f.price))}" placeholder="300m"><span class="small muted">Shortcuts work: 300m, 1.2b, 450k</span></div>
        <div class="field"><span class="flabel">Price applies to</span>${radios('unit', [['each', 'Each'], ['lot', 'Lot']], f.unit, 'Price applies to')}</div>
        <div class="field"><span class="flabel">Quantity</span>${stepper('qty', f.qty, 'Quantity')}</div>
      </div>
      <div class="box" style="flex-direction:row;align-items:center"><span class="grow muted">Total cost</span><span class="big" id="total">—</span>${coin()}</div>
      <div class="cols">
        <label class="field"><span>Purchase date</span><input class="in" type="datetime-local" name="bought" value="${esc(f.bought)}"></label>
        <div class="field"><label class="flabel" for="target">Target sell price <small class="muted">· optional</small></label>
          <div style="display:flex;gap:8px;align-items:center"><input class="in" id="target" name="target" value="${esc(toShort(f.target))}" placeholder="e.g. 380m" style="flex:1">${radios('tunit', [['each', 'Each'], ['lot', 'Lot']], f.targetUnit || (f.target ? 'lot' : 'each'), 'Target price applies to')}</div></div>
      </div>
      <label class="field"><span>Note <small>· optional</small></span><textarea class="in" name="note" placeholder="Why did you buy it?">${esc(f.note)}</textarea></label>
      <div class="field"><span class="flabel">Screenshot <small class="muted">· optional</small></span>
        <div class="drop" id="drop" tabindex="0" aria-label="Screenshot: drop an image or press Ctrl + V"><span id="shotprev"></span><div class="grow" style="display:flex;flex-direction:column;gap:2px"><span>Drop an image or paste with Ctrl + V</span><span class="small muted">PNG or JPG, up to 10 MB</span></div>
          <button type="button" class="btn ghost sm" id="shotdel" hidden>Remove</button>
          <label class="btn ghost sm">Browse<input type="file" accept="image/*" id="shotfile" class="sr"></label></div></div>
      <span class="err" role="alert"></span>
    </div>${dFoot(isEdit ? 'Save changes' : 'Add flip', isEdit && 'Delete')}</form>`);
  // item image: auto from the item name, or uploaded (an upload is never replaced by typing)
  let img = f.img || null, imgFrom = f.imgFrom || (img ? 'auto' : null), list = [], active = -1;
  const nameIn = $('#iname'), sugg = $('#sugg');
  const locked = () => imgFrom === 'upload' || imgFrom === 'manual'; // chosen by hand: typing never replaces it
  const showImg = () => {
    const sug = itemImg(nameIn.value);
    $('#iconprev').innerHTML = img ? `<img class="pix" src="${esc(img)}" alt="">` : ic(P.image, 22);
    $('#imgline').innerHTML = `<span class="grow">${img ? ({ upload: 'Your image', manual: 'Image you picked' }[imgFrom] || 'Image picked from the item name') : 'No image: the category icon is used'} · click the image to search</span>`
      + (sug && img !== sug ? '<button type="button" class="link" id="useSug">Use suggested image</button>' : '')
      + '<label class="link" style="display:inline-flex;align-items:center;cursor:pointer">Upload image<input type="file" accept="image/*" id="imgfile" class="sr"></label>'
      + (img ? '<button type="button" class="link" id="imgdel">Remove</button>' : '');
  };
  const closeSugg = () => { sugg.hidden = true; nameIn.setAttribute('aria-expanded', 'false'); nameIn.removeAttribute('aria-activedescendant'); };
  const renderSugg = () => {
    list = itemMatches(nameIn.value); active = -1;
    sugg.innerHTML = list.map(([n, file], i) => `<button type="button" role="option" id="sg${i}" data-i="${i}" tabindex="-1">${file ? `<img class="pix" src="items/${file}" alt="">` : '<span class="noimg"></span>'}<span class="ell">${esc(n)}</span></button>`).join('');
    sugg.hidden = !list.length; nameIn.setAttribute('aria-expanded', String(!!list.length));
  };
  const setActive = (i) => {
    active = (i + list.length) % list.length;
    sugg.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === active));
    nameIn.setAttribute('aria-activedescendant', 'sg' + active);
    sugg.children[active].scrollIntoView({ block: 'nearest' });
  };
  const pick = (i) => {
    const [n, file] = list[i];
    nameIn.value = n;
    if (!locked()) { img = file ? 'items/' + file : null; imgFrom = img ? 'auto' : null; }
    closeSugg(); showImg();
  };
  nameIn.addEventListener('input', () => {
    renderSugg();
    if (!locked()) { img = itemImg(nameIn.value); imgFrom = img ? 'auto' : null; }
    showImg();
  });
  // image search panel (click the image)
  const ipick = $('#ipick'), isearch = $('#isearch'), igrid = $('#igrid');
  const renderGrid = () => {
    const q = (isearch.value || nameIn.value).trim().toLowerCase();
    const hits = [];
    for (const r of ITEMS) if (r[1] && (!q || r[0].toLowerCase().includes(q)) && hits.push(r) >= 72) break;
    igrid.innerHTML = hits.map(([n, file]) => `<button type="button" role="option" data-file="${file}" title="${esc(n)}" aria-label="${esc(n)}"><img class="pix" src="items/${file}" alt=""></button>`).join('')
      || '<span class="small muted" style="grid-column:1/-1;padding:8px">No image matches.</span>';
  };
  const togglePick = (open) => {
    ipick.hidden = !open; $('#iconprev').setAttribute('aria-expanded', String(open));
    if (open) { isearch.value = ''; renderGrid(); isearch.focus(); }
  };
  $('#iconprev').addEventListener('click', () => togglePick(ipick.hidden));
  isearch.addEventListener('input', renderGrid);
  isearch.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); igrid.querySelector('[data-file]')?.click(); } // first hit, never submit
    if (e.key === 'Escape') { e.stopPropagation(); togglePick(false); $('#iconprev').focus(); }
  });
  igrid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-file]');
    if (!b) return;
    img = 'items/' + b.dataset.file; imgFrom = 'manual';
    togglePick(false); showImg();
  });
  nameIn.addEventListener('keydown', (e) => {
    if (sugg.hidden || !list.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setActive(active + (e.key === 'ArrowDown' ? 1 : -1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(active); }
    else if (e.key === 'Escape') { e.stopPropagation(); closeSugg(); } // close the list, not the dialog
  });
  nameIn.addEventListener('blur', () => setTimeout(closeSugg, 150));
  sugg.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in the input
  sugg.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) pick(+b.dataset.i); });
  form.addEventListener('click', (e) => {
    if (e.target.id === 'useSug') { img = itemImg(nameIn.value); imgFrom = 'auto'; showImg(); }
    if (e.target.id === 'imgdel') { img = null; imgFrom = null; showImg(); }
  });
  form.addEventListener('change', (e) => {
    if (e.target.id === 'imgfile') readImage(e.target.files[0], 128, 'image/png').then((d) => { img = d; imgFrom = 'upload'; showImg(); setErr(form, ''); }, (err) => setErr(form, err.message));
  });
  showImg();

  const showShot = () => {
    $('#shotprev').innerHTML = shot ? `<img src="${esc(shot)}" alt="Screenshot preview">` : ic(P.image, 28);
    $('#shotdel').hidden = !shot;
  };
  const setShot = (file) => readImage(file).then((d) => { shot = d; showShot(); setErr(form, ''); }, (e) => setErr(form, e.message));
  const update = () => {
    const fd = new FormData(form), p = parse(fd.get('price')), q = intOf(fd.get('qty'));
    $('#total').textContent = p == null ? '—' : fmt(fd.get('unit') === 'lot' ? p : p * q);
  };
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  $('#shotfile').onchange = (e) => setShot(e.target.files[0]);
  $('#shotdel').onclick = () => { shot = null; showShot(); };
  const drop = $('#drop');
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); setShot(e.dataTransfer.files[0]); };
  // Listen on the whole document: clicking the drop zone moves focus out of the form.
  const onPaste = (e) => {
    const dt = e.clipboardData;
    const file = [...(dt?.items || [])].find((i) => i.kind === 'file' && i.type.startsWith('image/'))?.getAsFile()
      || [...(dt?.files || [])].find((x) => x.type.startsWith('image/'));
    if (file) { e.preventDefault(); return setShot(file); }
    if (e.target.closest?.('input, textarea')) return; // normal text paste into a field
    // WebView2 sometimes hides bitmaps from the paste event: ask the clipboard directly
    navigator.clipboard?.read?.().then(async (items) => {
      for (const it of items) {
        const type = it.types.find((t) => t.startsWith('image/'));
        if (type) return setShot(new File([await it.getType(type)], 'clipboard', { type }));
      }
      setErr(form, 'No image in the clipboard. Copy a screenshot first (Win + Shift + S).');
    }).catch(() => setErr(form, 'Could not read the clipboard. Drop the image or use Browse instead.'));
  };
  document.addEventListener('paste', onPaste);
  modalCleanup = () => document.removeEventListener('paste', onPaste);
  form.querySelector('[data-del]')?.addEventListener('click', () => {
    if (!confirm(`Delete "${f.name}"? This cannot be undone.`)) return;
    db.flips = db.flips.filter((x) => x.id !== f.id); closeModal(); commit();
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = fd.get('name').trim(), price = parse(fd.get('price')), target = fd.get('target').trim();
    if (!name) return setErr(form, 'Give the item a name.');
    if (!price) return setErr(form, 'Enter a buy price, like 300m.');
    if (!fd.get('bought')) return setErr(form, 'Pick a purchase date.');
    if (target && parse(target) == null) return setErr(form, 'The target price is not a valid amount.');
    const data = { name, cat: fd.get('cat'), price, unit: fd.get('unit'), qty: intOf(fd.get('qty')), bought: fd.get('bought'), target: target ? parse(target) : null, targetUnit: fd.get('tunit'), note: fd.get('note').trim(), shot, img, imgFrom };
    if (isEdit) Object.assign(byId(db.flips, f.id), data);
    else db.flips.push(Object.assign({ id: uid(), profileId: db.activeProfile, sell: null, fees: 0, soldAt: null }, data));
    closeModal(); commit();
  };
  showShot(); update();
}

function sellModal(raw) {
  const f = derive(raw), m = catMeta(f.cat);
  const form = openModal(`<form novalidate>${dHead(f.sold ? 'Edit sale' : 'Close flip', 'Enter what you sold it for. Profit or loss is calculated for you.')}
    <div class="dbody">
      <div class="box" style="flex-direction:row;align-items:center;gap:14px">
        <div class="ico" style="background:${m.tint};color:${m.ink}">${flipIcon(f, m, 24)}</div>
        <div class="grow" style="display:flex;flex-direction:column;gap:2px;min-width:0"><div style="display:flex;gap:8px;align-items:center"><b class="ell">${esc(f.name)}</b><span class="pill" style="background:${m.tint};color:${m.ink}">${esc(m.label)}</span></div>
          <span class="small muted">Bought ${dateLabel(f.bought)} · ${f.unit === 'lot' ? 'lot of ' + f.qty + ' for ' + fmt(f.price) : f.qty + ' × ' + fmt(f.price) + ' each'}</span></div>
        <div style="text-align:right"><span class="small muted">Cost</span><div class="disp" style="font-size:18px">${fmt(f.cost)}</div></div></div>
      <div class="cols">
        <div class="field"><label class="flabel" for="sell">Sell price</label><input class="in" id="sell" name="sell" value="${esc(toShort(f.sell))}" placeholder="760m" autofocus></div>
        <div class="field"><span class="flabel">Price is</span>${radios('mode', [['total', 'Total'], ['each', 'Each']], 'total', 'Sell price applies to')}</div>
        <div class="field"><label class="flabel" for="fees">Fees &amp; tax <small class="muted">· optional</small></label><input class="in" id="fees" name="fees" value="${esc(f.fees ? toShort(f.fees) : '')}" placeholder="0"></div>
      </div>
      <label class="field"><span>Sell date</span><input class="in" type="datetime-local" name="soldAt" value="${esc(f.soldAt || localISO(new Date()))}"></label>
      <div class="box" id="res"></div>
      <span class="err" role="alert"></span>
    </div>${dFoot(f.sold ? 'Save sale' : 'Close flip', f.sold && 'Reopen flip')}</form>`);
  const calc = () => {
    const fd = new FormData(form), sv = parse(fd.get('sell')), fees = fd.get('fees').trim() ? parse(fd.get('fees')) : 0;
    const ok = sv != null && fees != null;
    const revenue = ok ? (fd.get('mode') === 'each' ? sv * f.qty : sv) : 0;
    return { ok, revenue, fees, pnl: revenue - fees - f.cost };
  };
  const update = () => {
    const r = calc(), gain = r.pnl >= 0;
    $('#res').innerHTML = `<div style="display:flex;align-items:center"><span class="grow" style="font-weight:600">${!r.ok ? 'Check the amounts' : gain ? 'Profit' : 'Loss'}</span><span class="big ${r.ok ? (gain ? 'pos' : 'neg') : 'muted'}">${r.ok ? signed(r.pnl) : '—'}</span></div>
      <div style="display:flex;gap:24px;flex-wrap:wrap" class="small"><span class="muted">Revenue <b style="color:var(--text)">${r.ok ? fmt(r.revenue) : '—'}</b></span><span class="muted">Per item <b style="color:var(--text)">${r.ok ? fmt(r.revenue / f.qty) : '—'}</b></span><span class="muted">ROI <b style="color:var(--text)">${r.ok ? (gain ? '+' : '−') + Math.abs((r.pnl / f.cost) * 100).toFixed(1) + '%' : '—'}</b></span></div>`;
  };
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.querySelector('[data-del]')?.addEventListener('click', () => {
    Object.assign(byId(db.flips, f.id), { sell: null, fees: 0, soldAt: null }); closeModal(); commit();
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    const r = calc(), soldAt = new FormData(form).get('soldAt');
    if (!r.ok) return setErr(form, 'Enter a valid sell price (and fees), like 760m.');
    if (!soldAt) return setErr(form, 'Pick a sell date.');
    Object.assign(byId(db.flips, f.id), { sell: r.revenue, fees: r.fees, soldAt });
    ui.sel.delete(f.id);
    closeModal(); commit();
  };
  update();
}

// Sell several open flips at once, each with its own price
function sellManyModal(flips) {
  const rows = flips.map((f) => {
    const m = catMeta(f.cat);
    return `<tr data-id="${f.id}">
      <td><div style="display:flex;align-items:center;gap:10px;min-width:0"><span class="ico" style="width:32px;height:32px;border-radius:9px;background:${m.tint};color:${m.ink}">${flipIcon(f, m, 17)}</span>
        <span style="display:flex;flex-direction:column;min-width:0"><b class="ell">${esc(f.name)}</b><span class="small muted">Cost ${fmt(f.cost)}${f.qty > 1 ? ` · ${f.qty} items` : ''}</span></span></div></td>
      <td><input class="in" name="sell_${f.id}" placeholder="e.g. 760m" aria-label="Sell price for ${esc(f.name)}" style="height:38px"></td>
      <td>${f.qty > 1 ? radios('mode_' + f.id, [['total', 'Total'], ['each', 'Each']], 'total', 'Price for ' + esc(f.name) + ' is') : `<input type="hidden" name="mode_${f.id}" value="total"><span class="small muted">Total</span>`}</td>
      <td><input class="in" name="fees_${f.id}" placeholder="0" aria-label="Fees for ${esc(f.name)}" style="height:38px;width:90px"></td>
      <td class="res num" style="font-weight:600;text-align:right">—</td></tr>`;
  }).join('');
  const form = openModal(`<form novalidate>${dHead(`Sell ${flips.length} flips`, 'Enter what each one sold for. Profit or loss is calculated for each.')}
    <div class="dbody">
      <div class="table" style="margin:0"><table class="hist" style="min-width:720px"><thead><tr><th>Item</th><th>Sell price</th><th>Price is</th><th>Fees</th><th style="text-align:right">Result</th></tr></thead><tbody>${rows}</tbody></table></div>
      <label class="field"><span>Sell date <small>· for all of them</small></span><input class="in" type="datetime-local" name="soldAt" value="${localISO(new Date())}" style="max-width:260px"></label>
      <div class="box" style="flex-direction:row;align-items:center"><span class="grow muted" id="manysum"></span><span class="big" id="manytot">—</span></div>
      <span class="err" role="alert"></span>
    </div>${dFoot(`Sell ${flips.length} flips`)}</form>`, 'wide');
  const calc = () => {
    const fd = new FormData(form);
    return flips.map((f) => {
      const sv = parse(fd.get('sell_' + f.id)), raw = fd.get('fees_' + f.id).trim(), fees = raw ? parse(raw) : 0;
      const ok = sv != null && fees != null;
      const revenue = ok ? (fd.get('mode_' + f.id) === 'each' ? sv * f.qty : sv) : 0;
      return { f, ok, filled: !!fd.get('sell_' + f.id).trim(), revenue, fees, pnl: revenue - fees - f.cost };
    });
  };
  const update = () => {
    const r = calc();
    r.forEach((x) => {
      const td = form.querySelector(`tr[data-id="${x.f.id}"] .res`);
      td.textContent = x.ok ? signed(x.pnl) : '—';
      td.className = 'res num ' + (x.ok ? (x.pnl >= 0 ? 'pos' : 'neg') : 'muted');
      if (x.ok) form.elements['sell_' + x.f.id].classList.remove('bad');
    });
    const done = r.filter((x) => x.ok), tot = sum(done, (x) => x.pnl);
    $('#manysum').textContent = `${done.length} of ${r.length} priced · revenue ${fmt(sum(done, (x) => x.revenue))}`;
    $('#manytot').textContent = done.length ? signed(tot) : '—';
    $('#manytot').className = 'big ' + (done.length ? (tot >= 0 ? 'pos' : 'neg') : '');
  };
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.onsubmit = (e) => {
    e.preventDefault();
    const r = calc(), soldAt = new FormData(form).get('soldAt');
    r.forEach((x) => form.elements['sell_' + x.f.id].classList.toggle('bad', !x.ok));
    const bad = r.filter((x) => !x.ok);
    if (bad.length) return setErr(form, `Enter a valid sell price for ${bad.map((x) => x.f.name).join(', ')}.`);
    if (!soldAt) return setErr(form, 'Pick a sell date.');
    r.forEach((x) => Object.assign(byId(db.flips, x.f.id), { sell: x.revenue, fees: x.fees, soldAt }));
    ui.sel.clear();
    closeModal(); commit();
  };
  update();
}

function readEvent(form) {
  const fd = new FormData(form);
  return {
    name: fd.get('name').trim(), color: fd.get('color'), calendars: fd.getAll('cal'),
    date: fd.get('date'), start: fd.get('start'), end: fd.get('end'),
    repeat: fd.get('rep') ? { sbYear: !!fd.get('sby'), every: fd.get('sby') ? L.SB_YEAR_MIN : readMin(fd), unit: 'minutes', end: fd.get('ends'), count: intOf(fd.get('count')), until: fd.get('until') } : null,
    reminder: fd.get('reminder') === '' ? null : Number(fd.get('reminder')), note: fd.get('note').trim(),
  };
}
function eventModal(ev, preset = {}) {
  const isEdit = !!ev;
  const vis = db.calendars.filter((c) => c.visible);
  ev = ev || Object.assign({ name: '', color: 'violet', calendars: [(vis[0] || db.calendars[0]).id], date: dKey(new Date()), start: '21:00', end: '21:30', repeat: null, reminder: 15, note: '' }, preset);
  const r = ev.repeat || { every: 1, unit: 'weeks', end: 'never', count: 5, until: '' };
  const form = openModal(`<form novalidate>${dHead(isEdit ? 'Edit event' : 'New event', isEdit ? 'Changes apply to this event and all its repeats.' : 'Add an event to one or more calendars.')}
    <div class="dbody">
      <label class="field"><span>Event name</span><input class="in" name="name" value="${esc(ev.name)}" placeholder="e.g. Dark Auction" autofocus></label>
      <div class="field"><span class="flabel">Color</span>${swatches(ev.color)}</div>
      <div class="field"><span class="flabel">Calendars</span><div class="chips" role="group" aria-label="Calendars">${db.calendars.map((c) => `<label><input type="checkbox" name="cal" value="${c.id}" ${ev.calendars.includes(c.id) ? 'checked' : ''}><span><span class="dot" style="background:${(COLORS[c.color] || COLORS.violet).ink}"></span>${esc(c.name)}</span></label>`).join('')}</div></div>
      <div class="cols">
        <label class="field"><span>Date</span><input class="in" type="date" name="date" value="${esc(ev.date)}"></label>
        <label class="field"><span>Starts</span><input class="in" type="time" name="start" value="${esc(ev.start)}"></label>
        <label class="field"><span>Ends</span><input class="in" type="time" name="end" value="${esc(ev.end)}"></label>
      </div>
      <div class="box">
        <div class="switchrow"><div class="grow"><label for="rep" style="font-weight:500">Repeat</label><div class="small muted">Adds this event again at a fixed interval</div></div><input type="checkbox" class="switch" id="rep" name="rep" ${ev.repeat ? 'checked' : ''}></div>
        <div class="rep-opts" style="flex-direction:column;gap:14px">
          ${sbBox(r.sbYear)}${dhm(r.every, r.unit)}
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><span class="flabel">Ends</span>${radios('ends', [['never', 'Never'], ['date', 'On a date'], ['after', 'After']], r.end, 'Repeat ends')}
            <input class="in" type="date" name="until" value="${esc(r.until)}" aria-label="End date" style="width:auto">
            <input class="in" type="number" name="count" min="1" value="${r.count}" aria-label="Number of times" style="width:90px"><span class="small muted">times</span></div>
          <div><span class="flabel">Next occurrences</span><div id="nextocc" class="small muted" style="display:flex;flex-direction:column;gap:2px;margin-top:6px"></div></div>
        </div>
      </div>
      <div class="cols">
        <label class="field"><span>Reminder</span><select class="in" name="reminder">${[['', 'No reminder'], ['0', 'When it starts'], ['5', '5 minutes before'], ['15', '15 minutes before'], ['60', '1 hour before']].map(([v, l]) => `<option value="${v}" ${String(ev.reminder ?? '') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field"><span>Note <small>· optional</small></span><input class="in" name="note" value="${esc(ev.note)}"></label>
      </div>
      <span class="err" role="alert"></span>
    </div>${dFoot(isEdit ? 'Save changes' : 'Add event', isEdit && 'Delete')}</form>`);
  form.addEventListener('change', (e) => e.target.name === 'sby' && sbToggle(form, true));
  if (r.sbYear) sbToggle(form, true);
  const update = () => {
    const e = readEvent(form);
    if (!e.repeat || !e.date || !e.start || !e.end) return;
    const from = new Date(e.date + 'T' + e.start).getTime();
    const list = occurrences(e, from, from + 400 * 864e5).slice(0, 6);
    const more = e.repeat.end === 'after' && list.length >= e.repeat.count ? 'then stops' : e.repeat.end === 'date' ? (e.repeat.until ? 'until ' + dateLabel(e.repeat.until + 'T00:00') : '') : 'and so on…';
    $('#nextocc').innerHTML = list.map((o) => { const d = new Date(o.start); return `<span>${DOWS[(d.getDay() + 6) % 7]} ${shortDate(d)} · ${hm(d)}</span>`; }).join('') + `<span>${more}</span>`;
  };
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.querySelector('[data-del]')?.addEventListener('click', () => {
    if (!confirm(`Delete "${ev.name}"${ev.repeat ? ' and all its repeats' : ''}?`)) return;
    db.events = db.events.filter((x) => x.id !== ev.id); closeModal(); commit();
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    const d = readEvent(form);
    if (!d.name) return setErr(form, 'Give the event a name.');
    if (!d.calendars.length) return setErr(form, 'Pick at least one calendar.');
    if (!d.date || !d.start || !d.end) return setErr(form, 'Pick a date, a start time and an end time.');
    if (d.repeat && d.repeat.every < 1) return setErr(form, 'The repeat interval must be at least 1 minute.');
    if (d.repeat && d.repeat.end === 'date' && !d.repeat.until) return setErr(form, 'Pick the date the repeat ends.');
    if (isEdit) Object.assign(byId(db.events, ev.id), d);
    else db.events.push(Object.assign({ id: uid() }, d));
    closeModal(); commit();
  };
  update();
}

function calModal(c) {
  const isEdit = !!c;
  c = c || { name: '', color: 'teal' };
  const form = openModal(`<form novalidate>${dHead(isEdit ? 'Edit calendar' : 'New calendar', 'A calendar is a layer you can show or hide.')}
    <div class="dbody">
      <label class="field"><span>Name</span><input class="in" name="name" value="${esc(c.name)}" placeholder="e.g. Mayor events" autofocus></label>
      <div class="field"><span class="flabel">Color</span>${swatches(c.color)}</div>
      <span class="err" role="alert"></span>
    </div>${dFoot(isEdit ? 'Save changes' : 'Add calendar', isEdit && db.calendars.length > 1 && 'Delete')}</form>`);
  form.querySelector('[data-del]')?.addEventListener('click', () => {
    const only = db.events.filter((e) => e.calendars.length === 1 && e.calendars[0] === c.id).length;
    if (!confirm(`Delete the calendar "${c.name}"?` + (only ? `\n\n${only} event(s) that are only in this calendar will be deleted too.` : ''))) return;
    db.calendars = db.calendars.filter((x) => x.id !== c.id);
    db.events = db.events.filter((e) => (e.calendars = e.calendars.filter((id) => id !== c.id)).length);
    closeModal(); commit();
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form), name = fd.get('name').trim();
    if (!name) return setErr(form, 'Give the calendar a name.');
    if (isEdit) Object.assign(byId(db.calendars, c.id), { name, color: fd.get('color') });
    else db.calendars.push({ id: uid(), name, color: fd.get('color'), visible: true });
    closeModal(); commit();
  };
}

function todoModal(t) {
  const isEdit = !!t;
  const start = new Date(); start.setMinutes(0, 0, 0);
  t = t || { name: '', start: localISO(start), every: 1, unit: 'days', passive: false, shared: false };
  const form = openModal(`<form novalidate>${dHead(isEdit ? 'Edit to do' : 'New to do', 'It comes back as "to do" every time the interval passes.')}
    <div class="dbody">
      <label class="field"><span>Task</span><input class="in" name="name" value="${esc(t.name)}" placeholder="e.g. Collect minions" autofocus></label>
      <label class="field"><span>First reset</span><input class="in" type="datetime-local" name="start" value="${esc(t.start)}"><span class="small muted">Resets at this time, then again after every interval.</span></label>
      ${sbBox(t.sbYear)}${dhm(t.every, t.unit)}
      <div class="box"><div class="switchrow"><div class="grow"><label for="passive" style="font-weight:500">Passive money</label><div class="small muted">When you tick it, you enter how much you earned. It goes to Stats under Passive.</div></div><input type="checkbox" class="switch" id="passive" name="passive" ${t.passive ? 'checked' : ''}></div></div>
      <div class="box"><div class="switchrow"><div class="grow"><label for="shared" style="font-weight:500">Shared between profiles</label><div class="small muted">On: one tick for all profiles, and the money goes to the profile that claims it. Off: every profile ticks it on its own.</div></div><input type="checkbox" class="switch" id="shared" name="shared" ${t.shared ? 'checked' : ''}></div></div>
      <span class="err" role="alert"></span>
    </div>${dFoot(isEdit ? 'Save changes' : 'Add to do', isEdit && 'Delete')}</form>`);
  form.addEventListener('change', (e) => e.target.name === 'sby' && sbToggle(form, false));
  if (t.sbYear) sbToggle(form, false);
  form.querySelector('[data-del]')?.addEventListener('click', () => {
    if (!confirm(`Delete "${t.name}"? Money it already earned stays in Stats.`)) return;
    db.todos = db.todos.filter((x) => x.id !== t.id); closeModal(); commit();
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form), name = fd.get('name').trim();
    if (!name) return setErr(form, 'Give the task a name.');
    if (!fd.get('start')) return setErr(form, 'Pick when it first resets.');
    const sby = !!fd.get('sby');
    if (!sby && readMin(fd) < 1) return setErr(form, 'The interval must be at least 1 minute.');
    const d = { name, sbYear: sby, start: sby ? localISO(new Date(L.SB_YEAR_ANCHOR)) : fd.get('start'), every: sby ? L.SB_YEAR_MIN : readMin(fd), unit: 'minutes', passive: !!fd.get('passive'), shared: !!fd.get('shared') };
    if (isEdit) {
      const cur = byId(db.todos, t.id);
      if (cur.shared !== d.shared) cur.done = {}; // ticks are keyed differently once sharing changes
      Object.assign(cur, d);
    } else db.todos.push(Object.assign({ id: uid(), done: {} }, d));
    closeModal(); commit();
  };
}

function markDone(t, entry) {
  t.done = t.done || {};
  t.done[tickKey(t)] = { doneAt: entry ? entry.at : new Date().toISOString(), entryId: entry ? entry.id : null, by: db.activeProfile };
}

function catModal(c) {
  const isEdit = !!c;
  c = c || { name: '', color: 'violet', icon: 'other' };
  const used = isEdit ? db.flips.filter((f) => f.cat === c.id).length : 0;
  const form = openModal(`<form novalidate>${dHead(isEdit ? 'Edit category' : 'New category', 'Categories are shared by every profile.')}
    <div class="dbody">
      <label class="field"><span>Name</span><input class="in" name="name" value="${esc(c.name)}" placeholder="e.g. Mayor" autofocus></label>
      <div class="field"><span class="flabel">Color</span>${swatches(c.color)}</div>
      <div class="field"><span class="flabel">Icon</span><div class="chips icons" role="radiogroup" aria-label="Icon">${CAT_ICONS.map((k) => `<label title="${k}"><input type="radio" name="icon" value="${k}" ${k === c.icon ? 'checked' : ''} aria-label="${k}"><span>${ic(P[k], 20)}</span></label>`).join('')}</div></div>
      <span class="err" role="alert"></span>
    </div>${dFoot(isEdit ? 'Save changes' : 'Add category', isEdit && 'Delete')}</form>`);
  form.querySelector('[data-del]')?.addEventListener('click', () => {
    if (used) return setErr(form, `${used} flip(s) still use this category (in all profiles). Move or delete them first.`);
    if (!confirm(`Delete the category "${c.name}"?`)) return;
    db.categories = db.categories.filter((x) => x.id !== c.id); closeModal(); commit();
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form), name = fd.get('name').trim();
    if (!name) return setErr(form, 'Give the category a name.');
    const d = { name, color: fd.get('color'), icon: fd.get('icon') };
    if (isEdit) Object.assign(byId(db.categories, c.id), d);
    else db.categories.push(Object.assign({ id: uid() }, d));
    closeModal(); commit();
  };
}

function profileModal(p, canDelete = true) { // deleting is only offered from Settings
  const isEdit = !!p;
  const form = openModal(`<form novalidate>${dHead(isEdit ? 'Edit profile' : 'New profile', 'A profile has its own flips, passive income and stats.')}
    <div class="dbody">
      <label class="field"><span>Name</span><input class="in" name="name" value="${esc(p?.name)}" placeholder="e.g. Ironman" autofocus></label>
      <span class="err" role="alert"></span>
    </div>${dFoot(isEdit ? 'Save changes' : 'Add profile', isEdit && canDelete && db.profiles.length > 1 && 'Delete')}</form>`);
  form.querySelector('[data-del]')?.addEventListener('click', () => {
    const n = db.flips.filter((f) => f.profileId === p.id).length;
    if (!confirm(`Delete the profile "${p.name}"?\n\nIts ${n} flip(s) and its passive income will be deleted too. This cannot be undone.`)) return;
    db.profiles = db.profiles.filter((x) => x.id !== p.id);
    db.flips = db.flips.filter((f) => f.profileId !== p.id);
    db.passive = db.passive.filter((x) => x.profileId !== p.id);
    db.timers = db.timers.filter((x) => x.profileId !== p.id);
    db.todos.forEach((t) => t.done && delete t.done[p.id]);
    if (db.activeProfile === p.id) db.activeProfile = db.profiles[0].id;
    closeModal(); commit();
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    const name = new FormData(form).get('name').trim();
    if (!name) return setErr(form, 'Give the profile a name.');
    if (isEdit) byId(db.profiles, p.id).name = name;
    else { const id = uid(); db.profiles.push({ id, name }); db.activeProfile = id; ui.sel.clear(); }
    closeModal(); commit();
  };
}

function amountModal(t) {
  const form = openModal(`<form novalidate>${dHead('How much did you earn?', esc(t.name))}
    <div class="dbody">
      <div class="field"><label class="flabel" for="amt">Amount</label><input class="in" id="amt" name="amount" placeholder="e.g. 12m" autofocus><span class="small muted">Shortcuts work: 300m, 1.2b, 450k</span></div>
      <span class="err" role="alert"></span>
    </div>${dFoot('Mark as done')}</form>`);
  form.onsubmit = (e) => {
    e.preventDefault();
    const amount = parse(new FormData(form).get('amount'));
    if (amount == null) return setErr(form, 'Enter an amount, like 12m (0 is fine).');
    const entry = { id: uid(), profileId: db.activeProfile, todoId: t.id, name: t.name, amount, at: new Date().toISOString() };
    db.passive.push(entry);
    markDone(t, entry);
    closeModal(); commit();
  };
}

/* ---------- actions ---------- */
const flipOf = (b) => byId(db.flips, b.dataset.id);
const A = {
  nav: (b) => { ui.view = b.dataset.view; if (b.dataset.cat) ui.cat = b.dataset.cat; ui.q = ''; $('#q').value = ''; ui.sel.clear(); render(); },
  tab: (b) => { ui.tab = b.dataset.v; render(); },
  sortBy: (b) => { const k = b.dataset.v; ui.sort = ui.sort.key === k ? { key: k, dir: -ui.sort.dir } : { key: k, dir: SORTS[k].first }; render(); },
  sel: (b) => { ui.sel.has(b.dataset.id) ? ui.sel.delete(b.dataset.id) : ui.sel.add(b.dataset.id); render(); },
  clearSel: () => { ui.sel.clear(); render(); },
  delSel: () => {
    if (!confirm(`Delete ${ui.sel.size} flip(s)? This cannot be undone.`)) return;
    db.flips = db.flips.filter((f) => !ui.sel.has(f.id)); ui.sel.clear(); commit();
  },
  newFlip: () => flipModal(),
  editFlip: (b) => flipModal(flipOf(b)),
  sell: (b) => sellModal(flipOf(b)),
  sellMany: () => sellManyModal([...ui.sel].map((id) => derive(byId(db.flips, id))).filter((f) => !f.sold)),
  shot: (b) => openModal(`<h2 id="dlg-t" class="sr">Screenshot of ${esc(flipOf(b).name)}</h2><img src="${esc(flipOf(b).shot)}" alt="" data-act="close">`, 'img'),
  calMove: (b) => { const n = +b.dataset.d, a = new Date(ui.anchor); ui.calMode === 'week' ? a.setDate(a.getDate() + 7 * n) : a.setMonth(a.getMonth() + n, 1); ui.anchor = a; render(); },
  calToday: () => { ui.anchor = new Date(); render(); },
  calMode: (b) => { ui.calMode = b.dataset.v; render(); },
  miniDay: (b) => { ui.anchor = new Date(b.dataset.day + 'T00:00'); render(); },
  mcell: (b) => { ui.anchor = new Date(b.dataset.day + 'T00:00'); ui.calMode = 'week'; render(); },
  slot: (b, e) => {
    if (e.target !== b) return;
    const mins = Math.min(23 * 60 + 30, Math.floor(((e.clientY - b.getBoundingClientRect().top) / ROW) * 2) * 30);
    const end = Math.min(mins + 60, 23 * 60 + 59);
    eventModal(null, { date: b.dataset.day, start: pad(Math.floor(mins / 60)) + ':' + pad(mins % 60), end: pad(Math.floor(end / 60)) + ':' + pad(end % 60) });
  },
  newEvent: () => eventModal(null, { date: dKey(ui.calMode === 'week' && monday(ui.anchor) > new Date() ? monday(ui.anchor) : new Date()) }),
  editEvent: (b) => eventModal(byId(db.events, b.dataset.id)),
  newCal: () => calModal(),
  editCal: (b) => calModal(byId(db.calendars, b.dataset.id)),
  newTodo: () => todoModal(),
  editTodo: (b) => todoModal(byId(db.todos, b.dataset.id)),
  tick: (b) => {
    const t = byId(db.todos, b.dataset.id);
    if (todoNow(t).done) {
      // undo: also drop the money recorded for this tick
      const rec = tickRec(t);
      if (rec.entryId) db.passive = db.passive.filter((p) => p.id !== rec.entryId);
      delete t.done[tickKey(t)];
      return commit();
    }
    if (t.passive) return amountModal(t);
    markDone(t, null);
    commit();
  },
  kofi: () => (T ? T.core.invoke('open_kofi').catch((e) => alert('Could not open the browser: ' + e)) : window.open('https://ko-fi.com/alphagenesis_', '_blank', 'noopener')),
  newForge: () => forgeModal(),
  newCustom: () => customModal(),
  editPreset: (b) => customModal(byId(db.presets, b.dataset.id)),
  startPreset: (b) => { startCustom(byId(db.presets, b.dataset.id)); commit(); },
  removeTimer: (b) => {
    const t = byId(db.timers, b.dataset.id);
    if (+new Date(t.end) > Date.now() && !confirm(`Cancel the timer for ${t.item}?`)) return;
    db.timers = db.timers.filter((x) => x.id !== t.id); commit();
  },
  newCat: () => catModal(),
  editCat: (b) => catModal(byId(db.categories, b.dataset.id)),
  newProfile: () => { ui.pOpen = false; render(); profileModal(); },
  pmenu: () => { ui.pOpen = !ui.pOpen; render(); },
  pickProfile: (b) => { ui.pOpen = false; db.activeProfile = b.dataset.id; ui.sel.clear(); commit(); },
  renameProfile: (b) => { ui.pOpen = false; render(); profileModal(byId(db.profiles, b.dataset.id), false); },
  toggleAll: () => { ui.catsOpen = !ui.catsOpen; render(); },
  editProfile: (b) => profileModal(byId(db.profiles, b.dataset.id)),
  openData: () => T.core.invoke('open_data_dir').catch((e) => alert('Could not open the folder: ' + e)),
  reloadData: async () => { await saving; await load(); render(); },
  period: (b) => { db.prefs.period = b.dataset.v; commit(); },
  prefSet: (b) => { db.prefs[b.dataset.k] = b.dataset.v; commit(); },
  chartSet: (b) => { db.prefs.chart[b.dataset.k] = b.dataset.v; commit(); },
  togglePassive: () => { ui.passiveOpen = !ui.passiveOpen; render(); },
  close: () => closeModal(),
};

document.addEventListener('click', (e) => {
  const step = e.target.closest('[data-step]');
  if (step) {
    const inp = step.parentElement.querySelector('input');
    inp.value = Math.min(+inp.max || 999, Math.max(+inp.min || 0, (parseInt(inp.value, 10) || 0) + +step.dataset.step));
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  // image viewer: click beside the image closes it (forms don't, to avoid losing input)
  if (e.target.id === 'modal' && $('#modal .dialog.img')) return closeModal();
  const b = e.target.closest('[data-act]');
  if (ui.pOpen && !e.target.closest('.pmenu')) { ui.pOpen = false; $('#side').innerHTML = sideHtml(); }
  if (b && A[b.dataset.act]) A[b.dataset.act](b, e);
});
document.addEventListener('change', (e) => {
  const id = e.target.dataset?.calvis;
  if (id) { byId(db.calendars, id).visible = e.target.checked; commit(); }
  const ck = e.target.dataset?.chartcat;
  if (ck) { const h = new Set(db.prefs.chart.hidden); e.target.checked ? h.delete(ck) : h.add(ck); db.prefs.chart.hidden = [...h]; commit(); }
  const pf = e.target.dataset?.pref;
  if (pf && e.target.value) { db.prefs[pf] = e.target.value; commit(); }
});
document.addEventListener('keydown', (e) => {
  const m = $('#modal');
  if (!m.hidden) {
    if (e.key === 'Escape') return closeModal();
    if (e.key === 'Tab') { // keep focus inside the dialog
      const f = [...m.querySelectorAll('button,input,select,textarea,[tabindex]')].filter((x) => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
    return;
  }
  if (e.key === 'Escape' && ui.pOpen) { ui.pOpen = false; render(); $('[data-act=pmenu]').focus(); }
  if (e.ctrlKey && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#q').focus(); }
});
$('#q').addEventListener('input', (e) => { ui.q = e.target.value; render(); });
$('.winbtns').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-win]');
  if (!b || !T) return;
  const w = T.window.getCurrentWindow();
  if (b.dataset.win === 'min') w.minimize();
  else if (b.dataset.win === 'max') w.toggleMaximize();
  else { await saving; w.close(); }
});

/* ---------- reorder categories (drag, or Alt + Up/Down) ---------- */
let dragId = null;
function slide(sub, mutate) { // animate rows from their old position to the new one
  const rows = [...sub.querySelectorAll('.navrow')];
  const before = new Map(rows.map((r) => [r, r.getBoundingClientRect().top]));
  mutate();
  rows.forEach((r) => {
    const d = before.get(r) - r.getBoundingClientRect().top;
    if (!d) return;
    r.style.transition = 'none';
    r.style.transform = `translateY(${d}px)`;
    requestAnimationFrame(() => { r.style.transition = 'transform .15s ease'; r.style.transform = ''; });
  });
}
function saveCatOrder(ids) {
  db.categories.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  commit();
}
document.addEventListener('dragstart', (e) => {
  const row = e.target.closest?.('.sub .navrow');
  if (!row) return;
  dragId = row.dataset.catId;
  row.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragId);
});
document.addEventListener('dragover', (e) => {
  if (!dragId) return;
  const sub = e.target.closest?.('.sub'), over = e.target.closest?.('.navrow');
  if (!sub) return;
  e.preventDefault();
  const drag = sub.querySelector('.dragging');
  if (!drag || !over || over === drag) return;
  const r = over.getBoundingClientRect();
  const ref = e.clientY > r.top + r.height / 2 ? over.nextSibling : over;
  if (ref === drag || ref === drag.nextSibling) return; // already there
  slide(sub, () => sub.insertBefore(drag, ref));
});
document.addEventListener('drop', (e) => { if (dragId) e.preventDefault(); });
document.addEventListener('dragend', () => {
  if (!dragId) return;
  dragId = null;
  saveCatOrder([...document.querySelectorAll('.sub .navrow')].map((r) => r.dataset.catId));
});
document.addEventListener('keydown', (e) => {
  const row = e.target.closest?.('.sub .navrow');
  if (!row || !e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  e.preventDefault();
  const ids = db.categories.map((c) => c.id), i = ids.indexOf(row.dataset.catId), j = i + (e.key === 'ArrowUp' ? -1 : 1);
  if (j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  saveCatOrder(ids);
  $(`.sub .navrow[data-cat-id="${ids[j]}"] .nav`).focus();
});

/* ---------- reminders ---------- */
// shortcut: reminders only fire while the app is open; a background service would be needed to notify when it is closed
let lastCheck = Date.now();
async function notify(title, body) {
  try {
    if (T?.notification) {
      const n = T.notification;
      if (!(await n.isPermissionGranted()) && (await n.requestPermission()) !== 'granted') return;
      n.sendNotification({ title, body });
    } else if ('Notification' in window && (Notification.permission === 'granted' || (await Notification.requestPermission()) === 'granted')) {
      new Notification(title, { body });
    }
  } catch (e) { console.error(e); }
}
function checkReminders() {
  const now = Date.now();
  for (const ev of db.events) {
    if (ev.reminder == null) continue;
    const rem = ev.reminder * 6e4;
    for (const o of occurrences(ev, lastCheck + rem, now + rem + 1)) {
      const t = o.start - rem;
      if (t > lastCheck && t <= now) notify(ev.name, ev.reminder ? `Starts in ${ev.reminder} min (${hm(new Date(o.start))})` : 'Starting now');
    }
  }
  lastCheck = now;
}

/* ---------- start ---------- */
load().then(async () => {
  dataPath = T ? await T.core.invoke('data_file').catch((e) => 'Unknown (' + e + ')') : 'Browser storage (no file when the app runs in a browser)';
  render();
  checkTimers(); // timers that finished while the app was closed
  setInterval(() => { checkReminders(); checkTimers(); if (!dragId) render(); }, 20e3); // don't redraw mid-drag
});
