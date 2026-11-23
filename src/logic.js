// Pure helpers shared by the UI and the tests (no DOM here).
(function (root) {
  const UNIT_MS = { minutes: 6e4, hours: 36e5, days: 864e5, weeks: 6048e5 };
  // A Skyblock year lasts 124 real hours. Reference reset: Tue 24 Nov 2026 14:55 Paris time (UTC+1) = 13:55 UTC.
  const SB_YEAR_ANCHOR = Date.UTC(2026, 10, 24, 13, 55);
  const SB_YEAR_MIN = 124 * 60;

  const trim = (x, d) => { let r = x.toFixed(d); if (r.indexOf('.') >= 0) r = r.replace(/0+$/, '').replace(/\.$/, ''); return r; };
  const fmt = (n) => {
    const a = Math.abs(n);
    if (a >= 1e9) return trim(a / 1e9, 2) + 'B';
    if (a >= 1e6) return trim(a / 1e6, a >= 1e8 ? 0 : 1) + 'M';
    if (a >= 1e3) return trim(a / 1e3, a >= 1e5 ? 0 : 1) + 'K';
    return String(Math.round(a));
  };
  const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(n);

  // "300m", "1.2b", "450k", "2500" -> number, anything else -> null
  const parse = (str) => {
    const t = String(str ?? '').trim().toLowerCase().replace(/\s/g, '').replace(',', '.');
    const m = t.match(/^(\d*\.?\d+)([kmb]?)$/);
    return m ? parseFloat(m[1]) * { '': 1, k: 1e3, m: 1e6, b: 1e9 }[m[2]] : null;
  };

  // k-th step from anchor a. Days/weeks use calendar math so 08:00 stays 08:00 across DST.
  const stepAt = (a, every, unit, k) => {
    const ms = every * UNIT_MS[unit];
    if (ms % 864e5 === 0) { // whole days
      const d = new Date(a);
      d.setDate(d.getDate() + k * (ms / 864e5));
      return d.getTime();
    }
    return a + k * ms;
  };
  // 1530 -> { d: 1, h: 1, m: 30 }
  const splitMin = (min) => ({ d: Math.floor(min / 1440), h: Math.floor((min % 1440) / 60), m: min % 60 });
  const everyText = (every, unit) => {
    const min = every * UNIT_MS[unit] / 6e4, s = splitMin(min);
    if (min === 1440) return 'Every day';
    if (min === 60) return 'Every hour';
    if (min === 10080) return 'Every week';
    return 'Every ' + [s.d && s.d + 'd', s.h && s.h + 'h', s.m && s.m + 'min'].filter(Boolean).join(' ');
  };
  // largest k with stepAt(k) <= t (k can be negative)
  const indexAt = (a, every, unit, t) => {
    let k = Math.floor((t - a) / (every * UNIT_MS[unit]));
    while (stepAt(a, every, unit, k) > t) k--;
    while (stepAt(a, every, unit, k + 1) <= t) k++;
    return k;
  };

  // To Do: the current period is [from, next). It is done if it was ticked inside that period.
  const todoState = (t, now) => {
    if (t.sbYear) t = { start: SB_YEAR_ANCHOR, every: SB_YEAR_MIN, unit: 'minutes', doneAt: t.doneAt };
    const a = new Date(t.start).getTime();
    const every = t.every > 0 ? t.every : 1; // guard against a zero interval (hand-edited data)
    const k = indexAt(a, every, t.unit, now);
    const from = stepAt(a, every, t.unit, k);
    return { from, next: stepAt(a, every, t.unit, k + 1), done: !!t.doneAt && new Date(t.doneAt).getTime() >= from };
  };

  // Every occurrence of an event that overlaps [from, to).
  const occurrences = (ev, from, to) => {
    let s = new Date(ev.date + 'T' + ev.start).getTime();
    let dur = new Date(ev.date + 'T' + ev.end).getTime() - s;
    if (dur <= 0) dur += 864e5; // ends after midnight
    let r = ev.repeat && ev.repeat.every > 0 ? ev.repeat : null; // a zero interval would loop forever
    if (ev.repeat && ev.repeat.sbYear) { s = SB_YEAR_ANCHOR; r = Object.assign({}, ev.repeat, { every: SB_YEAR_MIN, unit: 'minutes' }); }
    if (!r) return s < to && s + dur > from ? [{ start: s, end: s + dur }] : [];
    const max = r.end === 'after' ? r.count : Infinity;
    const until = r.end === 'date' && r.until ? new Date(r.until + 'T23:59:59').getTime() : Infinity;
    const out = [];
    for (let k = Math.max(0, indexAt(s, r.every, r.unit, from - dur)); k < max; k++) {
      const o = stepAt(s, r.every, r.unit, k);
      if (o >= to || o > until) break;
      if (o + dur > from) out.push({ start: o, end: o + dur });
    }
    return out;
  };

  // HOTM "Quick Forge": 10% + 0.5% per level (levels 1-19), 30% at max level 20 (from NEU hotmlayout.json)
  const qfPct = (lvl) => (!lvl ? 0 : lvl >= 20 ? 30 : 10 + lvl * 0.5);
  const forgeEnd = (startMs, sec, lvl) => startMs + Math.round(sec * 1000 * (1 - qfPct(lvl) / 100));
  const secText = (s) => {
    if (s < 60) return Math.round(s) + 's';
    const m = Math.round(s / 60), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
    return [d && d + 'd', h && h + 'h', mm && mm + 'm'].filter(Boolean).join(' ');
  };

  // Stats chart: group dated values [{t, key, v}] into day/week/month buckets covering [from, to)
  const bucketStart = (ms, group) => {
    const d = new Date(ms); d.setHours(0, 0, 0, 0);
    if (group === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    if (group === 'month') d.setDate(1);
    return d.getTime();
  };
  const nextBucket = (ms, group) => {
    const d = new Date(ms);
    if (group === 'month') d.setMonth(d.getMonth() + 1); else d.setDate(d.getDate() + (group === 'week' ? 7 : 1));
    return d.getTime();
  };
  const buckets = (events, from, to, group, max = 180) => {
    const out = [], idx = new Map();
    for (let s = bucketStart(from, group); s < to; s = nextBucket(s, group)) { idx.set(s, out.length); out.push({ start: s, byKey: {}, total: 0 }); }
    for (const e of events) {
      const b = out[idx.get(bucketStart(e.t, group))];
      if (!b) continue;
      b.byKey[e.key] = (b.byKey[e.key] || 0) + e.v;
      b.total += e.v;
    }
    return out.slice(-max); // shortcut: very long ranges keep only the latest buckets
  };

  // Candles of the running total inside [bks[0].start, to): open, close, high, low per bucket
  const candles = (events, bks, to) => {
    const ev = events.filter((e) => bks.length && e.t >= bks[0].start && e.t < to).sort((a, b) => a.t - b.t);
    let run = 0, i = 0;
    return bks.map((b, j) => {
      const end = j + 1 < bks.length ? bks[j + 1].start : to, o = run;
      let hi = run, lo = run;
      for (; i < ev.length && ev[i].t < end; i++) { run += ev[i].v; hi = Math.max(hi, run); lo = Math.min(lo, run); }
      return { o, c: run, hi, lo };
    });
  };

  // Split a purchase when only n of qty items are sold. A lot price is shared pro rata; the two parts always add up to the original.
  const splitBuy = (price, unit, qty, n) => {
    if (unit !== 'lot') return { sold: price, rest: price };
    const rest = Math.round((price * (qty - n)) / qty);
    return { sold: price - rest, rest };
  };

  // Hypixel sell fees for one sale. AH (BIN): listing fee 1% < 10M, 2% < 100M, else 2.5%, plus 1% claim tax from 1M; duration fee ignored.
  // Each AH listing is taxed on its own, so with a per-item price the tier comes from one item. Bazaar: a flat rate (1.25% → 1% with perks).
  const ahFee = (p) => p * ((p < 10e6 ? 0.01 : p < 100e6 ? 0.02 : 0.025) + (p >= 1e6 ? 0.01 : 0));
  const sellFees = (market, price, n, each, bzPct) => {
    const total = each ? price * n : price;
    return Math.round(market === 'bz' ? (total * bzPct) / 100 : each ? n * ahFee(price) : ahFee(total));
  };

  // Archfiend dice: every roll costs coins; a 6 pays out coins, a 7 drops an Archfiend Dye. Either one ends the dice.
  const DICE = {
    af: { name: 'Archfiend Dice', roll: 666700, six: 15e6, odds6: '1 in 24', odds7: '1 in 6,666' },
    hc: { name: 'High Class Archfiend Dice', roll: 6.7e6, six: 100e6, odds6: '1 in 16', odds7: '1 in 666' },
  };
  // d: { type, paid, rolls, end: null | { kind: 'six' | 'dye', dye } } → coins spent so far, payout, result
  const diceResult = (d) => {
    const spent = d.paid + d.rolls * DICE[d.type].roll;
    const payout = !d.end ? 0 : d.end.kind === 'six' ? DICE[d.type].six : d.end.dye;
    return { spent, payout, pnl: payout - spent };
  };

  const api = { DICE, diceResult, sellFees, splitBuy, candles, buckets, qfPct, forgeEnd, secText, UNIT_MS, SB_YEAR_ANCHOR, SB_YEAR_MIN, fmt, signed, parse, stepAt, splitMin, everyText, todoState, occurrences };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.L = api;
})(this);
