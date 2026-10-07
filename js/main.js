import { ABILITIES, applyAbility, applyBasicAttack, applyMove, buildPath, canStrike, createBattle, endTurn, living, planOffense, previewQueue, reachable, startBattle, targetsFor } from "./battle.js";
import { createRenderer } from "./render.js";
import { answersMatch, kanaToRomaji } from "./romaji.js";
import { buildPools, choiceIsCorrect, indexCatalog, prepareCatalog, selectPrompt } from "./prompt.js";
import {
  PERFECT_MS,
  PROMPT_TIMEOUT_MS,
  buildProgressExport,
  buildResultsExport,
  cardKey,
  emptyCard,
  gradeFromAnswer,
  normalizeResults,
  parseProgress,
  parseStudyList,
  reviewCard,
  splitPending,
  uniqueIso,
} from "./srs.js";

const SAVE_KEY = "kana-tactics.v1";
const $ = (id) => document.getElementById(id);

const ui = {
  screen: "title",
  mode: "move",
  reach: null,
  origin: null,
  ability: null,
  targets: [],
  hover: null,
  marks: new Map(),
  pos: {},
  floats: [],
  lunge: null,
  now: 0,
  logs: [],
  lastKey: null,
  token: 0,
  stats: { correct: 0, wrong: 0, perfect: 0 },
};

let save = loadSave();
let catalog = null;
let pools = null;
let byKey = null;
let battle = null;
let renderer = null;
let looping = false;
let audioCtx = null;
let promptTimer = 0;

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return emptySave();
    const data = JSON.parse(raw);
    return {
      cards: data.cards && typeof data.cards === "object" ? data.cards : {},
      results: normalizeResults(data.results),
      lastExportDate: typeof data.lastExportDate === "string" ? data.lastExportDate : null,
      study: {
        known: Array.isArray(data.study?.known) ? data.study.known : [],
        weak: Array.isArray(data.study?.weak) ? data.study.weak : [],
      },
      sound: data.sound !== false,
    };
  } catch {
    return emptySave();
  }
}

function emptySave() {
  return { cards: {}, results: [], lastExportDate: null, study: { known: [], weak: [] }, sound: true };
}

function persist() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  refreshStats();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

let toastTimer = 0;
function toast(text) {
  const el = $("toast");
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
}

function refreshStats() {
  const cards = Object.values(save.cards);
  const correct = cards.reduce((n, c) => n + (c.correct || 0), 0);
  const incorrect = cards.reduce((n, c) => n + (c.incorrect || 0), 0);
  const due = cards.filter((c) => c.seen && c.due <= Date.now()).length;
  $("stats").textContent = cards.length
    ? `Reviewed ${cards.length} · ${correct} correct, ${incorrect} missed · ${due} due · study list ${save.study.known.length} known / ${save.study.weak.length} weak`
    : `No reviews yet · study list ${save.study.known.length} known / ${save.study.weak.length} weak`;
  const waiting = sinceLabel(save.results.length);
  const since = $("results-since");
  if (since) since.textContent = waiting;
  const endSince = $("end-results-since");
  if (endSince) endSince.textContent = waiting;
  $("btn-sound").textContent = save.sound ? "Sound on" : "Sound off";
}

function sinceLabel(n) {
  const count = Math.max(0, Number(n) || 0);
  return `${count} ${count === 1 ? "result" : "results"} since last export`;
}

function lookup(type, id) {
  return byKey.get(cardKey(type, id)) || null;
}

/** Starts a file download. True only after the browser accepts it. */
function downloadJson(name, data) {
  const text = JSON.stringify(data, null, 2) + "\n";
  try {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return true;
  } catch {
    return false;
  }
}

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try { resolve(JSON.parse(String(reader.result))); }
      catch { reject(new Error("That file is not valid JSON.")); }
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsText(file);
  });
}

let exporting = false;

function exportResults() {
  if (exporting) return;
  const pending = splitPending(save.results);
  if (!pending.batch.length) {
    toast("No results since the last export.");
    return;
  }
  const date = uniqueIso(save.lastExportDate);
  const payload = buildResultsExport(pending.batch, date);
  if (!payload.results.length) {
    toast("No results since the last export.");
    return;
  }
  exporting = true;
  const day = payload.date.slice(0, 10);
  const ok = downloadJson(`kana-tactics-results-${day}.json`, payload);
  exporting = false;
  if (!ok) {
    toast("The download didn't start, so those results are still saved.");
    return;
  }
  save.results = pending.rest;
  save.lastExportDate = payload.date;
  persist();
  const left = save.results.length;
  toast(left
    ? `Downloaded ${payload.results.length}. ${sinceLabel(left)} still saved.`
    : `Downloaded ${payload.results.length} ${payload.results.length === 1 ? "result" : "results"}.`);
}

function exportProgress() {
  const payload = buildProgressExport(save.cards, lookup);
  if (!payload.items.length) {
    toast("No reviews to export yet.");
    return;
  }
  downloadJson(`kana-tactics-progress-${payload.exported.slice(0, 10)}.json`, payload);
}

async function onProgressFile(file) {
  if (!file) return;
  try {
    const data = await readJsonFile(file);
    const cards = parseProgress(data);
    const n = Object.keys(cards).length;
    if (!n) throw new Error("No kana, kanji, or vocab items in that file.");
    Object.assign(save.cards, cards);
    persist();
    toast(`Imported ${n} progress item${n === 1 ? "" : "s"}.`);
  } catch (err) {
    toast(err.message || "Could not import progress.");
  }
}

async function onStudyFile(file) {
  if (!file) return;
  try {
    const data = await readJsonFile(file);
    const list = parseStudyList(data);
    const ids = new Set(catalog.vocab.map((w) => w.id));
    const known = list.known.filter((id) => ids.has(id));
    const knownSet = new Set(known);
    const weak = list.weak.filter((id) => knownSet.has(id));
    const skipped = (Array.isArray(data.known) ? data.known.length : 0) + (Array.isArray(data.weak) ? data.weak.length : 0) - known.length - weak.length;
    save.study = { known, weak };
    persist();
    toast(`Study list: ${known.length} known, ${weak.length} weak${skipped ? `, ${skipped} unknown ids skipped` : ""}.`);
  } catch (err) {
    toast(err.message || "Could not import the study list.");
  }
}

function tone(freq, dur, type = "square", gain = 0.035) {
  if (!save.sound) return;
  try {
    audioCtx = audioCtx || new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const amp = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.value = gain;
    osc.connect(amp);
    amp.connect(audioCtx.destination);
    osc.start();
    amp.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    osc.stop(audioCtx.currentTime + dur);
  } catch { /* autoplay or missing audio */ }
}

function sleep(ms) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  return new Promise((resolve) => setTimeout(resolve, reduce ? 0 : ms));
}

function showScreen(name) {
  ui.screen = name;
  $("screen-title").hidden = name !== "title";
  $("screen-battle").hidden = name !== "battle";
  $("btn-title").hidden = name === "title";
  if (name === "battle") ensureLoop();
}

function ensureLoop() {
  if (looping) return;
  looping = true;
  const tick = (now) => {
    if (ui.screen !== "battle" || !battle) {
      looping = false;
      return;
    }
    ui.now = now;
    ui.floats = ui.floats.filter((f) => now - f.born < 900);
    syncMarks();
    renderer.draw(battle, ui);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function syncPos() {
  for (const unit of battle.units) {
    if (!ui.pos[unit.id]) ui.pos[unit.id] = { x: unit.x, y: unit.y };
  }
}

function pushLog(text) {
  ui.logs.unshift(text);
  if (ui.logs.length > 40) ui.logs.length = 40;
  $("log").innerHTML = ui.logs.map((line) => `<div>${escapeHtml(line)}</div>`).join("");
}

function floatAt(unit, text, color) {
  const pos = ui.pos[unit.id] || unit;
  ui.floats.push({ x: pos.x, y: pos.y, text, color, born: performance.now() });
}

function renderHud() {
  const q = battle ? previewQueue(battle, 6) : [];
  $("queue").innerHTML = q.map((u, i) =>
    `<span class="chip ${u.team} ${i === 0 ? "now" : ""}"><i style="background:${u.color}"></i>${escapeHtml(u.nameJp)}</span>`,
  ).join("");
  const unit = battle?.current;
  if (!unit) return;
  $("unit-name").textContent = `${unit.nameJp}  ${unit.name}`;
  const focus = unit.focus ? ` · ${unit.focus}` : "";
  $("unit-meta").textContent = `${unit.job} · HP ${unit.hp}/${unit.maxHp} · SPD ${unit.spd} · MOV ${unit.mov}${focus}`;
  const bar = $("unit-hp");
  bar.style.width = `${Math.max(0, unit.hp / unit.maxHp) * 100}%`;
  bar.style.background = unit.hp / unit.maxHp < 0.35 ? "var(--red)" : "var(--green)";
}

function syncMarks() {
  const marks = new Map();
  if (!battle || ui.mode === "busy" || ui.mode === "prompt") {
    ui.marks = marks;
    return;
  }
  if ((ui.mode === "move" || ui.mode === "menu") && ui.reach) {
    for (const key of ui.reach.dist.keys()) marks.set(key, "move");
    if (ui.hover && ui.reach.dist.has(ui.hover)) {
      const [x, y] = ui.hover.split(",").map(Number);
      const path = buildPath(ui.reach, x, y) || [];
      for (const step of path) marks.set(`${step.x},${step.y}`, "path");
    }
  }
  if (ui.mode === "target") {
    const kind = ui.ability?.kind === "heal" ? "heal" : "attack";
    for (const t of ui.targets) marks.set(`${t.x},${t.y}`, kind);
  }
  ui.marks = marks;
}

function setStatus(text) {
  $("status").textContent = text;
}

function renderActions() {
  const box = $("actions");
  box.innerHTML = "";
  const unit = battle?.current;
  if (!unit || unit.team !== "player" || battle.over || ui.mode === "busy" || ui.mode === "prompt") return;
  const add = (label, fn, cls = "ghost") => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = cls;
    btn.textContent = label;
    btn.addEventListener("click", fn);
    box.appendChild(btn);
  };
  if (ui.mode === "move" || ui.mode === "menu") {
    add("Attack", () => beginTarget(null), "solid");
    for (const id of unit.abilities) {
      const ability = ABILITIES[id];
      add(`${ability.name} ${ability.en}`, () => beginTarget(ability));
    }
    add("Wait", () => playerWait());
    if (ui.mode === "menu") add("Undo move", () => undoMove());
  } else if (ui.mode === "target") {
    add("Back", () => {
      ui.mode = "menu";
      ui.ability = null;
      setStatus("Attack, use an ability, or wait.");
      renderActions();
    });
  }
}

function onTurn() {
  if (!battle || battle.token !== ui.token) return;
  renderHud();
  if (battle.over) {
    showEnding();
    return;
  }
  const unit = battle.current;
  if (!unit) return;
  if (unit.team === "enemy") {
    ui.mode = "busy";
    renderActions();
    setStatus(`${unit.nameJp} is moving…`);
    runEnemy(ui.token);
    return;
  }
  ui.mode = "move";
  ui.origin = { x: unit.x, y: unit.y };
  ui.ability = null;
  ui.reach = reachable(battle, unit);
  ui.pos[unit.id] = { x: unit.x, y: unit.y };
  setStatus(`${unit.nameJp}'s turn. Tap a gold tile to move, or stay and act.`);
  renderActions();
  toast(`${unit.nameJp}のターン`);
}

async function tween(unit, from, to) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    ui.pos[unit.id] = { x: to.x, y: to.y };
    return;
  }
  const t0 = performance.now();
  await new Promise((resolve) => {
    const step = (now) => {
      const t = Math.min(1, (now - t0) / 130);
      ui.pos[unit.id] = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

async function walk(unit, path) {
  if (!path?.length) return;
  let cursor = ui.pos[unit.id] || { x: unit.x, y: unit.y };
  let start = 0;
  for (let i = 0; i < path.length; i++) {
    if (Math.hypot(path[i].x - cursor.x, path[i].y - cursor.y) < 0.2) start = i;
  }
  for (let i = start + 1; i < path.length; i++) {
    await tween(unit, path[i - 1], path[i]);
    cursor = path[i];
  }
  const end = path[path.length - 1];
  ui.pos[unit.id] = { x: end.x, y: end.y };
  applyMove(battle, unit, end.x, end.y);
}

function beginTarget(ability) {
  const unit = battle.current;
  ui.ability = ability;
  ui.targets = targetsFor(battle, unit, ability);
  if (!ui.targets.length) {
    toast(ability?.kind === "heal" ? "No ally in range." : "No enemy in range.");
    return;
  }
  ui.mode = "target";
  setStatus(ability
    ? `${ability.name}: tap a ${ability.kind === "heal" ? "green" : "red"} unit.`
    : "Tap a red unit to attack.");
  renderActions();
}

async function undoMove() {
  const unit = battle.current;
  ui.mode = "busy";
  renderActions();
  const back = [ui.pos[unit.id], ui.origin].filter(Boolean);
  if (back.length === 2 && (back[0].x !== back[1].x || back[0].y !== back[1].y)) {
    await tween(unit, back[0], back[1]);
  }
  applyMove(battle, unit, ui.origin.x, ui.origin.y);
  ui.pos[unit.id] = { ...ui.origin };
  ui.mode = "move";
  ui.reach = reachable(battle, unit);
  setStatus(`${unit.nameJp}'s turn. Tap a gold tile to move, or stay and act.`);
  renderActions();
}

async function playerWait() {
  const token = ui.token;
  ui.mode = "busy";
  renderActions();
  pushLog(`${battle.current.nameJp} waits.`);
  endTurn(battle);
  if (token === ui.token) onTurn();
}

function tileClick(x, y) {
  if (!battle || battle.over) return;
  const unit = battle.current;
  if (!unit || unit.team !== "player") return;
  if (ui.mode === "move" || ui.mode === "menu") {
    const key = `${x},${y}`;
    if (x === unit.x && y === unit.y && ui.mode === "move") {
      ui.mode = "menu";
      setStatus("Attack, use an ability, or wait.");
      renderActions();
      return;
    }
    if (!ui.reach?.dist.has(key)) return;
    const path = buildPath(ui.reach, x, y);
    if (!path) return;
    ui.mode = "busy";
    renderActions();
    walk(unit, path).then(() => {
      if (ui.token !== battle.token) return;
      ui.mode = "menu";
      setStatus("Attack, use an ability, or wait.");
      renderActions();
    });
    return;
  }
  if (ui.mode === "target") {
    const target = living(battle).find((u) => u.x === x && u.y === y && ui.targets.includes(u));
    if (!target) return;
    if (ui.ability) castAbility(ui.ability, target);
    else basicAttack(target);
  }
}

async function basicAttack(target) {
  const token = ui.token;
  const unit = battle.current;
  ui.mode = "busy";
  renderActions();
  ui.lunge = { id: unit.id, dx: Math.sign(target.x - unit.x) * 0.2, dy: Math.sign(target.y - unit.y) * 0.2, until: performance.now() + 180 };
  const result = applyBasicAttack(battle, unit, target);
  floatAt(target, result.damage ? `-${result.damage}` : "miss", "#f0c56a");
  tone(result.damage ? 220 : 90, 0.12);
  pushLog(`${unit.nameJp} attacks ${target.nameJp} for ${result.damage}.`);
  renderHud();
  await sleep(380);
  if (token !== ui.token) return;
  endTurn(battle);
  onTurn();
}

async function castAbility(ability, target) {
  const token = ui.token;
  const unit = battle.current;
  ui.mode = "prompt";
  renderActions();
  setStatus("Answer to cast.");
  const prompt = selectPrompt(pools, ability.pool, save.cards, save.study, battle.rng, ui.lastKey);
  const answer = await askPrompt(unit, ability, prompt);
  if (token !== ui.token) return;
  if (!answer) {
    ui.mode = "target";
    setStatus(`${ability.name}: tap a ${ability.kind === "heal" ? "green" : "red"} unit.`);
    renderActions();
    return;
  }
  ui.lastKey = cardKey(prompt.item.type, prompt.item.id);
  const grade = gradeFromAnswer(answer.correct, answer.ms);
  const card = reviewCard(save.cards[ui.lastKey] || emptyCard(prompt.item.type, prompt.item.id), grade);
  save.cards[ui.lastKey] = card;
  save.results.push({
    id: prompt.item.type === "vocab" ? Number(prompt.item.id) : String(prompt.item.id),
    type: prompt.item.type,
    correct: answer.correct,
    ms: answer.ms,
  });
  if (answer.correct) ui.stats.correct += 1;
  else ui.stats.wrong += 1;
  if (grade === "perfect") ui.stats.perfect += 1;
  persist();
  ui.mode = "busy";
  if (!canStrike(battle, unit, target, ability.range, { los: ability.kind !== "heal", self: ability.kind === "heal" })) {
    pushLog(`${unit.nameJp}'s ${ability.name} has no target.`);
    endTurn(battle);
    onTurn();
    return;
  }
  ui.lunge = { id: unit.id, dx: Math.sign(target.x - unit.x) * 0.16, dy: Math.sign(target.y - unit.y) * 0.16, until: performance.now() + 200 };
  const result = applyAbility(battle, unit, ability.id, target, grade);
  if (grade === "wrong") {
    floatAt(unit, "Fizzle", "#e15d55");
    tone(80, 0.18, "sawtooth");
    pushLog(`${unit.nameJp}'s ${ability.name} fizzles.`);
  } else if (ability.kind === "heal") {
    floatAt(target, `+${result.heal}`, "#5dce8a");
    tone(grade === "perfect" ? 660 : 440, 0.14, "triangle");
    pushLog(`${unit.nameJp} heals ${target.nameJp} for ${result.heal}${grade === "perfect" ? " (critical)" : grade === "slow" ? " (half)" : ""}.`);
  } else {
    const color = grade === "perfect" ? "#f0c56a" : "#f7f1e6";
    floatAt(target, grade === "perfect" ? `CRIT ${result.damage}` : `-${result.damage}`, color);
    tone(grade === "perfect" ? 520 : 240, 0.14);
    pushLog(`${unit.nameJp}'s ${ability.name} hits ${target.nameJp} for ${result.damage}${grade === "perfect" ? " — critical" : grade === "slow" ? " — half" : ""}.`);
  }
  renderHud();
  await sleep(420);
  if (token !== ui.token) return;
  endTurn(battle);
  onTurn();
}

function explain(prompt) {
  const kana = prompt.item.accept[0];
  const roma = kanaToRomaji(kana);
  return roma ? `${kana} · ${roma}` : kana;
}

function askPrompt(unit, ability, prompt) {
  const root = $("prompt");
  const choices = $("prompt-choices");
  const input = $("prompt-input");
  const feedback = $("prompt-feedback");
  const fill = $("timer-fill");
  root.hidden = false;
  $("prompt-kicker").textContent = `${unit.nameJp} · ${ability.name} ${ability.en}`;
  $("prompt-ask").textContent = prompt.romaji ? "Read it in romaji or kana." : "What is the reading?";
  $("prompt-jp").textContent = prompt.item.japanese;
  $("prompt-meaning").textContent = prompt.item.meaning;
  feedback.textContent = "";
  feedback.className = "feedback";
  input.value = "";
  choices.innerHTML = "";
  let settled = false;
  const started = performance.now();
  const buttons = prompt.choices.map((choice) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    const spoken = prompt.romaji ? "" : kanaToRomaji(choice);
    btn.textContent = spoken && spoken !== choice ? `${choice}  ${spoken}` : choice;
    btn.addEventListener("click", () => finish(choice, choiceIsCorrect(prompt, choice)));
    choices.appendChild(btn);
    return { btn, choice };
  });

  function paint(now) {
    if (settled) return;
    const elapsed = now - started;
    const left = Math.max(0, 1 - elapsed / PROMPT_TIMEOUT_MS);
    fill.style.width = `${left * 100}%`;
    fill.style.background = elapsed <= PERFECT_MS ? "var(--gold)" : "var(--blue)";
    if (elapsed >= PROMPT_TIMEOUT_MS) finish("", false, PROMPT_TIMEOUT_MS);
    else promptTimer = requestAnimationFrame(paint);
  }
  $("timer-mark").style.left = `${(1 - PERFECT_MS / PROMPT_TIMEOUT_MS) * 100}%`;
  promptTimer = requestAnimationFrame(paint);

  function onKey(ev) {
    if (settled) return;
    if (ev.key === "Escape") {
      ev.preventDefault();
      cancel();
    } else if (/^[1-4]$/.test(ev.key) && document.activeElement !== input) {
      const pick = buttons[Number(ev.key) - 1];
      if (pick) finish(pick.choice, choiceIsCorrect(prompt, pick.choice));
    }
  }
  document.addEventListener("keydown", onKey);

  function cleanup() {
    settled = true;
    cancelAnimationFrame(promptTimer);
    document.removeEventListener("keydown", onKey);
    $("prompt-form").onsubmit = null;
    $("prompt-cancel").onclick = null;
  }

  function finish(value, correct, forcedMs) {
    if (settled) return;
    const ms = forcedMs ?? Math.round(performance.now() - started);
    cleanup();
    for (const { btn, choice } of buttons) {
      if (choiceIsCorrect(prompt, choice)) btn.classList.add("good");
      else if (choice === value) btn.classList.add("bad");
      btn.disabled = true;
    }
    input.disabled = true;
    const grade = gradeFromAnswer(correct, ms);
    const line = `${explain(prompt)} — ${prompt.item.meaning}`;
    feedback.textContent = grade === "perfect" ? `Critical! ${line}` : grade === "slow" ? `Half power. ${line}` : `Fizzle. ${line}`;
    feedback.className = `feedback ${correct ? "good" : "bad"}`;
    setTimeout(() => {
      root.hidden = true;
      input.disabled = false;
      resolve({ correct, ms });
    }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700);
  }

  let resolve;
  function cancel() {
    if (settled) return;
    cleanup();
    root.hidden = true;
    input.disabled = false;
    resolve(null);
  }

  $("prompt-cancel").onclick = cancel;
  $("prompt-form").onsubmit = (ev) => {
    ev.preventDefault();
    const value = input.value;
    if (!value.trim()) return;
    finish(value, answersMatch(value, prompt.item.accept));
  };
  return new Promise((res) => { resolve = res; });
}

async function runEnemy(token) {
  const unit = battle.current;
  const plan = planOffense(battle, unit, unit.range);
  if (plan.path && plan.path.length > 1) await walk(unit, plan.path);
  else if (plan.x != null) applyMove(battle, unit, plan.x, plan.y);
  if (token !== ui.token) return;
  if (plan.kind === "attack" && plan.target && canStrike(battle, unit, plan.target, unit.range)) {
    ui.lunge = { id: unit.id, dx: Math.sign(plan.target.x - unit.x) * 0.2, dy: Math.sign(plan.target.y - unit.y) * 0.2, until: performance.now() + 180 };
    const result = applyBasicAttack(battle, unit, plan.target);
    floatAt(plan.target, `-${result.damage}`, "#e15d55");
    tone(160, 0.12, "square", 0.03);
    pushLog(`${unit.nameJp} hits ${plan.target.nameJp} for ${result.damage}.`);
    renderHud();
    await sleep(360);
  } else {
    pushLog(`${unit.nameJp} waits.`);
  }
  if (token !== ui.token) return;
  endTurn(battle);
  onTurn();
}

function showEnding() {
  ui.mode = "busy";
  renderActions();
  renderHud();
  const win = battle.over === "win";
  $("ending").hidden = false;
  $("end-title").textContent = win ? "Victory" : "Defeat";
  const answered = ui.stats.correct + ui.stats.wrong;
  $("end-copy").textContent = win
    ? `The field is clear. ${ui.stats.perfect} critical${ui.stats.perfect === 1 ? "" : "s"} · ${ui.stats.correct}/${answered || 0} readings correct.`
    : `The party fell. ${ui.stats.correct}/${answered || 0} readings correct. A fizzled spell spends the turn.`;
  tone(win ? 520 : 110, 0.25, win ? "triangle" : "sawtooth");
  pushLog(win ? "Victory." : "Defeat.");
}

function startFight() {
  ui.token += 1;
  battle = createBattle();
  battle.token = ui.token;
  startBattle(battle);
  ui.pos = {};
  ui.floats = [];
  ui.logs = [];
  ui.stats = { correct: 0, wrong: 0, perfect: 0 };
  ui.lastKey = null;
  for (const unit of battle.units) ui.pos[unit.id] = { x: unit.x, y: unit.y };
  $("log").innerHTML = "";
  $("ending").hidden = true;
  $("prompt").hidden = true;
  showScreen("battle");
  pushLog("A goblin, an archer, and an imp block the road.");
  onTurn();
}

function bootControls() {
  $("btn-start").onclick = () => startFight();
  $("btn-again").onclick = () => startFight();
  $("btn-title").onclick = () => { ui.token += 1; showScreen("title"); };
  $("btn-end-title").onclick = () => { ui.token += 1; $("ending").hidden = true; showScreen("title"); };
  $("btn-sound").onclick = () => { save.sound = !save.sound; persist(); tone(440, 0.08, "triangle"); };
  $("btn-export-results").onclick = exportResults;
  $("btn-end-export").onclick = exportResults;
  $("btn-export-progress").onclick = exportProgress;
  $("btn-import-progress").onclick = () => { $("file-progress").value = ""; $("file-progress").click(); };
  $("btn-import-study").onclick = () => { $("file-study").value = ""; $("file-study").click(); };
  $("file-progress").onchange = () => onProgressFile($("file-progress").files?.[0]);
  $("file-study").onchange = () => onStudyFile($("file-study").files?.[0]);
  $("btn-clear-study").onclick = () => {
    save.study = { known: [], weak: [] };
    persist();
    toast("Study list cleared.");
  };
  $("btn-reset").onclick = () => {
    if (!confirm("Erase saved reviews, results, and the study list on this browser?")) return;
    save = emptySave();
    persist();
    toast("Saved progress reset.");
  };
  const canvas = $("map");
  renderer = createRenderer(canvas);
  canvas.addEventListener("pointerdown", (ev) => {
    const tile = renderer.tileFromEvent(ev, battle, ui);
    if (!tile) return;
    tileClick(tile.x, tile.y);
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (ev.pointerType !== "mouse") return;
    const tile = renderer.tileFromEvent(ev, battle, ui);
    ui.hover = tile ? `${tile.x},${tile.y}` : null;
  });
  canvas.addEventListener("pointerleave", () => { ui.hover = null; });
  document.addEventListener("pointerdown", () => {
    if (audioCtx?.state === "suspended") audioCtx.resume();
  });
}

async function main() {
  const load = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} (${response.status})`);
    return response.json();
  };
  const [vocab, kana, kanji] = await Promise.all([
    load("data/n5-vocab.json"),
    load("data/kana.json"),
    load("data/kanji.json"),
  ]);
  catalog = prepareCatalog({ vocab, kana, kanji });
  pools = buildPools(catalog);
  byKey = indexCatalog(catalog);
  bootControls();
  refreshStats();
}

main().catch((err) => {
  console.error(err);
  toast("Could not load the N5 word list.");
});
