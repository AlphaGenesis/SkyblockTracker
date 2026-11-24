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

  // Time zones. tzOffset: minutes east of UTC for an IANA zone at an instant. zonedMs: a wall date + time in a zone → instant.
  const tzFmt = new Map();
  const tzOffset = (tz, ms) => {
    if (!tzFmt.has(tz)) tzFmt.set(tz, new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }));
    const p = {};
    for (const x of tzFmt.get(tz).formatToParts(ms)) p[x.type] = +x.value;
    return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000) / 6e4);
  };
  const zonedMs = (date, time, tz) => {
    const [y, mo, d] = date.split('-').map(Number), [h, mi] = time.split(':').map(Number);
    const wall = Date.UTC(y, mo - 1, d, h, mi);
    const guess = wall - tzOffset(tz, wall) * 6e4;
    return wall - tzOffset(tz, guess) * 6e4; // second pass settles days when the offset changes (DST)
  };
  const shiftTz = (ms, fromTz, toTz) => (fromTz === toTz ? ms : ms + (tzOffset(toTz, ms) - tzOffset(fromTz, ms)) * 6e4);

  // Event length in minutes. Events saved before durations existed have an end time instead (past midnight = next day).
  const eventMin = (ev) => {
    if (ev.dur != null) return ev.dur;
    const m = (new Date('2000-01-01T' + ev.end) - new Date('2000-01-01T' + ev.start)) / 6e4;
    return m > 0 ? m : m + 1440;
  };

  // Every occurrence of an event that overlaps [from, to).
  const occurrences = (ev, from, to) => {
    let s = ev.tz ? zonedMs(ev.date, ev.start, ev.tz) : new Date(ev.date + 'T' + ev.start).getTime();
    const dur = eventMin(ev) * 6e4;
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

  // One-field duration: "1d 2h 30m", "120m", "2h30", "1.5h", "90" (plain number = minutes) → whole minutes, or null if unreadable.
  const parseDhm = (str) => {
    const t = String(str).toLowerCase().replace(/\s+/g, '').replace(/min/g, 'm');
    if (!t || !/^(\d+(\.\d+)?[dhm]?)+$/.test(t)) return null;
    let min = 0, last = '';
    for (const [, n, u] of t.matchAll(/(\d+(?:\.\d+)?)([dhm]?)/g)) {
      const unit = u || (last === 'd' ? 'h' : 'm'); // "2h30" → 30 minutes, "1d4" → 4 hours
      min += Number(n) * { d: 1440, h: 60, m: 1 }[unit];
      last = unit;
    }
    return Math.round(min);
  };
  const fmtDhm = (min) => {
    const s = splitMin(Math.max(0, Math.round(min || 0)));
    return [s.d && s.d + 'd', s.h && s.h + 'h', s.m && s.m + 'm'].filter(Boolean).join(' ') || '0m';
  };

  // ---- SkyBlock calendar. Year 1 began 11 Jun 2019 17:55 UTC; 12 months of 31 days, 1 day = 20 real minutes, 1 hour = 50 s.
  const SB_EPOCH = Date.UTC(2019, 5, 11, 17, 55), SB_DAY = 20 * 6e4, SB_HOUR = 50e3, SB_YEAR_MS = SB_YEAR_MIN * 6e4;
  const SB_MONTHS = ['Early Spring', 'Spring', 'Late Spring', 'Early Summer', 'Summer', 'Late Summer', 'Early Autumn', 'Autumn', 'Late Autumn', 'Early Winter', 'Winter', 'Late Winter'];
  const sbTime = (year, month, day, hour = 0) => SB_EPOCH + (year - 1) * SB_YEAR_MS + ((month - 1) * 31 + day - 1) * SB_DAY + hour * SB_HOUR;
  const sbDate = (ms) => {
    const t = ms - SB_EPOCH, y = Math.floor(t / SB_YEAR_MS), r = t - y * SB_YEAR_MS, d = Math.floor(r / SB_DAY);
    return { year: y + 1, month: Math.floor(d / 31) + 1, day: (d % 31) + 1, hour: Math.floor((r - d * SB_DAY) / SB_HOUR) };
  };
  // Recurring SkyBlock events (dates from the SkyBlock wiki "Events" and "Mayor Election" pages; DA / Jacob's / Cult as in the NEU mod).
  // hourly: [minute, length in min] each real hour · days: [[fromMonth, fromDay, toMonth, toDay]] every year · monthly: [fromDay, toDay] every month
  // cult: those days of every month, 6 real minutes · mayor: only while that mayor is in office · tenure: the whole term
  const HYP_EVENTS = [
    { key: 'da', name: 'Dark Auction', group: 'Frequent', color: 'violet', hourly: [55, 5], desc: 'Bid on rare items at the Dark Auction in the Hub (Wither Cloak).' },
    { key: 'jacob', name: "Jacob's Farming Contest", group: 'Frequent', color: 'green', hourly: [15, 20], desc: 'Farming contest for 3 crops. Talk to Jacob in the Hub.' },
    { key: 'cult', name: 'Cult of the Fallen Star', group: 'Frequent', color: 'teal', cult: [7, 14, 21, 28], desc: 'The cult meets near the Star in the Dwarven Mines (days 7, 14, 21 and 28 of every month).' },
    { key: 'zoo', name: 'Traveling Zoo', group: 'Calendar', color: 'gold', days: [[4, 1, 4, 3], [10, 1, 10, 3]], desc: 'Oringo sells a legendary pet in the Hub (Early Summer 1–3 and Early Winter 1–3).' },
    { key: 'spooky', name: 'Spooky Festival', group: 'Calendar', color: 'orange', days: [[8, 29, 8, 31]], desc: 'Autumn 29–31. Kill spooky mobs for candy.' },
    { key: 'jerry', name: 'Season of Jerry', group: 'Calendar', color: 'red', days: [[12, 24, 12, 26]], desc: "Late Winter 24–26. Defend Jerry's Workshop." },
    { key: 'newyear', name: 'New Year Celebration', group: 'Calendar', color: 'pink', days: [[12, 29, 12, 31]], desc: 'Late Winter 29–31. The Baker hands out New Year Cakes.' },
    { key: 'hoppity', name: "Hoppity's Hunt", group: 'Calendar', color: 'amber', days: [[1, 1, 3, 31]], desc: 'Early Spring 1 – Late Spring 31. Find chocolate eggs.' },
    { key: 'harvest', name: 'Harvest Feast', group: 'Calendar', color: 'lime', days: [[7, 1, 9, 31]], desc: 'Early Autumn 1 – Late Autumn 31.' },
    { key: 'booth', name: 'Election opens', group: 'Election', color: 'blue', days: [[6, 27, 6, 27]], desc: 'Late Summer 27: the election booth opens in the Community Center.' },
    { key: 'newmayor', name: 'New mayor', group: 'Election', color: 'blue', days: [[3, 27, 3, 27]], desc: 'Late Spring 27: the election ends and the winner becomes mayor.' },
    { key: 'fishfest', name: 'Fishing Festival', group: 'Mayor', mayor: 'Marina', color: 'cyan', monthly: [1, 3], desc: "Marina's perk: days 1–3 of every month, sharks spawn." },
    { key: 'stonks', name: 'Stonks Auction', group: 'Mayor', mayor: 'Diaz', color: 'gold', monthly: [27, 31], desc: "Diaz's perk: bid for Stock of Stonks, days 27–31 of every month." },
    { key: 'fiesta', name: 'Mining Fiesta', group: 'Mayor', mayor: 'Cole', color: 'orange', tenure: true, desc: "Cole's perk: Mining Fiesta for the whole term." },
    { key: 'mytho', name: 'Mythological Ritual', group: 'Mayor', mayor: 'Diana', color: 'green', tenure: true, desc: "Diana's perk: Griffin burrows in the Hub for the whole term." },
    { key: 'carnival', name: 'Carnival', group: 'Mayor', mayor: 'Foxy', color: 'pink', tenure: true, desc: "Foxy's perk: the Carnival is open in the Hub for the whole term." },
  ];
  // Occurrences of one event overlapping [from, to). term: { mayor, start, end } of the mayor in office, or null.
  const hypOccurrences = (ev, from, to, term) => {
    let lo = from, hi = to;
    if (ev.mayor) {
      if (!term || term.mayor !== ev.mayor) return [];
      lo = Math.max(from, term.start); hi = Math.min(to, term.end);
      if (lo >= hi) return [];
      if (ev.tenure) return [{ start: term.start, end: term.end }];
    }
    const out = [], add = (s, e) => { if (s < hi && e > lo) out.push({ start: s, end: e }); };
    if (ev.hourly) {
      for (let h = Math.floor(lo / 36e5) * 36e5 - 36e5; h < hi; h += 36e5) add(h + ev.hourly[0] * 6e4, h + (ev.hourly[0] + ev.hourly[1]) * 6e4);
      return out;
    }
    const y0 = sbDate(lo).year - 1, y1 = sbDate(hi).year;
    for (let y = y0; y <= y1; y++) {
      if (ev.days) for (const [m1, d1, m2, d2] of ev.days) add(sbTime(y, m1, d1), sbTime(y, m2, d2) + SB_DAY);
      for (let m = 1; m <= 12; m++) {
        if (ev.monthly) add(sbTime(y, m, ev.monthly[0]), sbTime(y, m, ev.monthly[1]) + SB_DAY);
        if (ev.cult) for (const d of ev.cult) add(sbTime(y, m, d), sbTime(y, m, d) + 6 * 6e4);
      }
    }
    return out.sort((a, b) => a.start - b.start);
  };
  // The mayor elected in election year e is in office from Late Spring 27 of e+1 to Late Spring 27 of e+2.
  const mayorTerm = (electionYear) => ({ start: sbTime(electionYear + 1, 3, 27), end: sbTime(electionYear + 2, 3, 27) });

  const api = { SB_EPOCH, SB_MONTHS, sbTime, sbDate, HYP_EVENTS, hypOccurrences, mayorTerm, tzOffset, zonedMs, shiftTz, eventMin, parseDhm, fmtDhm, DICE, diceResult, sellFees, splitBuy, candles, buckets, qfPct, forgeEnd, secText, UNIT_MS, SB_YEAR_ANCHOR, SB_YEAR_MIN, fmt, signed, parse, stepAt, splitMin, everyText, todoState, occurrences };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.L = api;
})(this);
