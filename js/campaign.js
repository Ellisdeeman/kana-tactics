/** Campaign, jobs, gear, daily battle, and N5 lesson prompts. */

import { hiraToKata } from "./romaji.js";
import { cardKey } from "./srs.js";

const LEVEL_XP = [0, 40, 100, 180, 280, 400];

export const HEROES = [
  {
    id: "ren", name: "Ren", nameJp: "レン", job: "Squire", jobJp: "スクワイア", jobId: "squire",
    focus: "ひらがな", sprite: "squire", color: "#e15a4a",
    maxHp: 40, atk: 11, def: 3, spd: 8, mov: 4, range: 1,
    kit: [
      { id: "slash", level: 1 },
      { id: "shout", level: 2 },
    ],
  },
  {
    id: "mina", name: "Mina", nameJp: "ミナ", job: "Chemist", jobJp: "ケミスト", jobId: "chemist",
    focus: "カタカナ", sprite: "chemist", color: "#3cba78",
    maxHp: 34, atk: 8, def: 2, spd: 7, mov: 4, range: 1,
    kit: [
      { id: "potion", level: 1 },
      { id: "toss", level: 2 },
      { id: "listen", level: 1, content: "listen" },
    ],
  },
  {
    id: "sou", name: "Sou", nameJp: "ソウ", job: "Black Mage", jobJp: "黒魔道士", jobId: "mage",
    focus: "かんじ", sprite: "mage", color: "#7d6cf2",
    maxHp: 28, atk: 12, def: 2, spd: 6, mov: 3, range: 1,
    kit: [
      { id: "fire", level: 1 },
      { id: "water", level: 2 },
      { id: "chant", level: 3 },
      { id: "echo", level: 1, content: "listen" },
    ],
  },
  {
    id: "ken", name: "Ken", nameJp: "ケン", job: "Monk", jobJp: "モンク", jobId: "monk",
    focus: "かつよう", sprite: "monk", color: "#e0a04a",
    maxHp: 38, atk: 11, def: 3, spd: 8, mov: 4, range: 1,
    kit: [
      { id: "combo", level: 1 },
      { id: "form", level: 2 },
    ],
  },
  {
    id: "aki", name: "Aki", nameJp: "アキ", job: "Knight", jobJp: "ナイト", jobId: "knight",
    focus: "じょし", sprite: "knight", color: "#8eb6ff",
    maxHp: 42, atk: 11, def: 4, spd: 6, mov: 3, range: 1,
    kit: [
      { id: "particle", level: 1 },
      { id: "oath", level: 1, content: "duel" },
    ],
  },
];

const JOB_BY_CLEAR = ["chemist", "mage", "monk", "knight"];
const CONTENT_BY_CLEAR = ["katakana", "kanji", "conj", "particle", "listen", "duel", "ending"];

export const CAMPAIGN = [
  {
    id: "crossing", name: "The Crossing", nameJp: "みち", xp: 30, deploy: 3,
    blurb: "Hiragana on the road.",
    rows: [".#..#.", "......", "......", "......", "..#...", ".#..#."],
    slots: [{ x: 1, y: 4 }, { x: 2, y: 5 }, { x: 3, y: 4 }],
    enemies: [
      { id: "g1", name: "Goblin", nameJp: "ゴブリン", sprite: "goblin", color: "#d9892b", maxHp: 16, atk: 7, def: 1, spd: 6, mov: 3, range: 1, x: 1, y: 1 },
      { id: "g2", name: "Goblin", nameJp: "ゴブリン", sprite: "goblin", color: "#c47a28", maxHp: 16, atk: 7, def: 1, spd: 5, mov: 3, range: 1, x: 4, y: 1 },
    ],
  },
  {
    id: "market", name: "Market", nameJp: "いちば", xp: 36, deploy: 3,
    blurb: "Katakana loanwords.",
    rows: ["#....#", "......", ".#..#.", ".#..#.", "......", "#....#"],
    slots: [{ x: 1, y: 4 }, { x: 2, y: 5 }, { x: 3, y: 4 }],
    enemies: [
      { id: "a1", name: "Archer", nameJp: "アーチャー", sprite: "archer", color: "#d06a3a", maxHp: 18, atk: 8, def: 1, spd: 7, mov: 3, range: 3, x: 2, y: 0 },
      { id: "i1", name: "Imp", nameJp: "インプ", sprite: "imp", color: "#d24b86", maxHp: 16, atk: 9, def: 1, spd: 6, mov: 3, range: 3, x: 4, y: 1 },
    ],
  },
  {
    id: "shrine", name: "Shrine", nameJp: "じんじゃ", xp: 42, deploy: 3,
    blurb: "A wraith that only fears kanji.",
    rows: ["~~..~~", "~....~", "......", "......", "~....~", "~~..~~"],
    slots: [{ x: 2, y: 4 }, { x: 3, y: 4 }, { x: 2, y: 5 }],
    enemies: [
      { id: "w1", name: "Wraith", nameJp: "かげ", sprite: "wraith", color: "#9a8cff", quirk: "kanji", maxHp: 24, atk: 9, def: 1, spd: 6, mov: 3, range: 2, x: 2, y: 1 },
      { id: "g3", name: "Goblin", nameJp: "ゴブリン", sprite: "goblin", color: "#d9892b", maxHp: 18, atk: 8, def: 1, spd: 6, mov: 3, range: 1, x: 4, y: 2 },
    ],
  },
  {
    id: "dojo", name: "Dojo", nameJp: "どうじょう", xp: 48, deploy: 4,
    blurb: "Verb and adjective forms.",
    rows: ["======", "=....=", "=....=", "=....=", "=....=", "======"],
    slots: [{ x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }],
    enemies: [
      { id: "f1", name: "Fox", nameJp: "きつね", sprite: "fox", color: "#e07a3a", quirk: "scramble", maxHp: 22, atk: 9, def: 1, spd: 8, mov: 4, range: 1, x: 2, y: 1 },
      { id: "i2", name: "Imp", nameJp: "インプ", sprite: "imp", color: "#d24b86", maxHp: 18, atk: 8, def: 1, spd: 6, mov: 3, range: 2, x: 4, y: 1 },
    ],
  },
  {
    id: "forest", name: "Forest", nameJp: "もり", xp: 54, deploy: 4,
    blurb: "The fox scrambles the prompt into katakana.",
    rows: ["#..#..#.", ".#....#.", "..#..#..", "........", "..#..#..", ".#....#.", "#..#..#.", "........"],
    slots: [{ x: 1, y: 6 }, { x: 2, y: 6 }, { x: 5, y: 6 }, { x: 3, y: 7 }],
    enemies: [
      { id: "f2", name: "Fox", nameJp: "きつね", sprite: "fox", color: "#e07a3a", quirk: "scramble", maxHp: 26, atk: 10, def: 2, spd: 8, mov: 4, range: 1, x: 2, y: 1 },
      { id: "a2", name: "Archer", nameJp: "アーチャー", sprite: "archer", color: "#d06a3a", maxHp: 20, atk: 9, def: 1, spd: 7, mov: 3, range: 3, x: 5, y: 1 },
      { id: "g4", name: "Goblin", nameJp: "ゴブリン", sprite: "goblin", color: "#d9892b", maxHp: 20, atk: 8, def: 2, spd: 6, mov: 3, range: 1, x: 4, y: 2 },
    ],
  },
  {
    id: "gate", name: "Castle Gate", nameJp: "もん", xp: 60, deploy: 4,
    blurb: "Kanji wraith and a scrambling fox.",
    rows: ["###..###", "#......#", "#......#", "........", "........", "#......#", "###..###"],
    slots: [{ x: 3, y: 5 }, { x: 4, y: 5 }, { x: 2, y: 5 }, { x: 5, y: 5 }],
    enemies: [
      { id: "w2", name: "Wraith", nameJp: "かげ", sprite: "wraith", color: "#9a8cff", quirk: "kanji", maxHp: 28, atk: 10, def: 2, spd: 6, mov: 3, range: 2, x: 3, y: 1 },
      { id: "f3", name: "Fox", nameJp: "きつね", sprite: "fox", color: "#e07a3a", quirk: "scramble", maxHp: 24, atk: 10, def: 1, spd: 8, mov: 4, range: 1, x: 5, y: 2 },
    ],
  },
  {
    id: "throne", name: "Throne", nameJp: "まおう", xp: 80, deploy: 5,
    blurb: "The boss opens with a sentence duel.",
    rows: ["........", "..#..#..", "........", "........", "...==...", "...==...", "........", "........"],
    slots: [{ x: 2, y: 6 }, { x: 3, y: 7 }, { x: 4, y: 6 }, { x: 5, y: 7 }, { x: 1, y: 6 }],
    enemies: [
      { id: "boss", name: "Demon King", nameJp: "まおう", sprite: "boss", color: "#c43b4a", quirk: "duel", maxHp: 46, atk: 12, def: 3, spd: 7, mov: 3, range: 1, x: 3, y: 1 },
      { id: "w3", name: "Wraith", nameJp: "かげ", sprite: "wraith", color: "#9a8cff", quirk: "kanji", maxHp: 22, atk: 9, def: 1, spd: 6, mov: 3, range: 2, x: 1, y: 2 },
      { id: "f4", name: "Fox", nameJp: "きつね", sprite: "fox", color: "#e07a3a", quirk: "scramble", maxHp: 20, atk: 9, def: 1, spd: 8, mov: 4, range: 1, x: 6, y: 2 },
    ],
  },
];

function part(t, r, k) {
  return r ? { t, r, k: k || t } : { t };
}

function scene(id, lines) {
  return { id, lines };
}

export const STORIES = {
  "crossing-before": scene("crossing-before", [
    { parts: [part("私", "わたし"), part("はレンです。"), part("道", "みち"), part("をあるきます。")], en: "I am Ren. I walk the road." },
    { parts: [part("ゴブリンがいます。")], en: "There is a goblin." },
  ]),
  "crossing-after": scene("crossing-after", [
    { parts: [part("ゴブリンをたおしました。")], en: "I defeated the goblin." },
    { parts: [part("ミナがきます。"), part("薬", "くすり"), part("をくれます。")], en: "Mina comes. She gives me medicine." },
  ]),
  "market-before": scene("market-before", [
    { parts: [part("ここは"), part("市場", "いちば"), part("です。")], en: "This is the market." },
    { parts: [part("コーヒーとパンをかいます。")], en: "I buy coffee and bread." },
  ]),
  "market-after": scene("market-after", [
    { parts: [part("ソウがきます。"), part("火", "ひ"), part("と"), part("水", "みず"), part("をつかいます。")], en: "Sou comes. He uses fire and water." },
  ]),
  "shrine-before": scene("shrine-before", [
    { parts: [part("神社", "じんじゃ"), part("はしずかです。")], en: "The shrine is quiet." },
    { parts: [part("かげはかんじがこわいです。")], en: "The shadow is afraid of kanji." },
  ]),
  "shrine-after": scene("shrine-after", [
    { parts: [part("ケンがきます。"), part("ことばのかたちをならいます。")], en: "Ken comes. We learn word forms." },
  ]),
  "dojo-before": scene("dojo-before", [
    { parts: [part("道場", "どうじょう"), part("でれんしゅうします。")], en: "We practice in the dojo." },
    { parts: [part("かく、かきます、かいて。")], en: "Write, write (polite), write (te-form)." },
  ]),
  "dojo-after": scene("dojo-after", [
    { parts: [part("アキがきます。"), part("じょしをつかいます。")], en: "Aki comes. She uses particles." },
  ]),
  "forest-before": scene("forest-before", [
    { parts: [part("森", "もり"), part("はくらいです。")], en: "The forest is dark." },
    { parts: [part("きつねはことばをカタカナにします。")], en: "The fox turns words into katakana." },
  ]),
  "forest-after": scene("forest-after", [
    { parts: [part("みみでことばをききます。")], en: "We listen to the words." },
  ]),
  "gate-before": scene("gate-before", [
    { parts: [part("城", "しろ"), part("の"), part("門", "もん"), part("です。")], en: "It is the castle gate." },
    { parts: [part("わたしはみずをのみます。")], en: "I drink water." },
  ]),
  "gate-after": scene("gate-after", [
    { parts: [part("まおうがまっています。")], en: "The demon king is waiting." },
  ]),
  "throne-before": scene("throne-before", [
    { parts: [part("まおうは"), part("文", "ぶん"), part("をかきます。")], en: "The demon king writes a sentence." },
    { parts: [part("はやく、ただしいじょしをえらびます。")], en: "Choose the right particle quickly." },
  ]),
  "throne-after": scene("throne-after", [
    { parts: [part("まおうをたおしました。")], en: "We defeated the demon king." },
    { parts: [part("ともだちと"), part("国", "くに"), part("へかえります。")], en: "I go back to the country with my friends." },
  ]),
};

export const CONJ = [
  { id: 154, jp: "書く", dict: "かく", meaning: "to write", kind: "verb", forms: { dict: "かく", masu: "かきます", te: "かいて", ta: "かいた", nai: "かかない" } },
  { id: 48, jp: "行く", dict: "いく", meaning: "to go", kind: "verb", forms: { dict: "いく", masu: "いきます", te: "いって", ta: "いった", nai: "いかない" } },
  { id: 647, jp: "見る", dict: "みる", meaning: "to see", kind: "verb", forms: { dict: "みる", masu: "みます", te: "みて", ta: "みた", nai: "みない" } },
  { id: 392, jp: "食べる", dict: "たべる", meaning: "to eat", kind: "verb", forms: { dict: "たべる", masu: "たべます", te: "たべて", ta: "たべた", nai: "たべない" } },
  { id: 514, jp: "飲む", dict: "のむ", meaning: "to drink", kind: "verb", forms: { dict: "のむ", masu: "のみます", te: "のんで", ta: "のんだ", nai: "のまない" } },
  { id: 540, jp: "話す", dict: "はなす", meaning: "to speak", kind: "verb", forms: { dict: "はなす", masu: "はなします", te: "はなして", ta: "はなした", nai: "はなさない" } },
  { id: 378, jp: "高い", dict: "たかい", meaning: "expensive; tall", kind: "i", forms: { dict: "たかい", nai: "たかくない", past: "たかかった", te: "たかくて" } },
  { id: 20, jp: "新しい", dict: "あたらしい", meaning: "new", kind: "i", forms: { dict: "あたらしい", nai: "あたらしくない", past: "あたらしかった", te: "あたらしくて" } },
  { id: 297, jp: "静か", dict: "しずか", meaning: "quiet", kind: "na", forms: { dict: "しずか", na: "しずかな", nai: "しずかじゃない", past: "しずかだった" } },
  { id: 240, jp: "元気", dict: "げんき", meaning: "healthy; energetic", kind: "na", forms: { dict: "げんき", na: "げんきな", nai: "げんきじゃない", past: "げんきだった" } },
];

const FORM_LABEL = {
  dict: "dictionary",
  masu: "ます",
  te: "て",
  ta: "た",
  nai: "ない",
  past: "past",
  na: "な",
};

export const SENTENCES = [
  { parts: ["わたし", "＿", "がくせいです"], blank: "は", choices: ["は", "を", "で", "も"], speak: "わたしはがくせいです", meaning: "I am a student.", wordId: 713 },
  { parts: ["ねこ", "＿", "います"], blank: "が", choices: ["が", "を", "へ", "の"], speak: "ねこがいます", meaning: "There is a cat.", wordId: null },
  { parts: ["みず", "＿", "のみます"], blank: "を", choices: ["を", "に", "と", "が"], speak: "みずをのみます", meaning: "I drink water.", wordId: 637 },
  { parts: ["がっこう", "＿", "いきます"], blank: "に", choices: ["に", "を", "も", "の"], speak: "がっこうにいきます", meaning: "I go to school.", wordId: 167 },
  { parts: ["うち", "＿", "たべます"], blank: "で", choices: ["で", "を", "も", "が"], speak: "うちでたべます", meaning: "I eat at home.", wordId: 392 },
  { parts: ["がっこう", "＿", "いきます"], blank: "へ", choices: ["へ", "を", "と", "の"], speak: "がっこうへいきます", meaning: "I go to school.", wordId: 167 },
  { parts: ["ともだち", "＿", "はなします"], blank: "と", choices: ["と", "を", "で", "が"], speak: "ともだちとはなします", meaning: "I talk with a friend.", wordId: 540 },
  { parts: ["わたし", "＿", "がくせいです"], blank: "も", choices: ["も", "を", "へ", "の"], speak: "わたしもがくせいです", meaning: "I am a student too.", wordId: 713 },
  { parts: ["にほん", "＿", "みず"], blank: "の", choices: ["の", "を", "で", "へ"], speak: "にほんのみず", meaning: "Japan's water.", wordId: 637 },
];

export const DUELS = [
  {
    parts: ["わたし", "＿", "みず", "＿", "のみます"],
    blanks: [
      { answer: "は", choices: ["は", "を", "で", "も"] },
      { answer: "を", choices: ["を", "に", "へ", "が"] },
    ],
    speak: "わたしはみずをのみます",
    meaning: "I drink water.",
  },
  {
    parts: ["がっこう", "＿", "ともだち", "＿", "いきます"],
    blanks: [
      { answer: "に", choices: ["に", "を", "も", "の"] },
      { answer: "と", choices: ["と", "が", "で", "へ"] },
    ],
    speak: "がっこうにともだちといきます",
    meaning: "I go to school with a friend.",
  },
  {
    parts: ["うち", "＿", "ほん", "＿", "よみます"],
    blanks: [
      { answer: "で", choices: ["で", "を", "へ", "も"] },
      { answer: "を", choices: ["を", "に", "と", "の"] },
    ],
    speak: "うちでほんをよみます",
    meaning: "I read a book at home.",
  },
];

export const GEAR = [
  { id: "wood-sword", slot: "weapon", name: "木の剣", hero: "ren", atk: 2, def: 0, master: { type: "kana", id: "あ" } },
  { id: "hira-helm", slot: "armor", name: "あのかぶと", hero: "ren", atk: 0, def: 2, master: { type: "kana", id: "い" } },
  { id: "coffee-flask", slot: "weapon", name: "コーヒーびん", hero: "mina", atk: 2, def: 0, master: { type: "vocab", id: 250 } },
  { id: "pan-coat", slot: "armor", name: "パンのふく", hero: "mina", atk: 0, def: 2, master: { type: "vocab", id: 551 } },
  { id: "fire-staff", slot: "weapon", name: "火の杖", hero: "sou", atk: 3, def: 0, master: { type: "kanji", id: "火" } },
  { id: "water-robe", slot: "armor", name: "水のころも", hero: "sou", atk: 0, def: 2, master: { type: "kanji", id: "水" } },
  { id: "write-glove", slot: "weapon", name: "書く手甲", hero: "ken", atk: 2, def: 0, master: { type: "vocab", id: 154 } },
  { id: "eat-wrap", slot: "armor", name: "食べる帯", hero: "ken", atk: 0, def: 2, master: { type: "vocab", id: 392 } },
  { id: "wa-blade", slot: "weapon", name: "はの剣", hero: "aki", atk: 2, def: 0, master: { type: "kana", id: "は" } },
  { id: "wo-shield", slot: "armor", name: "をの盾", hero: "aki", atk: 0, def: 2, master: { type: "kana", id: "を" } },
];

export function levelFor(xp) {
  let level = 1;
  for (let i = 1; i < LEVEL_XP.length; i++) if ((xp || 0) >= LEVEL_XP[i]) level = i + 1;
  return level;
}

export function xpToNext(xp) {
  const level = levelFor(xp);
  return LEVEL_XP[level] ?? null;
}

export function clearedList(campaign) {
  return Array.isArray(campaign?.cleared) ? campaign.cleared.filter((id) => CAMPAIGN.some((b) => b.id === id)) : [];
}

export function unlockedJobs(cleared) {
  const jobs = ["squire"];
  CAMPAIGN.forEach((battle, i) => {
    if (cleared.includes(battle.id) && JOB_BY_CLEAR[i]) jobs.push(JOB_BY_CLEAR[i]);
  });
  return jobs;
}

export function unlockedContent(cleared) {
  const set = new Set(["hiragana"]);
  CAMPAIGN.forEach((battle, i) => {
    if (cleared.includes(battle.id) && CONTENT_BY_CLEAR[i]) set.add(CONTENT_BY_CLEAR[i]);
  });
  return set;
}

export function isBattleOpen(cleared, battleId) {
  const index = CAMPAIGN.findIndex((b) => b.id === battleId);
  if (index < 0) return false;
  if (index === 0) return true;
  return cleared.includes(CAMPAIGN[index - 1].id);
}

export function partyFor(cleared, deploy = 4) {
  const jobs = new Set(unlockedJobs(cleared));
  return HEROES.filter((h) => jobs.has(h.jobId)).slice(0, deploy);
}

export function isMastered(card) {
  return !!(card && card.seen && ((card.reps || 0) >= 2 || (card.intervalDays || 0) >= 6));
}

export function gearBonus(cards, gear, heroId) {
  let atk = 0;
  let def = 0;
  const names = [];
  const eq = gear?.[heroId] || {};
  for (const slot of ["weapon", "armor"]) {
    const item = GEAR.find((g) => g.id === eq[slot] && g.hero === heroId);
    if (!item) continue;
    const card = cards?.[cardKey(item.master.type, item.master.id)];
    if (!isMastered(card)) continue;
    atk += item.atk;
    def += item.def;
    names.push(item.name);
  }
  return { atk, def, names };
}

export function abilitiesFor(hero, xp, cleared) {
  const level = levelFor(xp);
  const content = unlockedContent(cleared);
  return hero.kit.filter((a) => level >= a.level && (!a.content || content.has(a.content))).map((a) => a.id);
}

export function buildEncounter(battleId, save, rng = Math.random) {
  const battle = CAMPAIGN.find((b) => b.id === battleId) || CAMPAIGN[0];
  const cleared = clearedList(save?.campaign);
  const heroes = partyFor(cleared, battle.deploy);
  const units = heroes.map((hero, i) => {
    const slot = battle.slots[i] || battle.slots[battle.slots.length - 1];
    const bonus = gearBonus(save?.cards, save?.gear, hero.id);
    const level = levelFor(save?.xp?.[hero.id] || 0);
    return {
      ...hero,
      team: "player",
      maxHp: hero.maxHp + (level - 1) * 4,
      atk: hero.atk + (level - 1) + bonus.atk,
      def: hero.def + bonus.def,
      abilities: abilitiesFor(hero, save?.xp?.[hero.id] || 0, cleared),
      x: slot.x,
      y: slot.y,
      level,
    };
  });
  for (const enemy of battle.enemies) {
    units.push({ team: "enemy", abilities: [], range: 1, focus: "", job: "Enemy", jobJp: "てき", ...enemy });
  }
  return {
    id: battle.id,
    kind: "campaign",
    rows: battle.rows,
    units,
    rng,
    focusIds: null,
  };
}

export function recordVictory(save, battleId) {
  const cleared = clearedList(save?.campaign);
  const fighters = partyFor(cleared, 5).map((h) => h.id);
  const next = cleared.includes(battleId) ? cleared.slice() : cleared.concat(battleId);
  const battle = CAMPAIGN.find((b) => b.id === battleId);
  const xp = { ...(save?.xp || {}) };
  for (const id of fighters) xp[id] = (xp[id] || 0) + (battle?.xp || 30);
  const seen = Array.isArray(save?.campaign?.seen) ? save.campaign.seen.slice() : [];
  return { cleared: next, seen, xp };
}

export function localDay(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dailyAvailable(daily, now = new Date()) {
  return !daily || daily.day !== localDay(now) || daily.finished !== true;
}

export function dailyWordIds(save, vocabIds, now = Date.now()) {
  const knownIds = vocabIds instanceof Set ? vocabIds : new Set(vocabIds || []);
  const weak = (save?.study?.weak || []).map(Number).filter((id) => knownIds.has(id));
  if (weak.length) return [...new Set(weak)].slice(0, 12);
  const due = Object.values(save?.cards || {})
    .filter((c) => c && c.type === "vocab" && c.seen && Number(c.due) <= now && knownIds.has(Number(c.id)))
    .map((c) => Number(c.id));
  if (due.length) return [...new Set(due)].slice(0, 12);
  return [0, 20, 48, 154, 250, 392].filter((id) => knownIds.has(id));
}

export function buildDailyEncounter(save, vocabIds, now = new Date(), rng = Math.random) {
  const cleared = clearedList(save?.campaign);
  const heroes = partyFor(cleared, 3);
  const slots = [{ x: 1, y: 4 }, { x: 2, y: 5 }, { x: 3, y: 4 }];
  const units = heroes.map((hero, i) => {
    const bonus = gearBonus(save?.cards, save?.gear, hero.id);
    const level = levelFor(save?.xp?.[hero.id] || 0);
    return {
      ...hero,
      team: "player",
      maxHp: hero.maxHp + (level - 1) * 4,
      atk: hero.atk + (level - 1) + bonus.atk,
      def: hero.def + bonus.def,
      abilities: abilitiesFor(hero, save?.xp?.[hero.id] || 0, cleared),
      x: slots[i].x,
      y: slots[i].y,
      level,
    };
  });
  units.push(
    { id: "d1", name: "Imp", nameJp: "インプ", team: "enemy", sprite: "imp", color: "#d24b86", job: "Enemy", jobJp: "てき", focus: "", abilities: [], maxHp: 18, atk: 8, def: 1, spd: 6, mov: 3, range: 2, x: 1, y: 1 },
    { id: "d2", name: "Fox", nameJp: "きつね", team: "enemy", sprite: "fox", color: "#e07a3a", job: "Enemy", jobJp: "てき", focus: "", abilities: [], quirk: "scramble", maxHp: 20, atk: 8, def: 1, spd: 7, mov: 3, range: 1, x: 4, y: 1 },
  );
  return {
    id: "daily",
    kind: "daily",
    rows: [".#..#.", "......", "......", "......", "......", ".#..#."],
    units,
    rng,
    focusIds: dailyWordIds(save, vocabIds, now.getTime ? now.getTime() : now),
  };
}

function pick(list, rng) {
  return list[Math.floor(rng() * list.length)];
}

function shuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function selectConjPrompt(rng = Math.random) {
  const word = pick(CONJ, rng);
  const keys = Object.keys(word.forms);
  const form = pick(keys, rng);
  const correct = word.forms[form];
  const choices = shuffle(keys.map((k) => word.forms[k]), rng);
  return {
    mode: "conj",
    speak: word.dict,
    ask: `${FORM_LABEL[form] || form} form`,
    item: {
      id: word.id,
      type: "vocab",
      japanese: word.jp,
      reading: correct,
      meaning: `${word.meaning} · ${FORM_LABEL[form] || form}`,
      accept: [correct],
    },
    choices,
    correct,
    romaji: false,
  };
}

function particlePrompt(row) {
  const shown = row.parts.map((p) => (p === "＿" ? "＿" : p)).join("");
  return {
    mode: "particle",
    speak: row.speak,
    ask: "Which particle?",
    item: {
      id: row.blank,
      type: "kana",
      japanese: shown,
      reading: row.blank,
      meaning: row.meaning,
      accept: [row.blank],
    },
    choices: row.choices.slice(),
    correct: row.blank,
    romaji: false,
  };
}

export function selectParticlePrompt(rng = Math.random) {
  return particlePrompt(pick(SENTENCES, rng));
}

export function selectSentencePrompt(rng = Math.random) {
  const row = pick(DUELS, rng);
  const steps = row.blanks.map((blank, index) => {
    const parts = row.parts.slice();
    let n = 0;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] !== "＿") continue;
      parts[i] = n === index ? "＿" : row.blanks[n].answer;
      n += 1;
    }
    return particlePrompt({
      parts,
      blank: blank.answer,
      choices: blank.choices,
      speak: row.speak,
      meaning: row.meaning,
    });
  });
  return {
    mode: "sentence",
    speak: row.speak,
    ask: "Build the sentence",
    meaning: row.meaning,
    steps,
    item: steps[0].item,
    choices: steps[0].choices,
    correct: steps[0].correct,
    romaji: false,
  };
}

export function selectListenPrompt(vocab, rng = Math.random, focusIds = null) {
  const focus = focusIds ? new Set(focusIds) : null;
  let pool = vocab.filter((w) => w.meaning && w.japanese);
  if (focus) {
    const hit = pool.filter((w) => focus.has(w.id));
    if (hit.length) pool = hit;
  }
  const word = pick(pool, rng);
  const correct = word.meaning.split(/[;,]/)[0].trim();
  const distractors = [];
  const seen = new Set([correct.toLowerCase()]);
  const rest = shuffle(vocab, rng);
  for (const other of rest) {
    const meaning = (other.meaning || "").split(/[;,]/)[0].trim();
    if (!meaning || seen.has(meaning.toLowerCase())) continue;
    seen.add(meaning.toLowerCase());
    distractors.push(meaning);
    if (distractors.length === 3) break;
  }
  return {
    mode: "listen",
    speak: word.reading || word.japanese,
    ask: "What does it mean?",
    item: {
      id: word.id,
      type: "vocab",
      japanese: word.japanese,
      reading: word.reading,
      meaning: correct,
      accept: [correct],
    },
    choices: shuffle([correct, ...distractors], rng),
    correct,
    romaji: false,
    hideJp: true,
  };
}

export function scramblePrompt(prompt) {
  if (!prompt || prompt.mode === "listen" || prompt.mode === "sentence") return prompt;
  const toK = (s) => hiraToKata(String(s));
  return {
    ...prompt,
    scrambled: true,
    item: { ...prompt.item, japanese: toK(prompt.item.japanese) },
    choices: (prompt.choices || []).map(toK),
    correct: toK(prompt.correct),
  };
}

export function storyHtml(story, cards, showEnglish) {
  const mastered = new Set();
  for (const card of Object.values(cards || {})) {
    if (card?.type === "kanji" && isMastered(card)) mastered.add(String(card.id));
  }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const lines = (story?.lines || []).map((line) => {
    const jp = (line.parts || []).map((p) => {
      if (!p.r) return esc(p.t);
      const faded = p.k && mastered.has(p.k) ? " faded" : "";
      return `<ruby>${esc(p.t)}<rt class="${faded.trim()}">${esc(p.r)}</rt></ruby>`;
    }).join("");
    const en = showEnglish ? `<span class="story-en">${esc(line.en || "")}</span>` : "";
    return `<p class="story-line" lang="ja">${jp}${en}</p>`;
  }).join("");
  return lines;
}

export function migrateSave(data) {
  const src = data && typeof data === "object" ? data : {};
  return {
    cards: src.cards && typeof src.cards === "object" ? src.cards : {},
    results: Array.isArray(src.results) ? src.results : [],
    lastExportDate: typeof src.lastExportDate === "string" ? src.lastExportDate : null,
    study: {
      known: Array.isArray(src.study?.known) ? src.study.known : [],
      weak: Array.isArray(src.study?.weak) ? src.study.weak : [],
    },
    sound: src.sound !== false,
    campaign: {
      cleared: clearedList(src.campaign),
      seen: Array.isArray(src.campaign?.seen) ? src.campaign.seen.filter((id) => typeof id === "string") : [],
    },
    xp: src.xp && typeof src.xp === "object" ? src.xp : {},
    gear: src.gear && typeof src.gear === "object" ? src.gear : {},
    daily: src.daily && typeof src.daily === "object" ? { day: String(src.daily.day || ""), finished: src.daily.finished === true } : { day: "", finished: false },
    gloss: src.gloss === true,
  };
}

export function availableGear(heroId, cards) {
  return GEAR.filter((g) => g.hero === heroId && isMastered(cards?.[cardKey(g.master.type, g.master.id)]));
}
