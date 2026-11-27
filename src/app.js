'use strict';
const { fmt, signed, parse, todoState, occurrences } = L;
const T = window.__TAURI__; // undefined when opened in a plain browser
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
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
  grip: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.1" fill="currentColor"/><circle cx="15" cy="15" r="1.1" fill="currentColor"/><circle cx="12" cy="12" r="1.1" fill="currentColor"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
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
  filter: '<path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/>',
  zoomIn: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M8.5 11h5M11 8.5v5"/>',
  zoomOut: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M8.5 11h5"/>',
  peek: '<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L20 20"/><circle cx="10" cy="8.8" r="1.8"/><path d="M7.2 13a3.2 3.2 0 0 1 5.6 0"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
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
const DICE_LOOK = { label: 'Dice', ink: '#f87171', tint: 'rgba(248,113,113,.15)' };
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
  return { profiles: [{ id: p, name: 'Main' }], activeProfile: p, prefs: { period: 'all', from: '', to: '', catView: 'list', catMetric: 'invested', chart: { style: 'bars', group: 'day', sign: 'all', hidden: [] }, hyp: { visible: true, types: {}, limit: 5, rem: {} }, coll: { name: '', key: '', file: '' } }, coll: { pieces: {}, at: null, msg: '' }, categories: [], flips: [], timers: [], presets: [], calendars: [], events: [], todos: [], passive: [], dice: [] };
};
// Time zones. Events and to dos keep the zone they were made in, so they stay at the same real moment.
// The calendar and to do show everything in the chosen zone (Auto = the PC's). The rest of the UI reads times with the PC's
// local clock, so "view" times are shifted instants whose local fields read as the chosen zone's wall time.
const SYS_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const dispTz = () => db.prefs.tz || SYS_TZ;
const toView = (ms) => L.shiftTz(ms, SYS_TZ, dispTz());
const fromView = (ms) => L.shiftTz(ms, dispTz(), SYS_TZ);
const vNow = () => new Date(toView(Date.now()));
// a wall date + time saved in zone tz, as the same moment's date + time in the chosen zone
const wallToView = (date, time, tz) => { const v = new Date(toView(L.zonedMs(date, time, tz || SYS_TZ))); return { date: dKey(v), time: hm(v) }; };
const todoStartMs = (t) => L.zonedMs(t.start.slice(0, 10), t.start.slice(11, 16), t.tz || SYS_TZ);
const tzLabel = (tz) => { const o = L.tzOffset(tz, Date.now()), a = Math.abs(o); return `${tz.replace(/_/g, ' ')} (UTC${o < 0 ? '−' : '+'}${Math.floor(a / 60)}${a % 60 ? ':' + String(a % 60).padStart(2, '0') : ''})`; };
let tzList = null; // built once: ~400 zones
const tzSelect = (style = '') => {
  tzList = tzList || (Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [SYS_TZ]).map((z) => [z, tzLabel(z)]);
  const cur = db.prefs.tz || '';
  return `<select class="in" data-tz aria-label="Time zone" style="${style}"><option value="" ${cur ? '' : 'selected'}>Auto · ${esc(tzLabel(SYS_TZ))}</option>${tzList.map(([z, l]) => `<option value="${z}" ${z === cur ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
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
  d.events.forEach((e) => (e.tz = e.tz || SYS_TZ)); // made before time zones existed: they were in the PC's zone
  d.todos.forEach((t) => (t.tz = t.tz || SYS_TZ));
  if (!byId(d.profiles, d.activeProfile)) d.activeProfile = d.profiles[0].id;
  d.prefs = Object.assign(EMPTY().prefs, d.prefs);
  d.prefs.chart = Object.assign(EMPTY().prefs.chart, d.prefs.chart);
  d.prefs.hyp = Object.assign({ visible: true, types: {}, limit: 5, rem: {} }, d.prefs.hyp); // Hypixel layer: which events, reminders
  d.prefs.coll = Object.assign({ name: '', key: '', file: '' }, d.prefs.coll);
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
const ui = { collTab: 'pieces', setRef: null, setCat: null, collPick: new Set(), collSel: { slot: new Set(), kind: new Set(), pat: false, gone: false }, collOpen: false, sort: { key: 'date', dir: -1 }, pOpen: false, catsOpen: true, view: 'inv', cat: 'all', tab: 'all', q: '', sel: new Set(), anchor: new Date(), calMode: 'week', passiveOpen: false };
const ROW = 48; // px per hour in the week grid

const derive = (f) => {
  const cost = f.unit === 'lot' ? f.price : f.price * f.qty;
  const sold = f.sell != null;
  return Object.assign({}, f, { cost, sold, pnl: sold ? f.sell - (f.fees || 0) - cost : 0 });
};
const myFlips = () => db.flips.filter((f) => f.profileId === db.activeProfile).map(derive);
const myPassive = () => db.passive.filter((p) => p.profileId === db.activeProfile);
const myDice = () => db.dice.filter((d) => d.profileId === db.activeProfile).map((d) => ({ ...d, ...L.diceResult(d) }));
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
const todoNow = (t, now = Date.now()) => todoState({ start: todoStartMs(t), every: t.every, unit: t.unit, sbYear: t.sbYear, doneAt: tickRec(t)?.doneAt }, now);
const visibleCals = () => new Set(db.calendars.filter((c) => c.visible).map((c) => c.id));
// Mayor, minister and election from the public Hypixel API (no key needed). Refreshed at most every 10 minutes.
const hyp = { data: null, err: '', at: 0, busy: false };
async function fetchElection(force) {
  if (hyp.busy || (!force && Date.now() - hyp.at < 10 * 6e4)) return;
  hyp.busy = true;
  try {
    const r = await fetch('https://api.hypixel.net/v2/resources/skyblock/election');
    const j = await r.json();
    if (!j || !j.success || !j.mayor || !Number.isInteger(j.mayor.election?.year)) throw new Error(j?.cause || 'unexpected answer (HTTP ' + r.status + ')');
    hyp.data = j; hyp.err = '';
  } catch (e) { hyp.err = String(e.message || e); }
  hyp.at = Date.now(); hyp.busy = false;
  if (!dragId) render();
}
const hypTerm = () => { const m = hyp.data?.mayor; return m ? { mayor: String(m.name), ...L.mayorTerm(m.election.year) } : null; };
const mcText = (s) => String(s ?? '').replace(/§./g, ''); // drop Minecraft color codes
const HYP_LONG = 6 * 36e5; // longer than this: not drawn in the week grid (would cover whole days), listed under "Active now"
const hypOccs = (from, to, ql = '') => { // real instants
  const H = db.prefs.hyp, out = [];
  if (!H.visible) return out;
  for (const he of L.HYP_EVENTS) {
    if (!H.types[he.key] || (ql && !he.name.toLowerCase().includes(ql))) continue;
    let list;
    if (he.hourly || he.cult) { const now = Date.now(); list = L.hypOccurrences(he, now, now + (H.limit + 1) * 3 * 36e5, null).slice(0, H.limit).filter((o) => o.start < to && o.end > from); } // frequent: only the next few
    else list = L.hypOccurrences(he, from, to, hypTerm());
    const ev = { id: 'hyp:' + he.key, name: he.name, color: he.color, repeat: true, hyp: true };
    for (const o of list) out.push({ ev, start: o.start, end: o.end });
  }
  return out;
};

const visibleOccs = (from, to, q = '') => {
  const vis = visibleCals();
  const ql = q.trim().toLowerCase();
  const out = [];
  for (const ev of db.events) {
    if (ev.calendars.length && !ev.calendars.some((id) => vis.has(id))) continue; // in no calendar = always shown
    if (ql && !(ev.name + ' ' + (ev.note || '')).toLowerCase().includes(ql)) continue;
    const rf = fromView(from), rt = fromView(to), r = ev.repeat;
    let list;
    if (r) { // only the next N occurrences of a repeating event (5 by default), from now on
      const step = (r.sbYear ? L.SB_YEAR_MIN : toMin(r.every, r.unit)) * 6e4, now = Date.now(), n = r.show || 5;
      list = occurrences(ev, now, now + (n + 1) * step + 2 * 864e5).slice(0, n).filter((o) => o.start < rt && o.end > rf);
    } else list = occurrences(ev, rf, rt);
    for (const o of list) out.push({ ev, start: toView(o.start), end: toView(o.end) });
  }
  for (const o of hypOccs(fromView(from), fromView(to), ql)) out.push({ ev: o.ev, start: toView(o.start), end: toView(o.end) });
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
  const today = dayStart(vNow());
  const nToday = visibleOccs(today.getTime(), addDays(today, 1).getTime()).length;
  const nDue = db.todos.filter((t) => !todoNow(t).done).length;
  const net = sum(flips.filter((f) => f.sold), (f) => f.pnl);
  return `
  <div class="brand"><img class="logo" src="logo.png" alt=""><div class="grow"><b>Skyblock</b><i>Tracker</i></div>
    <button type="button" class="kofibtn" data-act="kofi" title="Support me on Ko-fi" aria-label="Support me on Ko-fi (opens your browser)"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24"><path d="M3 6.5h14.5a3.5 3.5 0 0 1 0 7H16.6A6.5 6.5 0 0 1 10.5 18h-1A6.5 6.5 0 0 1 3 11.5z" fill="#fff"/><path d="M16.8 8.6h.7a1.4 1.4 0 0 1 0 2.8h-.7z" fill="#29abe0"/><path d="M9.9 14.6s-3.4-2.1-3.4-4.2a1.7 1.7 0 0 1 3.4-.6 1.7 1.7 0 0 1 3.4.6c0 2.1-3.4 4.2-3.4 4.2z" fill="#ff5e5b"/></svg></button></div>
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
    ${navBtn(ui.view === 'dice', P.dice, 'Dice', `<span class="count">${myDice().filter((d) => !d.end).length}</span>`, 'data-act="nav" data-view="dice"')}
    ${navBtn(ui.view === 'coll', P.skins, 'Collection', `<span class="count">${Object.values(db.coll.pieces).filter((x) => !x.gone).length}</span>`, 'data-act="nav" data-view="coll"')}
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
  ${upd.avail && !upd.busy ? `<button type="button" class="nav updbtn" data-act="installUpdate">${ic(P.download, 18, 2)}<span class="grow">Update to v${esc(upd.avail.version)}</span></button>` : ''}
  ${navBtn(ui.view === 'settings', P.settings, 'Settings', '', 'data-act="nav" data-view="settings"')}`;
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
      <div><div style="display:flex;align-items:center;gap:6px">${coin(15)}<span class="num" style="font-weight:600;font-size:15px">${fmt(f.cost)}</span></div><span class="small muted">total</span></div>
      <div><div style="display:flex;align-items:center;gap:6px">${coin(13)}<span class="num" style="font-weight:600;font-size:14px">${fmt(f.cost / f.qty)}</span></div><span class="small muted">each</span></div>
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
    <div class="row head"><span></span><span>${th('name', 'Item')}</span><span>${th('price', 'Total')}</span><span>${th('each', 'Each')}</span><span>${th('qty', 'Qty')}</span><span>Note</span><span>Screenshot</span><span>Status</span><span></span></div>
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
  price: { get: (f) => f.cost, label: 'total price', asc: 'lowest first', desc: 'highest first', first: -1 },
  each: { get: (f) => f.cost / f.qty, label: 'price each', asc: 'lowest first', desc: 'highest first', first: -1 },
  qty: { get: (f) => f.qty, label: 'quantity', asc: 'lowest first', desc: 'highest first', first: -1 },
};

/* ---------- calendar ---------- */
function layoutDay(items) {
  // side-by-side columns for overlapping events
  items.sort((a, b) => a.s - b.s || b.e - a.e);
  let cols = [], group = [], groupEnd = -Infinity;
  // Cascade (each one slightly indented over the previous) keeps every title readable when starts are spread out;
  // events starting within 25 min of each other would hide a title, so that group goes side by side instead.
  const flush = () => {
    const n = cols.length, cascade = group.every((x, i) => !i || x.s - group[i - 1].s >= 25 * 6e4);
    group.forEach((i) => { i.n = n; i.cascade = cascade; });
    group = []; cols = [];
  };
  for (const it of items) {
    if (group.length && it.s >= groupEnd) { flush(); groupEnd = -Infinity; }
    let c = cols.findIndex((end) => end <= it.s);
    if (c < 0) { c = cols.length; cols.push(0); }
    cols[c] = it.e; it.col = c; group.push(it); groupEnd = Math.max(groupEnd, it.e);
  }
  flush();
  return items;
}

// Left column of the calendar: panels the user can fold and reorder (order and folds are saved).
const CAL_PANELS = ['mini', 'cals', 'hyp', 'next', 'mayor'];
const calOrder = () => { const o = (db.prefs.calOrder || []).filter((k) => CAL_PANELS.includes(k)); return o.concat(CAL_PANELS.filter((k) => !o.includes(k))); };
function calPanel(key, title, tools, body) {
  const fold = !!db.prefs.calFold?.[key];
  return `<section class="panel cpanel ${fold ? 'folded' : ''}" data-panel="${key}">
    <div class="cphead"><span class="grip" draggable="true" title="Drag to move">${ic(P.grip, 16)}</span>
      <button type="button" class="cptitle" data-act="calFold" data-k="${key}" aria-expanded="${!fold}" title="Click to ${fold ? 'open' : 'fold'} · Alt + ↑/↓ to move"><h2>${title}</h2>${ic(fold ? P.chevDown : P.chevUp, 15, 2)}</button>${tools}</div>
    ${fold ? '' : body}</section>`;
}

function hypPanel() {
  const H = db.prefs.hyp, term = hypTerm(), now = Date.now();
  const groups = [...new Set(L.HYP_EVENTS.map((e) => e.group))];
  const item = (e) => {
    const off = e.mayor && term && term.mayor !== e.mayor;
    const note = e.mayor ? (term ? (off ? `only when ${e.mayor} is mayor` : `${e.mayor} is mayor now`) : `needs ${e.mayor} as mayor`) : '';
    return `<label class="hypitem"><input type="checkbox" data-hyp="${e.key}" ${H.types[e.key] ? 'checked' : ''}><span class="dot" style="background:${(COLORS[e.color] || COLORS.violet).ink}"></span><span class="grow" style="min-width:0;display:flex;flex-direction:column"><span class="ell">${esc(e.name)}</span>${note ? `<small class="muted">${note}</small>` : ''}</span></label>`;
  };
  const active = hypOccs(now, now + 1).filter((o) => o.end - o.start > HYP_LONG)
    .map((o) => `<button type="button" class="upnext" data-act="editEvent" data-id="${o.ev.id}"><span class="dot" style="background:${(COLORS[o.ev.color] || COLORS.violet).ink}"></span><span class="grow ell">${esc(o.ev.name)}</span><span class="small muted">ends in ${dur(o.end - now)}</span></button>`).join('');
  return calPanel('hyp', 'Hypixel', `<input type="checkbox" class="switch" data-hypvis ${H.visible ? 'checked' : ''} aria-label="Show Hypixel events">`, `
    <span class="small muted">SkyBlock events, worked out from the SkyBlock calendar. Mayor events follow the live mayor.</span>
    ${groups.map((g) => `<div class="hypgroup"><span class="flabel">${g}</span>${L.HYP_EVENTS.filter((e) => e.group === g).map(item).join('')}
      ${g === 'Frequent' ? `<div style="display:flex;align-items:center;gap:8px;margin-top:4px">${stepper('hyplimit', H.limit, 'Hourly events shown', 1, 99)}<span class="small muted">next ones of each shown</span></div>` : ''}</div>`).join('')}
    ${active ? `<span class="flabel">Active now</span>${active}` : ''}`);
}

function mayorPanel() {
  fetchElection();
  const d = hyp.data, now = Date.now();
  const head = `<button type="button" class="iconbtn" data-act="hypRefresh" aria-label="Refresh from Hypixel" ${hyp.busy ? 'disabled' : ''}>${ic(P.repeat, 15)}</button>`;
  if (!d) return calPanel('mayor', 'Mayor', head, `<span class="small muted">${hyp.err ? 'Could not reach the Hypixel API: ' + esc(hyp.err) : 'Loading from Hypixel…'}</span>`);
  const m = d.mayor, term = L.mayorTerm(m.election.year);
  const perks = (ps) => (Array.isArray(ps) ? ps : []).map((x) => `<div class="perk"><b>${esc(mcText(x.name))}</b><span class="small muted">${esc(mcText(x.description))}</span></div>`).join('');
  let el = '';
  const c = d.current;
  if (c && Array.isArray(c.candidates)) {
    const total = sum(c.candidates, (x) => +x.votes || 0) || 1;
    el = `<span class="flabel">Election ${esc(c.year)} · ends in ${dur(L.mayorTerm(c.year - 1).end - now)}</span>
      ${c.candidates.slice().sort((a, b) => (b.votes || 0) - (a.votes || 0)).map((x) => { const pc = ((+x.votes || 0) / total) * 100; return `<div class="vote"><div style="display:flex;gap:8px"><span class="grow" style="font-weight:600">${esc(mcText(x.name))}</span><span class="small muted">${pc.toFixed(1)}%</span></div><div class="track"><div style="width:${pc}%;background:var(--accent)"></div></div></div>`; }).join('')}`;
  }
  return calPanel('mayor', 'Mayor', head, `
    <div><div style="font-weight:700;font-size:16px">${esc(mcText(m.name))}</div><span class="small muted">In office until Late Spring 27 · ${dur(term.end - now)} left</span></div>
    ${perks(m.perks)}
    ${m.minister ? `<span class="flabel">Minister · ${esc(mcText(m.minister.name))}</span>${perks([m.minister.perk])}` : ''}
    ${el}
    <span class="small muted">From the Hypixel API · ${hm(new Date(toView(hyp.at)))}</span>`);
}

// A Hypixel event: what it is, when it comes next, and an optional reminder.
function hypModal(key) {
  const he = L.HYP_EVENTS.find((e) => e.key === key), H = db.prefs.hyp, now = Date.now();
  const next = (he.hourly ? L.hypOccurrences(he, now, now + 6 * 36e5, null) : L.hypOccurrences(he, now - 124 * 36e5, now + 400 * 36e5, hypTerm()).filter((o) => o.end > now)).slice(0, 4);
  const when = (o) => { const a = new Date(toView(o.start)), b = new Date(toView(o.end)); return `${o.start <= now ? 'Now' : DOWS[(a.getDay() + 6) % 7] + ' ' + shortDate(a) + ' · ' + hm(a)} → ${dKey(a) === dKey(b) ? hm(b) : shortDate(b) + ' ' + hm(b)}`; };
  const rem = H.rem[key];
  const form = openModal(`<form novalidate>${dHead(esc(he.name), esc(he.desc))}
    <div class="dbody">
      <div><span class="flabel">Next</span><div class="small" style="display:flex;flex-direction:column;gap:3px;margin-top:6px">${next.map((o) => `<span>${when(o)}</span>`).join('') || `<span class="muted">${he.mayor ? `Only when ${he.mayor} is mayor.` : 'Nothing coming up.'}</span>`}</div></div>
      <label class="field"><span>Reminder</span><select class="in" name="reminder">${[['', 'No reminder'], ['0', 'When it starts'], ['5', '5 minutes before'], ['15', '15 minutes before'], ['60', '1 hour before']].map(([v, l]) => `<option value="${v}" ${String(rem ?? '') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <span class="small muted">Times in ${esc(dispTz().replace(/_/g, ' '))}. Hypixel events can't be edited; untick them in the Hypixel list to hide them.</span>
    </div>${dFoot('Save')}</form>`);
  form.onsubmit = (e) => {
    e.preventDefault();
    const v = new FormData(form).get('reminder');
    if (v === '') delete H.rem[key]; else H.rem[key] = Number(v);
    closeModal(); commit();
  };
}

function viewCal() {
  const now = vNow(), todayK = dKey(now);
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
      const items = layoutDay(occs.filter((o) => o.start < to && o.end > from && !(o.ev.hyp && o.end - o.start > HYP_LONG)).map((o) => ({ o, s: Math.max(o.start, from), e: Math.min(o.end, to) })));
      const evs = items.map((it) => {
        const c = COLORS[it.o.ev.color] || COLORS.violet;
        const top = ((it.s - from) / 36e5) * ROW + 1, h = Math.max(20, ((it.e - it.s) / 36e5) * ROW - 3);
        const when = `${hm(new Date(it.o.start))}–${hm(new Date(it.o.end))}`;
        return `<button type="button" class="ev" data-act="editEvent" data-id="${it.o.ev.id}" title="${esc(it.o.ev.name)} · ${when}" style="top:${top}px;height:${h}px;${it.cascade ? `left:${2 + it.col * 14}px;width:calc(100% - ${4 + it.col * 14}px);z-index:${1 + it.col}` : `left:calc(${(it.col / it.n) * 100}% + 2px);width:calc(${100 / it.n}% - 4px)`};background:linear-gradient(${c.bg}, ${c.bg}), var(--card);box-shadow:inset 3px 0 0 ${c.ink}">
          <b>${esc(it.o.ev.name)}${it.o.ev.repeat ? ' ' + ic(P.repeat, 10, 2.2) : ''}</b>${h >= 34 ? `<i style="color:${c.ink}">${when}</i>` : ''}</button>`;
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

  const nowMs = now.getTime();
  const next = visibleOccs(nowMs, nowMs + 30 * 864e5, ui.q).filter((o) => o.start >= nowMs).slice(0, 5);
  const when = (o) => { const d = new Date(o.start); return (dKey(d) === todayK ? 'Today' : DOWS[(d.getDay() + 6) % 7] + ' ' + shortDate(d)) + ' · ' + hm(d); };
  const upnext = next.map((o) => `<button type="button" class="upnext" data-act="editEvent" data-id="${o.ev.id}"><span class="dot" style="background:${(COLORS[o.ev.color] || COLORS.violet).ink}"></span><span class="grow" style="min-width:0;display:flex;flex-direction:column;gap:2px"><span class="ell" style="font-weight:500">${esc(o.ev.name)}</span><span class="small muted">${when(o)}</span></span>${o.ev.repeat ? `<span class="muted" title="Repeats">${ic(P.repeat, 15)}</span>` : ''}</button>`).join('');

  return `
  <div class="top"><div><h1>Calendar</h1><p>Tick the calendars you want to see. They stack in the same view.</p>
      <div style="margin-top:8px;display:flex;align-items:center;gap:8px"><span class="small muted">Time zone</span>${tzSelect('width:240px;height:34px;font-size:13px')}</div></div>
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
    <div class="calside" id="calside">${calOrder().map((k) => ({
      mini: () => calPanel('mini', `${MONTHS_LONG[a.getMonth()]} ${a.getFullYear()}`, '', `<div class="mini">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x) => `<span>${x}</span>`).join('')}${mini}</div>`),
      cals: () => calPanel('cals', 'Calendars', `<button type="button" class="iconbtn" data-act="newCal" aria-label="New calendar">${ic(P.plus, 17, 2)}</button>`,
        `<div style="display:flex;flex-direction:column;gap:2px">${cals || '<span class="small muted">No calendars. Events show up anyway; add one to group events and hide them in one click.</span>'}</div>`),
      hyp: hypPanel,
      next: () => calPanel('next', 'Up next', '', upnext || '<span class="small muted">Nothing in the next 30 days.</span>'),
      mayor: mayorPanel,
    })[k]()).join('')}
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
        <span class="small muted">${t.sbYear ? 'Every Skyblock year (124h)' : `${L.everyText(t.every, t.unit)} · from ${shortDate(new Date(toView(todoStartMs(t))))}, ${hm(new Date(toView(todoStartMs(t))))}`}</span></div>
      <div style="text-align:right;display:flex;flex-direction:column;gap:2px">
        <span class="${st.done ? 'pos' : ''}" style="font-weight:600">${st.done ? doneLabel(t) : 'To do'}</span>
        <span class="small muted">Resets in ${dur(st.next - now)}</span>
        ${t.passive ? `<button type="button" class="link small" style="color:${PASSIVE.ink};align-self:flex-end" data-act="passiveEdit" data-id="${t.id}" aria-label="Edit what ${esc(t.name)} earned">${fmt(earned(t.id))} earned ${ic(P.edit, 12)}</button>` : ''}</div>
      <button type="button" class="iconbtn" data-act="editTodo" data-id="${t.id}" aria-label="Edit ${esc(t.name)}">${ic(P.edit, 17)}</button>
    </div>`;
  return `
  <div class="top"><div><h1>To Do</h1><p>Recurring tasks. Each one comes back on its own schedule.</p></div>
    <button type="button" class="btn" data-act="newTodo">${ic(P.plus, 18, 2)}New to do</button></div>
  <div class="cards">
    <div class="card"><span>To do now</span><div class="big">${due}</div><span class="small muted">of ${items.length} tasks</span></div>
    <div class="card"><span>Done</span><div class="big pos">${items.length - due}</div><span class="small muted">until their next reset</span></div>
    <button type="button" class="card tap" data-act="passiveWeek"><span>Passive · last 7 days</span><div class="big" style="color:${PASSIVE.ink}">${fmt(week)}${coin()}</div><span class="small muted">from passive tasks · click to see and edit</span></button>
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

let lastStats = null;
// What a Stats card counts, line by line. Each line opens the flip or dice it comes from.
function breakdownModal(k) {
  const S = lastStats, pl = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  if (k === 'passive') return passiveModal({ from: S.from, to: S.to, sub: S.period });
  const val = (v, sign = true) => `<b class="num ${sign ? (v > 0 ? 'pos' : v < 0 ? 'neg' : '') : ''}">${sign ? signed(v) : fmt(v)}</b>`;
  const flipRow = (f, act, sub, v, sign) => ({ act, id: f.id, label: f.name, sub, v: val(v, sign) });
  const soldSub = (f) => `Sold ${dateLabel(f.soldAt)} · ${fmt(f.cost)} → ${fmt(f.sell)}${f.fees ? ' · fees ' + fmt(f.fees) : ''}`;
  const by = (key) => (a, b) => b[key].localeCompare(a[key]);
  const T = {
    invested: ['Invested', `${pl(S.bought.length, 'flip')} bought`, S.bought.sort(by('bought')).map((f) => flipRow(f, 'editFlip', `Bought ${dateLabel(f.bought)}${f.qty > 1 ? ` · ${f.qty} items` : ''}`, f.cost, false)), fmt(sum(S.bought, (f) => f.cost))],
    profit: ['Profit', `${pl(S.wins.length, 'winning flip')}`, S.wins.sort(by('soldAt')).map((f) => flipRow(f, 'sell', soldSub(f), f.pnl)), signed(sum(S.wins, (f) => f.pnl))],
    losses: ['Losses', `${pl(S.losses.length, 'losing flip')}`, S.losses.sort(by('soldAt')).map((f) => flipRow(f, 'sell', soldSub(f), f.pnl)), signed(sum(S.losses, (f) => f.pnl))],
    winrate: ['Win rate', `${S.wins.length} won out of ${pl(S.closed.length, 'closed flip')}`, S.closed.sort(by('soldAt')).map((f) => flipRow(f, 'sell', (f.pnl > 0 ? 'Won · ' : f.pnl < 0 ? 'Lost · ' : 'Even · ') + soldSub(f), f.pnl)), S.closed.length ? Math.round((S.wins.length / S.closed.length) * 100) + '%' : '—'],
    open: ['Still open', `${pl(S.open.length, 'flip')} in progress (any purchase date)`, S.open.sort(by('bought')).map((f) => flipRow(f, 'editFlip', `Bought ${dateLabel(f.bought)}${f.qty > 1 ? ` · ${f.qty} items` : ''}`, f.cost, false)), fmt(sum(S.open, (f) => f.cost))],
    dice: ['Dice', `${S.diceDone.length} finished dice`, S.diceDone.map((d) => ({ act: 'diceDrop', id: d.id, label: L.DICE[d.type].name, sub: `${d.end.kind === 'six' ? 'Rolled a 6' : 'Archfiend Dye ' + fmt(d.end.dye)} · ${d.rolls} rolls · paid ${fmt(d.paid)} · ${dateLabel(d.end.at)}`, v: val(d.pnl) })), signed(sum(S.diceDone, (d) => d.pnl))],
  };
  if (k === 'net') {
    const part = (key, label, sub, v) => ({ act: 'breakdown', k: key, label, sub, v: val(v) });
    const pass = sum(S.pass, (x) => x.amount), dice = sum(S.diceDone, (d) => d.pnl), win = sum(S.wins, (f) => f.pnl), loss = sum(S.losses, (f) => f.pnl);
    T.net = ['Net result', 'Everything that came back, minus what was lost', [
      part('profit', 'Profit', pl(S.wins.length, 'winning flip'), win), part('losses', 'Losses', pl(S.losses.length, 'losing flip'), loss),
      part('passive', 'Passive', pl(S.pass.length, 'completion'), pass), part('dice', 'Dice', `${S.diceDone.length} finished`, dice)], signed(win + loss + pass + dice)];
  }
  const [title, sub, rows, total] = T[k];
  openModal(`<form novalidate>${dHead(title, esc(sub) + ' · ' + esc(S.period))}
    <div class="dbody">
      <div class="bklist">${rows.map((r) => `<button type="button" class="bkrow" data-act="${r.act}" ${r.id ? `data-id="${r.id}"` : `data-k="${r.k}"`}><span class="grow" style="min-width:0;display:flex;flex-direction:column;gap:2px"><span class="ell" style="font-weight:600">${esc(r.label)}</span><span class="small muted ell">${r.sub}</span></span>${r.v}${ic(P.right, 14, 2)}</button>`).join('') || '<span class="small muted">Nothing counted in this period.</span>'}</div>
      <div class="box" style="flex-direction:row;align-items:center"><span class="grow muted">Total</span><b class="big">${total}</b></div>
    </div><div class="dfoot"><span class="small muted grow">Click a line to open it.</span><button type="button" class="btn" data-act="close">Close</button></div></form>`, 'wide');
}

function viewStats() {
  const pr = db.prefs, today = dayStart(new Date()), tomorrow = addDays(today, 1).getTime();
  const ms = (s) => new Date(s).getTime();
  const flips = myFlips(), allPass = myPassive(), allDice = myDice();
  // period -> [from, to)
  let from, to = tomorrow;
  const preset = PERIODS.find((p) => p[0] === pr.period && p[2]);
  if (preset) from = addDays(today, -(preset[2] - 1)).getTime();
  else if (pr.period === 'custom') {
    const a = new Date((pr.from || dKey(addDays(today, -29))) + 'T00:00').getTime(), b = addDays(new Date((pr.to || dKey(today)) + 'T00:00'), 1).getTime();
    [from, to] = a < b ? [a, b] : [b - 864e5, a + 864e5];
  } else from = Math.min(today.getTime() - 13 * 864e5, ...flips.map((f) => ms(f.bought)), ...allPass.map((p) => ms(p.at)), ...allDice.map((d) => ms(d.bought)));
  const inR = (s) => { const t = ms(s); return t >= from && t < to; };
  const bought = flips.filter((f) => inR(f.bought));
  const closed = flips.filter((f) => f.sold && inR(f.soldAt));
  const pass = allPass.filter((p) => inR(p.at));
  const diceDone = allDice.filter((d) => d.end && inR(d.end.at)), diceRes = sum(diceDone, (d) => d.pnl);
  const wins = closed.filter((f) => f.pnl > 0), losses = closed.filter((f) => f.pnl < 0);
  const profit = sum(wins, (f) => f.pnl), loss = sum(losses, (f) => f.pnl), passive = sum(pass, (p) => p.amount);
  const net = profit + loss + passive + diceRes;
  const closedCost = sum(closed, (f) => f.cost);
  const roi = closedCost ? ((profit + loss) / closedCost) * 100 : 0;
  const open = flips.filter((f) => !f.sold);
  const invested = sum(bought, (f) => f.cost);
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const pct = (x) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(1) + '%';
  lastStats = { from, to, bought, closed, wins, losses, pass, diceDone, open, period: `${dateLabel(new Date(from))} – ${dateLabel(new Date(to - 864e5))}` };

  // realized chart: closed flips by category + passive, with the chart filters
  const c = pr.chart, hidden = new Set(c.hidden);
  const keys = db.categories.map((x) => [x.id, catMeta(x.id)]).concat([['passive', PASSIVE], ['dice', DICE_LOOK]]);
  const evs = flips.filter((f) => f.sold).map((f) => ({ t: ms(f.soldAt), key: f.cat, v: f.pnl }))
    .concat(allPass.map((p) => ({ t: ms(p.at), key: 'passive', v: p.amount })))
    .concat(allDice.filter((d) => d.end).map((d) => ({ t: ms(d.end.at), key: 'dice', v: d.pnl })))
    .filter((e) => !hidden.has(e.key) && (c.sign === 'all' || (c.sign === 'gain' ? e.v > 0 : e.v < 0)));
  const bks = L.buckets(evs, from, to, c.group);
  const seg = (k, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button type="button" aria-pressed="${c[k] === v}" data-act="chartSet" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const catFilter = `<div class="chips small" role="group" aria-label="Categories shown">${keys.map(([k, m]) => `<label><input type="checkbox" data-chartcat="${k}" ${hidden.has(k) ? '' : 'checked'}><span><span class="dot" style="background:${m.ink}"></span>${esc(m.label)}</span></label>`).join('')}</div>`;
  const pseg = (k, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button type="button" aria-pressed="${pr[k] === v}" data-act="prefSet" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const catData = db.categories.map(({ id }) => {
    const m = catMeta(id);
    return { label: m.label, ink: m.ink, inv: sum(bought.filter((f) => f.cat === id), (f) => f.cost), res: sum(closed.filter((f) => f.cat === id), (f) => f.pnl) };
  }).concat([{ label: 'Passive', ink: PASSIVE.ink, inv: 0, res: sum(pass, (p) => p.amount) }, { label: 'Dice', ink: DICE_LOOK.ink, inv: sum(diceDone, (d) => d.spent), res: diceRes }]);
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
  const diceRow = `<div class="catrow"><div style="display:flex;align-items:center;gap:8px"><span class="dot" style="background:${DICE_LOOK.ink}"></span><span class="grow" style="font-weight:500">Dice</span><span class="num ${diceRes > 0 ? 'pos' : diceRes < 0 ? 'neg' : 'muted'}" style="font-weight:600">${signed(diceRes)}</span></div>
      <span class="small muted">${diceDone.length} finished dice · ${fmt(sum(diceDone, (d) => d.spent))} spent</span></div>`;

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
    <button type="button" class="card tap" data-act="breakdown" data-k="invested"><span>Invested</span><div class="big">${fmt(invested)}${coin()}</div><span class="small muted">${plural(bought.length, 'flip')}</span></button>
    <button type="button" class="card tap" data-act="breakdown" data-k="profit"><span>Profit</span><div class="big pos">${signed(profit)}</div><span class="small muted">${plural(wins.length, 'winning flip')}</span></button>
    <button type="button" class="card tap" data-act="breakdown" data-k="losses"><span>Losses</span><div class="big neg">${signed(loss)}</div><span class="small muted">${plural(losses.length, 'losing flip')}</span></button>
    <button type="button" class="card tap" data-act="breakdown" data-k="passive"><span>Passive</span><div class="big" style="color:${PASSIVE.ink}">${signed(passive)}</div><span class="small muted">${plural(pass.length, 'completion')}</span></button>
    <button type="button" class="card tap" data-act="breakdown" data-k="dice"><span>Dice</span><div class="big ${diceRes > 0 ? 'pos' : diceRes < 0 ? 'neg' : ''}">${signed(diceRes)}</div><span class="small muted">${diceDone.length} finished</span></button>
    <button type="button" class="card tap" data-act="breakdown" data-k="net"><span>Net result</span><div class="big ${net > 0 ? 'pos' : net < 0 ? 'neg' : ''}">${signed(net)}</div><span class="small muted">${closed.length ? 'ROI ' + pct(roi) + ' on closed' : 'flips + passive + dice'}</span></button>
    <button type="button" class="card tap" data-act="breakdown" data-k="winrate"><span>Win rate</span><div class="big">${closed.length ? Math.round((wins.length / closed.length) * 100) + '%' : '—'}</div><span class="small muted">${wins.length} of ${closed.length} closed</span></button>
    <button type="button" class="card tap" data-act="breakdown" data-k="open"><span>Still open</span><div class="big">${fmt(sum(open, (f) => f.cost))}</div><span class="small muted">${plural(open.length, 'flip')} in progress</span></button>
  </div>
  <div class="split">
    <section class="panel wide"><div style="display:flex;align-items:baseline;gap:12px"><h2 class="grow">${chartTitle}</h2><span class="small muted">${bTitle(bks[0].start, c.group)} – ${shortDate(new Date(to - 864e5))}</span></div>
      <div class="chartbar">${seg('style', [['bars', 'Bars'], ['line', 'Line'], ['cumul', 'Cumulative'], ['candle', 'Candles'], ['stack', 'Stacked']])}${seg('group', [['day', 'Day'], ['week', 'Week'], ['month', 'Month']])}${seg('sign', [['all', 'All'], ['gain', 'Gains'], ['loss', 'Losses']])}</div>
      ${catFilter}
      ${chartSvg(bks, c.style, c.group, keys, c.style === 'candle' ? L.candles(evs, bks, to) : null)}</section>
    <section class="panel"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><h2 class="grow">By category</h2>
        <div class="chartbar">${pseg('catView', [['list', 'List'], ['pie', 'Pie'], ['bars', 'Bars']])}${pr.catView === 'list' ? '' : pseg('catMetric', [['invested', 'Invested'], ['result', 'Result']])}</div></div>
      ${pr.catView === 'list' ? catRows + passiveRow + diceRow : catChart(catData, pr.catView, pr.catMetric)}</section>
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
      ${dhm(p.min, 'Duration')}
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
    if (min < 1) return setErr(form, 'Enter a duration of at least 1 minute, like 45m, 2h30 or 1d.');
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
  return `
  <div class="top"><div><h1>Settings</h1><p>Your data file, time zone, selling fees and updates. Profiles and categories are in the sidebar.</p></div></div>
  <section class="panel"><h2>Data</h2>
    <span class="small muted">Everything is saved in one JSON file. To edit it by hand: open the folder, edit <b>data.json</b>, save it, then click Reload. Don't change anything in the app while you edit, or the app will overwrite your edits. A copy of the previous version is kept as data.json.bak.</span>
    <code style="padding:10px 12px;border-radius:10px;background:var(--field);border:1px solid var(--fieldline);user-select:text;word-break:break-all">${esc(dataPath)}</code>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="btn ghost" data-act="openData" ${T ? '' : 'disabled'}>${ic(P.folder, 17)}Open data folder</button><button type="button" class="btn ghost" data-act="reloadData">Reload from file</button></div>
  </section>
  <section class="panel"><h2>Time zone</h2>
    <span class="small muted">The calendar and To Do show their times in this zone. Auto follows your PC. Events keep the real moment they happen, so they move by themselves when you change zone.</span>
    ${tzSelect('max-width:420px')}
  </section>
  <section class="panel"><h2>Selling</h2>
    <span class="small muted">Used to calculate fees when you sell. AH fees are fixed by the game (BIN listing fee 1% / 2% / 2.5% + 1% claim tax).</span>
    <label class="field"><span>Bazaar tax (%) <small>· 1.25% by default, lower with the Bazaar Flipper perk</small></span><input class="in" id="bztax" type="number" min="0" max="1.25" step="0.0125" value="${db.prefs.bzTax ?? 1.25}" style="max-width:160px"></label>
  </section>
  <section class="panel"><h2>Updates</h2>
    <span class="small muted">Version ${esc(upd.version || '?')}. The app checks GitHub for a new version when it starts.</span>
    <div class="box"><div class="switchrow"><div class="grow"><label for="autoupd" style="font-weight:500">Install updates automatically</label><div class="small muted">On: a new version is installed and the app restarts by itself. Off: an Update button appears in the sidebar.</div></div><input type="checkbox" class="switch" id="autoupd" ${db.prefs.autoUpdate ? 'checked' : ''}></div></div>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button type="button" class="btn ghost" data-act="checkUpdate" ${T?.updater && !upd.busy ? '' : 'disabled'}>Check for updates</button>${upd.avail && !upd.busy ? `<button type="button" class="btn" data-act="installUpdate">Update to v${esc(upd.avail.version)}</button>` : ''}<span class="small muted" role="status">${esc(T?.updater ? upd.status : 'Updates only work in the installed app.')}</span></div>
  </section>`;
}

/* ---------- dice ---------- */
function viewDice() {
  const all = myDice().sort((a, b) => (b.end?.at || b.bought).localeCompare(a.end?.at || a.bought));
  const open = all.filter((d) => !d.end), done = all.filter((d) => d.end);
  const net = sum(done, (d) => d.pnl), dyes = done.filter((d) => d.end.kind === 'dye').length;
  const look = `background:${DICE_LOOK.tint};color:${DICE_LOOK.ink}`;
  const row = (d) => {
    const t = L.DICE[d.type];
    const status = !d.end ? `<span class="small muted">Spent so far</span><b class="num neg">${signed(-d.spent)}</b>`
      : `<span class="small muted">${d.end.kind === 'six' ? `Rolled a 6 · ${fmt(t.six)}` : `Archfiend Dye · ${fmt(d.end.dye)}`}</span><b class="num ${d.pnl >= 0 ? 'pos' : 'neg'}">${signed(d.pnl)}</b>`;
    return `<div class="todo">
      <div class="ico" style="${look}">${itemPic(d.end?.kind === 'dye' ? 'Archfiend Dye' : t.name, 30) || ic(P.dice, 22)}</div>
      <div class="grow" style="min-width:0;display:flex;flex-direction:column;gap:4px">
        <div style="display:flex;align-items:center;gap:8px;min-width:0"><span class="ell" style="font-weight:600;font-size:15px">${t.name}</span>${d.end ? `<span class="pill" style="background:var(--chip);color:var(--nav)">${d.end.kind === 'six' ? '6' : '7 · Dye'}</span>` : ''}</div>
        <span class="small muted">Paid ${fmt(d.paid)} · ${d.rolls} roll${d.rolls === 1 ? '' : 's'} × ${fmt(t.roll)} · ${d.end ? 'ended ' + shortDate(d.end.at) : 'since ' + shortDate(d.bought)}</span></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;min-width:120px">${status}</div>
      ${d.end ? `<button type="button" class="btn ghost sm" data-act="diceDrop" data-id="${d.id}">Edit drop</button>`
        : `<div style="display:flex;gap:6px;align-items:center"><button type="button" class="btn ghost sm" data-act="diceRoll" data-id="${d.id}" data-v="-1" aria-label="Remove a roll" ${d.rolls ? '' : 'disabled'}>−1</button><button type="button" class="btn ghost sm" data-act="diceRoll" data-id="${d.id}" data-v="1">+1 roll</button><button type="button" class="btn sm" data-act="diceDrop" data-id="${d.id}">Got the drop</button></div>`}
      <button type="button" class="iconbtn" style="opacity:1" data-act="editDice" data-id="${d.id}" aria-label="Edit dice">${ic(P.edit, 15)}</button></div>`;
  };
  return `
  <div class="top"><div><h1>Dice</h1><p>${esc(profileName(db.activeProfile))} · Archfiend dice: count your rolls, log the drop, see what you made.</p></div>
    <button type="button" class="btn" data-act="newDice">${ic(P.plus, 18, 2)}New dice</button></div>
  <div class="cards">
    <div class="card"><span>Net result</span><div class="big ${net > 0 ? 'pos' : net < 0 ? 'neg' : ''}">${signed(net)}</div><span class="small muted">${done.length} finished dice</span></div>
    <div class="card"><span>In progress</span><div class="big">${open.length}</div><span class="small muted">${fmt(sum(open, (d) => d.spent))} spent so far</span></div>
    <div class="card"><span>Rolls</span><div class="big">${sum(all, (d) => d.rolls)}</div><span class="small muted">all dice</span></div>
    <div class="card"><span>Dyes</span><div class="big">${dyes}</div><span class="small muted">${done.length - dyes} paid out with a 6</span></div>
  </div>
  ${open.length ? `<section class="panel"><h2>In progress</h2>${open.map(row).join('')}</section>` : ''}
  <section class="panel"><h2>Finished</h2>${done.map(row).join('') || '<span class="small muted">No finished dice yet. When a dice gives its 6 or its dye, click Got the drop.</span>'}</section>`;
}

/* ---------- collection: rare leather armor ---------- */
// Original color of each leather item, from the Hypixel item list (filled by loadItems, or by a scan).
const HYP_COLORS = {};
const setHypColors = (items) => { for (const h of items || []) if (h?.id && /^\d+,\d+,\d+$/.test(h.color || '')) HYP_COLORS[h.id] = h.color.split(',').map((n) => (+n).toString(16).padStart(2, '0')).join('').toUpperCase(); };
const coll = { busy: false };
const gunzipB64 = async (b64) => new Uint8Array(await new Response(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
// Every leather piece in the player's inventories, on all their SkyBlock profiles (needs their own Hypixel API key).
async function apiPieces(name, key) {
  const pl = await (await fetch('https://playerdb.co/api/player/minecraft/' + encodeURIComponent(name))).json().catch(() => null);
  const uuid = pl?.data?.player?.raw_id;
  if (!/^[0-9a-f]{32}$/.test(uuid || '')) throw new Error(`no Minecraft player named "${name}"`);
  const r = await fetch('https://api.hypixel.net/v2/skyblock/profiles?uuid=' + uuid, { headers: { 'API-Key': key } });
  const j = await r.json().catch(() => ({}));
  if (!j.success) throw new Error(j.cause || 'HTTP ' + r.status);
  if (!HYP_COLORS.VELVET_TOP_HAT && !Object.keys(HYP_COLORS).length) setHypColors((await (await fetch('https://api.hypixel.net/v2/resources/skyblock/items')).json()).items);
  const out = [];
  let open = 0;
  for (const pr of j.profiles || []) {
    const inv = pr.members?.[uuid]?.inventory;
    if (!inv) continue;
    open++;
    const boxes = [['Inventory', inv.inv_contents], ['Armor', inv.inv_armor], ['Equipment', inv.equipment_contents], ['Ender chest', inv.ender_chest_contents], ['Wardrobe', inv.wardrobe_contents],
      ['Personal vault', inv.personal_vault_contents], ...Object.entries(inv.backpack_contents || {}).map(([i, b]) => ['Backpack ' + (+i + 1), b])];
    for (const [where, box] of boxes) if (box?.data) out.push(...L.leatherPieces(L.readNbt(await gunzipB64(box.data)), `${pr.cute_name || 'Profile'} · ${where}`));
  }
  if (!open) throw new Error('your inventory API is off. In SkyBlock: Settings → API Settings → turn on Inventory API');
  return out;
}
// Pieces SeymourAnalyzer saved while you scanned chests in game (no API key needed).
async function modPieces(path) {
  const j = JSON.parse(await T.core.invoke('read_seymour', { path: path || null }));
  return Object.values(j?.pieces || j || {}).filter((x) => x && x.uuid && /^[0-9A-Fa-f]{6}$/.test(x.hexcode || '')).map((x) => {
    const name = String(x.pieceName || 'Seymour piece').replace(/§./g, '').trim(), c = x.chestLocation;
    return { uuid: String(x.uuid), id: L.SEYMOUR_IDS.find((i) => name.toUpperCase().replace(/ /g, '_').includes(i)) || 'VELVET_TOP_HAT', name, hex: x.hexcode.toUpperCase(),
      where: c ? `Chest ${c.x}, ${c.y}, ${c.z}` : '', mods: null };
  });
}
// One source's scan replaces its pieces; pieces it no longer finds stay, marked gone. Dyed pieces and normal colors are left out.
function mergePieces(src, found) {
  const all = db.coll.pieces, now = new Date().toISOString(), seen = new Set();
  for (const x of found) {
    const kind = x.dyed ? null : L.pieceKind(x, HYP_COLORS[x.id], SEY_TARGETS);
    if (!kind) continue;
    seen.add(x.uuid);
    all[x.uuid] = { ...all[x.uuid], ...x, kind, src, seen: now, gone: false };
  }
  for (const x of Object.values(all)) if (x.src === src && !seen.has(x.uuid)) x.gone = true;
  return seen.size;
}
async function collRefresh() {
  if (coll.busy) return;
  const c = db.prefs.coll, notes = [];
  coll.busy = true; db.coll.msg = 'Scanning…'; render();
  if (T) {
    try { notes.push(`SeymourAnalyzer: ${mergePieces('mod', await modPieces(c.file))} pieces`); } catch (e) { notes.push('SeymourAnalyzer file not read (' + (e.message || e) + ')'); }
  }
  if (c.name && c.key) {
    try { notes.push(`Hypixel: ${mergePieces('api', await apiPieces(c.name, c.key))} rare pieces`); } catch (e) { notes.push('Hypixel scan failed: ' + (e.message || e)); }
  } else notes.push('Add your username and API key to scan your inventories');
  coll.busy = false; db.coll.at = new Date().toISOString(); db.coll.msg = notes.join(' · ');
  commit();
}
const hexInfo = new Map(); // hex -> closest SeymourAnalyzer target
const useFades = () => db.prefs.coll.fades !== false; // SeymourAnalyzer's "fade dyes" option
const hexMatch = (hex) => { const k = hex + useFades(); if (!hexInfo.has(k)) hexInfo.set(k, L.analyzeHex(hex, SEY_TARGETS, useFades() ? SEY_FADES : {})); return hexInfo.get(k); };
const pieceLabel = (x) => (x.kind === 'Seymour' ? 'T' + (hexMatch(x.hex)?.tier ?? 3) : x.kind);
// Leather icon in the piece's exact color: the grey texture multiplied by the hex, like Minecraft draws it, plus its overlay.
const leatherIcon = (x, size = 32) => { const t = L.pieceType(x.name) || 'chestplate'; return `<span class="lth" style="--c:#${x.hex};--b:url(leather/leather_${t}.png);width:${size}px;height:${size}px"><img src="leather/leather_${t}_overlay.png" alt=""></span>`; };
const KIND_ORDER = ['OG Fairy', 'Crystal', 'Fairy', 'Spook', 'Exotic', 'Bleached', 'T0', 'T1', 'T2', 'T3'];
function viewColl() {
  const c = db.prefs.coll, q = ui.q.trim().toLowerCase();
  const all = Object.values(viewPieces()).map((x) => ({ x, label: pieceLabel(x), m: hexMatch(x.hex), pat: x.kind === 'Seymour' ? L.hexPattern(x.hex) : null })); // patterns: Seymour pieces only
  all.forEach((r) => (r.slot = L.pieceType(r.x.name) || 'chestplate'));
  // Checked boxes: any of them inside a group, every group with a box checked must match. The search also finds pieces within T2 of a target named like it.
  const F = ui.collSel, pool = all.filter((r) => F.gone || !r.x.gone);
  const shown = pool.filter((r) => (!F.slot.size || F.slot.has(r.slot)) && (!F.kind.size || F.kind.has(r.label)) && (!F.pat || r.pat)).flatMap((r) => {
    if (!q || r.x.name.toLowerCase().includes(q) || r.x.hex.toLowerCase().includes(q.replace('#', ''))) return [r];
    const s = L.searchHex(r.x.hex, q, SEY_TARGETS, useFades() ? SEY_FADES : {});
    return s ? [{ ...r, m: s, hit: true }] : [];
  }).sort((a, b) => KIND_ORDER.indexOf(a.label) - KIND_ORDER.indexOf(b.label) || (a.m?.dE ?? 99) - (b.m?.dE ?? 99));
  const nSel = F.slot.size + F.kind.size + F.pat + F.gone;
  const box = (g, v, label, n) => `<label class="fchk"><input type="checkbox" data-act="collTog" data-g="${g}" data-v="${esc(v)}" ${(g === 'pat' || g === 'gone' ? F[g] : F[g].has(v)) ? 'checked' : ''}><span>${esc(label)}</span><small>${n}</small></label>`;
  const nOf = (f) => pool.filter(f).length;
  const showMade = c.made !== false, showPrice = c.price !== false;
  const mods = (m) => pieceMods(m, showMade).map(([k, v]) => `${k}: ${v}`).join(' · ');
  const card = ({ x, label, m, pat, hit }) => `<article class="pcard ${x.kind === 'Seymour' ? 'bg-' + tierCls(hexMatch(x.hex)) : ''} ${x.gone ? 'gonerow' : ''} ${ui.collPick.has(x.uuid) ? 'picked' : ''}" data-act="collPick" data-id="${esc(x.uuid)}">
    <span class="ppick"><input type="checkbox" data-act="collPick" data-id="${esc(x.uuid)}" ${ui.collPick.has(x.uuid) ? 'checked' : ''} aria-label="Select ${esc(x.name)} for the sales list"></span>
    <div class="pchead">${leatherIcon(x, 52)}
      <span style="min-width:0;display:flex;flex-direction:column;gap:6px;align-items:flex-start">
        <span class="ptitle"><button type="button" class="pname" data-act="collInfo" data-id="${esc(x.uuid)}" title="Details, owners and sales">${esc(x.name)}</button>
          <span class="pill ${/^T\d$/.test(label) ? tierCls(hexMatch(x.hex)) : 'kind'}">${esc(label)}${/^T\d$/.test(label) && hexMatch(x.hex)?.fade ? ' fade' : ''}</span>${pat ? `<span class="pill" style="background:var(--chip);color:var(--nav)">${pat}</span>` : ''}${x.gone ? '<span class="pill" style="background:var(--chip);color:var(--muted)">No longer found</span>' : ''}</span>
        <span class="hexchip"><span class="sw" style="background:#${x.hex}"></span>#${x.hex}</span></span></div>
    ${m ? `<dl class="ana">
      <dt>${hit ? 'Search' : 'Closest'}</dt><dd title="${esc(m.name)}"><b>${esc(m.name)}</b>${m.fade ? ' <span class="muted">(fade)</span>' : ''}</dd>
      <dt>Target</dt><dd class="hexchip"><span class="sw" style="background:#${m.hex}"></span>#${m.hex}</dd>
      <dt>ΔE</dt><dd><b class="de ${tierCls(m)}">${m.dE.toFixed(2)}</b> <span class="muted">· Absolute ${m.abs}</span></dd></dl>` : ''}
    ${mods(x.mods) ? `<span class="small muted pmods" title="${esc(mods(x.mods))}">${esc(mods(x.mods))}</span>` : ''}
    <div class="pfoot"><span class="small muted ell grow" title="${esc(pieceWhere(x))}">${esc(pieceWhere(x))}</span>
      ${showPrice && !ui.peek ? `<button type="button" class="pricebtn ${x.price != null ? 'set' : ''}" data-act="collPrice" data-id="${esc(x.uuid)}" title="${x.price != null ? 'Edit the buy price' : 'Add a buy price'}" aria-label="Buy price of ${esc(x.name)}${x.price != null ? ': ' + fmt(x.price) : ''}">${x.price != null ? fmt(x.price) + ' ' : ''}<b>$</b></button>` : ''}
      ${x.gone ? `<button type="button" class="iconbtn" style="opacity:1" data-act="collForget" data-id="${esc(x.uuid)}" aria-label="Forget ${esc(x.name)}">${ic(P.trash, 15)}</button>` : ''}</div>
  </article>`;
  const status = ui.collTab === 'pieces' && q ? `"${q}" also finds pieces within T2 of a target with that name`
    : coll.busy ? 'Scanning…' : [db.coll.at && 'Last scan ' + shortDate(db.coll.at) + ' ' + hm(new Date(db.coll.at)), db.coll.msg || (c.key ? 'Click Refresh to scan.' : 'Open Settings to link your account, or Refresh to read SeymourAnalyzer.')].filter(Boolean).join(' · ');
  const tabs = `<div class="seg" role="tablist" aria-label="Collection view">${[['pieces', 'Pieces', shown.length], ['sets', 'Set builder', '']].map(([k, l, n]) => `<button type="button" role="tab" aria-selected="${ui.collTab === k}" data-act="collTab" data-v="${k}">${l}${n !== '' ? `<span>${n}</span>` : ''}</button>`).join('')}</div>`;
  return `
  <div class="top" style="flex-wrap:nowrap"><div style="flex:1;min-width:0"><h1>Collection</h1><p>Your rare leather armor, sorted by type and tier. Dyed pieces are left out.</p>
      <div class="cafes">${[['exotic', 'Exotic Café'], ['seymour', 'Seymour Café'], ['crystal', 'Crystal Café']].map(([k, l]) => `<button type="button" class="cafe" data-act="openLink" data-v="${k}" title="Open the ${l} Discord">${ic(P.link, 14)}${l}</button>`).join('')}</div></div>
    <div style="display:flex;gap:8px;flex:none"><button type="button" class="btn ghost" data-act="collPeek">${ic(P.peek, 17)}Check player inventory</button>
    <button type="button" class="btn ghost" data-act="collAccount">${ic(P.gear, 17)}Settings</button></div></div>
  ${ui.peek ? `<div class="pickbar peekbar">${ic(P.peek, 17)}<b>${esc(ui.peek.name)}</b><span class="small">${ui.peek.busy ? 'Scanning their inventories…' : ui.peek.err ? esc(ui.peek.err) : `${Object.keys(ui.peek.pieces || {}).length} rare pieces · shown for now, not added to your collection`}</span><span class="grow"></span>
    <button type="button" class="btn sm" data-act="collPeekEnd">Back to my collection</button></div>` : ''}
  <div class="ctool">${tabs}
    ${ui.collTab === 'pieces' ? `<button type="button" class="btn ghost" data-act="collOpen" aria-expanded="${ui.collOpen}" aria-controls="collfilters">${ic(P.filter, 17)}Filters${nSel ? ` <span class="pill kind">${nSel}</span>` : ''}</button>
    ${nSel ? '<button type="button" class="link" data-act="collClear">Clear filters</button>' : ''}` : ''}
    <span class="grow"></span><span class="small muted ell cstatus" role="status" title="${esc(status)}">${esc(status)}</span>
    <button type="button" class="iconbtn refresh ${coll.busy ? 'spin' : ''}" data-act="collRefresh" ${coll.busy ? 'disabled' : ''} title="Refresh: scan your inventories and SeymourAnalyzer" aria-label="${coll.busy ? 'Scanning' : 'Refresh'}">${ic(P.repeat, 18, 2)}</button></div>
  ${ui.collTab === 'pieces' && ui.collPick.size ? `<div class="pickbar"><b>${ui.collPick.size} selected</b><span class="small muted">Copied as aligned lines for a sales post</span><span class="grow"></span>
    <button type="button" class="btn sm" data-act="collCopy">${ic(P.copy, 15)}Copy list</button><button type="button" class="btn ghost sm" data-act="collPickAll">Select all shown</button><button type="button" class="link" data-act="collPickNone">Clear</button></div>` : ''}
  ${ui.collTab === 'sets' ? setsHtml(all.filter((r) => !r.x.gone)) : `${ui.collOpen ? `<section class="panel fpanel" id="collfilters">
    <div><span class="flabel">Piece</span><div class="fgrid">${['helmet', 'chestplate', 'leggings', 'boots'].map((t) => box('slot', t, t[0].toUpperCase() + t.slice(1), nOf((r) => r.slot === t))).join('')}</div></div>
    <div><span class="flabel">Type</span><div class="fgrid">${KIND_ORDER.map((k) => box('kind', k, k, nOf((r) => r.label === k))).join('')}</div></div>
    <div><span class="flabel">Other</span><div class="fgrid">${box('pat', '1', 'Hex patterns only', nOf((r) => r.pat))}${box('gone', '1', 'Include pieces no longer found', all.filter((r) => r.x.gone).length)}
      <label class="fchk" title="Match hexes against fade dye stages too, like SeymourAnalyzer's fade option"><input type="checkbox" data-act="collFades" ${useFades() ? 'checked' : ''}><span>Include fade dyes</span></label></div></div>
  </section>` : ''}
  ${shown.length ? `<div class="pgrid">${shown.map(card).join('')}</div>` : `<section class="panel"><span class="small muted">${all.length ? 'No piece matches these filters.' : 'Nothing here yet. Click Refresh.'}</span></section>`}`}`;
}
// SeymourAnalyzer's highlight colors: normal T0 red, T1 pink, T2 orange; fade T0 blue, T1 light blue, T2 yellow.
const viewPieces = () => ui.peek?.pieces || db.coll.pieces; // a checked player's pieces replace yours on screen only
const pieceWhere = (x) => x.where || (x.src === 'mod' ? 'SeymourAnalyzer' : '');
const tierCls = (m) => (m && m.tier <= 2 ? `tc-${m.fade ? 'f' : 'n'}${m.tier}` : 'tc-3');
// Set builder: pick a target color (categories of the community hex sheet, a piece, or a typed hex); each slot lists your closest pieces.
function setsHtml(pool) {
  const ref = ui.setRef, refPiece = ref?.uuid ? viewPieces()[ref.uuid] : null, hex = refPiece?.hex || ref?.hex || '';
  const title = refPiece ? refPiece.name : ref?.name || (hex ? 'Custom hex' : '');
  const ink = (h) => (L.hexLab(h)[0] > 60 ? '#111' : '#fff'); // readable hex text over its own color
  const tiers = db.prefs.coll.setTiers || [0, 1, 2, 3];
  const tierBoxes = `<div class="fgrid" role="group" aria-label="Tiers to suggest">${[0, 1, 2, 3].map((n) => `<label class="fchk"><input type="checkbox" data-act="setTier" data-v="${n}" ${tiers.includes(n) ? 'checked' : ''}><span class="tdot ${tierCls({ tier: n, fade: false })}"></span><span>T${n}</span><small>${['ΔE ≤ 1', '≤ 2', '≤ 5', '> 5'][n]}</small></label>`).join('')}</div>`;
  const cats = `<section class="panel sbcats"><h2>Targets</h2><span class="small muted">Open a category, then pick a color.</span>
    ${SET_CATS.map(([cat, items]) => { const open = ui.setCat === cat; return `<div class="sbcat">
      <button type="button" class="sbcathead" data-act="setCat" data-v="${esc(cat)}" aria-expanded="${open}"><span class="grow">${esc(cat)}</span><span class="small muted">${items.length}</span>${ic(open ? P.chevUp : P.chevDown, 14, 2)}</button>
      ${open ? `<div class="sbitems">${items.map(([n, h]) => `<button type="button" class="sbitem ${!refPiece && ref?.name === n ? 'on' : ''}" data-act="setTarget" data-n="${esc(n)}" data-h="${h}"><span class="ell grow">${esc(n)}</span><span class="sbsw" style="background:#${h};color:${ink(h)}">#${h}</span></button>`).join('')}</div>` : ''}</div>`; }).join('')}</section>`;
  const tile = (x, d) => `<button type="button" class="stile ${x.uuid === refPiece?.uuid ? 'on' : ''}" data-act="collInfo" data-id="${esc(x.uuid)}" title="${esc(x.name)} · #${x.hex}">${leatherIcon(x, 36)}
    <span style="min-width:0;display:flex;flex-direction:column;gap:2px;align-items:flex-start"><span class="ell" style="font-weight:600;max-width:100%">${esc(x.name)}</span>
    <span class="hexchip"><span class="sw" style="background:#${x.hex}"></span>#${x.hex}</span>
    <span class="small muted ell" style="max-width:100%">${esc(pieceWhere(x))}</span></span>
    <b class="de ${tierCls({ tier: L.hexTier(d), fade: false })}" style="margin-left:auto">${d.toFixed(2)}</b></button>`;
  const cols = ['helmet', 'chestplate', 'leggings', 'boots'].map((t) => {
    const near = pool.filter((r) => r.slot === t).map((r) => ({ x: r.x, d: L.deltaE(hex, r.x.hex) })).filter((n) => tiers.includes(L.hexTier(n.d))).sort((a, b) => a.d - b.d).slice(0, 6);
    return `<section class="panel scol"><h2>${t[0].toUpperCase() + t.slice(1)}</h2>${near.map((n) => tile(n.x, n.d)).join('') || `<span class="small muted">${tiers.length ? 'No piece in these tiers.' : 'Pick at least one tier.'}</span>`}</section>`;
  }).join('');
  return `<div class="sbwrap">${cats}<div style="display:flex;flex-direction:column;gap:14px;min-width:0">
    <section class="panel"><div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      ${hex ? `<span class="sbsw big" style="background:#${hex};color:${ink(hex)}">#${hex}</span><div style="display:flex;flex-direction:column;gap:2px"><b style="font-size:16px">${esc(title)}</b><span class="small muted">Your closest piece of each slot. ΔE is measured to this color.</span></div>` : '<span class="small muted">Pick a target color on the left, or type a hex.</span>'}
      <span class="grow"></span><label class="flabel" for="sethex">Hex</label><input class="in" id="sethex" value="${hex ? '#' + hex : ''}" placeholder="#F2DF11" maxlength="7" style="width:120px;font-family:ui-monospace,Consolas,monospace"></div>
      <div style="display:flex;align-items:center;gap:12px;margin-top:12px;flex-wrap:wrap"><span class="flabel">Suggest</span>${tierBoxes}</div></section>
    ${hex ? `<div class="scols">${cols}</div>` : ''}</div></div>`;
}
const LINKS = { dev: 'https://developer.hypixel.net/dashboard', exotic: 'https://discord.gg/wmrCckpaee', seymour: 'https://discord.gg/pq3pmmJwZY', crystal: 'https://discord.gg/3jYaB53vtC' };
// What was done to a piece, only the parts it has: [label, value].
const pieceMods = (m, made = true) => !m ? [] : [
  m.reforge && ['Reforge', m.reforge[0].toUpperCase() + m.reforge.slice(1)], m.hpb && ['HPB', Math.min(m.hpb, 10)], m.hpb > 10 && ['FPB', m.hpb - 10], m.recomb && ['Recomb', 'Yes'],
  m.stars && ['Stars', m.stars], m.enchants && ['Enchants', m.enchants], m.gems && ['Gems', m.gems],
  made && m.made && ['Made', typeof m.made === 'number' ? new Date(m.made).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' }) : m.made]].filter(Boolean);
// Details of a piece, with its Auction House history from Coflnet (sales only: trades between players are not public).
function collInfoModal(x) {
  if (!x) return;
  const m = hexMatch(x.hex), uid = String(x.uuid).replace(/-/g, '').slice(-12).toLowerCase();
  openModal(`<div>${dHead(esc(x.name), `${esc(pieceLabel(x))} · #${x.hex}`)}
    <div class="dbody">
      <div style="display:flex;gap:16px;align-items:center">${leatherIcon(x, 64)}
        <dl class="ana" style="flex:1">
          <dt>Piece</dt><dd class="hexchip"><span class="sw" style="background:#${x.hex}"></span>#${x.hex}</dd>
          ${m ? `<dt>Closest</dt><dd title="${esc(m.name)}"><b>${esc(m.name)}</b>${m.fade ? ' <span class="muted">(fade)</span>' : ''}</dd>
          <dt>Target</dt><dd class="hexchip"><span class="sw" style="background:#${m.hex}"></span>#${m.hex}</dd>
          <dt>ΔE</dt><dd><b class="de ${tierCls(m)}">${m.dE.toFixed(2)}</b> <span class="muted">· Absolute ${m.abs}</span></dd>` : ''}
        </dl></div>
      <dl class="ana"><dt>Item ID</dt><dd style="white-space:normal;word-break:break-all;font-family:ui-monospace,Consolas,monospace">${esc(x.uuid)}</dd>
        ${pieceMods(x.mods, db.prefs.coll.made !== false).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}
        ${x.price != null && db.prefs.coll.price !== false ? `<dt>Bought</dt><dd>${fmt(x.price)}</dd>` : ''}
        <dt>Where</dt><dd>${esc(pieceWhere(x))}</dd></dl>
      <div class="field"><span class="flabel">Owners and sales (Auction House, from Coflnet)</span><div id="ahist" class="small muted">Loading…</div></div>
    </div>
    <div class="dfoot"><button type="button" class="btn ghost" data-act="collSet" data-id="${esc(x.uuid)}">Find a matching set</button><span class="grow"></span><button type="button" class="btn" data-act="close">Close</button></div></div>`, 'info');
  (async () => {
    if (!/^[0-9a-f]{12}$/.test(uid)) return 'This piece has no item ID, so its sales cannot be looked up.';
    const sales = await (await fetch(`https://sky.coflnet.com/api/auctions/uid/${uid}/sold`)).json();
    if (!Array.isArray(sales) || !sales.length) return 'No Auction House sale found for this piece.';
    sales.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
    const ids = [...new Set(sales.flatMap((s) => [s.seller, s.buyer]).filter((id) => /^[0-9a-f]{32}$/.test(id || '')))].slice(0, 12);
    const names = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await fetch(`https://sky.coflnet.com/api/player/${id}/name`).then((r) => (r.ok ? r.text() : ''), () => '').then((t) => t.replace(/"/g, '').trim() || id.slice(0, 8))])));
    const who = (id) => esc(names[id] || String(id || '?').slice(0, 8));
    return `<table class="ahist"><thead><tr><th>Date</th><th>Seller</th><th>Buyer</th><th>Price</th></tr></thead><tbody>${sales.map((s) => `<tr><td>${esc(new Date(s.timestamp + 'Z').toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' }))}</td><td>${who(s.seller)}</td><td>${who(s.buyer)}</td><td><b>${fmt(s.highestBid)}</b></td></tr>`).join('')}</tbody></table>
      <span class="small muted">Owners in order: ${[sales[0].seller, ...sales.map((s) => s.buyer)].map(who).join(' → ')}</span>`;
  })().then((html) => { const el = $('#ahist'); if (el) el.innerHTML = html; }, (e) => { const el = $('#ahist'); if (el) el.textContent = 'Could not reach Coflnet: ' + (e.message || e); });
}
// Check another player's inventories with your API key: their rare pieces are shown until you go back, never saved.
function collPeekModal() {
  const c = db.prefs.coll;
  if (!c.key) return collAccountModal();
  const form = openModal(`<form novalidate>${dHead('Check player inventory', 'See the rare leather armor of any player. Nothing is added to your collection.')}
    <div class="dbody"><label class="field"><span>Minecraft username</span><input class="in" name="name" placeholder="e.g. Technoblade" autocomplete="off" autofocus></label>
      <span class="small muted">Uses your Hypixel API key. The player must have the Inventory API turned on.</span><span class="err" role="alert"></span></div>${dFoot('Check')}</form>`);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const name = String(new FormData(form).get('name')).trim();
    if (!/^\w{2,16}$/.test(name)) return setErr(form, 'A Minecraft username is 2 to 16 letters, digits or _.');
    closeModal();
    const peek = (ui.peek = { name, busy: true, pieces: {} });
    ui.collPick.clear(); ui.setRef = null; render();
    try {
      for (const x of await apiPieces(name, c.key)) {
        const kind = x.dyed ? null : L.pieceKind(x, HYP_COLORS[x.id], SEY_TARGETS);
        if (kind) peek.pieces[x.uuid] = { ...x, kind, src: 'api' };
      }
    } catch (err) { peek.err = 'Could not check: ' + (err.message || err); }
    peek.busy = false;
    if (ui.peek === peek) render(); // ignore a check you already left
  };
}
function collPriceModal(x) {
  const form = openModal(`<form novalidate>${dHead('Buy price', esc(x.name) + ' · #' + x.hex)}
    <div class="dbody"><div class="field"><label class="flabel" for="cprice">What you paid</label><input class="in" id="cprice" name="price" value="${esc(toShort(x.price))}" placeholder="e.g. 25m" autofocus><span class="small muted">Shortcuts work: 25m, 1.2b, 450k. Leave empty to remove it.</span></div>
      <span class="err" role="alert"></span></div>${dFoot('Save')}</form>`);
  form.onsubmit = (e) => {
    e.preventDefault();
    const v = String(new FormData(form).get('price')).trim(), n = v ? parse(v) : null;
    if (v && n == null) return setErr(form, 'Enter a price like 25m, 1.2b or 450000.');
    if (n == null) delete x.price; else x.price = n;
    closeModal(); commit();
  };
}
function collAccountModal() {
  const c = db.prefs.coll;
  const form = openModal(`<form novalidate>${dHead('Collection settings', 'Your Minecraft username and your own Hypixel API key stay on this PC.')}
    <div class="dbody">
      <label class="field"><span>Minecraft username</span><input class="in" name="name" value="${esc(c.name)}" placeholder="e.g. Technoblade" autocomplete="off" autofocus></label>
      <label class="field"><span>Hypixel API key <small class="muted">· optional</small></span><input class="in" type="password" name="key" value="${esc(c.key)}" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autocomplete="off">
        <span class="small muted">Create one on the <button type="button" class="link" data-act="openLink" data-v="dev">Hypixel Developer Dashboard</button> (developer.hypixel.net/dashboard: log in, then Create API Key). Development keys expire after a few days: paste the new one here. In SkyBlock, turn on Settings → API Settings → Inventory API.</span></label>
      <label class="field"><span>SeymourAnalyzer file <small class="muted">· optional</small></span><input class="in" name="file" value="${esc(c.file)}" placeholder="%APPDATA%\\.minecraft\\config\\seymouranalyzer\\collection.json">
        <span class="small muted">Leave empty for the default Minecraft launcher. With Prism, Modrinth or CurseForge, paste the instance's config\\seymouranalyzer folder.</span></label>
      <div class="fgrid stack"><label class="fchk"><input type="checkbox" name="made" ${c.made !== false ? 'checked' : ''}><span>Show the date each piece was made</span></label>
        <label class="fchk"><input type="checkbox" name="price" ${c.price !== false ? 'checked' : ''}><span>Show buy prices ($)</span></label></div>
      <span class="err" role="alert"></span>
    </div>${dFoot('Save')}</form>`);
  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form), name = String(fd.get('name')).trim(), key = String(fd.get('key')).trim();
    if (name && !/^\w{2,16}$/.test(name)) return setErr(form, 'A Minecraft username is 2 to 16 letters, digits or _.');
    if (key && !/^[0-9a-f-]{36}$/i.test(key)) return setErr(form, 'An API key looks like xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.');
    Object.assign(db.prefs.coll, { name, key, file: String(fd.get('file')).trim(), made: fd.get('made') === 'on', price: fd.get('price') === 'on' });
    closeModal(); commit();
  };
}

function diceModal(d) {
  const isEdit = !!d;
  d = d || { type: 'af', paid: null, rolls: 0, bought: localISO(new Date()) };
  const form = openModal(`<form novalidate>${dHead(isEdit ? 'Edit dice' : 'New dice', 'Pick the dice and what you paid for it.')}
    <div class="dbody">
      <div class="field"><span class="flabel">Dice</span>${radios('type', Object.entries(L.DICE).map(([k, t]) => [k, itemPic(t.name, 20) + t.name]), d.type, 'Dice type')}
        <span class="small muted" id="dinfo"></span></div>
      <div class="cols">
        <div class="field"><label class="flabel" for="dpaid">Price paid</label><input class="in" id="dpaid" name="paid" value="${esc(toShort(d.paid))}" placeholder="e.g. 1.2m" autofocus></div>
        <div class="field"><label class="flabel" for="drolls">Rolls so far</label><input class="in" id="drolls" name="rolls" type="number" min="0" step="1" value="${d.rolls}"></div>
      </div>
      <label class="field"><span>Bought</span><input class="in" type="datetime-local" name="bought" value="${esc(d.bought)}" style="max-width:260px"></label>
      <span class="err" role="alert"></span>
    </div>${dFoot(isEdit ? 'Save changes' : 'Add dice', isEdit && 'Delete')}</form>`);
  const info = () => { const t = L.DICE[new FormData(form).get('type')]; $('#dinfo').textContent = `${fmt(t.roll)} per roll · a 6 (${t.odds6}) pays ${fmt(t.six)} · a 7 (${t.odds7}) drops an Archfiend Dye`; };
  form.addEventListener('change', info); info();
  form.querySelector('[data-del]')?.addEventListener('click', () => {
    if (!confirm('Delete this dice? This cannot be undone.')) return;
    db.dice = db.dice.filter((x) => x.id !== d.id); closeModal(); commit();
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form), paid = parse(fd.get('paid')), rolls = Number(fd.get('rolls'));
    if (paid == null) return setErr(form, 'Enter what you paid for the dice, like 1.2m (0 is fine).');
    if (!Number.isInteger(rolls) || rolls < 0) return setErr(form, 'Rolls must be a whole number, 0 or more.');
    if (!fd.get('bought')) return setErr(form, 'Pick the date you bought it.');
    const data = { type: fd.get('type'), paid, rolls, bought: fd.get('bought') };
    if (isEdit) Object.assign(byId(db.dice, d.id), data);
    else db.dice.push({ id: uid(), profileId: db.activeProfile, end: null, ...data });
    closeModal(); commit();
  };
}

function dropModal(d) {
  const t = L.DICE[d.type], end = d.end || { kind: 'six', dye: db.prefs.dyePrice ?? null, at: localISO(new Date()) };
  const form = openModal(`<form novalidate>${dHead(d.end ? 'Edit drop' : 'Got the drop', esc(t.name) + ' · the dice ends when it drops.')}
    <div class="dbody">
      <div class="field"><span class="flabel">What did it give?</span>${radios('kind', [['six', `${coin(16)}A 6 · ${fmt(t.six)} coins`], ['dye', `${itemPic('Archfiend Dye', 20)}A 7 · Archfiend Dye`]], end.kind, 'Drop')}</div>
      <div class="cols">
        <div class="field"><label class="flabel" for="drolls2">Total rolls</label><input class="in" id="drolls2" name="rolls" type="number" min="1" step="1" value="${d.end ? d.rolls : d.rolls + 1}"><span class="small muted">Including the roll that dropped.</span></div>
        <div class="field" id="dyef"><label class="flabel" for="dye">Dye price</label><input class="in" id="dye" name="dye" value="${esc(toShort(end.dye))}" placeholder="e.g. 700m"><span class="small muted">What the dye is worth or sold for.</span></div>
      </div>
      <label class="field"><span>Date</span><input class="in" type="datetime-local" name="at" value="${esc(end.at)}" style="max-width:260px"></label>
      <div class="box" id="dres"></div>
      <span class="err" role="alert"></span>
    </div>${dFoot(d.end ? 'Save' : 'Log the drop', d.end && 'Reopen dice')}</form>`);
  const calc = () => {
    const fd = new FormData(form), kind = fd.get('kind'), rolls = Number(fd.get('rolls')), dye = parse(fd.get('dye'));
    const ok = Number.isInteger(rolls) && rolls >= 1 && (kind === 'six' || dye != null);
    return { ok, kind, rolls, dye, r: ok ? L.diceResult({ type: d.type, paid: d.paid, rolls, end: { kind, dye } }) : null };
  };
  const update = () => {
    const c = calc();
    $('#dyef').hidden = c.kind !== 'dye';
    $('#dres').innerHTML = `<div style="display:flex;align-items:center"><span class="grow" style="font-weight:600">${!c.ok ? 'Check the amounts' : c.r.pnl >= 0 ? 'Profit' : 'Loss'}</span><span class="big ${c.ok ? (c.r.pnl >= 0 ? 'pos' : 'neg') : 'muted'}">${c.ok ? signed(c.r.pnl) : '—'}</span></div>
      <div class="small muted">${c.ok ? `Got ${fmt(c.r.payout)} · spent ${fmt(c.r.spent)} (dice ${fmt(d.paid)} + ${c.rolls} × ${fmt(t.roll)})` : ''}</div>`;
  };
  form.addEventListener('input', update); form.addEventListener('change', update); update();
  form.querySelector('[data-del]')?.addEventListener('click', () => { byId(db.dice, d.id).end = null; closeModal(); commit(); });
  form.onsubmit = (e) => {
    e.preventDefault();
    const c = calc(), at = new FormData(form).get('at');
    if (!c.ok) return setErr(form, c.kind === 'dye' ? 'Enter the dye price, like 700m, and the total rolls (1 or more).' : 'Enter the total rolls (1 or more).');
    if (!at) return setErr(form, 'Pick the date.');
    if (c.kind === 'dye') db.prefs.dyePrice = c.dye;
    Object.assign(byId(db.dice, d.id), { rolls: c.rolls, end: { kind: c.kind, dye: c.kind === 'dye' ? c.dye : null, at } });
    closeModal(); commit();
  };
}

/* ---------- render ---------- */
const VIEWS = { coll: viewColl, dice: viewDice, inv: viewInv, history: viewHistory, cal: viewCal, todo: viewTodo, timers: viewTimers, stats: viewStats, settings: viewSettings };
const PLACEHOLDER = { coll: 'Search pieces or hex…', dice: 'Search…', inv: 'Search items or notes…', history: 'Search sold items…', cal: 'Search events…', todo: 'Search tasks…', timers: 'Search timers…', stats: 'Search…', settings: 'Search…' };
function render() {
  $('#side').innerHTML = sideHtml();
  const main = $('#view');
  const st = main.scrollTop, ws = $('#wscroll')?.scrollTop, cs = $('#calside')?.scrollTop;
  main.innerHTML = VIEWS[ui.view]();
  main.scrollTop = st;
  if (cs && $('#calside')) $('#calside').scrollTop = cs;
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
// duration picker: one field like "1d 2h 30m", stored as total minutes
const toMin = (every, unit) => Math.round((every * L.UNIT_MS[unit]) / 6e4);
const dhm = (min, label = 'Every', name = 'every', hint = 'Type it any way: 90m, 2h30, 1d 4h. It tidies itself up.') => `<div class="field"><label class="flabel" for="f-${name}">${label}</label>
    <input class="in dhmin" id="f-${name}" name="${name}" value="${L.fmtDhm(min)}" placeholder="e.g. 1d 2h 30m" style="max-width:220px"><span class="small muted">${hint}</span></div>`;
const sbBox = (on) => `<div class="chips"><label><input type="checkbox" name="sby" ${on ? 'checked' : ''}><span>${ic(P.star, 16)}Every Skyblock year<small class="muted">· 124h</small></span></label></div>`;
// "Every Skyblock year" fills and locks the start and the interval
function sbToggle(form, isEvent) {
  const el = form.elements, on = el.sby.checked;
  ['every', 'start'].concat(isEvent ? ['date'] : []).forEach((n) => (el[n].readOnly = on));
  if (!on) return;
  const a = new Date(toView(L.SB_YEAR_ANCHOR));
  el.every.value = L.fmtDhm(L.SB_YEAR_MIN);
  if (!isEvent) { el.start.value = localISO(a); return; }
  el.date.value = dKey(a); el.start.value = hm(a);
}
const readMin = (fd, name = 'every') => L.parseDhm(fd.get(name)) ?? 0; // unreadable counts as 0, which every form rejects
const intOf = (v, min = 1) => Math.max(min, parseInt(v, 10) || min);
const setErr = (form, msg) => { form.querySelector('.err').textContent = msg; };

// a flip shows its item image if it has one, else its category icon
const flipIcon = (f, m, size) => (f.img ? `<img class="pix" src="${esc(f.img)}" alt="" style="width:${size + 8}px;height:${size + 8}px">` : ic(P[m.icon], size));
// item name -> icon path, from the bundled item list (items.js)
const ITEM_ROW = new Map(ITEMS.map((r) => [r[0].toLowerCase(), r]));
const itemPic = (name, size) => { const src = itemImg(name); return src ? `<img class="pix" src="${src}" alt="" width="${size}" height="${size}" style="vertical-align:middle;margin-right:6px">` : ''; };
const itemSrc = (file) => (/^(data|https):/.test(file) ? file : 'items/' + file); // bundled file, our repo's newer icon, or a drawn head
const itemImg = (name) => { const file = ITEM_ROW.get(String(name).trim().toLowerCase())?.[1]; return file ? itemSrc(file) : null; };
// Items newer than this version, without updating the app:
// 1. our GitHub repo: the item list and icons as last rebuilt (Hypixel pack textures included)
// 2. NEU-REPO: items added after that rebuild; icon = head skin, else the plain Minecraft texture of its model
// 3. Hypixel API: items in neither (same icon rules)
const GH_SRC = 'https://raw.githubusercontent.com/AlphaGenesis/SkyblockTracker/main/src/', NEU_REPO = 'NotEnoughUpdates/NotEnoughUpdates-REPO';
const BUNDLED = new Set(ITEMS.map((r) => r[1]));
const setItem = (name, file) => { const k = name.toLowerCase(), row = ITEM_ROW.get(k); if (row) row[1] = file; else { const r = [name, file]; ITEMS.push(r); ITEM_ROW.set(k, r); } };
async function loadItems() {
  let ids = NEU_IDS, icons = MODEL_ICONS;
  const add = (it) => { // skipped when a list already has it with an icon
    if (!it || ITEM_ROW.get(it.name.toLowerCase())?.[1]) return;
    setItem(it.name, icons[it.model] || '');
    if (it.skin) headFace(it.skin).then((d) => setItem(it.name, d), () => {}); // keeps the model icon if the skin can't load
  };
  const hypList = fetch('https://api.hypixel.net/v2/resources/skyblock/items').then((r) => r.json()); // in parallel, applied last
  const remote = (f) => (!f || BUNDLED.has(f) ? f : GH_SRC + 'items/' + f);
  try {
    const [it, nx] = await Promise.all(['items.js', 'neu.js'].map((f) => fetch(GH_SRC + f).then((r) => (r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status))))));
    const val = (txt, n) => JSON.parse(txt.match(new RegExp(`^const ${n} = (.*);$`, 'm'))[1]); // data only, never run
    for (const [n, f] of val(it, 'ITEMS')) if (typeof n === 'string' && typeof f === 'string' && /^[\w.]*$/.test(f) && (f || !ITEM_ROW.has(n.toLowerCase()))) setItem(n, remote(f));
    ids = val(nx, 'NEU_IDS'); icons = Object.fromEntries(Object.entries(val(nx, 'MODEL_ICONS')).map(([m, f]) => [m, remote(f)]));
  } catch (e) { console.warn('Item list from GitHub not loaded:', e); }
  try {
    const tree = await (await fetch(`https://api.github.com/repos/${NEU_REPO}/git/trees/master?recursive=1`)).json();
    const known = new Set(String(ids).split(',')), cache = (() => { try { return JSON.parse(localStorage.getItem('neuItems')) || {}; } catch { return {}; } })();
    let fetches = 0;
    await Promise.all((tree.tree || []).map((x) => (x.path.match(/^items\/(.+)\.json$/) || [])[1]).filter((id) => id && !known.has(id)).map(async (id) => {
      if (!(id in cache)) {
        if (++fetches > 300) return; // shortcut: at most 300 new items per launch, the rest come next launch
        try { cache[id] = L.neuItem(id, await (await fetch(`https://raw.githubusercontent.com/${NEU_REPO}/master/items/${encodeURIComponent(id)}.json`)).json()) || 0; } catch { return; }
      }
      add(cache[id] || null);
    }));
    try { localStorage.setItem('neuItems', JSON.stringify(cache)); } catch {}
  } catch (e) { console.warn('NEU-REPO items not loaded:', e); }
  try { const hl = await hypList; setHypColors(hl.items); for (const h of hl.items || []) add(L.hypItem(h)); } catch (e) { console.warn('Hypixel item list not loaded:', e); }
  ITEMS.sort((a, b) => (a[0].toLowerCase() < b[0].toLowerCase() ? -1 : 1));
}
// Face of a player-head skin (8x8 + hat layer), as the build tool draws it; cached per skin in this browser.
const headFace = (hash) => new Promise((res, rej) => {
  const key = 'head:' + hash;
  try { const c = localStorage.getItem(key); if (c) return res(c); } catch {}
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const c = document.createElement('canvas'), g = c.getContext('2d');
    c.width = c.height = 8;
    g.drawImage(img, 8, 8, 8, 8, 0, 0, 8, 8);
    if (img.height >= 32) g.drawImage(img, 40, 8, 8, 8, 0, 0, 8, 8);
    const d = c.toDataURL();
    try { localStorage.setItem(key, d); } catch {}
    res(d);
  };
  img.onerror = rej;
  img.src = 'https://textures.minecraft.net/texture/' + hash;
});
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
    sugg.innerHTML = list.map(([n, file], i) => `<button type="button" role="option" id="sg${i}" data-i="${i}" tabindex="-1">${file ? `<img class="pix" src="${esc(itemSrc(file))}" alt="">` : '<span class="noimg"></span>'}<span class="ell">${esc(n)}</span></button>`).join('');
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
    if (!locked()) { img = file ? itemSrc(file) : null; imgFrom = img ? 'auto' : null; }
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
    igrid.innerHTML = hits.map(([n, file]) => `<button type="button" role="option" data-file="${esc(file)}" title="${esc(n)}" aria-label="${esc(n)}"><img class="pix" src="${esc(itemSrc(file))}" alt=""></button>`).join('')
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
    img = itemSrc(b.dataset.file); imgFrom = 'manual';
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
  const f = derive(raw), m = catMeta(f.cat), partial = !f.sold && f.qty > 1;
  const form = openModal(`<form novalidate>${dHead(f.sold ? 'Edit sale' : 'Close flip', 'Enter what you sold it for. Profit or loss is calculated for you.')}
    <div class="dbody">
      <div class="box" style="flex-direction:row;align-items:center;gap:14px">
        <div class="ico" style="background:${m.tint};color:${m.ink}">${flipIcon(f, m, 24)}</div>
        <div class="grow" style="display:flex;flex-direction:column;gap:2px;min-width:0"><div style="display:flex;gap:8px;align-items:center"><b class="ell">${esc(f.name)}</b><span class="pill" style="background:${m.tint};color:${m.ink}">${esc(m.label)}</span></div>
          <span class="small muted">Bought ${dateLabel(f.bought)} · ${f.unit === 'lot' ? 'lot of ' + f.qty + ' for ' + fmt(f.price) : f.qty + ' × ' + fmt(f.price) + ' each'}</span></div>
        <div style="text-align:right"><span class="small muted">Cost</span><div class="disp" style="font-size:18px">${fmt(f.cost)}</div></div></div>
      ${partial ? `<div class="field"><label class="flabel" for="sqty">Quantity sold <small class="muted">· of ${f.qty}</small></label><input class="in" id="sqty" name="sqty" type="number" min="1" max="${f.qty}" step="1" value="${f.qty}" style="max-width:160px"><span class="small muted">Sell part of it: the rest stays open as its own flip.</span></div>` : ''}
      <div class="cols">
        <div class="field"><label class="flabel" for="sell">Sell price</label><input class="in" id="sell" name="sell" value="${esc(toShort(f.sell))}" placeholder="760m" autofocus></div>
        <div class="field"><span class="flabel">Price is</span>${radios('mode', [['total', 'Total'], ['each', 'Each']], 'total', 'Sell price applies to')}</div>
        <div class="field"><span class="flabel">Sold on</span>${radios('market', [['ah', 'AH'], ['bz', 'Bazaar']], db.prefs.market || 'ah', 'Sold on')}</div>
      </div>
      <div class="field"><label class="flabel" for="fees">Fees &amp; tax</label><input class="in" id="fees" name="fees" value="${esc(f.fees ? toShort(f.fees) : '')}" placeholder="0" style="max-width:220px"><span class="small muted" id="feehint"></span></div>
      <label class="field"><span>Sell date</span><input class="in" type="datetime-local" name="soldAt" value="${esc(f.soldAt || localISO(new Date()))}"></label>
      <div class="box" id="res"></div>
      <span class="err" role="alert"></span>
    </div>${dFoot(f.sold ? 'Save sale' : 'Close flip', f.sold && 'Reopen flip')}</form>`);
  const calc = () => {
    const fd = new FormData(form), sv = parse(fd.get('sell')), fees = fd.get('fees').trim() ? parse(fd.get('fees')) : 0;
    const n = partial ? Number(fd.get('sqty')) : f.qty, cost = (f.cost * n) / f.qty;
    const ok = sv != null && fees != null && Number.isInteger(n) && n >= 1 && n <= f.qty;
    const revenue = ok ? (fd.get('mode') === 'each' ? sv * n : sv) : 0;
    return { ok, n, cost, revenue, fees, pnl: revenue - fees - cost };
  };
  let feesAuto = !(f.sold && f.fees); // an existing sale keeps the fees it was saved with
  const autoFees = () => {
    const fd = new FormData(form), sv = parse(fd.get('sell')), n = partial ? Number(fd.get('sqty')) : f.qty;
    return sv == null || !(n >= 1) ? null : L.sellFees(fd.get('market'), sv, n, fd.get('mode') === 'each', db.prefs.bzTax ?? 1.25);
  };
  form.addEventListener('click', (e) => { if (e.target.closest('[data-recalc]')) { feesAuto = true; update(); } });
  const update = (e) => {
    if (e?.target?.id === 'fees') feesAuto = false;
    const a = autoFees();
    if (feesAuto) form.elements.fees.value = a ? toShort(a) : '';
    const hint = feesAuto ? (new FormData(form).get('market') === 'bz' ? `Calculated: Bazaar tax ${db.prefs.bzTax ?? 1.25}% (change it in Settings). You can edit it.` : 'Calculated: AH BIN listing fee + 1% claim tax. You can edit it.')
      : a != null ? `Edited by hand. <button type="button" class="link" data-recalc="">Use calculated (${fmt(a)})</button>` : 'Edited by hand.';
    if ($('#feehint').innerHTML !== hint) $('#feehint').innerHTML = hint; // redrawing it under the mouse would swallow the click on the button
    const r = calc(), gain = r.pnl >= 0;
    $('#res').innerHTML = `<div style="display:flex;align-items:center"><span class="grow" style="font-weight:600">${!r.ok ? 'Check the amounts' : gain ? 'Profit' : 'Loss'}</span><span class="big ${r.ok ? (gain ? 'pos' : 'neg') : 'muted'}">${r.ok ? signed(r.pnl) : '—'}</span></div>
      <div style="display:flex;gap:24px;flex-wrap:wrap" class="small"><span class="muted">Revenue <b style="color:var(--text)">${r.ok ? fmt(r.revenue) : '—'}</b></span><span class="muted">Per item <b style="color:var(--text)">${r.ok ? fmt(r.revenue / r.n) : '—'}</b></span><span class="muted">ROI <b style="color:var(--text)">${r.ok ? (gain ? '+' : '−') + Math.abs((r.pnl / r.cost) * 100).toFixed(1) + '%' : '—'}</b></span>${r.ok && r.n < f.qty ? `<span class="muted">Cost of these ${r.n} <b style="color:var(--text)">${fmt(r.cost)}</b> · ${f.qty - r.n} stay open</span>` : ''}</div>`;
  };
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.querySelector('[data-del]')?.addEventListener('click', () => {
    Object.assign(byId(db.flips, f.id), { sell: null, fees: 0, soldAt: null }); closeModal(); commit();
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    const r = calc(), soldAt = new FormData(form).get('soldAt');
    if (!r.ok) return setErr(form, partial ? `Enter a valid sell price (and fees), like 760m, and a quantity from 1 to ${f.qty}.` : 'Enter a valid sell price (and fees), like 760m.');
    if (!soldAt) return setErr(form, 'Pick a sell date.');
    db.prefs.market = new FormData(form).get('market');
    const orig = byId(db.flips, f.id);
    if (r.n < f.qty) {
      const p = L.splitBuy(orig.price, orig.unit, orig.qty, r.n);
      db.flips.push({ ...orig, id: uid(), qty: r.n, price: p.sold, sell: r.revenue, fees: r.fees, soldAt });
      Object.assign(orig, { qty: orig.qty - r.n, price: p.rest });
    } else Object.assign(orig, { sell: r.revenue, fees: r.fees, soldAt });
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
      <td><input class="in" name="fees_${f.id}" placeholder="0" aria-label="Fees for ${esc(f.name)}" style="height:38px;width:100px"></td>
      <td class="res num" style="font-weight:600;text-align:right">—</td></tr>`;
  }).join('');
  const form = openModal(`<form novalidate>${dHead(`Sell ${flips.length} flips`, 'Enter what each one sold for. Profit or loss is calculated for each.')}
    <div class="dbody">
      <div class="table" style="margin:0"><table class="hist" style="min-width:720px"><thead><tr><th>Item</th><th>Sell price</th><th>Price is</th><th>Fees</th><th style="text-align:right">Result</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-end"><label class="field"><span>Sell date <small>· for all of them</small></span><input class="in" type="datetime-local" name="soldAt" value="${localISO(new Date())}" style="max-width:260px"></label>
        <div class="field"><span class="flabel">Sold on</span>${radios('market', [['ah', 'AH'], ['bz', 'Bazaar']], db.prefs.market || 'ah', 'Sold on')}</div></div>
      <span class="small muted">Fees are calculated from the sell price (AH: BIN listing fee + 1% claim tax; Bazaar: ${db.prefs.bzTax ?? 1.25}%). You can edit any of them.</span>
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
  const handFees = new Set(); // rows whose fees were typed by hand
  const update = (e) => {
    const nm = e?.target?.name || '';
    if (nm.startsWith('fees_')) handFees.add(nm.slice(5));
    const fd = new FormData(form);
    for (const f of flips) {
      if (handFees.has(f.id)) continue;
      const sv = parse(fd.get('sell_' + f.id));
      form.elements['fees_' + f.id].value = sv == null ? '' : toShort(L.sellFees(fd.get('market'), sv, f.qty, fd.get('mode_' + f.id) === 'each', db.prefs.bzTax ?? 1.25));
    }
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
    db.prefs.market = new FormData(form).get('market');
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
    date: fd.get('date'), start: fd.get('start'), dur: readMin(fd, 'dur'), tz: dispTz(),
    repeat: fd.get('rep') ? { sbYear: !!fd.get('sby'), every: fd.get('sby') ? L.SB_YEAR_MIN : readMin(fd), unit: 'minutes', end: fd.get('ends'), count: intOf(fd.get('count')), until: fd.get('until'), show: Math.min(999, intOf(fd.get('show'))) } : null,
    reminder: fd.get('reminder') === '' ? null : Number(fd.get('reminder')), note: fd.get('note').trim(),
  };
}
function eventModal(ev, preset = {}) {
  const isEdit = !!ev;
  const vis = db.calendars.filter((c) => c.visible);
  ev = ev || Object.assign({ name: '', color: 'violet', calendars: vis[0] ? [vis[0].id] : [], date: dKey(vNow()), start: '21:00', dur: 30, repeat: null, reminder: 15, note: '', tz: dispTz() }, preset);
  const w = wallToView(ev.date, ev.start, ev.tz);
  const dur = L.eventMin(ev);
  const r = ev.repeat || { every: 1, unit: 'weeks', end: 'never', count: 5, until: '' };
  const form = openModal(`<form novalidate>${dHead(isEdit ? 'Edit event' : 'New event', isEdit ? 'Changes apply to this event and all its repeats.' : 'Add an event to one or more calendars.')}
    <div class="dbody">
      <label class="field"><span>Event name</span><input class="in" name="name" value="${esc(ev.name)}" placeholder="e.g. Dark Auction" autofocus></label>
      <div class="field"><span class="flabel">Color</span>${swatches(ev.color)}</div>
      ${db.calendars.length ? `<div class="field"><span class="flabel">Calendars <small class="muted">· optional, an event in no calendar is always shown</small></span><div class="chips" role="group" aria-label="Calendars">${db.calendars.map((c) => `<label><input type="checkbox" name="cal" value="${c.id}" ${ev.calendars.includes(c.id) ? 'checked' : ''}><span><span class="dot" style="background:${(COLORS[c.color] || COLORS.violet).ink}"></span>${esc(c.name)}</span></label>`).join('')}</div></div>` : ''}
      <div class="box">
        <div class="switchrow"><div class="grow"><label for="rep" style="font-weight:500">Repeat</label><div class="small muted">Adds this event again at a fixed interval</div></div><input type="checkbox" class="switch" id="rep" name="rep" ${ev.repeat ? 'checked' : ''}></div>
        <div class="rep-opts" style="flex-direction:column;gap:14px">
          ${sbBox(r.sbYear)}${dhm(toMin(r.every, r.unit), 'Every', 'every', 'Counted from one start to the next. Type it any way: 90m, 2h30, 1d 4h.')}
          <div class="field"><span class="flabel">Show in the calendar</span><div style="display:flex;align-items:center;gap:10px">${stepper('show', r.show || 5, 'Occurrences shown', 1, 999)}<span class="small muted">next occurrences at a time</span></div></div>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><span class="flabel">Ends</span>${radios('ends', [['never', 'Never'], ['date', 'On a date'], ['after', 'After']], r.end, 'Repeat ends')}
            <input class="in" type="date" name="until" value="${esc(r.until)}" aria-label="End date" style="width:auto">
            <input class="in" type="number" name="count" min="1" value="${r.count}" aria-label="Number of times" style="width:90px"><span class="small muted">times</span></div>
          <div><span class="flabel">Next occurrences</span><div id="nextocc" class="small muted" style="display:flex;flex-direction:column;gap:2px;margin-top:6px"></div></div>
        </div>
      </div>
      <div class="cols">
        <label class="field"><span>Date</span><input class="in" type="date" name="date" value="${esc(w.date)}"></label>
        <label class="field"><span>Starts <small>· ${esc(dispTz().replace(/_/g, ' '))}</small></span><input class="in" type="time" name="start" value="${esc(w.time)}"></label>
      </div>
      ${dhm(dur, 'Duration', 'dur', 'How long it lasts from the start time: 30m, 1h, 2h30…')}
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
    if (!e.repeat || !e.date || !e.start) return;
    const from = L.zonedMs(e.date, e.start, e.tz);
    const list = occurrences(e, from, from + 400 * 864e5).slice(0, 6);
    const more = e.repeat.end === 'after' && list.length >= e.repeat.count ? 'then stops' : e.repeat.end === 'date' ? (e.repeat.until ? 'until ' + dateLabel(e.repeat.until + 'T00:00') : '') : 'and so on…';
    $('#nextocc').innerHTML = list.map((o) => { const d = new Date(toView(o.start)); return `<span>${DOWS[(d.getDay() + 6) % 7]} ${shortDate(d)} · ${hm(d)}</span>`; }).join('') + `<span>${more}</span>`;
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
    if (!d.date || !d.start) return setErr(form, 'Pick a date and a start time.');
    if (d.dur < 1) return setErr(form, 'Enter a duration of at least 1 minute, like 30m or 2h.');
    if (d.repeat && d.repeat.every < 1) return setErr(form, 'Enter a repeat interval of at least 1 minute, like 3h or 1d.');
    if (d.repeat && d.repeat.end === 'date' && !d.repeat.until) return setErr(form, 'Pick the date the repeat ends.');
    if (isEdit) { const o = byId(db.events, ev.id); delete o.end; Object.assign(o, d); }
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
    </div>${dFoot(isEdit ? 'Save changes' : 'Add calendar', isEdit && 'Delete')}</form>`);
  form.querySelector('[data-del]')?.addEventListener('click', () => {
    const only = db.events.filter((e) => e.calendars.length === 1 && e.calendars[0] === c.id).length;
    if (!confirm(`Delete the calendar "${c.name}"?` + (only ? `\n\n${only} event(s) that are only in this calendar will be deleted too.` : ''))) return;
    db.calendars = db.calendars.filter((x) => x.id !== c.id);
    db.events = db.events.filter((e) => {
      const had = e.calendars.includes(c.id);
      e.calendars = e.calendars.filter((id) => id !== c.id);
      return !had || e.calendars.length; // events that were only in this calendar go with it; events in no calendar stay
    });
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
  const start = vNow(); start.setMinutes(0, 0, 0);
  t = t || { name: '', start: localISO(start), every: 1, unit: 'days', passive: false, shared: false, tz: dispTz() };
  const tw = wallToView(t.start.slice(0, 10), t.start.slice(11, 16), t.tz);
  const form = openModal(`<form novalidate>${dHead(isEdit ? 'Edit to do' : 'New to do', 'It comes back as "to do" every time the interval passes.')}
    <div class="dbody">
      <label class="field"><span>Task</span><input class="in" name="name" value="${esc(t.name)}" placeholder="e.g. Collect minions" autofocus></label>
      ${sbBox(t.sbYear)}${dhm(toMin(t.every, t.unit), 'Resets every')}
      <label class="field"><span>First reset</span><input class="in" type="datetime-local" name="start" value="${esc(tw.date + 'T' + tw.time)}"><span class="small muted">Resets at this time, then again after every interval.</span></label>
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
    if (!sby && readMin(fd) < 1) return setErr(form, 'Enter an interval of at least 1 minute, like 30m, 12h or 1d.');
    const d = { name, tz: dispTz(), sbYear: sby, start: sby ? localISO(new Date(toView(L.SB_YEAR_ANCHOR))) : fd.get('start'), every: sby ? L.SB_YEAR_MIN : readMin(fd), unit: 'minutes', passive: !!fd.get('passive'), shared: !!fd.get('shared') };
    if (isEdit) {
      const cur = byId(db.todos, t.id);
      if (cur.shared !== d.shared) cur.done = {}; // ticks are keyed differently once sharing changes
      Object.assign(cur, d);
    } else db.todos.push(Object.assign({ id: uid(), done: {} }, d));
    closeModal(); commit();
  };
}

// Every amount a passive to do earned for this profile: edit, delete, or add one you forgot to log.
// opts: { todo } for one to do, or { from, to, sub } for a time window over every to do
function passiveModal(opts) {
  const t = opts.todo, ms = (x) => new Date(x.at).getTime();
  const rows = myPassive().filter((x) => (!t || x.todoId === t.id) && (opts.from == null || ms(x) >= opts.from) && (opts.to == null || ms(x) < opts.to)).sort((a, b) => b.at.localeCompare(a.at));
  const shown = new Set(rows.map((x) => x.id));
  const todos = db.todos.filter((x) => x.passive);
  const todoPick = (id) => `<select class="in" name="todo_${id}" aria-label="To do" style="width:170px">${todos.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select>`;
  const row = (x, id) => `<div class="prow" data-pid="${id}" style="display:flex;gap:8px;align-items:center">
      ${t ? '' : x.todoId ? `<span class="ell" style="width:170px;font-weight:500" title="${esc(x.name)}">${esc((byId(db.todos, x.todoId) || x).name)}</span>` : todoPick(id)}
      <input class="in" type="datetime-local" name="at_${id}" value="${esc(localISO(new Date(x.at)))}" aria-label="Date" style="flex:1">
      <input class="in" name="amt_${id}" value="${esc(toShort(x.amount))}" placeholder="e.g. 12m" aria-label="Amount" style="width:130px">
      <button type="button" class="iconbtn" data-delrow aria-label="Delete this one">${ic(P.trash, 16)}</button></div>`;
  const form = openModal(`<form novalidate>${dHead('Passive income', esc(t ? t.name : opts.sub) + ' · ' + esc(profileName(db.activeProfile)))}
    <div class="dbody">
      <div id="prows" style="display:flex;flex-direction:column;gap:8px">${rows.map((x) => row(x, x.id)).join('')}</div>
      <span class="small muted" id="pempty" ${rows.length ? 'hidden' : ''}>Nothing logged yet.</span>
      ${t || todos.length ? `<div><button type="button" class="btn ghost sm" data-addrow>${ic(P.plus, 16, 2)}Add one</button></div>` : ''}
      <div class="box" style="flex-direction:row;align-items:center"><span class="grow muted">Total</span><b class="big" id="ptot" style="color:${PASSIVE.ink}"></b></div>
      <span class="err" role="alert"></span>
    </div>${dFoot('Save')}</form>`, t ? '' : 'wide');
  let n = 0;
  const live = () => [...form.querySelectorAll('.prow')].map((r) => r.dataset.pid);
  const update = () => {
    const fd = new FormData(form);
    $('#ptot').textContent = fmt(sum(live(), (id) => parse(fd.get('amt_' + id)) || 0));
    $('#pempty').hidden = live().length > 0;
  };
  form.addEventListener('input', (e) => {
    const r = e.target.closest('.prow');
    if (r) { r.querySelectorAll('input').forEach((i) => i.classList.remove('bad')); if (!form.querySelector('.prow .bad')) setErr(form, ''); }
    update();
  });
  form.addEventListener('click', (e) => {
    if (e.target.closest('[data-delrow]')) { e.target.closest('.prow').remove(); update(); }
    if (e.target.closest('[data-addrow]')) {
      $('#prows').insertAdjacentHTML('afterbegin', row({ at: new Date().toISOString(), amount: null }, '_n' + n++));
      form.querySelector('.prow input[name^=amt_]').focus(); update();
    }
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form), ids = live();
    const bad = ids.filter((id) => parse(fd.get('amt_' + id)) == null || !fd.get('at_' + id));
    form.querySelectorAll('.prow input').forEach((i) => i.classList.remove('bad'));
    bad.forEach((id) => form.querySelectorAll(`[data-pid="${id}"] input`).forEach((i) => i.classList.add('bad')));
    if (bad.length) return setErr(form, 'Each line needs a date and an amount, like 12m (0 is fine).');
    const keep = new Set(ids);
    db.passive = db.passive.filter((x) => !shown.has(x.id) || keep.has(x.id)); // only the lines this window listed can be deleted
    for (const id of ids) {
      const data = { amount: parse(fd.get('amt_' + id)), at: new Date(fd.get('at_' + id)).toISOString() };
      const td = t || byId(db.todos, fd.get('todo_' + id));
      if (id.startsWith('_n')) db.passive.push({ id: uid(), profileId: db.activeProfile, todoId: td.id, name: td.name, ...data });
      else Object.assign(byId(db.passive, id), data);
    }
    closeModal(); commit();
  };
  update();
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

function profileModal(p, canDelete = true) {
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
    db.dice = db.dice.filter((x) => x.profileId !== p.id);
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
  collOpen: () => { ui.collOpen = !ui.collOpen; render(); },
  collClear: () => { ui.collSel = { slot: new Set(), kind: new Set(), pat: false, gone: false }; render(); },
  collTog: (b) => { const F = ui.collSel, g = b.dataset.g; if (g === 'pat' || g === 'gone') F[g] = !F[g]; else F[g].has(b.dataset.v) ? F[g].delete(b.dataset.v) : F[g].add(b.dataset.v); render(); $(`[data-act=collTog][data-g="${g}"][data-v="${b.dataset.v}"]`)?.focus(); },
  collRefresh: () => collRefresh(),
  collAccount: () => collAccountModal(),
  openLink: (b) => (T ? T.core.invoke('open_link', { site: b.dataset.v }).catch((e) => alert('Could not open the browser: ' + e)) : window.open(LINKS[b.dataset.v], '_blank', 'noopener')),
  collInfo: (b) => collInfoModal(viewPieces()[b.dataset.id]),
  collPick: (b) => { const s = ui.collPick, id = b.dataset.id; s.has(id) ? s.delete(id) : s.add(id); render(); },
  collPickAll: () => { $$('[data-act=collPick]').forEach((x) => ui.collPick.add(x.dataset.id)); render(); },
  collPickNone: () => { ui.collPick.clear(); render(); },
  collCopy: (b) => {
    const order = $$('[data-act=collPick]').map((x) => x.dataset.id), ids = [...ui.collPick].sort((a, c) => order.indexOf(a) - order.indexOf(c));
    const rows = ids.map((id) => viewPieces()[id]).filter(Boolean).map((x) => { const m = hexMatch(x.hex); return { name: x.name, hex: x.hex, top: m?.name || '-', dE: m?.dE ?? 0, abs: m?.abs ?? 0 }; });
    navigator.clipboard.writeText('```\n' + L.exportLines(rows) + '\n```').then(() => { b.textContent = 'Copied ✓'; }, (e) => alert('Could not copy: ' + e));
  },
  collTab: (b) => { ui.collTab = b.dataset.v; render(); },
  collPeek: () => collPeekModal(),
  collPeekEnd: () => { ui.peek = null; ui.collPick.clear(); ui.setRef = null; render(); },
  setTier: (b) => { const n = +b.dataset.v, t = new Set(db.prefs.coll.setTiers || [0, 1, 2, 3]); t.has(n) ? t.delete(n) : t.add(n); db.prefs.coll.setTiers = [...t].sort(); commit(); },
  collFades: () => { db.prefs.coll.fades = !useFades(); commit(); },
  setCat: (b) => { ui.setCat = ui.setCat === b.dataset.v ? null : b.dataset.v; render(); },
  setTarget: (b) => { ui.setRef = { hex: b.dataset.h, name: b.dataset.n }; render(); },
  collSet: (b) => { if (b.closest('#modal')) closeModal(); ui.setRef = { uuid: b.dataset.id }; ui.collTab = 'sets'; render(); },
  collPrice: (b) => collPriceModal(db.coll.pieces[b.dataset.id]),
  collForget: (b) => { delete db.coll.pieces[b.dataset.id]; commit(); },
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
    eventModal(null, { date: b.dataset.day, start: pad(Math.floor(mins / 60)) + ':' + pad(mins % 60), dur: 60 });
  },
  newEvent: () => eventModal(null, { date: dKey(ui.calMode === 'week' && monday(ui.anchor) > vNow() ? monday(ui.anchor) : vNow()) }),
  editEvent: (b) => (b.dataset.id.startsWith('hyp:') ? hypModal(b.dataset.id.slice(4)) : eventModal(byId(db.events, b.dataset.id))),
  hypRefresh: () => fetchElection(true),
  calFold: (b) => { const f = (db.prefs.calFold = db.prefs.calFold || {}); f[b.dataset.k] = !f[b.dataset.k]; commit(); },
  newCal: () => calModal(),
  editCal: (b) => calModal(byId(db.calendars, b.dataset.id)),
  newTodo: () => todoModal(),
  passiveEdit: (b) => passiveModal({ todo: byId(db.todos, b.dataset.id) }),
  passiveWeek: () => passiveModal({ from: Date.now() - 7 * 864e5, sub: 'Last 7 days' }),
  breakdown: (b) => breakdownModal(b.dataset.k),
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
  renameProfile: (b) => { ui.pOpen = false; render(); profileModal(byId(db.profiles, b.dataset.id)); },
  toggleAll: () => { ui.catsOpen = !ui.catsOpen; render(); },
  editProfile: (b) => profileModal(byId(db.profiles, b.dataset.id)),
  openData: () => T.core.invoke('open_data_dir').catch((e) => alert('Could not open the folder: ' + e)),
  checkUpdate: () => checkUpdate(),
  installUpdate: () => installUpdate(),
  reloadData: async () => { await saving; await load(); render(); },
  period: (b) => { db.prefs.period = b.dataset.v; commit(); },
  prefSet: (b) => { db.prefs[b.dataset.k] = b.dataset.v; commit(); },
  chartSet: (b) => { db.prefs.chart[b.dataset.k] = b.dataset.v; commit(); },
  newDice: () => diceModal(),
  editDice: (b) => diceModal(byId(db.dice, b.dataset.id)),
  diceDrop: (b) => dropModal(byId(db.dice, b.dataset.id)),
  diceRoll: (b) => { const d = byId(db.dice, b.dataset.id); d.rolls = Math.max(0, d.rolls + Number(b.dataset.v)); commit(); },
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
  if (e.target.id === 'modal' && $('#modal .dialog.img, #modal .dialog.info')) return closeModal(); // read-only windows
  const b = e.target.closest('[data-act]');
  if (ui.pOpen && !e.target.closest('.pmenu')) { ui.pOpen = false; $('#side').innerHTML = sideHtml(); }
  if (b && A[b.dataset.act]) A[b.dataset.act](b, e);
});
document.addEventListener('change', (e) => {
  if (e.target.classList?.contains('dhmin') && !e.target.readOnly) {
    const m = L.parseDhm(e.target.value);
    e.target.classList.toggle('bad', m == null);
    if (m != null) e.target.value = L.fmtDhm(m);
  }
  const id = e.target.dataset?.calvis;
  if (id) { byId(db.calendars, id).visible = e.target.checked; commit(); }
  const ck = e.target.dataset?.chartcat;
  if (ck) { const h = new Set(db.prefs.chart.hidden); e.target.checked ? h.delete(ck) : h.add(ck); db.prefs.chart.hidden = [...h]; commit(); }
  if (e.target.dataset?.hyp) { db.prefs.hyp.types[e.target.dataset.hyp] = e.target.checked; commit(); }
  if (e.target.matches?.('[data-hypvis]')) { db.prefs.hyp.visible = e.target.checked; commit(); }
  if (e.target.name === 'hyplimit') setHypLimit(e.target);
  if (e.target.matches?.('[data-tz]')) { db.prefs.tz = e.target.value; commit(); }
  if (e.target.id === 'bztax') { const v = Number(e.target.value); if (e.target.value !== '' && v >= 0 && v <= 1.25) { db.prefs.bzTax = v; commit(); } else e.target.value = db.prefs.bzTax ?? 1.25; }
  if (e.target.id === 'autoupd') { db.prefs.autoUpdate = e.target.checked; commit(); if (e.target.checked && upd.avail) installUpdate(); }
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
function slide(sub, mutate, sel = '.navrow') { // animate rows from their old position to the new one
  const rows = [...sub.querySelectorAll(sel)];
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
const saveCalOrder = (keys) => { db.prefs.calOrder = keys; commit(); };
// Zoom of the whole app (50% to 200%, saved): Ctrl + mouse wheel anywhere, or the buttons in the top bar.
let zoomSave;
const appZoom = () => db.prefs.zoom || 1;
function applyZoom() {
  const v = appZoom();
  if (T?.webview) T.webview.getCurrentWebview().setZoom(v).catch(() => {});
  else document.documentElement.style.zoom = v; // in a plain browser
  $('#zoomval').textContent = Math.round(v * 100) + '%';
}
function stepZoom(dir) {
  const v = dir ? Math.round(Math.min(2, Math.max(0.5, appZoom() + dir * 0.1)) * 100) / 100 : 1;
  if (v === appZoom()) return;
  db.prefs.zoom = v;
  applyZoom();
  clearTimeout(zoomSave); zoomSave = setTimeout(save, 400); // save once the zooming stops
}
document.addEventListener('wheel', (e) => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  stepZoom(-Math.sign(e.deltaY || e.deltaX));
}, { passive: false });
$('.appzoom').addEventListener('click', (e) => { const b = e.target.closest('[data-zoom]'); if (b) stepZoom(+b.dataset.zoom); });
document.addEventListener('change', (e) => {
  if (e.target.id !== 'sethex') return;
  const h = e.target.value.trim().replace(/^#/, '').toUpperCase();
  if (/^[0-9A-F]{6}$/.test(h)) { ui.setRef = { hex: h }; render(); $('#sethex')?.focus(); } else e.target.setCustomValidity('A hex is 6 characters, like F2DF11'), e.target.reportValidity();
});
document.addEventListener('dragstart', (e) => {
  const grip = e.target.closest?.('.cphead .grip');
  if (!grip) return;
  const sec = grip.closest('.cpanel');
  dragId = 'panel:' + sec.dataset.panel;
  sec.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragId);
  e.dataTransfer.setDragImage(sec, 24, 20);
});
document.addEventListener('dragover', (e) => {
  if (!dragId?.startsWith('panel:')) return;
  const side = e.target.closest?.('.calside');
  if (!side) return;
  e.preventDefault();
  const drag = side.querySelector('.cpanel.dragging'), over = e.target.closest('.cpanel');
  if (!drag || !over || over === drag) return;
  const r = over.getBoundingClientRect();
  const ref = e.clientY > r.top + r.height / 2 ? over.nextElementSibling : over;
  if (ref === drag || ref === drag.nextElementSibling) return;
  slide(side, () => side.insertBefore(drag, ref), '.cpanel');
});
document.addEventListener('dragend', () => {
  if (!dragId?.startsWith('panel:')) return;
  dragId = null;
  saveCalOrder([...document.querySelectorAll('.calside .cpanel')].map((x) => x.dataset.panel));
});
document.addEventListener('keydown', (e) => {
  const t = e.target.closest?.('.cptitle');
  if (!t || !e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  e.preventDefault();
  const keys = calOrder(), i = keys.indexOf(t.dataset.k), j = i + (e.key === 'ArrowUp' ? -1 : 1);
  if (j < 0 || j >= keys.length) return;
  [keys[i], keys[j]] = [keys[j], keys[i]];
  saveCalOrder(keys);
  $(`.cptitle[data-k="${t.dataset.k}"]`).focus();
});
document.addEventListener('dragstart', (e) => {
  const row = e.target.closest?.('.sub .navrow');
  if (!row) return;
  dragId = row.dataset.catId;
  row.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragId);
});
document.addEventListener('dragover', (e) => {
  if (!dragId || dragId.startsWith('panel:')) return;
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
  if (!dragId || dragId.startsWith('panel:')) return;
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

const setHypLimit = (inp) => { const n = parseInt(inp.value, 10); if (n >= 1 && n <= 99) { db.prefs.hyp.limit = n; commit(); } else inp.value = db.prefs.hyp.limit; };
document.addEventListener('input', (e) => { if (e.target.name === 'hyplimit' && !e.isTrusted) setHypLimit(e.target); }); // the − / + buttons

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
      if (t > lastCheck && t <= now) notify(ev.name, ev.reminder ? `Starts in ${ev.reminder} min (${hm(new Date(toView(o.start)))})` : 'Starting now');
    }
  }
  const H = db.prefs.hyp;
  for (const he of L.HYP_EVENTS) {
    const r = H.rem[he.key];
    if (r == null || !H.visible || !H.types[he.key]) continue;
    for (const o of L.hypOccurrences(he, lastCheck + r * 6e4, now + r * 6e4 + 1, hypTerm())) {
      const t = o.start - r * 6e4;
      if (t > lastCheck && t <= now) notify(he.name, r ? `Starts in ${r} min (${hm(new Date(toView(o.start)))})` : 'Starting now');
    }
  }
  lastCheck = now;
}

/* ---------- updates ---------- */
const upd = { version: '', avail: null, busy: false, status: '' };
async function checkUpdate() {
  if (!T?.updater || upd.busy) return;
  upd.busy = true; upd.status = 'Checking…'; render();
  try {
    upd.avail = (await T.updater.check()) || null;
    upd.status = upd.avail ? `Version ${upd.avail.version} is available.` : 'You have the latest version.';
  } catch (e) { upd.status = 'Could not check for updates: ' + e; }
  upd.busy = false; render();
  if (upd.avail && db.prefs.autoUpdate) installUpdate();
}
async function installUpdate() {
  if (!upd.avail || upd.busy) return;
  upd.busy = true; upd.status = `Downloading version ${upd.avail.version}…`; render();
  try {
    await saving; // don't lose a pending save when the installer closes the app
    await upd.avail.downloadAndInstall();
    await T.process.relaunch();
  } catch (e) { upd.busy = false; upd.status = 'Update failed: ' + e; render(); }
}

/* ---------- start ---------- */
load().then(async () => {
  dataPath = T ? await T.core.invoke('data_file').catch((e) => 'Unknown (' + e + ')') : 'Browser storage (no file when the app runs in a browser)';
  render();
  applyZoom();
  checkTimers(); // timers that finished while the app was closed
  loadItems();
  if (T) { upd.version = await T.app.getVersion().catch(() => ''); checkUpdate(); }
  setInterval(() => { checkReminders(); checkTimers(); if (!dragId) render(); }, 20e3); // don't redraw mid-drag
});
