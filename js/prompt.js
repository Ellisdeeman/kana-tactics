/** Job prompt pools. Vocab ids are JLPT Vocab Quest N5 indexes. */

import { answersMatch, expandReading, kanaToRomaji, kataToHira } from "./romaji.js";
import { cardKey, pickWeighted, promptWeight, studySets } from "./srs.js";

const KANJI_RE = /[\u4e00-\u9fff々]/;

export function prepareCatalog(raw) {
  const kana = raw.kana.map((k) => ({
    id: k.id,
    type: "kana",
    japanese: k.id,
    reading: k.reading,
    meaning: k.meaning,
    accept: [kataToHira(k.id)],
    script: k.script,
    row: k.row,
    tier: k.tier,
    intro: !!k.intro,
  }));
  const kanji = raw.kanji.map((k) => {
    const readings = [];
    for (const r of k.readings) {
      for (const part of expandReading(r)) {
        if (!readings.includes(part)) readings.push(part);
      }
    }
    return {
      id: k.id,
      type: "kanji",
      japanese: k.id,
      reading: readings[0],
      meaning: k.meaning,
      accept: readings,
      tier: k.tier || 2,
      intro: !!k.intro,
    };
  });
  const vocab = raw.vocab.map((w) => ({
    id: w.id,
    type: "vocab",
    japanese: w.japanese,
    reading: w.reading,
    meaning: w.meaning,
    accept: expandReading(w.reading),
    tier: 2,
    intro: w.id < 15,
  }));
  return { kana, kanji, vocab };
}

export function indexCatalog(catalog) {
  const map = new Map();
  for (const item of [...catalog.kana, ...catalog.kanji, ...catalog.vocab]) {
    map.set(cardKey(item.type, item.id), item);
  }
  return map;
}

function isLoan(jp) {
  if (KANJI_RE.test(jp)) return false;
  const kata = (jp.match(/[\u30a0-\u30ff]/g) || []).length;
  const hira = (jp.match(/[\u3040-\u309f]/g) || []).length;
  return kata > 0 && kata >= hira;
}

function isHiraWord(jp) {
  return /[\u3040-\u309f]/.test(jp) && !/[\u30a0-\u30ff]/.test(jp) && !KANJI_RE.test(jp);
}

export function buildPools(catalog) {
  return {
    hira: catalog.kana.filter((k) => k.script === "hiragana"),
    kata: catalog.kana.filter((k) => k.script === "katakana"),
    loan: catalog.vocab.filter((w) => isLoan(w.japanese)),
    hiraVocab: catalog.vocab.filter((w) => isHiraWord(w.japanese)),
    kanji: catalog.kanji,
    kanjiVocab: catalog.vocab.filter((w) => KANJI_RE.test(w.japanese)),
    vocab: catalog.vocab,
  };
}

const VOCAB_POOLS = new Set(["loan", "hiraVocab", "kanjiVocab", "vocab"]);

export function poolItems(pools, poolName, study) {
  const base = pools[poolName] || [];
  if (!VOCAB_POOLS.has(poolName) || !study) return base.slice();
  const sets = study.weak instanceof Set ? study : studySets(study);
  const have = new Set(base.map((it) => it.id));
  const items = base.slice();
  for (const id of sets.weak) {
    if (typeof id !== "number") continue;
    if (have.has(id)) continue;
    const word = pools.vocab.find((w) => w.id === id);
    if (word) {
      items.push(word);
      have.add(id);
    }
  }
  return items;
}

function showsRomaji(item) {
  if (item.type === "kana") return true;
  if (item.type === "kanji") return false;
  return !KANJI_RE.test(item.japanese);
}

function displayOf(item) {
  const primary = item.accept[0];
  if (showsRomaji(item)) return kanaToRomaji(primary) || item.reading;
  return primary;
}

function shuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function distractorDisplays(item, pool, rng) {
  const correct = displayOf(item);
  const same = [];
  const rest = [];
  for (const other of pool) {
    if (other.type === item.type && other.id === item.id) continue;
    if (item.accept.some((a) => other.accept?.includes(a))) continue;
    const disp = displayOf(other);
    if (!disp || disp === correct) continue;
    if (answersMatch(disp, item.accept)) continue;
    if (item.row && other.row === item.row) same.push(disp);
    else rest.push(disp);
  }
  const picked = [];
  const seen = new Set([correct]);
  for (const disp of [...shuffle(same, rng), ...shuffle(rest, rng)]) {
    if (seen.has(disp)) continue;
    seen.add(disp);
    picked.push(disp);
    if (picked.length === 3) break;
  }
  const fallback = ["a", "i", "u", "e", "ka", "ki", "shi", "tsu", "みず", "ひと", "やま", "くるま"];
  for (const disp of fallback) {
    if (picked.length >= 3) break;
    if (seen.has(disp) || answersMatch(disp, item.accept)) continue;
    seen.add(disp);
    picked.push(disp);
  }
  return picked;
}

export function makePrompt(item, pool, rng) {
  const correct = displayOf(item);
  const choices = shuffle([correct, ...distractorDisplays(item, pool, rng)], rng);
  return {
    item,
    choices,
    correct,
    romaji: showsRomaji(item),
  };
}

export function selectPrompt(pools, poolName, cards, study, rng, avoidKey, now = Date.now()) {
  const sets = study && study.weak instanceof Set ? study : studySets(study || {});
  const items = poolItems(pools, poolName, sets);
  if (!items.length) throw new Error(`Empty prompt pool: ${poolName}`);
  const item = pickWeighted(
    items,
    (it) => promptWeight(it, cards[cardKey(it.type, it.id)], sets, now),
    rng,
    avoidKey,
  );
  return makePrompt(item, items, rng);
}

export function choiceIsCorrect(prompt, choice) {
  return choice === prompt.correct || answersMatch(choice, prompt.item.accept);
}
