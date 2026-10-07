import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  answersMatch,
  expandReading,
  foldLong,
  kanaToRomaji,
  romajiToHiragana,
} from "../js/romaji.js";
import {
  RESULTS_MAX,
  buildProgressExport,
  buildResultsExport,
  emptyCard,
  gradeFromAnswer,
  normalizeResults,
  parseProgress,
  parseStudyList,
  promptWeight,
  reviewCard,
  splitPending,
  studySets,
  uniqueIso,
} from "../js/srs.js";
import { buildPools, prepareCatalog, selectPrompt } from "../js/prompt.js";
import {
  ABILITIES,
  applyBasicAttack,
  autoBattle,
  canStrike,
  createBattle,
  mulberry32,
  planOffense,
  reachable,
  startBattle,
  strikeAmount,
  targetsFor,
} from "../js/battle.js";
import { iso, tileFromIso } from "../js/render.js";

const vocab = JSON.parse(readFileSync(new URL("../data/n5-vocab.json", import.meta.url)));
const kana = JSON.parse(readFileSync(new URL("../data/kana.json", import.meta.url)));
const kanji = JSON.parse(readFileSync(new URL("../data/kanji.json", import.meta.url)));
const catalog = prepareCatalog({ vocab, kana, kanji });
const pools = buildPools(catalog);

test("N5 vocab ids match JLPT Vocab Quest indexes", () => {
  assert.equal(vocab.length, 718);
  assert.equal(vocab[0].id, 0);
  assert.equal(vocab[0].japanese, "ああ");
  assert.equal(vocab[250].japanese, "コーヒー");
  assert.equal(vocab[250].reading, "コーヒー");
  assert.equal(vocab[717].id, 717);
  for (let i = 0; i < vocab.length; i++) assert.equal(vocab[i].id, i);
});

test("romaji round-trips every kana and every vocab reading", () => {
  for (const k of kana) {
    const hira = catalog.kana.find((c) => c.id === k.id).accept[0];
    const roma = kanaToRomaji(hira);
    assert.equal(roma, k.reading, k.id);
    assert.equal(foldLong(romajiToHiragana(roma)), foldLong(hira));
    assert.equal(answersMatch(k.reading, [hira]), true);
    assert.equal(answersMatch(k.id, [hira]), true);
  }
  for (const w of vocab) {
    for (const accept of expandReading(w.reading)) {
      const roma = kanaToRomaji(accept);
      assert.ok(roma, `${w.id} ${accept}`);
      assert.equal(foldLong(romajiToHiragana(roma)), foldLong(accept), `${w.id} ${accept} ${roma}`);
      assert.equal(answersMatch(roma, [accept]), true);
      assert.equal(answersMatch(accept, [accept]), true);
    }
  }
});

test("optional する readings and romaji aliases are accepted", () => {
  const accept = expandReading("けっこん (する)");
  assert.deepEqual(accept, ["けっこん", "けっこんする"]);
  assert.equal(answersMatch("kekkon", accept), true);
  assert.equal(answersMatch("kekkonsuru", accept), true);
  assert.equal(answersMatch("し", ["し"]), true);
  assert.equal(answersMatch("si", ["し"]), true);
  assert.equal(answersMatch("chi", ["ち"]), true);
  assert.equal(answersMatch("ti", ["ち"]), true);
  assert.equal(answersMatch("wo", ["を"]), true);
  assert.equal(answersMatch("o", ["を"]), true);
  assert.equal(answersMatch("koohii", expandReading("コーヒー")), true);
  assert.equal(answersMatch("コーヒー", expandReading("コーヒー")), true);
  assert.equal(answersMatch("wrong", ["みず"]), false);
});

test("SM-2: a miss comes back quickly, a perfect answer graduates", () => {
  const now = Date.UTC(2026, 9, 7);
  const missed = reviewCard(emptyCard("kana", "あ"), "wrong", now);
  assert.equal(missed.incorrect, 1);
  assert.equal(missed.reps, 0);
  assert.equal(missed.due, now + 20000);
  assert.ok(missed.ease < 2.5);
  const passed = reviewCard(emptyCard("vocab", 250), "perfect", now);
  assert.equal(passed.correct, 1);
  assert.equal(passed.intervalDays, 1);
  assert.equal(passed.due, now + 86400000);
  const second = reviewCard(passed, "perfect", passed.due);
  assert.equal(second.intervalDays, 6);
  const slow = reviewCard(emptyCard("kanji", "火"), "slow", now);
  assert.equal(slow.correct, 1);
  assert.ok(slow.ease < 2.5);
  assert.equal(gradeFromAnswer(true, 4000), "perfect");
  assert.equal(gradeFromAnswer(true, 4001), "slow");
  assert.equal(gradeFromAnswer(false, 100), "wrong");
});

test("weak study-list words outweigh known ones", () => {
  const study = studySets({ known: [20], weak: [250] });
  const coffee = catalog.vocab.find((w) => w.id === 250);
  const known = catalog.vocab.find((w) => w.id === 20);
  const fresh = catalog.vocab.find((w) => w.id === 30);
  const now = Date.now();
  const wWeak = promptWeight(coffee, null, study, now);
  const wKnown = promptWeight(known, null, study, now);
  const wFresh = promptWeight(fresh, null, study, now);
  assert.ok(wWeak > wFresh * 3);
  assert.ok(wFresh > wKnown);
  const rng = mulberry32(7);
  const counts = new Map();
  for (let i = 0; i < 2500; i++) {
    const prompt = selectPrompt(pools, "loan", {}, { known: [], weak: [250] }, rng, null, now);
    counts.set(prompt.item.id, (counts.get(prompt.item.id) || 0) + 1);
  }
  const weakHits = counts.get(250);
  const other = [...counts.entries()].filter(([id]) => id !== 250).map(([, n]) => n);
  const avg = other.reduce((a, b) => a + b, 0) / other.length;
  assert.ok(weakHits > avg * 3, `weak ${weakHits} avg ${avg}`);
});

test("export results and progress use the documented shapes", () => {
  const date = new Date("2026-10-07T12:00:00.000Z");
  const results = buildResultsExport([
    { id: 250, type: "vocab", correct: true, ms: 1800.4 },
    { id: "あ", type: "kana", correct: false, ms: 4200 },
    { id: "火", type: "kanji", correct: true, ms: 2100 },
  ], date);
  assert.deepEqual(results, {
    source: "kana-tactics",
    date: "2026-10-07T12:00:00.000Z",
    results: [
      { id: 250, type: "vocab", correct: true, ms: 1800 },
      { id: "あ", type: "kana", correct: false, ms: 4200 },
      { id: "火", type: "kanji", correct: true, ms: 2100 },
    ],
  });
  const card = reviewCard(emptyCard("vocab", 250), "perfect", date.getTime());
  const exported = buildProgressExport({ "vocab:250": card }, (type, id) => {
    assert.equal(type, "vocab");
    assert.equal(id, 250);
    return catalog.vocab.find((w) => w.id === id);
  }, date);
  assert.equal(exported.version, 1);
  assert.equal(exported.source, "kana-tactics");
  assert.equal(exported.items.length, 1);
  const item = exported.items[0];
  assert.equal(item.id, 250);
  assert.equal(item.type, "vocab");
  assert.equal(item.japanese, "コーヒー");
  assert.equal(item.reading, "コーヒー");
  assert.equal(item.meaning, "coffee");
  assert.equal(item.correct, 1);
  assert.equal(item.incorrect, 0);
  assert.equal(typeof item.srs.ease, "number");
  assert.equal(item.srs.reps, 1);
  const restored = parseProgress(exported);
  assert.equal(restored["vocab:250"].correct, 1);
  assert.equal(restored["vocab:250"].reps, 1);
  const study = parseStudyList({
    app: "jlpt-vocab-quest",
    v: 1,
    date: "2026-10-07T12:00:00.000Z",
    known: [250, 1, 1, 800, "2"],
    weak: [250, 12, 1],
    note: "ignored",
  });
  assert.deepEqual(study.known, [1, 250]);
  assert.deepEqual(study.weak, [1, 250]);
  assert.throws(() => parseStudyList({ source: "n5-vocab-quest", known: [1], weak: [] }));
  const later = uniqueIso(results.date, date);
  assert.ok(Date.parse(later) > Date.parse(results.date));
  const hugeMs = buildResultsExport([{ id: "火", type: "kanji", correct: true, ms: 9e6 }], date);
  assert.equal(hugeMs.results[0].ms, 3600000);
  const negative = buildResultsExport([{ id: "あ", type: "kana", correct: false, ms: -5 }], date);
  assert.equal(negative.results[0].ms, 0);
  assert.equal(negative.results[0].correct, false);
  const tooLong = buildResultsExport([{ id: "123456789", type: "kana", correct: true, ms: 10 }], date);
  assert.equal(tooLong.results.length, 0);
  const many = Array.from({ length: RESULTS_MAX + 1 }, (_, i) => ({
    id: i % 718,
    type: "vocab",
    correct: i % 2 === 0,
    ms: 10.2,
  }));
  const capped = buildResultsExport(many, date);
  assert.equal(capped.results.length, RESULTS_MAX);
  assert.equal(capped.source, "kana-tactics");
  assert.equal(Number.isInteger(capped.results[0].ms), true);
  assert.equal(capped.results[1].correct, false);
  const kept = normalizeResults(many);
  assert.equal(kept.length, RESULTS_MAX + 1);
  assert.equal(kept[0].id, 0);
  const split = splitPending(many.concat([{ id: "nope-too-long", type: "kana", correct: true, ms: 1 }]));
  assert.equal(split.batch.length, RESULTS_MAX);
  assert.equal(split.rest.length, 1);
  assert.equal(split.rest[0].id, RESULTS_MAX % 718);
});

test("prompts use job pools and real ids", () => {
  const rng = mulberry32(3);
  const hira = selectPrompt(pools, "hira", {}, { known: [], weak: [] }, rng);
  assert.equal(hira.item.type, "kana");
  assert.equal(hira.item.script, "hiragana");
  assert.equal(hira.choices.length, 4);
  assert.ok(hira.choices.includes(hira.correct));
  const loan = selectPrompt(pools, "loan", {}, { known: [], weak: [] }, rng);
  assert.equal(loan.item.type, "vocab");
  assert.equal(typeof loan.item.id, "number");
  assert.ok(loan.item.id >= 0 && loan.item.id < 718);
  const kj = selectPrompt(pools, "kanji", {}, { known: [], weak: [] }, rng);
  assert.equal(kj.item.type, "kanji");
  assert.equal(kj.item.id, kj.item.japanese);
  assert.equal(answersMatch(kj.correct, kj.item.accept), true);
  assert.ok(pools.loan.some((w) => w.id === 250));
  assert.ok(pools.kanji.some((k) => k.id === "火" && k.accept.includes("ひ")));
  assert.ok(pools.hira.some((k) => k.id === "あ"));
});

test("a basic attack needs no prompt and a perfect hit outdamages a slow one", () => {
  const state = startBattle(createBattle({ rng: mulberry32(1) }));
  const ren = state.units.find((u) => u.id === "ren");
  const gob = state.units.find((u) => u.id === "gob");
  gob.x = ren.x + 1;
  gob.y = ren.y;
  assert.equal(canStrike(state, ren, gob, 1), true);
  const before = gob.hp;
  const hit = applyBasicAttack(state, ren, gob);
  assert.ok(hit.damage > 0);
  assert.ok(gob.hp < before);
  const perfect = strikeAmount(12, 1, 1.8, "perfect", () => 0.5);
  const slow = strikeAmount(12, 1, 1.8, "slow", () => 0.5);
  const fizzle = strikeAmount(12, 1, 1.8, "wrong", () => 0.5);
  assert.ok(perfect > slow * 2);
  assert.equal(fizzle, 0);
});

test("battles can be won with good answers and lost when the party does nothing", () => {
  let wins = 0;
  let fizzleLosses = 0;
  let waits = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const good = autoBattle("perfect", seed);
    if (good.over === "win") wins += 1;
    else console.log("perfect not win", seed, good.over, good.units.map((u) => [u.id, u.hp]));
    const bad = autoBattle("fizzle", seed);
    if (bad.over === "lose") fizzleLosses += 1;
    const idle = autoBattle("wait", seed);
    if (idle.over === "lose") waits += 1;
    assert.equal(idle.over, "lose");
  }
  assert.ok(wins >= 10, `wins ${wins}`);
  assert.ok(fizzleLosses >= 10, `fizzle losses ${fizzleLosses}`);
  assert.equal(waits, 12);
});

test("a chemist can target herself with a potion", () => {
  const state = startBattle(createBattle({ rng: mulberry32(2) }));
  const mina = state.units.find((u) => u.id === "mina");
  state.current = mina;
  const targets = targetsFor(state, mina, ABILITIES.potion);
  assert.ok(targets.some((u) => u.id === "mina"));
  assert.equal(canStrike(state, mina, mina, 3, { self: true, los: false }), true);
});

test("isometric clicks land on the tile center", () => {
  for (const [x, y] of [[0, 0], [2, 3], [7, 7], [1, 6]]) {
    const top = iso(x, y);
    const center = tileFromIso(top.x, top.y + 18);
    assert.deepEqual(center, { x, y });
  }
});

test("the first actor is a player and movement stays on the map", () => {
  const state = startBattle(createBattle({ rng: mulberry32(4) }));
  assert.equal(state.current.team, "player");
  const reach = reachable(state, state.current);
  assert.ok(reach.dist.size > 1);
  for (const key of reach.dist.keys()) {
    const [x, y] = key.split(",").map(Number);
    assert.equal(state.map.blocked[y][x], false);
  }
  const plan = planOffense(state, state.units.find((u) => u.id === "gob"));
  assert.ok(plan.path.length >= 1);
});
