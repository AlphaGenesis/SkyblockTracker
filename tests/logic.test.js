// Run: node tests/logic.test.js
const assert = require('assert');
const L = require('../src/logic.js');

assert.strictEqual(L.parse('300m'), 300e6);
assert.strictEqual(L.parse('1.2B'), 1.2e9);
assert.strictEqual(L.parse('7,6m'), 7.6e6);
assert.strictEqual(L.parse('2500'), 2500);
assert.strictEqual(L.parse('abc'), null);
assert.strictEqual(L.parse(''), null);
assert.strictEqual(L.fmt(1.2e9), '1.2B');
assert.strictEqual(L.fmt(450e3), '450K');
assert.strictEqual(L.signed(-60e6), '−60M');

const at = (s) => new Date(s).getTime();

// To Do every 2 hours from 08:00
const todo = { start: '2026-11-23T08:00', every: 2, unit: 'hours', doneAt: null };
let st = L.todoState(todo, at('2026-11-23T11:30'));
assert.strictEqual(st.from, at('2026-11-23T10:00'));
assert.strictEqual(st.next, at('2026-11-23T12:00'));
assert.strictEqual(st.done, false);
todo.doneAt = '2026-11-23T10:15';
assert.strictEqual(L.todoState(todo, at('2026-11-23T11:59')).done, true);
assert.strictEqual(L.todoState(todo, at('2026-11-23T12:00')).done, false, 'resets at the next step');
// before the anchor: available now, resets at the anchor
assert.strictEqual(L.todoState({ start: '2026-11-23T08:00', every: 1, unit: 'days' }, at('2026-11-23T07:00')).next, at('2026-11-23T08:00'));
// daily keeps the wall-clock time across a DST change
assert.strictEqual(new Date(L.todoState({ start: '2026-03-01T08:00', every: 1, unit: 'days' }, at('2026-04-10T09:00')).from).getHours(), 8);

// Events
const once = { date: '2026-11-23', start: '21:00', end: '21:30', repeat: null };
assert.strictEqual(L.occurrences(once, at('2026-11-23T00:00'), at('2026-11-24T00:00')).length, 1);
assert.strictEqual(L.occurrences(once, at('2026-11-24T00:00'), at('2026-11-25T00:00')).length, 0);
const every2d = { date: '2026-11-23', start: '21:00', end: '21:30', repeat: { every: 2, unit: 'days', end: 'never' } };
const week = L.occurrences(every2d, at('2026-11-23T00:00'), at('2026-11-30T00:00'));
assert.deepStrictEqual(week.map((o) => new Date(o.start).getDate()), [23, 25, 27, 29]);
const after3 = { ...every2d, repeat: { every: 1, unit: 'weeks', end: 'after', count: 3 } };
assert.strictEqual(L.occurrences(after3, at('2026-11-01T00:00'), at('2027-02-01T00:00')).length, 3);
const until = { ...every2d, repeat: { every: 1, unit: 'days', end: 'date', until: '2026-11-25' } };
assert.strictEqual(L.occurrences(until, at('2026-11-01T00:00'), at('2026-12-31T00:00')).length, 3);
const hourly = { date: '2026-11-23', start: '10:00', end: '10:30', repeat: { every: 3, unit: 'hours', end: 'never' } };
assert.strictEqual(L.occurrences(hourly, at('2026-11-24T00:00'), at('2026-11-25T00:00')).length, 8);
// overnight event shows in a range that starts after midnight
const late = { date: '2026-11-23', start: '23:00', end: '01:00', repeat: null };
assert.strictEqual(L.occurrences(late, at('2026-11-24T00:00'), at('2026-11-24T02:00')).length, 1);

// mixed day/hour/minute intervals, stored as minutes
const mixed = { start: '2026-11-23T08:00', every: 1530, unit: 'minutes' }; // 1d 1h 30min
assert.strictEqual(L.todoState(mixed, at('2026-11-24T09:45')).from, at('2026-11-24T09:30'));
assert.strictEqual(L.everyText(1530, 'minutes'), 'Every 1d 1h 30min');
assert.strictEqual(L.everyText(1440, 'minutes'), 'Every day');
assert.strictEqual(L.everyText(2, 'hours'), 'Every 2h');
assert.deepStrictEqual(L.splitMin(1530), { d: 1, h: 1, m: 30 });
// 2 days given in minutes still keeps the wall-clock time across DST
assert.strictEqual(new Date(L.todoState({ start: '2026-03-01T08:00', every: 2880, unit: 'minutes' }, at('2026-04-10T09:00')).from).getHours(), 8);
const evMixed = { date: '2026-11-23', start: '10:00', end: '10:30', repeat: { every: 90, unit: 'minutes', end: 'never' } };
assert.strictEqual(L.occurrences(evMixed, at('2026-11-23T10:00'), at('2026-11-23T13:00')).length, 2);

// zero interval never hangs
assert.strictEqual(L.occurrences({ ...evMixed, repeat: { every: 0, unit: 'minutes', end: 'never' } }, at('2026-11-23T00:00'), at('2026-11-24T00:00')).length, 1);
assert.ok(L.todoState({ start: '2026-11-23T08:00', every: 0, unit: 'minutes' }, at('2026-11-23T09:00')).next > 0);

// Skyblock year: 124h from Tue 24 Nov 2026 14:55 Paris (13:55 UTC)
assert.strictEqual(new Date(L.SB_YEAR_ANCHOR).toISOString(), '2026-11-24T13:55:00.000Z');
const sbStart = new Date(L.SB_YEAR_ANCHOR);
const sb = { start: sbStart, every: L.SB_YEAR_MIN, unit: 'minutes' };
const H = 36e5;
assert.strictEqual(L.todoState(sb, L.SB_YEAR_ANCHOR + 1).from, L.SB_YEAR_ANCHOR);
assert.strictEqual(L.todoState(sb, L.SB_YEAR_ANCHOR + 124 * H).from, L.SB_YEAR_ANCHOR + 124 * H, 'resets exactly 124h later');
assert.strictEqual(L.todoState(sb, L.SB_YEAR_ANCHOR - 1).next, L.SB_YEAR_ANCHOR, 'before the anchor, next reset is the anchor');
// far future stays exact (no drift, constant time)
const far = L.SB_YEAR_ANCHOR + 1000 * 124 * H + 5;
assert.strictEqual(L.todoState(sb, far).from, L.SB_YEAR_ANCHOR + 1000 * 124 * H);

// sbYear flag ignores the stored start/interval
assert.strictEqual(L.todoState({ sbYear: true, start: '2020-01-01T00:00', every: 5, unit: 'minutes' }, far).from, L.SB_YEAR_ANCHOR + 1000 * 124 * H);
const sbEv = { date: '2020-01-01', start: '14:55', end: '15:55', repeat: { sbYear: true, every: 1, unit: 'minutes', end: 'never' } };
const sbOcc = L.occurrences(sbEv, L.SB_YEAR_ANCHOR, L.SB_YEAR_ANCHOR + 3 * 124 * H);
assert.deepStrictEqual(sbOcc.map((o) => (o.start - L.SB_YEAR_ANCHOR) / H), [0, 124, 248]);
assert.strictEqual(sbOcc[0].end - sbOcc[0].start, H, 'keeps the event length');

// Quick Forge
assert.strictEqual(L.qfPct(0), 0);
assert.strictEqual(L.qfPct(1), 10.5);
assert.strictEqual(L.qfPct(19), 19.5);
assert.strictEqual(L.qfPct(20), 30);
assert.strictEqual(L.forgeEnd(0, 168 * 3600, 20) / 36e5, 117.6, 'Pendant of Divan with max Quick Forge');
assert.strictEqual(L.forgeEnd(0, 168 * 3600, 0) / 36e5, 168);
assert.strictEqual(L.secText(30), '30s');
assert.strictEqual(L.secText(36 * 3600), '1d 12h');
assert.strictEqual(L.secText(5400), '1h 30m');

// chart buckets
const ev = [{ t: at('2026-11-23T10:00'), key: 'a', v: 5 }, { t: at('2026-11-23T20:00'), key: 'b', v: -2 }, { t: at('2026-11-25T09:00'), key: 'a', v: 1 }, { t: at('2026-12-02T09:00'), key: 'a', v: 7 }];
const days = L.buckets(ev, at('2026-11-23T00:00'), at('2026-11-26T00:00'), 'day');
assert.deepStrictEqual(days.map((b) => b.total), [3, 0, 1]);
assert.deepStrictEqual(days[0].byKey, { a: 5, b: -2 });
const weeks = L.buckets(ev, at('2026-11-25T00:00'), at('2026-12-07T00:00'), 'week'); // starts on the Monday before
assert.strictEqual(new Date(weeks[0].start).getDate(), 23);
assert.deepStrictEqual(weeks.map((b) => b.total), [4, 7]);
const months = L.buckets(ev, at('2026-11-10T00:00'), at('2027-01-01T00:00'), 'month');
assert.deepStrictEqual(months.map((b) => b.total), [4, 7]);
assert.strictEqual(L.buckets([], at('2026-01-01T00:00'), at('2027-01-01T00:00'), 'day', 30).length, 30, 'capped');

// candles: running total per bucket, with intra-bucket high/low
const cEv = [{ t: at('2026-11-23T10:00'), v: 10 }, { t: at('2026-11-23T11:00'), v: -15 }, { t: at('2026-11-23T12:00'), v: 3 }, { t: at('2026-11-25T09:00'), v: 4 }, { t: at('2026-11-30T09:00'), v: 99 }];
const cB = L.buckets(cEv, at('2026-11-23T00:00'), at('2026-11-26T00:00'), 'day');
assert.deepStrictEqual(L.candles(cEv, cB, at('2026-11-26T00:00')), [
  { o: 0, c: -2, hi: 10, lo: -5 },
  { o: -2, c: -2, hi: -2, lo: -2 },
  { o: -2, c: 2, hi: 2, lo: -2 },
]);

assert.deepStrictEqual(L.splitBuy(60e6, 'each', 10, 3), { sold: 60e6, rest: 60e6 });
assert.deepStrictEqual(L.splitBuy(1e9, 'lot', 10, 3), { sold: 3e8, rest: 7e8 });
{ const r = L.splitBuy(100, 'lot', 3, 1); assert.strictEqual(r.sold + r.rest, 100); }

assert.strictEqual(L.sellFees('ah', 500e3, 1, false, 1.25), 5e3); // 1%, no claim tax under 1M
assert.strictEqual(L.sellFees('ah', 5e6, 1, false, 1.25), 1e5); // 1% + 1%
assert.strictEqual(L.sellFees('ah', 50e6, 1, false, 1.25), 1.5e6); // 2% + 1%
assert.strictEqual(L.sellFees('ah', 200e6, 1, false, 1.25), 7e6); // 2.5% + 1%
assert.strictEqual(L.sellFees('ah', 15e6, 10, true, 1.25), 4.5e6); // tier from one item: 10 × 3% of 15M
assert.strictEqual(L.sellFees('ah', 150e6, 10, false, 1.25), 5.25e6); // total 150M → 3.5%
assert.strictEqual(L.sellFees('bz', 1e6, 4, true, 1.25), 5e4);
assert.strictEqual(L.sellFees('bz', 1e6, 1, false, 1), 1e4);

assert.deepStrictEqual(L.diceResult({ type: 'af', paid: 1e6, rolls: 3, end: null }), { spent: 3000100, payout: 0, pnl: -3000100 });
assert.strictEqual(L.diceResult({ type: 'af', paid: 1e6, rolls: 10, end: { kind: 'six' } }).pnl, 15e6 - 1e6 - 6667000);
assert.strictEqual(L.diceResult({ type: 'hc', paid: 50e6, rolls: 20, end: { kind: 'dye', dye: 800e6 } }).pnl, 800e6 - 50e6 - 134e6);

for (const [inp, min] of [['120m', 120], ['1590m', 1590], ['36h', 2160], ['90', 90], ['2h30', 150], ['2h 30m', 150], ['1d 2h 30m', 1590], ['1.5h', 90], ['1d4', 1680], ['45 min', 45], ['0', 0]]) assert.strictEqual(L.parseDhm(inp), min, inp);
for (const bad of ['', 'abc', '2x', '-5m', '1h-2m']) assert.strictEqual(L.parseDhm(bad), null, bad);
assert.strictEqual(L.fmtDhm(120), '2h');
assert.strictEqual(L.fmtDhm(1590), '1d 2h 30m');
assert.strictEqual(L.fmtDhm(2160), '1d 12h');
assert.strictEqual(L.fmtDhm(7440), '5d 4h');
assert.strictEqual(L.fmtDhm(0), '0m');
assert.strictEqual(L.parseDhm(L.fmtDhm(98765)), 98765);

assert.strictEqual(L.eventMin({ start: '21:00', end: '21:30' }), 30);
assert.strictEqual(L.eventMin({ start: '23:00', end: '01:00' }), 120); // old event past midnight
assert.strictEqual(L.eventMin({ start: '23:00', dur: 45 }), 45);
{ const o = L.occurrences({ date: '2026-11-24', start: '14:00', dur: 30, repeat: { every: 180, unit: 'minutes', end: 'never' } }, new Date('2026-11-24T00:00').getTime(), new Date('2026-11-25T00:00').getTime());
  assert.deepStrictEqual(o.map((x) => new Date(x.start).getHours()), [14, 17, 20, 23]); // counted from each start
  assert.strictEqual(o[0].end - o[0].start, 30 * 6e4); }

// time zones
assert.strictEqual(L.tzOffset('Europe/Paris', Date.UTC(2026, 10, 24, 12)), 60); // winter UTC+1
assert.strictEqual(L.tzOffset('Europe/Paris', Date.UTC(2026, 6, 1, 12)), 120); // summer UTC+2
assert.strictEqual(L.tzOffset('America/New_York', Date.UTC(2026, 10, 24, 12)), -300);
assert.strictEqual(L.zonedMs('2026-11-24', '14:55', 'Europe/Paris'), Date.UTC(2026, 10, 24, 13, 55)); // the Skyblock year anchor
assert.strictEqual(L.zonedMs('2026-03-29', '03:30', 'Europe/Paris'), Date.UTC(2026, 2, 29, 1, 30)); // just after the spring DST jump
assert.strictEqual(L.shiftTz(0, 'UTC', 'Asia/Tokyo'), 9 * 36e5);
{ const ev = { date: '2026-11-24', start: '14:55', dur: 30, tz: 'Europe/Paris', repeat: null };
  assert.strictEqual(L.occurrences(ev, 0, Infinity)[0].start, Date.UTC(2026, 10, 24, 13, 55)); }

// SkyBlock calendar
assert.strictEqual(L.sbTime(528, 1, 1), L.SB_YEAR_ANCHOR); // the user's anchor is the start of year 528
assert.deepStrictEqual(L.sbDate(L.sbTime(527, 8, 29, 13)), { year: 527, month: 8, day: 29, hour: 13 });
assert.deepStrictEqual(L.sbDate(L.SB_EPOCH), { year: 1, month: 1, day: 1, hour: 0 });
{ const HE = Object.fromEntries(L.HYP_EVENTS.map((e) => [e.key, e]));
  const y = L.sbTime(528, 1, 1), yEnd = y + 124 * 36e5;
  const sp = L.hypOccurrences(HE.spooky, y, yEnd, null);
  assert.strictEqual(sp.length, 1); assert.strictEqual(sp[0].start, L.sbTime(528, 8, 29)); assert.strictEqual(sp[0].end - sp[0].start, 60 * 6e4); // 3 days = 1 real hour
  const da = L.hypOccurrences(HE.da, Date.UTC(2026, 10, 24, 10, 0), Date.UTC(2026, 10, 24, 13, 0), null);
  assert.deepStrictEqual(da.map((o) => new Date(o.start).getUTCMinutes()), [55, 55, 55]); // 10:55, 11:55, 12:55
  assert.strictEqual(L.hypOccurrences(HE.cult, y, yEnd, null).length, 48);
  assert.strictEqual(L.hypOccurrences(HE.zoo, y, yEnd, null).length, 2);
  const term = { mayor: 'Marina', ...L.mayorTerm(527) };
  assert.strictEqual(term.start, L.sbTime(528, 3, 27));
  assert.strictEqual(L.hypOccurrences(HE.fishfest, y, yEnd, { mayor: 'Aatrox', ...L.mayorTerm(527) }).length, 0); // wrong mayor
  assert.strictEqual(L.hypOccurrences(HE.fishfest, term.start, term.end, term).length, 12); // days 1-3 of every month of the term
  assert.deepStrictEqual(L.hypOccurrences(HE.fiesta, y, yEnd, { mayor: 'Cole', ...L.mayorTerm(527) }), [{ start: term.start, end: term.end }]); }

console.log('logic tests passed');
