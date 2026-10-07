/** Isometric-grid battle: speed ticks, move, basic attack, prompted abilities. */

export const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const ABILITIES = {
  slash: { id: "slash", name: "切り込み", en: "Slash", job: "squire", kind: "damage", power: 1.65, range: 1, target: "enemy", pool: "hira" },
  shout: { id: "shout", name: "号令", en: "Rally", job: "squire", kind: "damage", power: 1.4, range: 1, target: "enemy", pool: "hiraVocab" },
  potion: { id: "potion", name: "ポーション", en: "Potion", job: "chemist", kind: "heal", power: 14, range: 3, target: "ally", pool: "loan" },
  toss: { id: "toss", name: "カタカナ投げ", en: "Kana Toss", job: "chemist", kind: "damage", power: 1.5, range: 3, target: "enemy", pool: "kata" },
  fire: { id: "fire", name: "火", en: "Fire", job: "mage", kind: "damage", power: 1.85, range: 4, target: "enemy", pool: "kanji" },
  water: { id: "water", name: "水", en: "Water", job: "mage", kind: "damage", power: 1.7, range: 4, target: "enemy", pool: "kanji" },
  chant: { id: "chant", name: "詠唱", en: "Chant", job: "mage", kind: "damage", power: 1.6, range: 3, target: "enemy", pool: "kanjiVocab" },
};

const ROWS = [
  ".#....#.",
  "........",
  "..#..#..",
  "...~~...",
  "...~~...",
  "..#..#..",
  "........",
  ".#....#.",
];

function tileChar(ch) {
  if (ch === "#") return "tree";
  if (ch === "~") return "water";
  if (ch === "=") return "path";
  return "grass";
}

export function createMap() {
  const tiles = ROWS.map((row) => [...row].map(tileChar));
  const blocked = tiles.map((row) => row.map((t) => t === "tree" || t === "water"));
  return { w: tiles[0].length, h: tiles.length, tiles, blocked };
}

function unit(partial) {
  return {
    hp: partial.maxHp,
    ct: 0,
    abilities: [],
    range: 1,
    ...partial,
  };
}

export function createBattle({ rng = Math.random } = {}) {
  const map = createMap();
  const units = [
    unit({ id: "ren", name: "Ren", nameJp: "レン", job: "Squire", jobJp: "スクワイア", focus: "ひらがな", team: "player", sprite: "squire", maxHp: 38, atk: 10, def: 3, spd: 8, mov: 4, range: 1, abilities: ["slash", "shout"], x: 1, y: 6, color: "#e15a4a" }),
    unit({ id: "mina", name: "Mina", nameJp: "ミナ", job: "Chemist", jobJp: "ケミスト", focus: "カタカナ", team: "player", sprite: "chemist", maxHp: 32, atk: 7, def: 2, spd: 7, mov: 4, range: 1, abilities: ["potion", "toss"], x: 3, y: 6, color: "#3cba78" }),
    unit({ id: "sou", name: "Sou", nameJp: "ソウ", job: "Black Mage", jobJp: "黒魔道士", focus: "かんじ", team: "player", sprite: "mage", maxHp: 26, atk: 12, def: 2, spd: 6, mov: 3, range: 1, abilities: ["fire", "water", "chant"], x: 6, y: 6, color: "#7d6cf2" }),
    unit({ id: "gob", name: "Goblin", nameJp: "ゴブリン", job: "Brute", jobJp: "てき", focus: "", team: "enemy", sprite: "goblin", maxHp: 28, atk: 9, def: 2, spd: 7, mov: 4, range: 1, x: 1, y: 1, color: "#d9892b" }),
    unit({ id: "arc", name: "Archer", nameJp: "アーチャー", job: "Archer", jobJp: "ゆみ", focus: "", team: "enemy", sprite: "archer", maxHp: 22, atk: 8, def: 1, spd: 7, mov: 3, range: 3, x: 4, y: 1, color: "#d06a3a" }),
    unit({ id: "imp", name: "Imp", nameJp: "インプ", job: "Imp", jobJp: "まほう", focus: "", team: "enemy", sprite: "imp", maxHp: 20, atk: 11, def: 1, spd: 6, mov: 3, range: 3, x: 6, y: 1, color: "#d24b86" }),
  ];
  return {
    map,
    units,
    rng,
    turn: 0,
    current: null,
    over: null,
    log: [],
  };
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function living(state, team) {
  return state.units.filter((u) => u.hp > 0 && (!team || u.team === team));
}

export function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function unitAt(state, x, y) {
  return state.units.find((u) => u.hp > 0 && u.x === x && u.y === y) || null;
}

export function lineOfSight(map, a, b) {
  let x0 = a.x;
  let y0 = a.y;
  const x1 = b.x;
  const y1 = b.y;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (!(x0 === x1 && y0 === y1)) {
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
    if (x0 === x1 && y0 === y1) break;
    if (map.blocked[y0]?.[x0]) return false;
  }
  return true;
}

function inBounds(map, x, y) {
  return x >= 0 && y >= 0 && x < map.w && y < map.h;
}

function canEnter(state, unit, x, y, forEnd) {
  if (!inBounds(state.map, x, y)) return false;
  if (state.map.blocked[y][x]) return false;
  const occ = unitAt(state, x, y);
  if (!occ || occ === unit) return true;
  if (forEnd) return false;
  return occ.team === unit.team;
}

export function reachable(state, unit, from = { x: unit.x, y: unit.y }) {
  const dist = new Map();
  const prev = new Map();
  const start = `${from.x},${from.y}`;
  dist.set(start, 0);
  const q = [[from.x, from.y]];
  while (q.length) {
    const [x, y] = q.shift();
    const d = dist.get(`${x},${y}`);
    if (d >= unit.mov) continue;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (dist.has(key)) continue;
      if (!canEnter(state, unit, nx, ny, false)) continue;
      dist.set(key, d + 1);
      prev.set(key, `${x},${y}`);
      q.push([nx, ny]);
    }
  }
  for (const key of [...dist.keys()]) {
    if (key === start) continue;
    const [x, y] = key.split(",").map(Number);
    if (!canEnter(state, unit, x, y, true)) {
      dist.delete(key);
    }
  }
  return { dist, prev, from };
}

export function buildPath(reach, x, y) {
  const key = `${x},${y}`;
  if (!reach.dist.has(key) && key !== `${reach.from.x},${reach.from.y}`) return null;
  const steps = [[x, y]];
  let cur = key;
  const start = `${reach.from.x},${reach.from.y}`;
  let guard = 0;
  while (cur !== start && guard++ < 64) {
    const p = reach.prev.get(cur);
    if (!p) return null;
    const [px, py] = p.split(",").map(Number);
    steps.push([px, py]);
    cur = p;
  }
  steps.reverse();
  return steps.map(([sx, sy]) => ({ x: sx, y: sy }));
}

function checkOver(state) {
  if (!living(state, "player").length) state.over = "lose";
  else if (!living(state, "enemy").length) state.over = "win";
  return state.over;
}

function byReadiness(a, b) {
  return b.ct - a.ct || b.spd - a.spd || (a.id < b.id ? -1 : 1);
}

export function nextUnit(state) {
  if (checkOver(state)) {
    state.current = null;
    return null;
  }
  const alive = living(state);
  let guard = 0;
  while (guard++ < 10000) {
    const ready = alive.filter((u) => u.ct >= 100).sort(byReadiness);
    if (ready.length) {
      const u = ready[0];
      u.ct -= 100;
      state.current = u;
      state.turn += 1;
      return u;
    }
    for (const u of alive) u.ct += u.spd;
  }
  throw new Error("Turn order stalled");
}

export function startBattle(state) {
  for (const u of state.units) u.ct = u.team === "player" ? 78 : 0;
  nextUnit(state);
  return state;
}

export function previewQueue(state, n = 6) {
  const alive = living(state).map((u) => ({
    id: u.id, name: u.name, nameJp: u.nameJp, team: u.team, spd: u.spd, color: u.color, ct: u.ct,
  }));
  const snap = (u) => ({ id: u.id, name: u.name, nameJp: u.nameJp, team: u.team, spd: u.spd, color: u.color });
  const q = [];
  if (state.current && state.current.hp > 0) {
    const cur = alive.find((u) => u.id === state.current.id);
    if (cur) q.push(snap(cur));
  }
  let guard = 0;
  while (q.length < n && guard++ < 5000) {
    const ready = alive.filter((u) => u.ct >= 100).sort(byReadiness);
    if (!ready.length) {
      for (const u of alive) u.ct += u.spd;
      continue;
    }
    const next = ready[0];
    next.ct -= 100;
    q.push(snap(next));
  }
  return q.slice(0, n);
}

export function applyMove(state, unit, x, y) {
  if (!inBounds(state.map, x, y)) return false;
  if (x === unit.x && y === unit.y) return true;
  const occ = unitAt(state, x, y);
  if (occ && occ !== unit) return false;
  if (state.map.blocked[y][x]) return false;
  unit.x = x;
  unit.y = y;
  return true;
}

function amount(base, grade) {
  if (grade === "wrong") return 0;
  const scale = grade === "perfect" ? 2 : grade === "slow" ? 0.5 : 1;
  return Math.max(1, Math.round(base * scale));
}

export function strikeAmount(atk, def, power, grade, rng) {
  if (grade === "wrong") return 0;
  const variance = 0.94 + rng() * 0.12;
  const raw = Math.max(1, (atk * power - def * 0.4) * variance);
  return amount(raw, grade);
}

export function healAmount(power, grade, rng) {
  if (grade === "wrong") return 0;
  const variance = 0.96 + rng() * 0.08;
  return amount(power * variance, grade);
}

export function canStrike(state, unit, target, range, { los = true, self = false } = {}) {
  if (!target || target.hp <= 0) return false;
  if (target === unit) return !!self;
  const dist = manhattan(unit, target);
  if (dist < 1 || dist > range) return false;
  if (los && !lineOfSight(state.map, unit, target)) return false;
  return true;
}

export function targetsFor(state, unit, ability) {
  const range = ability ? ability.range : unit.range;
  const team = ability?.target === "ally" ? unit.team : (unit.team === "player" ? "enemy" : "player");
  const heal = ability?.kind === "heal";
  return living(state, team).filter((t) => canStrike(state, unit, t, range, { los: !heal, self: heal }));
}

export function applyBasicAttack(state, attacker, target) {
  if (!canStrike(state, attacker, target, attacker.range)) return { damage: 0, defeated: false };
  const damage = strikeAmount(attacker.atk, target.def, 1, "normal", state.rng);
  target.hp = Math.max(0, target.hp - damage);
  const defeated = target.hp <= 0;
  state.log.push(`${attacker.nameJp}の攻撃 → ${target.nameJp} ${damage}`);
  return { damage, defeated, grade: "normal" };
}

export function applyAbility(state, attacker, abilityId, target, grade) {
  const ability = ABILITIES[abilityId];
  if (!ability) throw new Error(`Unknown ability ${abilityId}`);
  if (grade === "wrong") {
    state.log.push(`${attacker.nameJp}の${ability.name}は失敗`);
    return { ability, damage: 0, heal: 0, defeated: false, grade };
  }
  if (!canStrike(state, attacker, target, ability.range, { los: ability.kind !== "heal", self: ability.kind === "heal" })) {
    return { ability, damage: 0, heal: 0, defeated: false, grade, missed: true };
  }
  if (ability.kind === "heal") {
    const heal = healAmount(ability.power, grade, state.rng);
    const before = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + heal);
    const gained = target.hp - before;
    state.log.push(`${attacker.nameJp}の${ability.name} → ${target.nameJp} +${gained}`);
    return { ability, damage: 0, heal: gained, defeated: false, grade };
  }
  const damage = strikeAmount(attacker.atk, target.def, ability.power, grade, state.rng);
  target.hp = Math.max(0, target.hp - damage);
  state.log.push(`${attacker.nameJp}の${ability.name} → ${target.nameJp} ${damage}`);
  return { ability, damage, heal: 0, defeated: target.hp <= 0, grade };
}

export function endTurn(state) {
  if (checkOver(state)) {
    state.current = null;
    return null;
  }
  return nextUnit(state);
}

function rankBetter(a, b) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

export function planOffense(state, unit, range = unit.range) {
  const foes = living(state).filter((u) => u.team !== unit.team);
  if (!foes.length) return { kind: "wait", path: [{ x: unit.x, y: unit.y }] };
  const canHit = (from, foe) => {
    const dist = Math.abs(from.x - foe.x) + Math.abs(from.y - foe.y);
    return dist >= 1 && dist <= range && lineOfSight(state.map, from, foe);
  };
  const here = { x: unit.x, y: unit.y };
  const hereHits = foes.filter((f) => canHit(here, f)).sort((a, b) => a.hp - b.hp || (a.id < b.id ? -1 : 1));
  if (hereHits.length) {
    return { kind: "attack", target: hereHits[0], x: unit.x, y: unit.y, path: [here] };
  }
  const reach = reachable(state, unit);
  let best = null;
  for (const key of reach.dist.keys()) {
    const [x, y] = key.split(",").map(Number);
    const from = { x, y };
    const hits = foes.filter((f) => canHit(from, f)).sort((a, b) => a.hp - b.hp);
    const nearest = Math.min(...foes.map((f) => Math.abs(from.x - f.x) + Math.abs(from.y - f.y)));
    const steps = reach.dist.get(key);
    const rank = hits.length ? [1, -hits[0].hp, -steps] : [0, -nearest, -steps];
    if (!best || rankBetter(rank, best.rank) > 0) best = { rank, x, y, target: hits[0] || null };
  }
  if (!best) return { kind: "wait", path: [here] };
  const path = buildPath(reach, best.x, best.y) || [here];
  if (best.target) return { kind: "attack", target: best.target, x: best.x, y: best.y, path };
  if (best.x === unit.x && best.y === unit.y) return { kind: "wait", path: [here] };
  return { kind: "move", x: best.x, y: best.y, path };
}

function damageAbility(unit) {
  const list = (unit.abilities || []).map((id) => ABILITIES[id]).filter((a) => a && a.kind === "damage");
  list.sort((a, b) => b.power - a.power || b.range - a.range);
  return list[0] || null;
}

export function autoStep(state, style) {
  const unit = state.current;
  if (!unit || state.over) return;
  if (unit.team === "enemy" || style === "basic" || style === "wait") {
    if (style === "wait" && unit.team === "player") {
      endTurn(state);
      return;
    }
    const plan = planOffense(state, unit, unit.range);
    if (plan.x != null) applyMove(state, unit, plan.x, plan.y);
    if (plan.kind === "attack" && plan.target && canStrike(state, unit, plan.target, unit.range)) {
      applyBasicAttack(state, unit, plan.target);
    }
    endTurn(state);
    return;
  }
  const grade = style === "fizzle" ? "wrong" : "perfect";
  const ability = damageAbility(unit);
  const range = ability ? ability.range : unit.range;
  const plan = planOffense(state, unit, range);
  if (plan.x != null) applyMove(state, unit, plan.x, plan.y);
  if (unit.abilities.includes("potion")) {
    const hurt = living(state, unit.team)
      .filter((u) => u.hp < u.maxHp * 0.55)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (hurt && canStrike(state, unit, hurt, ABILITIES.potion.range, { los: false, self: true })) {
      applyAbility(state, unit, "potion", hurt, grade);
      endTurn(state);
      return;
    }
  }
  if (ability && plan.target && canStrike(state, unit, plan.target, ability.range, { los: true })) {
    applyAbility(state, unit, ability.id, plan.target, grade);
  } else if (plan.kind === "attack" && plan.target && canStrike(state, unit, plan.target, unit.range)) {
    applyBasicAttack(state, unit, plan.target);
  }
  endTurn(state);
}

export function autoBattle(style, seed = 1, limit = 280) {
  const state = createBattle({ rng: mulberry32(seed) });
  startBattle(state);
  let n = 0;
  while (!state.over && n++ < limit) autoStep(state, style);
  return state;
}
