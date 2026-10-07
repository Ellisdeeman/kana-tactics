/** Isometric map and unit sprites. */

export const TW = 72;
export const TH = 36;
export const DEPTH = 16;

export function iso(x, y) {
  return { x: (x - y) * (TW / 2), y: (x + y) * (TH / 2) };
}

export function tileFromIso(sx, sy) {
  const tx = (sx / (TW / 2) + sy / (TH / 2)) / 2;
  const ty = (sy / (TH / 2) - sx / (TW / 2)) / 2;
  return { x: Math.floor(tx + 1e-6), y: Math.floor(ty + 1e-6) };
}

export function layoutCamera(cssW, cssH, map) {
  const mapW = (map.w + map.h) * (TW / 2);
  const mapH = (map.w + map.h) * (TH / 2) + DEPTH + 70;
  const scale = Math.min(cssW / (mapW + 28), cssH / (mapH + 16));
  const mid = iso((map.w - 1) / 2, (map.h - 1) / 2);
  return {
    scale,
    cx: cssW / 2 - mid.x * scale,
    cy: cssH / 2 - (mid.y + TH / 2) * scale + 8,
  };
}

export function tileCenter(cam, x, y) {
  const p = iso(x, y);
  return { x: cam.cx + p.x * cam.scale, y: cam.cy + (p.y + TH / 2) * cam.scale };
}

const GRASS = ["#6eae4c", "#63a344", "#79b856", "#58963e"];
const TOP = {
  grass: null,
  path: "#c6a36a",
  water: "#3f8fd0",
  tree: "#4e8a38",
};

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) * amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) * amt));
  const b = Math.max(0, Math.min(255, (n & 255) * amt));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function diamond(ctx, x, y) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + TW / 2, y + TH / 2);
  ctx.lineTo(x, y + TH);
  ctx.lineTo(x - TW / 2, y + TH / 2);
  ctx.closePath();
}

function drawBlock(ctx, x, y, top, left, right) {
  const p = iso(x, y);
  ctx.beginPath();
  ctx.moveTo(p.x - TW / 2, p.y + TH / 2);
  ctx.lineTo(p.x, p.y + TH);
  ctx.lineTo(p.x, p.y + TH + DEPTH);
  ctx.lineTo(p.x - TW / 2, p.y + TH / 2 + DEPTH);
  ctx.closePath();
  ctx.fillStyle = left;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(p.x + TW / 2, p.y + TH / 2);
  ctx.lineTo(p.x, p.y + TH);
  ctx.lineTo(p.x, p.y + TH + DEPTH);
  ctx.lineTo(p.x + TW / 2, p.y + TH / 2 + DEPTH);
  ctx.closePath();
  ctx.fillStyle = right;
  ctx.fill();
  diamond(ctx, p.x, p.y);
  ctx.fillStyle = top;
  ctx.fill();
  ctx.strokeStyle = "rgba(20, 16, 40, .28)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function px(ctx, x, y, w, h, fill) {
  ctx.fillStyle = "#1b1430";
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

function drawSprite(ctx, x, y, unit, now) {
  const bob = Math.sin(now / 280 + unit.x * 1.7) * 1.3;
  ctx.fillStyle = "rgba(18, 12, 36, .38)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 11, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  const fy = y + bob;
  const skin = unit.sprite === "goblin" ? "#93c24a" : unit.sprite === "imp" ? "#f0a8cc" : "#f3c7a4";
  px(ctx, x - 6, fy - 12, 4, 8, "#2a2144");
  px(ctx, x + 2, fy - 12, 4, 8, "#2a2144");
  px(ctx, x - 8, fy - 24, 16, 14, unit.color);
  px(ctx, x - 6, fy - 36, 12, 12, skin);
  if (unit.sprite === "mage") {
    ctx.fillStyle = unit.color;
    ctx.beginPath();
    ctx.moveTo(x, fy - 52);
    ctx.lineTo(x - 7, fy - 36);
    ctx.lineTo(x + 7, fy - 36);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1b1430";
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (unit.sprite !== "goblin" && unit.sprite !== "imp") {
    px(ctx, x - 6, fy - 40, 12, 5, "#3a2a22");
  }
  if (unit.sprite === "squire") {
    px(ctx, x + 10, fy - 34, 3, 20, "#d7e0f2");
    px(ctx, x + 7, fy - 16, 9, 3, "#e6c36a");
  } else if (unit.sprite === "chemist") {
    px(ctx, x + 9, fy - 24, 6, 9, "#dff6ff");
    px(ctx, x + 10, fy - 28, 4, 4, "#8fcdf0");
    px(ctx, x - 2, fy - 21, 4, 7, "#f7fbff");
    px(ctx, x - 4, fy - 19, 8, 3, "#f7fbff");
  } else if (unit.sprite === "goblin") {
    px(ctx, x - 12, fy - 34, 5, 5, skin);
    px(ctx, x + 7, fy - 34, 5, 5, skin);
  } else if (unit.sprite === "archer") {
    ctx.strokeStyle = "#e6c36a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 12, fy - 22, 8, Math.PI * 0.55, Math.PI * 1.45);
    ctx.stroke();
    px(ctx, x + 11, fy - 30, 2, 16, "#f4efe4");
  } else if (unit.sprite === "imp") {
    px(ctx, x - 5, fy - 46, 3, 7, "#f0c36a");
    px(ctx, x + 2, fy - 46, 3, 7, "#f0c36a");
  }
  px(ctx, x - 4, fy - 32, 2, 2, "#1b1430");
  px(ctx, x + 2, fy - 32, 2, 2, "#1b1430");
  const w = 28;
  const ratio = Math.max(0, unit.hp / unit.maxHp);
  ctx.fillStyle = "#1b1430";
  ctx.fillRect(x - w / 2, fy - 58, w, 5);
  ctx.fillStyle = ratio < 0.35 ? "#e15d55" : "#5dce8a";
  ctx.fillRect(x - w / 2 + 1, fy - 57, (w - 2) * ratio, 3);
}

function drawTree(ctx, x, y) {
  const p = iso(x, y);
  const cx = p.x;
  const cy = p.y + TH / 2;
  px(ctx, cx - 2, cy - 16, 4, 12, "#6b4a2e");
  ctx.fillStyle = "#1b1430";
  ctx.beginPath();
  ctx.moveTo(cx, cy - 34);
  ctx.lineTo(cx - 12, cy - 12);
  ctx.lineTo(cx + 12, cy - 12);
  ctx.fill();
  ctx.fillStyle = "#2f7a32";
  ctx.beginPath();
  ctx.moveTo(cx, cy - 32);
  ctx.lineTo(cx - 10, cy - 14);
  ctx.lineTo(cx + 10, cy - 14);
  ctx.fill();
  ctx.fillStyle = "#3f9a40";
  ctx.beginPath();
  ctx.moveTo(cx, cy - 26);
  ctx.lineTo(cx - 7, cy - 16);
  ctx.lineTo(cx + 7, cy - 16);
  ctx.fill();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  let cam = null;

  function layout(map) {
    const cssW = canvas.clientWidth || 320;
    const cssH = canvas.clientHeight || 240;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const fitted = layoutCamera(cssW, cssH, map);
    cam = { dpr, cssW, cssH, ...fitted };
    const pw = Math.max(1, Math.floor(cssW * dpr));
    const ph = Math.max(1, Math.floor(cssH * dpr));
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    return cam;
  }

  function draw(battle, view) {
    if (!battle) return;
    const c = layout(battle.map);
    ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, c.cssH);
    sky.addColorStop(0, "#2a2158");
    sky.addColorStop(1, "#120e22");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, c.cssW, c.cssH);
    ctx.setTransform(c.dpr * c.scale, 0, 0, c.dpr * c.scale, c.dpr * c.cx, c.dpr * c.cy);

    const map = battle.map;
    const now = view.now || 0;
    for (let sum = 0; sum < map.w + map.h - 1; sum++) {
      for (let x = 0; x < map.w; x++) {
        const y = sum - x;
        if (y < 0 || y >= map.h) continue;
        const kind = map.tiles[y][x];
        let top = kind === "grass" ? GRASS[(x * 3 + y * 5) & 3] : TOP[kind];
        if (kind === "water") {
          const wave = 0.92 + Math.sin(now / 500 + x + y) * 0.06;
          top = shade("#3f8fd0", wave);
        }
        const mark = view.marks?.get(`${x},${y}`);
        drawBlock(ctx, x, y, top, shade(top, 0.72), shade(top, 0.52));
        if (kind === "grass" && (x * 7 + y * 3) % 5 === 0) {
          const p = iso(x, y);
          ctx.fillStyle = "#f2d36b";
          ctx.fillRect(p.x + 8, p.y + TH / 2, 2, 2);
          ctx.fillStyle = "#e07ab0";
          ctx.fillRect(p.x - 10, p.y + TH / 2 + 2, 2, 2);
        }
        if (mark) {
          const p = iso(x, y);
          diamond(ctx, p.x, p.y);
          ctx.fillStyle = mark === "attack" ? "rgba(225,93,85,.72)"
            : mark === "heal" ? "rgba(93,206,138,.66)"
              : mark === "path" ? "rgba(240,197,106,.88)"
                : "rgba(240,197,106,.62)";
          ctx.fill();
          ctx.strokeStyle = mark === "attack" ? "#ffd0cc" : mark === "heal" ? "#d9ffe8" : "#ffe7a8";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        if (kind === "tree") drawTree(ctx, x, y);
      }
    }

    const units = battle.units.filter((u) => u.hp > 0).slice().sort((a, b) => (a.x + a.y) - (b.x + b.y));
    for (const unit of units) {
      const pos = view.pos?.[unit.id] || unit;
      let ox = 0;
      let oy = 0;
      if (view.lunge && view.lunge.id === unit.id && now < view.lunge.until) {
        ox = view.lunge.dx;
        oy = view.lunge.dy;
      }
      const p = iso(pos.x + ox, pos.y + oy);
      if (battle.current && battle.current.id === unit.id) {
        const g = iso(pos.x, pos.y);
        diamond(ctx, g.x, g.y - 2);
        ctx.strokeStyle = "#f0c56a";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      drawSprite(ctx, p.x, p.y + TH / 2, unit, now);
    }

    ctx.globalAlpha = 1;
    ctx.font = "700 13px 'Zen Maru Gothic', sans-serif";
    ctx.textAlign = "center";
    for (const f of view.floats || []) {
      const age = (now - f.born) / 900;
      if (age < 0 || age > 1) continue;
      const p = iso(f.x, f.y);
      ctx.globalAlpha = 1 - age;
      ctx.fillStyle = "#1b1430";
      ctx.fillText(f.text, p.x + 1, p.y + TH / 2 - 36 - age * 16 + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, p.x, p.y + TH / 2 - 36 - age * 16);
    }
    ctx.globalAlpha = 1;
  }

  function tileFromEvent(ev, battle, view) {
    if (!cam) return null;
    const rect = canvas.getBoundingClientRect();
    const px = ev.clientX - rect.left;
    const py = ev.clientY - rect.top;
    const sx = (px - cam.cx) / cam.scale;
    const sy = (py - cam.cy) / cam.scale;
    if (battle) {
      const units = battle.units.filter((u) => u.hp > 0).slice().sort((a, b) => (b.x + b.y) - (a.x + a.y));
      for (const unit of units) {
        const pos = view?.pos?.[unit.id] || unit;
        const p = iso(pos.x, pos.y);
        const fx = p.x;
        const fy = p.y + TH / 2;
        // The sprite stands above the tile. Clicks on the body should still select that unit.
        if (sx >= fx - 20 && sx <= fx + 20 && sy >= fy - 70 && sy <= fy + 12) {
          return { x: Math.round(pos.x), y: Math.round(pos.y) };
        }
      }
    }
    return tileFromIso(sx, sy);
  }

  return { draw, tileFromEvent };
}
