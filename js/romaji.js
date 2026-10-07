/** Romaji ⇄ kana matching for N5 prompts. */

const VOWEL_CHAR = { a: "あ", i: "い", u: "う", e: "え", o: "お" };

/** Preferred Hepburn, then accepted aliases. First entry is the display form. */
const SYLLABLES = [
  ["kya", "きゃ"], ["kyu", "きゅ"], ["kyo", "きょ"],
  ["gya", "ぎゃ"], ["gyu", "ぎゅ"], ["gyo", "ぎょ"],
  ["sha", "しゃ"], ["shu", "しゅ"], ["sho", "しょ"],
  ["cha", "ちゃ"], ["chu", "ちゅ"], ["cho", "ちょ"],
  ["nya", "にゃ"], ["nyu", "にゅ"], ["nyo", "にょ"],
  ["hya", "ひゃ"], ["hyu", "ひゅ"], ["hyo", "ひょ"],
  ["bya", "びゃ"], ["byu", "びゅ"], ["byo", "びょ"],
  ["pya", "ぴゃ"], ["pyu", "ぴゅ"], ["pyo", "ぴょ"],
  ["mya", "みゃ"], ["myu", "みゅ"], ["myo", "みょ"],
  ["rya", "りゃ"], ["ryu", "りゅ"], ["ryo", "りょ"],
  ["ja", "じゃ"], ["ju", "じゅ"], ["jo", "じょ"],
  ["sya", "しゃ"], ["syu", "しゅ"], ["syo", "しょ"],
  ["tya", "ちゃ"], ["tyu", "ちゅ"], ["tyo", "ちょ"],
  ["jya", "じゃ"], ["jyu", "じゅ"], ["jyo", "じょ"],
  ["zya", "じゃ"], ["zyu", "じゅ"], ["zyo", "じょ"],
  ["fa", "ふぁ"], ["fi", "ふぃ"], ["fe", "ふぇ"], ["fo", "ふぉ"],
  ["ti", "てぃ"],
  ["shi", "し"], ["chi", "ち"], ["tsu", "つ"], ["fu", "ふ"],
  ["si", "し"], ["tu", "つ"], ["hu", "ふ"],
  ["ka", "か"], ["ki", "き"], ["ku", "く"], ["ke", "け"], ["ko", "こ"],
  ["ga", "が"], ["gi", "ぎ"], ["gu", "ぐ"], ["ge", "げ"], ["go", "ご"],
  ["sa", "さ"], ["su", "す"], ["se", "せ"], ["so", "そ"],
  ["za", "ざ"], ["ji", "じ"], ["zu", "ず"], ["ze", "ぜ"], ["zo", "ぞ"],
  ["zi", "じ"],
  ["ta", "た"], ["te", "て"], ["to", "と"],
  ["da", "だ"], ["di", "ぢ"], ["du", "づ"], ["de", "で"], ["do", "ど"],
  ["na", "な"], ["ni", "に"], ["nu", "ぬ"], ["ne", "ね"], ["no", "の"],
  ["ha", "は"], ["hi", "ひ"], ["he", "へ"], ["ho", "ほ"],
  ["ba", "ば"], ["bi", "び"], ["bu", "ぶ"], ["be", "べ"], ["bo", "ぼ"],
  ["pa", "ぱ"], ["pi", "ぴ"], ["pu", "ぷ"], ["pe", "ぺ"], ["po", "ぽ"],
  ["ma", "ま"], ["mi", "み"], ["mu", "む"], ["me", "め"], ["mo", "も"],
  ["ya", "や"], ["yu", "ゆ"], ["yo", "よ"],
  ["ra", "ら"], ["ri", "り"], ["ru", "る"], ["re", "れ"], ["ro", "ろ"],
  ["wa", "わ"], ["wo", "を"],
  ["a", "あ"], ["i", "い"], ["u", "う"], ["e", "え"], ["o", "お"],
  ["n", "ん"],
];

const ROMA_TO_HIRA = new Map(SYLLABLES.map(([r, h]) => [r, h]));
const ROMA_KEYS = [...ROMA_TO_HIRA.keys()].sort((a, b) => b.length - a.length);
const ALT_ROMA = new Map(ROMA_TO_HIRA);
ALT_ROMA.set("ti", "ち");
const ALT_KEYS = [...ALT_ROMA.keys()].sort((a, b) => b.length - a.length);

const HIRA_TO_ROMA = new Map();
for (const [roma, hira] of SYLLABLES) {
  if (!HIRA_TO_ROMA.has(hira)) HIRA_TO_ROMA.set(hira, roma);
}
const HIRA_KEYS = [...HIRA_TO_ROMA.keys()].sort((a, b) => b.length - a.length);

const CHAR_VOWEL = {};
for (const [hira, roma] of HIRA_TO_ROMA) {
  const v = roma.match(/[aeiou]$/)?.[0];
  if (!v) continue;
  CHAR_VOWEL[hira[hira.length - 1]] = VOWEL_CHAR[v];
}

export function kataToHira(s) {
  return [...String(s)].map((ch) => {
    const c = ch.codePointAt(0);
    if (c >= 0x30a1 && c <= 0x30f6) return String.fromCodePoint(c - 0x60);
    return ch;
  }).join("");
}

export function hiraToKata(s) {
  return [...String(s)].map((ch) => {
    const c = ch.codePointAt(0);
    if (c >= 0x3041 && c <= 0x3096) return String.fromCodePoint(c + 0x60);
    return ch;
  }).join("");
}

/** Collapse katakana long marks so こー and こお compare equal. を matches お. */
export function foldLong(s) {
  const src = kataToHira(s);
  let out = "";
  for (const ch of src) {
    if (ch === "ー") {
      const v = CHAR_VOWEL[out[out.length - 1]];
      if (v) out += v;
      continue;
    }
    out += ch;
  }
  return out.replaceAll("を", "お");
}

function parseRomaji(input, table, keys) {
  let s = String(input).toLowerCase().replace(/[\s\-‐‑–—]/g, "");
  s = s.replace(/ā/g, "aa").replace(/ī/g, "ii").replace(/ū/g, "uu").replace(/ē/g, "ee").replace(/ō/g, "oo");
  s = s.replace(/tcha/g, "ccha").replace(/tchu/g, "cchu").replace(/tcho/g, "ccho").replace(/tchi/g, "cchi");
  let out = "";
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    const nxt = s[i + 1];
    if (ch === "n" && nxt === "'") {
      out += "ん";
      i += 2;
      continue;
    }
    if (ch === "n" && (!nxt || (!"aiueony'".includes(nxt)))) {
      out += "ん";
      i += 1;
      continue;
    }
    if (nxt && ch === nxt && !"aeioun".includes(ch)) {
      out += "っ";
      i += 1;
      continue;
    }
    let matched = false;
    for (const key of keys) {
      if (s.startsWith(key, i)) {
        if (key === "n") {
          const after = s[i + 1];
          if (after && "aiueoy".includes(after)) continue;
        }
        out += table.get(key);
        i += key.length;
        matched = true;
        break;
      }
    }
    if (!matched) return null;
  }
  return out;
}

export function romajiToHiragana(input) {
  return parseRomaji(input, ROMA_TO_HIRA, ROMA_KEYS);
}

export function romajiCandidates(input) {
  const primary = parseRomaji(input, ROMA_TO_HIRA, ROMA_KEYS);
  const alt = parseRomaji(input, ALT_ROMA, ALT_KEYS);
  return [...new Set([primary, alt].filter(Boolean))];
}

export function kanaToRomaji(input) {
  const s = kataToHira(input);
  let out = "";
  let i = 0;
  while (i < s.length) {
    if (s[i] === "っ") {
      let j = i + 1;
      let next = null;
      let nextLen = 0;
      for (const key of HIRA_KEYS) {
        if (s.startsWith(key, j)) {
          next = HIRA_TO_ROMA.get(key);
          nextLen = key.length;
          break;
        }
      }
      if (!next) return null;
      const cons = next.match(/^[^aeiou]+/)?.[0] ?? next[0];
      out += cons[0];
      i += 1;
      continue;
    }
    if (s[i] === "ん") {
      let nextRoma = "";
      for (const key of HIRA_KEYS) {
        if (s.startsWith(key, i + 1)) {
          nextRoma = HIRA_TO_ROMA.get(key);
          break;
        }
      }
      out += nextRoma && /^[aiueoy]/.test(nextRoma) ? "n'" : "n";
      i += 1;
      continue;
    }
    if (s[i] === "ー") {
      const v = out.match(/[aeiou]$/)?.[0];
      if (!v) return null;
      out += v;
      i += 1;
      continue;
    }
    let matched = false;
    for (const key of HIRA_KEYS) {
      if (s.startsWith(key, i)) {
        out += HIRA_TO_ROMA.get(key);
        i += key.length;
        matched = true;
        break;
      }
    }
    if (!matched) return null;
  }
  return out;
}

/** Split a dictionary reading into acceptable hiragana forms. */
export function expandReading(reading) {
  const parts = String(reading).split(/\s*[;；/]\s*/);
  const out = [];
  const add = (p) => {
    let t = kataToHira(p).replace(/[～〜~]/g, "").replace(/\s+/g, "");
    t = t.replace(/[()（）]/g, "");
    if (t && !out.includes(t)) out.push(t);
  };
  for (let p of parts) {
    p = p.trim();
    if (!p) continue;
    const optional = p.match(/^(.*?)[(（]\s*する\s*[)）]\s*$/);
    if (optional) {
      add(optional[1]);
      add(optional[1] + "する");
    } else add(p);
  }
  return out;
}

export function normalizeInput(raw) {
  if (raw == null) return null;
  let s = String(raw).trim().toLowerCase();
  s = s.replace(/[。、．，,.!！?？・\s\-‐‑–—]/g, "");
  s = s.replace(/ā/g, "aa").replace(/ī/g, "ii").replace(/ū/g, "uu").replace(/ē/g, "ee").replace(/ō/g, "oo");
  if (!s) return null;
  if (/[\u3040-\u30ff]/.test(s)) {
    s = kataToHira(s).replace(/[^\u3040-\u309fー]/g, "");
    return s || null;
  }
  if (!/^[a-z']+$/.test(s)) return null;
  return romajiToHiragana(s);
}

export function inputReadings(raw) {
  if (raw == null) return [];
  let s = String(raw).trim().toLowerCase();
  s = s.replace(/[。、．，,.!！?？・\s\-‐‑–—]/g, "");
  s = s.replace(/ā/g, "aa").replace(/ī/g, "ii").replace(/ū/g, "uu").replace(/ē/g, "ee").replace(/ō/g, "oo");
  if (!s) return [];
  if (/[\u3040-\u30ff]/.test(s)) {
    s = kataToHira(s).replace(/[^\u3040-\u309fー]/g, "");
    return s ? [s] : [];
  }
  if (!/^[a-z']+$/.test(s)) return [];
  return romajiCandidates(s);
}

export function answersMatch(raw, accept) {
  const got = inputReadings(raw);
  if (!got.length) return false;
  return got.some((g) => accept.some((a) => foldLong(a) === foldLong(g)));
}
