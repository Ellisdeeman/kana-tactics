/** SM-2 scheduler with a short in-battle learning step, plus the sync file formats. */

export const PERFECT_MS = 4000;
export const PROMPT_TIMEOUT_MS = 30000;
export const RESULTS_MAX = 5000;
export const MS_MAX = 3600000;
export const VOCAB_ID_MAX = 717;

export function emptyCard(type, id) {
  return {
    id,
    type,
    ease: 2.5,
    intervalDays: 0,
    reps: 0,
    due: 0,
    lapses: 0,
    correct: 0,
    incorrect: 0,
    seen: false,
  };
}

export function cardKey(type, id) {
  return `${type}:${id}`;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

/**
 * grade is "perfect" (q=5), "slow" (q=3), or "wrong" (q=1).
 * A miss is due again in 20 seconds so it can return before the battle ends.
 * A pass follows classic SM-2 intervals (1 day, 6 days, then interval × ease).
 */
export function reviewCard(prev, grade, now = Date.now()) {
  const card = { ...emptyCard(prev?.type, prev?.id), ...prev };
  const q = grade === "perfect" ? 5 : grade === "slow" ? 3 : 1;
  if (q < 3) {
    card.incorrect += 1;
    card.reps = 0;
    card.intervalDays = 0;
    card.lapses += 1;
    card.due = now + 20000;
  } else {
    card.correct += 1;
    if (card.reps <= 0) card.intervalDays = 1;
    else if (card.reps === 1) card.intervalDays = 6;
    else card.intervalDays = round4(card.intervalDays * card.ease);
    card.reps += 1;
    card.due = now + card.intervalDays * 86400000;
  }
  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  card.ease = Math.max(1.3, round2(card.ease + delta));
  card.seen = true;
  return card;
}

export function gradeFromAnswer(correct, ms) {
  if (!correct) return "wrong";
  if (ms <= PERFECT_MS) return "perfect";
  return "slow";
}

export function studySets(study) {
  const toSet = (arr) => {
    const s = new Set();
    for (const id of arr || []) {
      s.add(id);
      s.add(String(id));
      if (typeof id === "string" && /^-?\d+$/.test(id.trim())) s.add(Number(id));
    }
    return s;
  };
  return { known: toSet(study?.known), weak: toSet(study?.weak) };
}

export function isWeak(study, id) {
  const sets = study?.weak instanceof Set ? study : studySets(study || {});
  return sets.weak.has(id) || sets.weak.has(String(id));
}

export function isKnown(study, id) {
  const sets = study?.known instanceof Set ? study : studySets(study || {});
  return sets.known.has(id) || sets.known.has(String(id));
}

/** Higher means the prompt should show up sooner. Weak imported words weigh ×5. */
export function promptWeight(item, card, study, now = Date.now()) {
  const weak = isWeak(study, item.id);
  const known = isKnown(study, item.id);
  const seen = !!(card && card.seen);
  let w;
  if (!seen) {
    if (item.intro) w = 6;
    else if (item.tier === 3) w = 0.45;
    else if (item.tier === 2) w = 1.25;
    else w = 3;
  } else if (card.due <= now) {
    const overdue = Math.max(0, (now - card.due) / 86400000);
    w = 5 + Math.min(6, overdue);
  } else {
    w = 0.18;
  }
  if (weak) w *= 5;
  else if (known && seen && card.due > now) w *= 0.25;
  else if (known && !seen) w *= 0.3;
  if (seen && card.incorrect > card.correct) w *= 1.75;
  return w;
}

export function pickWeighted(items, weightOf, rng, avoidKey) {
  let pool = items;
  if (avoidKey && items.length > 1) {
    const filtered = items.filter((it) => cardKey(it.type, it.id) !== avoidKey);
    if (filtered.length) pool = filtered;
  }
  let total = 0;
  const weights = pool.map((it) => {
    const w = Math.max(0, weightOf(it));
    total += w;
    return w;
  });
  if (total <= 0) return pool[Math.floor(rng() * pool.length)];
  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** Whole milliseconds in the range the study app accepts (0 … 3,600,000). */
export function clampMs(ms) {
  const n = Math.round(Number(ms));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(MS_MAX, n);
}

/**
 * ISO timestamp that is strictly later than the previous export, so two
 * downloads in the same millisecond still produce different files.
 */
export function uniqueIso(previous, now = new Date()) {
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  let t = Number.isFinite(nowMs) ? nowMs : Date.now();
  const prev = typeof previous === "string" ? Date.parse(previous) : NaN;
  if (Number.isFinite(prev) && t <= prev) t = prev + 1;
  return new Date(t).toISOString();
}

function resultId(type, id) {
  if (type === "vocab") {
    const n = typeof id === "number" ? id : NaN;
    return Number.isInteger(n) ? n : null;
  }
  if (typeof id !== "string" || id.length === 0 || id.length > 8) return null;
  return id;
}

/**
 * Results file the study app imports. At most 5000 rows. An empty `results`
 * array means there is nothing to download — the caller must not write a file.
 */
/** Drop rows that cannot appear in a results file. Keeps order. Does not cap the queue. */
export function normalizeResults(results) {
  const rows = [];
  for (const r of results || []) {
    if (!r || (r.type !== "vocab" && r.type !== "kana" && r.type !== "kanji")) continue;
    const id = resultId(r.type, r.id);
    if (id == null) continue;
    rows.push({
      id,
      type: r.type,
      correct: r.correct === true,
      ms: clampMs(r.ms),
    });
  }
  return rows;
}

export function buildResultsExport(results, date = new Date()) {
  const iso = typeof date === "string" ? uniqueIso(null, date) : date.toISOString();
  return {
    source: "kana-tactics",
    date: iso,
    results: normalizeResults(results).slice(0, RESULTS_MAX),
  };
}

/** First file's rows, and everything that stays queued after that file is saved. */
export function splitPending(results) {
  const clean = normalizeResults(results);
  return {
    batch: clean.slice(0, RESULTS_MAX),
    rest: clean.slice(RESULTS_MAX),
  };
}

export function buildProgressExport(cards, lookup, date = new Date()) {
  const items = Object.values(cards).map((card) => {
    const meta = lookup(card.type, card.id) || {};
    const id = card.type === "vocab" ? Number(card.id) : String(card.id);
    return {
      id,
      type: card.type,
      japanese: meta.japanese ?? "",
      reading: meta.reading ?? "",
      meaning: meta.meaning ?? "",
      srs: {
        ease: card.ease,
        intervalDays: card.intervalDays,
        reps: card.reps,
        due: new Date(card.due).toISOString(),
        lapses: card.lapses || 0,
      },
      correct: card.correct || 0,
      incorrect: card.incorrect || 0,
    };
  });
  items.sort((a, b) => (a.type === b.type ? String(a.id).localeCompare(String(b.id), "ja") : a.type.localeCompare(b.type)));
  return {
    version: 1,
    source: "kana-tactics",
    exported: date.toISOString(),
    items,
  };
}

function intIds(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array of word ids.`);
  const seen = new Set();
  const out = [];
  for (const id of value) {
    if (typeof id !== "number" || !Number.isInteger(id)) continue;
    if (id < 0 || id > VOCAB_ID_MAX || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  out.sort((a, b) => a - b);
  return out;
}

/**
 * JLPT Vocab Quest study list. Unknown fields are ignored. `weak` is kept
 * only when it is also in `known` (the app's subset rule). Ids outside 0–717
 * are skipped.
 */
export function parseStudyList(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Study list must be a JSON object.");
  }
  if (data.app !== "jlpt-vocab-quest" || data.v !== 1) {
    throw new Error('Study list must use {"app":"jlpt-vocab-quest","v":1}.');
  }
  const known = intIds(data.known, "known");
  const knownSet = new Set(known);
  const weak = intIds(data.weak, "weak").filter((id) => knownSet.has(id));
  return { known, weak };
}

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function parseProgress(data) {
  if (!data || typeof data !== "object" || !Array.isArray(data.items)) {
    throw new Error("Progress file needs an items array.");
  }
  const cards = {};
  for (const item of data.items) {
    if (!item || (item.type !== "kana" && item.type !== "kanji" && item.type !== "vocab")) continue;
    if (item.id == null || item.id === "") continue;
    const id = item.type === "vocab" ? Number(item.id) : String(item.id);
    if (item.type === "vocab" && !Number.isInteger(id)) continue;
    const srs = item.srs && typeof item.srs === "object" ? item.srs : {};
    const due = typeof srs.due === "number" ? srs.due : Date.parse(srs.due);
    cards[cardKey(item.type, id)] = {
      id,
      type: item.type,
      ease: Math.max(1.3, num(srs.ease, 2.5)),
      intervalDays: Math.max(0, num(srs.intervalDays, 0)),
      reps: Math.max(0, Math.round(num(srs.reps, 0))),
      due: Number.isFinite(due) ? due : 0,
      lapses: Math.max(0, Math.round(num(srs.lapses, 0))),
      correct: Math.max(0, Math.round(num(item.correct, 0))),
      incorrect: Math.max(0, Math.round(num(item.incorrect, 0))),
      seen: true,
    };
  }
  return cards;
}
