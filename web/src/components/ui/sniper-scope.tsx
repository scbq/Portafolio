/**
 * Sniper Scope. Designed & built by Aakash Mehra.
 *
 * A full-screen rifle scope: black tube, a lit green mil-dot reticle, breathing sway and eye-relief
 * shadow. Through it, a weathered wooden shelf at a dirt range holds glass bottles. Click (or tap,
 * or Space) to fire. Bottles shatter into real fractured shards cut from the bottle itself, which
 * tumble, bounce and settle on the planks, with glints, liquid spray and synthesized sound.
 * Two steel plates hang on pipe stands: HOME (right) sends the page to `homeHref`, RESET (left)
 * restocks the shelf.
 *
 * Everything is drawn on one canvas: the scene is painted once (backgrounds blurred for depth of
 * field), bottles are pre-rendered sprites, and shards are clipped pieces of those sprites.
 * Mouse aims, scroll zooms (1x to 5x), Shift holds breath, arrows aim from the keyboard.
 */
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type RGB = [number, number, number];
type Pt = [number, number];
type Ctx = CanvasRenderingContext2D;
type Rand = () => number;

const W = 1600;
const H = 900;
const HORIZON = 530;
const GROUND = 840;
const G = 3600; // gravity, world units / s^2
const S = 4; // sprite px per world unit
const FOCUS = 3; // shelf layer px per world unit
const BG = 1.5; // background px per world unit (it is blurred anyway)
const BX0 = -500; // background runs past the world so low zoom never shows its edge
const BX1 = W + 500;
const BW = BX1 - BX0;
const GREEN = "rgb(98,255,143)";
const WHITE: RGB = [255, 255, 255];

const F = { x0: 140, y0: 280, x1: 1460, y1: 870 };
const BOARD = { x0: 455, y0: 300, x1: 1145, y1: 655 };
const PLANKS = [
  { x0: 410, x1: 1190, top: 462, y1: 490 },
  { x0: 410, x1: 1190, top: 642, y1: 670 },
];
const SURF = PLANKS.map((p) => ({ y: p.top + 5, x0: p.x0, x1: p.x1 }));
const POSTS = [
  { x0: 425, x1: 457 },
  { x0: 1143, x1: 1175 },
];
type Kind = "home" | "reset";
const STAND_Y0 = 360;
const ARM_Y0 = 367;
const ARM_Y1 = 376;
const STANDS: { kind: Kind; cx: number; post: { x0: number; x1: number }; arm: { x0: number; x1: number } }[] = [
  { kind: "home", cx: 1320, post: { x0: 1395, x1: 1407 }, arm: { x0: 1268, x1: 1407 } },
  { kind: "reset", cx: 280, post: { x0: 193, x1: 205 }, arm: { x0: 193, x1: 332 } },
];
const PLATE = { pivot: ARM_Y1, chain: 44, w: 90, h: 70, pad: 2 };

type Spec = {
  h: number;
  keys: Pt[]; // [t from top 0..1, radius]
  glass: RGB;
  alpha: number;
  liquid?: { color: RGB; top: number };
  label?: { y0: number; y1: number; paper: RGB; ink: RGB; text: string; sub?: string };
  cap?: { color: RGB; to: number };
};

const SPECS: Spec[] = [
  {
    h: 150,
    keys: [[0, 5.6], [0.02, 6.2], [0.05, 5.6], [0.36, 6.2], [0.5, 15.5], [0.56, 17], [0.97, 17], [1, 15.8]],
    glass: [28, 70, 36],
    alpha: 0.86,
    liquid: { color: [90, 10, 25], top: 0.52 },
    label: { y0: 0.66, y1: 0.86, paper: [232, 222, 196], ink: [90, 20, 30], text: "RESERVE", sub: "1994" },
    cap: { color: [110, 20, 30], to: 0.2 },
  },
  {
    h: 122,
    keys: [[0, 6.2], [0.03, 6.8], [0.06, 5.9], [0.3, 6.6], [0.47, 14], [0.53, 15], [0.97, 15], [1, 14]],
    glass: [44, 125, 50],
    alpha: 0.72,
    liquid: { color: [200, 140, 30], top: 0.38 },
    label: { y0: 0.6, y1: 0.82, paper: [240, 236, 220], ink: [30, 80, 40], text: "LAGER" },
    cap: { color: [200, 170, 80], to: 0.035 },
  },
  {
    h: 128,
    keys: [[0, 7.5], [0.1, 7.5], [0.11, 6.8], [0.2, 7.2], [0.28, 18], [0.33, 21], [0.97, 21], [1, 20]],
    glass: [225, 235, 230],
    alpha: 0.2,
    liquid: { color: [175, 95, 25], top: 0.42 },
    label: { y0: 0.55, y1: 0.78, paper: [25, 22, 20], ink: [215, 180, 110], text: "No. 7", sub: "SINGLE MALT" },
    cap: { color: [25, 25, 25], to: 0.1 },
  },
  {
    h: 138,
    keys: [[0, 7], [0.08, 7], [0.09, 6.3], [0.22, 7.5], [0.34, 18], [0.4, 19.5], [0.97, 19.5], [1, 18.5]],
    glass: [40, 85, 170],
    alpha: 0.6,
    label: { y0: 0.58, y1: 0.74, paper: [236, 238, 240], ink: [30, 50, 110], text: "DRY GIN" },
    cap: { color: [190, 190, 195], to: 0.08 },
  },
  {
    h: 118,
    keys: [[0, 6], [0.03, 6.6], [0.06, 5.8], [0.26, 6.6], [0.44, 15], [0.5, 16], [0.97, 16], [1, 15]],
    glass: [105, 50, 15],
    alpha: 0.86,
    liquid: { color: [60, 25, 5], top: 0.3 },
    label: { y0: 0.6, y1: 0.8, paper: [220, 190, 120], ink: [80, 30, 10], text: "PALE ALE" },
    cap: { color: [180, 180, 185], to: 0.035 },
  },
  {
    h: 112,
    keys: [[0, 7.8], [0.03, 8.4], [0.06, 7.4], [0.18, 8.6], [0.38, 13.5], [0.48, 12.2], [0.62, 14], [0.97, 14], [1, 13]],
    glass: [200, 230, 215],
    alpha: 0.24,
    liquid: { color: [150, 205, 230], top: 0.5 },
    cap: { color: [200, 40, 35], to: 0.04 },
  },
  {
    h: 100,
    keys: [[0, 6.5], [0.04, 7], [0.07, 6.2], [0.2, 7], [0.38, 16], [0.44, 17], [0.97, 17], [1, 16]],
    glass: [90, 45, 15],
    alpha: 0.88,
    label: { y0: 0.55, y1: 0.85, paper: [200, 40, 35], ink: [250, 240, 220], text: "STOUT" },
    cap: { color: [200, 170, 80], to: 0.04 },
  },
  {
    h: 132,
    keys: [[0, 6], [0.02, 6.5], [0.05, 5.8], [0.3, 6.5], [0.48, 17], [0.55, 18], [0.97, 18], [1, 17]],
    glass: [60, 95, 40],
    alpha: 0.8,
    liquid: { color: [220, 200, 120], top: 0.48 },
    label: { y0: 0.65, y1: 0.85, paper: [245, 242, 232], ink: [40, 40, 40], text: "BLANC" },
    cap: { color: [200, 180, 120], to: 0.18 },
  },
];
// Fila de arriba (y 467): 5 lugares. Fila de abajo (y 647): 6 lugares. Total 11.
const PLACES: Pt[] = [
  [520, 467], [640, 467], [790, 467], [945, 467], [1075, 467],
  [470, 647], [610, 647], [750, 647], [890, 647], [1030, 647], [1160, 647],
];

// ---------- small helpers ----------

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const col = (c: RGB, a = 1, k = 1) =>
  `rgba(${Math.round(clamp(c[0] * k, 0, 255))},${Math.round(clamp(c[1] * k, 0, 255))},${Math.round(clamp(c[2] * k, 0, 255))},${clamp(a, 0, 1)})`;

function rng(seed: number): Rand {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}
const ctx2d = (c: HTMLCanvasElement) => c.getContext("2d")!;

// Down/up-sampling blur. Works everywhere (Safari has no ctx.filter). Radius ~ 2^passes px.
function blur(src: HTMLCanvasElement, passes: number) {
  const chain: HTMLCanvasElement[] = [];
  let cur = src;
  for (let i = 0; i < passes; i++) {
    const n = canvas(cur.width / 2, cur.height / 2);
    ctx2d(n).drawImage(cur, 0, 0, n.width, n.height);
    chain.push(cur);
    cur = n;
  }
  for (let i = passes - 1; i >= 0; i--) {
    const n = canvas(chain[i].width, chain[i].height);
    const x = ctx2d(n);
    x.imageSmoothingQuality = "high";
    x.drawImage(cur, 0, 0, n.width, n.height);
    cur = n;
  }
  return cur;
}

function radiusAt(keys: Pt[], t: number) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, r0] = keys[i];
    const [t1, r1] = keys[i + 1];
    if (t <= t1) {
      const u = (t - t0) / (t1 - t0 || 1);
      return r0 + (r1 - r0) * u * u * (3 - 2 * u);
    }
  }
  return keys[keys.length - 1][1];
}

// Bottle local space: x = 0 on the axis, y = 0 at the base, y = -h at the lip.
function bottlePath(x: Ctx, spec: Spec) {
  const n = 140;
  x.beginPath();
  for (let i = 0; i <= n; i++) x.lineTo(-radiusAt(spec.keys, i / n), -spec.h + (i / n) * spec.h);
  for (let i = n; i >= 0; i--) x.lineTo(radiusAt(spec.keys, i / n), -spec.h + (i / n) * spec.h);
  x.closePath();
}
const insideBottle = (spec: Spec, lx: number, ly: number) => {
  const t = (ly + spec.h) / spec.h;
  return t >= 0 && t <= 1 && Math.abs(lx) <= radiusAt(spec.keys, t);
};

type Sprite = { c: HTMLCanvasElement; ox: number; oy: number; w: number; h: number };

function buildBottle(spec: Spec): { sprite: Sprite; shadow: Sprite; maxR: number } {
  const { h, glass, alpha, keys } = spec;
  const maxR = Math.max(...keys.map((k) => k[1]));
  const pad = 3;
  const w = 2 * (maxR + pad);
  const hh = h + 2 * pad;
  const c = canvas(w * S, hh * S);
  const x = ctx2d(c);
  x.scale(S, S);
  x.translate(maxR + pad, h + pad);

  x.save();
  bottlePath(x, spec);
  x.clip();
  const step = 0.25;
  for (let y = -h; y < 0; y += step) {
    const t = (y + step / 2 + h) / h;
    const r = radiusAt(keys, t);
    const slope = (radiusAt(keys, t + 0.01) - radiusAt(keys, t - 0.01)) / (0.02 * h);
    const sh = clamp(slope * 0.8, 0, 0.6); // shoulders catch the sun
    const g = x.createLinearGradient(-r, 0, r, 0);
    if (spec.cap && t < spec.cap.to) {
      const cc = spec.cap.color;
      g.addColorStop(0, col(cc, 1, 0.35));
      g.addColorStop(0.2, col(mix(cc, WHITE, 0.55)));
      g.addColorStop(0.32, col(cc, 1, 1.05));
      g.addColorStop(0.6, col(cc, 1, 0.8));
      g.addColorStop(0.85, col(cc, 1, 0.5));
      g.addColorStop(1, col(cc, 1, 0.3));
    } else {
      let base = glass;
      let a = alpha;
      let k = 1;
      if (spec.liquid && t >= spec.liquid.top) {
        base = mix(glass, spec.liquid.color, 0.8);
        a = Math.min(0.96, alpha + 0.35);
        k = 1.15;
      }
      const hi = mix(base, WHITE, 0.8);
      g.addColorStop(0, col(base, a + 0.35, 0.25));
      g.addColorStop(0.07, col(base, a + 0.1, 0.55));
      g.addColorStop(0.17, col(base, a, 0.95 + sh));
      g.addColorStop(0.205, col(hi, 0.5 + sh * 0.6));
      g.addColorStop(0.235, col(hi, 0.72 + sh * 0.4));
      g.addColorStop(0.27, col(base, a, 1.1 + sh));
      g.addColorStop(0.5, col(base, a * 0.85, k + sh * 0.5));
      g.addColorStop(0.72, col(base, a * 0.9, 0.78));
      g.addColorStop(0.8, col(mix(base, WHITE, 0.35), a * 0.9 + 0.1));
      g.addColorStop(0.85, col(base, a, 0.62));
      g.addColorStop(0.95, col(base, a + 0.3, 0.3));
      g.addColorStop(1, col(mix(base, WHITE, 0.5), 0.55));
    }
    x.fillStyle = g;
    x.fillRect(-r - 0.3, y, 2 * r + 0.6, step + 0.08);
  }

  if (spec.liquid) {
    const yt = -h + spec.liquid.top * h;
    const r = radiusAt(keys, spec.liquid.top);
    x.fillStyle = "rgba(255,255,255,0.28)";
    x.fillRect(-r, yt - 0.3, 2 * r, 0.6);
    x.fillStyle = "rgba(0,0,0,0.18)";
    x.fillRect(-r, yt + 0.3, 2 * r, 1.4);
  }

  if (spec.label) {
    const L = spec.label;
    const ly0 = -h + L.y0 * h;
    const ly1 = -h + L.y1 * h;
    for (let y = ly0; y < ly1; y += step) {
      const r = radiusAt(keys, (y + h) / h);
      const g = x.createLinearGradient(-r, 0, r, 0);
      g.addColorStop(0, col(L.paper, 1, 0.45));
      g.addColorStop(0.15, col(L.paper, 1, 0.85));
      g.addColorStop(0.3, col(L.paper, 1, 1.05));
      g.addColorStop(0.55, col(L.paper, 1, 0.95));
      g.addColorStop(0.85, col(L.paper, 1, 0.7));
      g.addColorStop(1, col(L.paper, 1, 0.4));
      x.fillStyle = g;
      x.fillRect(-r - 0.3, y, 2 * r + 0.6, step + 0.08);
    }
    const lh = ly1 - ly0;
    const ym = (ly0 + ly1) / 2;
    const rr = radiusAt(keys, (L.y0 + L.y1) / 2);
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillStyle = col(L.ink, 0.92);
    let fs = lh * (L.sub ? 0.34 : 0.42);
    x.font = `700 ${fs}px Georgia, "Times New Roman", serif`;
    const mw = x.measureText(L.text).width;
    if (mw > rr * 1.45) {
      fs *= (rr * 1.45) / mw;
      x.font = `700 ${fs}px Georgia, "Times New Roman", serif`;
    }
    x.fillText(L.text, -rr * 0.04, ym - (L.sub ? lh * 0.12 : 0));
    if (L.sub) {
      x.font = `600 ${lh * 0.15}px Georgia, serif`;
      x.fillText(L.sub, -rr * 0.04, ym + lh * 0.25, rr * 1.5);
    }
    x.fillStyle = col(L.ink, 0.5);
    x.fillRect(-rr, ly0 + 0.8, 2 * rr, 0.35);
    x.fillRect(-rr, ly1 - 1.15, 2 * rr, 0.35);
    const e = x.createLinearGradient(-rr, 0, rr, 0);
    e.addColorStop(0, "rgba(0,0,0,0.5)");
    e.addColorStop(0.18, "rgba(0,0,0,0)");
    e.addColorStop(0.24, "rgba(255,255,255,0.18)");
    e.addColorStop(0.3, "rgba(0,0,0,0)");
    e.addColorStop(0.8, "rgba(0,0,0,0)");
    e.addColorStop(1, "rgba(0,0,0,0.5)");
    x.fillStyle = e;
    x.fillRect(-rr - 0.5, ly0, 2 * rr + 1, lh);
  }

  // thick glass heel
  const rb = radiusAt(keys, 0.99);
  const gb = x.createLinearGradient(0, -4, 0, 0);
  gb.addColorStop(0, "rgba(0,0,0,0)");
  gb.addColorStop(1, "rgba(0,0,0,0.35)");
  x.fillStyle = gb;
  x.fillRect(-rb - 1, -4, 2 * rb + 2, 4);
  x.fillStyle = "rgba(255,255,255,0.28)";
  x.fillRect(-rb * 0.7, -2.6, rb * 1.4, 0.4);
  x.restore();

  bottlePath(x, spec);
  x.strokeStyle = "rgba(0,0,0,0.35)";
  x.lineWidth = 0.35;
  x.stroke();

  // Cast shadow with a coloured caustic where sun passes through the glass.
  const sc = canvas(w * 2, hh * 2);
  const sx = ctx2d(sc);
  sx.scale(2, 2);
  sx.translate(maxR + pad, h + pad);
  bottlePath(sx, spec);
  sx.fillStyle = col(mix([25, 18, 10], glass, 0.2), alpha < 0.4 ? 0.3 : 0.5);
  sx.fill();
  sx.globalCompositeOperation = "source-atop";
  sx.fillStyle = col(mix(spec.liquid ? mix(glass, spec.liquid.color, 0.6) : glass, WHITE, 0.35), 0.5);
  sx.beginPath();
  sx.ellipse(0, -h * 0.25, maxR * 0.45, h * 0.18, 0, 0, Math.PI * 2);
  sx.fill();

  return {
    sprite: { c, ox: maxR + pad, oy: h + pad, w, h: hh },
    shadow: { c: blur(sc, 3), ox: maxR + pad, oy: h + pad, w, h: hh },
    maxR,
  };
}

// ---------- scene painting ----------

function wood(x: Ctx, rx: number, ry: number, rw: number, rh: number, base: RGB, R: Rand, vertical: boolean) {
  x.save();
  x.beginPath();
  x.rect(rx, ry, rw, rh);
  x.clip();
  x.fillStyle = col(base);
  x.fillRect(rx, ry, rw, rh);
  const L = vertical ? rw : rh;
  const along = vertical ? rh : rw;
  const n = Math.ceil(L * 2);
  for (let i = 0; i < n; i++) {
    const off = R() * L;
    const amp = R() * 1.4;
    const f = 0.008 + R() * 0.03;
    const ph = R() * 6;
    x.beginPath();
    for (let s = 0; s <= along + 4; s += 4) {
      const o = off + Math.sin(s * f + ph) * amp;
      if (vertical) x.lineTo(rx + o, ry + s);
      else x.lineTo(rx + s, ry + o);
    }
    x.strokeStyle = R() < 0.7 ? `rgba(70,45,25,${0.04 + R() * 0.12})` : `rgba(255,235,200,${0.03 + R() * 0.08})`;
    x.lineWidth = 0.2 + R() * 0.9;
    x.stroke();
  }
  const knots = Math.floor((along / 220) * R() * 2);
  for (let i = 0; i < knots; i++) {
    const kx = rx + R() * rw;
    const ky = ry + R() * rh;
    for (let r = 5; r >= 1; r--) {
      x.strokeStyle = `rgba(80,50,25,${0.12 + (5 - r) * 0.05})`;
      x.lineWidth = 0.5;
      x.beginPath();
      x.ellipse(kx, ky, vertical ? r * 0.7 : r * 1.8, vertical ? r * 1.8 : r * 0.7, 0, 0, Math.PI * 2);
      x.stroke();
    }
    x.fillStyle = "rgba(60,35,18,0.6)";
    x.beginPath();
    x.ellipse(kx, ky, 1.1, 0.8, 0, 0, Math.PI * 2);
    x.fill();
  }
  for (let i = 0; i < along / 40; i++) {
    const bx = rx + R() * rw;
    const by = ry + R() * rh;
    const br = 6 + R() * 30;
    const g = x.createRadialGradient(bx, by, 0, bx, by, br);
    g.addColorStop(0, `rgba(${R() < 0.5 ? "50,35,20" : "235,220,190"},${0.05 + R() * 0.08})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(bx - br, by - br, br * 2, br * 2);
  }
  x.restore();
}

function hole(x: Ctx, px: number, py: number, R: Rand) {
  x.save();
  x.lineCap = "round";
  for (let i = 0; i < 10; i++) {
    const a = R() * Math.PI * 2;
    const l = 1.2 + R() * 3.2;
    x.strokeStyle = `rgba(225,195,150,${0.35 + R() * 0.3})`;
    x.lineWidth = 0.3 + R() * 0.5;
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l);
    x.stroke();
  }
  const g = x.createRadialGradient(px, py, 0, px, py, 2.6);
  g.addColorStop(0, "rgba(10,6,3,1)");
  g.addColorStop(0.45, "rgba(25,15,8,0.95)");
  g.addColorStop(0.6, "rgba(60,40,22,0.5)");
  g.addColorStop(1, "rgba(60,40,22,0)");
  x.fillStyle = g;
  x.beginPath();
  x.arc(px, py, 2.6, 0, Math.PI * 2);
  x.fill();
  x.restore();
}

function splat(x: Ctx, px: number, py: number, R: Rand) {
  x.save();
  x.lineCap = "round";
  for (let i = 0; i < 14; i++) {
    const a = R() * Math.PI * 2;
    const l = 2 + R() * 6;
    x.strokeStyle = `rgba(150,150,156,${0.5 + R() * 0.4})`;
    x.lineWidth = 0.4 + R() * 0.7;
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l);
    x.stroke();
  }
  x.fillStyle = "rgba(128,128,134,0.95)";
  x.beginPath();
  x.arc(px, py, 3.2, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "rgba(70,70,76,1)";
  x.beginPath();
  x.arc(px, py, 1.6, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "rgba(225,225,230,0.6)";
  x.beginPath();
  x.arc(px - 1, py - 1, 0.8, 0, Math.PI * 2);
  x.fill();
  x.restore();
}

const bermY = (px: number) => (px < 250 || px > 1550 ? HORIZON : 395 + ((px - 900) / 650) ** 2 * 140);

function ridge(x: Ctx, base: number, waves: [number, number, number][], fill: string) {
  x.beginPath();
  x.moveTo(BX0, HORIZON + 10);
  for (let px = BX0; px <= BX1; px += 8) {
    let y = base;
    for (const [a, f, p] of waves) y += a * Math.sin(px * f + p);
    x.lineTo(px, y);
  }
  x.lineTo(BX1, HORIZON + 10);
  x.closePath();
  x.fillStyle = fill;
  x.fill();
  x.globalCompositeOperation = "source-atop";
  const g = x.createLinearGradient(0, base - 40, 0, HORIZON);
  g.addColorStop(0, "rgba(230,225,210,0)");
  g.addColorStop(1, "rgba(230,225,210,0.5)");
  x.fillStyle = g;
  x.fillRect(BX0, 0, BW, HORIZON + 10);
  x.globalCompositeOperation = "source-over";
}

function grass(x: Ctx, R: Rand, n: number, y0: number, y1: number, lenK: number, wK: number) {
  x.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const y = y0 + (y1 - y0) * R();
    const p = (y - HORIZON) / (H - HORIZON);
    const len = (0.8 + p * 7) * lenK * (0.6 + R() * 0.8);
    const px = BX0 + R() * BW;
    const tone = R();
    x.strokeStyle =
      tone < 0.5
        ? `rgba(${180 + R() * 30},${160 + R() * 25},${110 + R() * 20},0.7)`
        : tone < 0.8
          ? `rgba(${120 + R() * 30},${110 + R() * 20},${70 + R() * 15},0.7)`
          : `rgba(${95 + R() * 20},${105 + R() * 20},${60 + R() * 15},0.7)`;
    x.lineWidth = (0.3 + p * 0.9) * wK;
    x.beginPath();
    x.moveTo(px, y);
    x.quadraticCurveTo(px, y - len * 0.6, px + (R() - 0.5) * len * 0.7, y - len);
    x.stroke();
  }
}

function paintBG(R: Rand) {
  const bg = canvas(BW * BG, H * BG);
  const b = ctx2d(bg);
  const layer = (passes: number, fn: (x: Ctx) => void) => {
    const c = canvas(bg.width, bg.height);
    const x = ctx2d(c);
    x.scale(BG, BG);
    x.translate(-BX0, 0);
    fn(x);
    b.drawImage(passes ? blur(c, passes) : c, 0, 0);
  };
  layer(1, (x) => {
    const g = x.createLinearGradient(0, 0, 0, HORIZON + 30);
    g.addColorStop(0, "rgb(96,132,176)");
    g.addColorStop(0.55, "rgb(160,183,206)");
    g.addColorStop(1, "rgb(226,221,206)");
    x.fillStyle = g;
    x.fillRect(BX0, 0, BW, HORIZON + 40);
    const s = x.createRadialGradient(240, 80, 0, 240, 80, 700);
    s.addColorStop(0, "rgba(255,244,220,0.55)");
    s.addColorStop(1, "rgba(255,244,220,0)");
    x.fillStyle = s;
    x.fillRect(BX0, 0, BW, HORIZON + 40);
  });
  layer(4, (x) => {
    for (let i = 0; i < 16; i++) {
      const cx = BX0 + R() * BW;
      const cy = 40 + R() * 260;
      const sc = 0.6 + R() * 1.2;
      for (let j = 0; j < 9; j++) {
        const r = (20 + R() * 40) * sc;
        x.fillStyle = `rgba(255,255,255,${0.25 + R() * 0.3})`;
        x.beginPath();
        x.ellipse(cx + (R() - 0.5) * 160 * sc, cy + (R() - 0.5) * 30 * sc, r * 1.6, r * 0.7, 0, 0, Math.PI * 2);
        x.fill();
      }
    }
  });
  layer(2, (x) => ridge(x, 458, [[28, 0.0035, 1], [14, 0.009, 2], [6, 0.027, 0.5]], "rgb(150,160,176)"));
  layer(2, (x) => ridge(x, 503, [[12, 0.006, 2], [6, 0.02, 1], [3, 0.05, 3]], "rgb(126,131,116)"));
  layer(2, (x) => {
    for (let i = 0; i < 380; i++) {
      const h = 8 + R() * 22;
      x.fillStyle = `rgb(${60 + R() * 25},${70 + R() * 25},${45 + R() * 15})`;
      x.beginPath();
      x.ellipse(BX0 + R() * BW, HORIZON - 2 + R() * 6 - h * 0.5, 6 + R() * 14, h * 0.6, 0, 0, Math.PI * 2);
      x.fill();
    }
  });
  layer(1, (x) => {
    x.beginPath();
    x.moveTo(250, HORIZON + 15);
    for (let px = 250; px <= 1550; px += 10) x.lineTo(px, bermY(px) + Math.sin(px * 0.05) * 2 + Math.sin(px * 0.13) * 1.2);
    x.lineTo(1550, HORIZON + 15);
    x.closePath();
    const g = x.createLinearGradient(0, 395, 0, HORIZON);
    g.addColorStop(0, "rgb(168,134,96)");
    g.addColorStop(1, "rgb(138,110,80)");
    x.fillStyle = g;
    x.fill();
    x.save();
    x.clip();
    for (let i = 0; i < 2500; i++) {
      x.fillStyle = R() < 0.5 ? "rgba(90,65,40,0.35)" : "rgba(210,185,150,0.3)";
      x.fillRect(250 + R() * 1300, 395 + R() * 140, 0.8 + R() * 2, 0.6 + R());
    }
    grass(x, R, 900, 400, HORIZON, 0.5, 0.8);
    x.restore();
  });
  layer(1, (x) => {
    const g = x.createLinearGradient(0, HORIZON, 0, H);
    g.addColorStop(0, "rgb(176,160,124)");
    g.addColorStop(0.4, "rgb(156,136,100)");
    g.addColorStop(1, "rgb(118,98,70)");
    x.fillStyle = g;
    x.fillRect(BX0, HORIZON, BW, H - HORIZON);
    for (let i = 0; i < 70; i++) {
      const y = HORIZON + R() * (H - HORIZON);
      const rx = 20 + R() * 120;
      x.fillStyle = R() < 0.5 ? "rgba(90,70,45,0.05)" : "rgba(220,200,160,0.05)";
      x.beginPath();
      x.ellipse(BX0 + R() * BW, y, rx, rx * 0.08, 0, 0, Math.PI * 2);
      x.fill();
    }
    grass(x, R, 14000, HORIZON, 760, 1, 1);
  });
  layer(3, (x) => grass(x, R, 4000, 740, H + 10, 1.6, 2));
  return bg;
}

function paintFocus(R: Rand) {
  const c = canvas((F.x1 - F.x0) * FOCUS, (F.y1 - F.y0) * FOCUS);
  const x = ctx2d(c);
  x.setTransform(FOCUS, 0, 0, FOCUS, -F.x0 * FOCUS, -F.y0 * FOCUS);

  const shadowEllipse = (cx: number, cy: number, rx: number, a: number) => {
    x.save();
    x.translate(cx, cy);
    x.scale(1, 0.04);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(30,20,10,${a})`);
    g.addColorStop(1, "rgba(30,20,10,0)");
    x.fillStyle = g;
    x.beginPath();
    x.arc(0, 0, rx, 0, Math.PI * 2);
    x.fill();
    x.restore();
  };
  shadowEllipse(800, GROUND + 3, 470, 0.4);
  for (const st of STANDS) shadowEllipse(st.post.x0 + 6, GROUND + 3, 40, 0.4);

  // plywood backboard
  const bw = BOARD.x1 - BOARD.x0;
  const bh = BOARD.y1 - BOARD.y0;
  wood(x, BOARD.x0, BOARD.y0, bw, bh, [176, 141, 101], R, false);
  for (const sx of [685, 915]) {
    x.fillStyle = "rgba(40,25,15,0.55)";
    x.fillRect(sx - 0.6, BOARD.y0, 1.2, bh);
    x.fillStyle = "rgba(255,230,190,0.25)";
    x.fillRect(sx + 0.6, BOARD.y0, 0.6, bh);
  }
  for (let i = 0; i < 60; i++) {
    const px = BOARD.x0 + R() * bw;
    const py = [BOARD.y0, PLANKS[0].y1, PLANKS[1].y1][Math.floor(R() * 3)];
    const len = 20 + R() * 160;
    const g = x.createLinearGradient(0, py, 0, py + len);
    g.addColorStop(0, "rgba(60,40,25,0.14)");
    g.addColorStop(1, "rgba(60,40,25,0)");
    x.fillStyle = g;
    x.fillRect(px, py, 1 + R() * 6, len);
  }
  const bs = x.createLinearGradient(0, BOARD.y0, 0, BOARD.y1);
  bs.addColorStop(0, "rgba(255,240,210,0.1)");
  bs.addColorStop(1, "rgba(0,0,0,0.2)");
  x.fillStyle = bs;
  x.fillRect(BOARD.x0, BOARD.y0, bw, bh);
  x.fillStyle = "rgba(255,240,210,0.35)";
  x.fillRect(BOARD.x0, BOARD.y0, bw, 0.8);
  for (let i = 0; i < 16; i++) hole(x, BOARD.x0 + 10 + R() * (bw - 20), BOARD.y0 + 10 + R() * (bh - 20), R);

  // posts
  for (const p of POSTS) {
    const pw = p.x1 - p.x0;
    wood(x, p.x0, 290, pw, GROUND + 4 - 290, [128, 98, 66], R, true);
    const g = x.createLinearGradient(p.x0, 0, p.x1, 0);
    g.addColorStop(0, "rgba(255,235,200,0.2)");
    g.addColorStop(0.4, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.38)");
    x.fillStyle = g;
    x.fillRect(p.x0, 290, pw, GROUND + 4 - 290);
    x.fillStyle = "rgb(150,118,82)";
    x.fillRect(p.x0, 290, pw, 3);
  }

  // plank shadows, then planks
  for (const pl of PLANKS) {
    const g = x.createLinearGradient(0, pl.y1, 0, pl.y1 + 24);
    g.addColorStop(0, "rgba(20,12,6,0.42)");
    g.addColorStop(1, "rgba(20,12,6,0)");
    x.fillStyle = g;
    x.fillRect(BOARD.x0 - 32, pl.y1, bw + 64, 24);
  }
  for (const pl of PLANKS) {
    const w = pl.x1 - pl.x0;
    wood(x, pl.x0, pl.top, w, 10, [200, 170, 128], R, false);
    const tg = x.createLinearGradient(0, pl.top, 0, pl.top + 10);
    tg.addColorStop(0, "rgba(0,0,0,0.15)");
    tg.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = tg;
    x.fillRect(pl.x0, pl.top, w, 10);
    wood(x, pl.x0, pl.top + 10, w, pl.y1 - pl.top - 10, [152, 116, 78], R, false);
    const fg = x.createLinearGradient(0, pl.top + 10, 0, pl.y1);
    fg.addColorStop(0, "rgba(255,235,200,0.12)");
    fg.addColorStop(1, "rgba(0,0,0,0.25)");
    x.fillStyle = fg;
    x.fillRect(pl.x0, pl.top + 10, w, pl.y1 - pl.top - 10);
    x.fillStyle = "rgba(255,240,210,0.4)";
    x.fillRect(pl.x0, pl.top + 9.6, w, 0.8);
    x.fillStyle = "rgba(0,0,0,0.4)";
    x.fillRect(pl.x0, pl.y1 - 1, w, 1);
    x.fillStyle = "rgba(60,40,22,0.6)";
    x.fillRect(pl.x0, pl.top, 1.6, pl.y1 - pl.top);
    x.fillRect(pl.x1 - 1.6, pl.top, 1.6, pl.y1 - pl.top);
    for (const p of POSTS) {
      for (const ny of [pl.top + 14, pl.top + 23]) {
        const nx = (p.x0 + p.x1) / 2;
        x.fillStyle = "rgb(55,55,58)";
        x.beginPath();
        x.arc(nx, ny, 1, 0, Math.PI * 2);
        x.fill();
        x.fillStyle = "rgba(220,220,225,0.6)";
        x.beginPath();
        x.arc(nx - 0.3, ny - 0.3, 0.35, 0, Math.PI * 2);
        x.fill();
      }
    }
  }

  // plate stand: steel pipe and arm
  const pipe = (x0: number, y0: number, w: number, h: number, horizontal: boolean) => {
    const g = horizontal ? x.createLinearGradient(0, y0, 0, y0 + h) : x.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, "rgb(58,60,64)");
    g.addColorStop(0.3, "rgb(156,158,162)");
    g.addColorStop(0.7, "rgb(80,82,86)");
    g.addColorStop(1, "rgb(36,38,41)");
    x.fillStyle = g;
    x.fillRect(x0, y0, w, h);
    for (let i = 0; i < 14; i++) {
      x.fillStyle = `rgba(130,70,30,${0.1 + R() * 0.2})`;
      if (horizontal) x.fillRect(x0 + R() * w, y0, 1 + R() * 4, h);
      else x.fillRect(x0, y0 + R() * h, w, 1 + R() * 6);
    }
  };
  for (const { post, arm, kind } of STANDS) {
    pipe(post.x0, STAND_Y0, post.x1 - post.x0, GROUND + 3 - STAND_Y0, false);
    pipe(arm.x0, ARM_Y0, arm.x1 - arm.x0, ARM_Y1 - ARM_Y0, true);
    x.fillStyle = "rgb(50,52,56)";
    x.beginPath();
    x.ellipse(kind === "home" ? arm.x0 : arm.x1, (ARM_Y0 + ARM_Y1) / 2, 1.5, (ARM_Y1 - ARM_Y0) / 2, 0, 0, Math.PI * 2);
    x.fill();
  }

  // sharp grass tufts at the base, in the focal plane
  x.lineCap = "round";
  for (let i = 0; i < 260; i++) {
    const near = R() < 0.6;
    const bx = near
      ? [POSTS[0].x0, POSTS[1].x0, ...STANDS.map((st) => st.post.x0)][Math.floor(R() * 4)] + (R() - 0.3) * 50
      : F.x0 + 10 + R() * (F.x1 - F.x0 - 20);
    const by = GROUND - 2 + R() * 14;
    const blades = 3 + Math.floor(R() * 5);
    for (let j = 0; j < blades; j++) {
      const len = 4 + R() * 12;
      const lean = (R() - 0.5) * len * 0.9;
      x.strokeStyle = R() < 0.6 ? `rgba(${185 + R() * 30},${165 + R() * 25},${110 + R() * 20},0.9)` : `rgba(${110 + R() * 25},${110 + R() * 20},${65 + R() * 15},0.9)`;
      x.lineWidth = 0.4 + R() * 0.5;
      x.beginPath();
      x.moveTo(bx + j * 0.8, by);
      x.quadraticCurveTo(bx + j * 0.8, by - len * 0.6, bx + j * 0.8 + lean, by - len);
      x.stroke();
    }
  }
  return { c, x };
}

function buildPlate(R: Rand, kind: Kind) {
  const { w, h, pad } = PLATE;
  const c = canvas((w + 2 * pad) * S, (h + 2 * pad) * S);
  const x = ctx2d(c);
  x.scale(S, S);
  x.translate(w / 2 + pad, pad); // origin = top centre of plate
  const hw = w / 2;
  x.fillStyle = "rgb(70,70,72)";
  x.beginPath();
  x.roundRect(-hw, 0, w, h, 5);
  x.fill();
  x.save();
  x.beginPath();
  x.roundRect(-hw + 1.2, 1.2, w - 2.4, h - 2.4, 4);
  x.clip();
  const pg = x.createLinearGradient(-hw, 0, hw, h);
  pg.addColorStop(0, "rgb(240,236,224)");
  pg.addColorStop(1, "rgb(212,206,190)");
  x.fillStyle = pg;
  x.fillRect(-hw, 0, w, h);
  const grime = x.createLinearGradient(0, h * 0.4, 0, h);
  grime.addColorStop(0, "rgba(90,75,55,0)");
  grime.addColorStop(1, "rgba(90,75,55,0.22)");
  x.fillStyle = grime;
  x.fillRect(-hw, 0, w, h);
  for (const dx of [-30, 30]) {
    for (let i = 0; i < 3; i++) {
      const sx = dx + (R() - 0.5) * 4;
      const len = 10 + R() * 22;
      const g = x.createLinearGradient(0, 6, 0, 6 + len);
      g.addColorStop(0, "rgba(130,65,25,0.35)");
      g.addColorStop(1, "rgba(130,65,25,0)");
      x.fillStyle = g;
      x.fillRect(sx, 6, 0.8 + R() * 1.2, len);
    }
  }
  for (let i = 0; i < 90; i++) {
    x.fillStyle = `rgba(130,70,30,${0.12 + R() * 0.35})`;
    x.beginPath();
    x.arc(-hw + R() * w, R() * h, 0.2 + R() * 0.8, 0, Math.PI * 2);
    x.fill();
  }
  // stencilled icon + word
  x.fillStyle = "rgba(22,22,24,0.92)";
  if (kind === "home") {
    x.beginPath();
    x.moveTo(-17, 31);
    x.lineTo(0, 15);
    x.lineTo(17, 31);
    x.closePath();
    x.fill();
    x.fillRect(7, 17, 4, 8);
    x.fillRect(-12, 30, 24, 14);
    x.fillStyle = pg;
    x.fillRect(-3, 35, 6, 9);
  } else {
    x.strokeStyle = "rgba(22,22,24,0.92)";
    x.lineWidth = 4.2;
    x.beginPath();
    x.arc(0, 30, 10, -Math.PI * 0.35, Math.PI * 1.35);
    x.stroke();
    const a = -Math.PI * 0.35;
    const ex = Math.cos(a) * 10;
    const ey = 30 + Math.sin(a) * 10;
    x.beginPath();
    x.moveTo(ex + 5.5, ey - 3);
    x.lineTo(ex - 3.5, ey - 4.5);
    x.lineTo(ex + 1.5, ey + 5);
    x.closePath();
    x.fill();
  }
  x.fillStyle = "rgba(22,22,24,0.92)";
  x.font = '900 15px "Arial Black", Impact, "Helvetica Neue", sans-serif';
  x.textAlign = "center";
  x.textBaseline = "alphabetic";
  x.fillText(kind === "home" ? "INICIO" : "RESET", 0, 62);
  // chipped paint near the edges shows steel
  for (let i = 0; i < 34; i++) {
    const side = Math.floor(R() * 4);
    const t = R();
    const inset = 1 + R() * 4;
    const px = side === 0 ? -hw + t * w : side === 1 ? hw - inset : side === 2 ? -hw + t * w : -hw + inset;
    const py = side === 0 ? inset : side === 1 ? t * h : side === 2 ? h - inset : t * h;
    x.fillStyle = "rgba(72,72,75,0.85)";
    x.beginPath();
    x.ellipse(px, py, 0.6 + R() * 2, 0.4 + R() * 1.4, R() * 3, 0, Math.PI * 2);
    x.fill();
  }
  const sheen = x.createLinearGradient(-hw, 0, hw * 0.2, h);
  sheen.addColorStop(0, "rgba(255,255,255,0.18)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = sheen;
  x.fillRect(-hw, 0, w, h);
  x.restore();
  x.strokeStyle = "rgba(0,0,0,0.3)";
  x.lineWidth = 0.6;
  x.beginPath();
  x.roundRect(-hw + 0.6, 0.6, w - 1.2, h - 1.2, 4.5);
  x.stroke();
  for (const dx of [-30, 30]) {
    x.fillStyle = "rgb(20,20,22)";
    x.beginPath();
    x.arc(dx, 4, 2, 0, Math.PI * 2);
    x.fill();
    x.strokeStyle = "rgba(120,120,125,0.8)";
    x.lineWidth = 0.5;
    x.stroke();
  }
  for (let i = 0; i < 3; i++) splat(x, (R() - 0.5) * 70, 10 + R() * 52, R);
  return { c, x };
}

// ---------- shattering ----------

function fracture(ix: number, iy: number, R: Rand): Pt[][] {
  const n = 9 + Math.floor(R() * 5);
  const a0 = R() * Math.PI * 2;
  const ang = Array.from({ length: n }, (_, k) => a0 + (k + (R() - 0.5) * 0.6) * ((2 * Math.PI) / n));
  const radii = [2 + R() * 2.5];
  while (radii[radii.length - 1] < 200) radii.push(radii[radii.length - 1] * (1.4 + R() * 0.45));
  // Shared vertex grid, so neighbouring shards fit without gaps. Cracks run long vertically.
  const V = radii.map((r) =>
    ang.map((a): Pt => {
      const rr = r * (0.82 + R() * 0.36);
      const aa = a + (R() - 0.5) * 0.18;
      return [ix + Math.cos(aa) * rr, iy + Math.sin(aa) * rr * 1.35];
    }),
  );
  const mid = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const polys: Pt[][] = [];
  for (let k = 0; k < n; k++) polys.push([[ix, iy], V[0][k], V[0][(k + 1) % n]]);
  for (let i = 0; i < radii.length - 1; i++) {
    for (let k = 0; k < n; k++) {
      const k1 = (k + 1) % n;
      const A = V[i][k];
      const B = V[i][k1];
      const C = V[i + 1][k1];
      const D = V[i + 1][k];
      const m = R();
      if (m < 0.35) polys.push([A, B, C], [A, C, D]);
      else if (m < 0.6) {
        const p = mid(A, B, 0.3 + R() * 0.4);
        const q = mid(D, C, 0.3 + R() * 0.4);
        polys.push([A, p, q, D], [p, B, C, q]);
      } else polys.push([A, B, C, D]);
    }
  }
  return polys;
}

type Bottle = { idx: number; spec: Spec; x: number; y: number; sprite: Sprite; shadow: Sprite; maxR: number; broken: boolean; alpha: number; tier: number };
type Shard = {
  c: HTMLCanvasElement; ox: number; oy: number; w: number; h: number; r: number;
  x: number; y: number; z: number; vx: number; vy: number; vz: number; rot: number; vr: number;
  sq: number; sqT: number; state: 0 | 1 | 2; alpha: number; fade: boolean;
};
type Particle = {
  k: "glint" | "drop" | "spark" | "chip" | "puff" | "flash";
  x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; c: RGB;
  rot: number; vr: number; grow: number; a: number;
};

// ---------- sound (synthesized, no assets) ----------

function makeSound() {
  let ac: AudioContext | null = null;
  let nb: AudioBuffer;
  let out: AudioNode;
  let echo: AudioNode;
  const get = () => {
    if (!ac) {
      ac = new AudioContext();
      nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const comp = ac.createDynamicsCompressor();
      comp.connect(ac.destination);
      out = comp;
      const dl = ac.createDelay(1);
      dl.delayTime.value = 0.34;
      const fb = ac.createGain();
      fb.gain.value = 0.3;
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 700;
      dl.connect(lp).connect(fb).connect(dl);
      lp.connect(comp);
      echo = dl;
    }
    if (ac.state === "suspended") void ac.resume();
    return ac;
  };
  const env = (g: GainNode, t: number, peak: number, dur: number) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  };
  const noise = (t: number, dur: number, type: BiquadFilterType, f: number, q: number, peak: number, toEcho = false) => {
    const a = get();
    const src = a.createBufferSource();
    src.buffer = nb;
    const fl = a.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = f;
    fl.Q.value = q;
    const g = a.createGain();
    env(g, t, peak, dur);
    src.connect(fl).connect(g).connect(out);
    if (toEcho) g.connect(echo);
    src.start(t, Math.random() * 0.5, dur + 0.05);
    return fl;
  };
  const tone = (t: number, f: number, peak: number, dur: number) => {
    const a = get();
    const o = a.createOscillator();
    o.frequency.value = f;
    const g = a.createGain();
    env(g, t, peak, dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  };
  let lastTink = 0;
  return {
    unlock: () => get(),
    now: () => get().currentTime,
    shot() {
      const t = get().currentTime;
      noise(t, 0.5, "lowpass", 8000, 0.7, 0.9, true).frequency.exponentialRampToValueAtTime(320, t + 0.3);
      noise(t, 0.04, "highpass", 3000, 0.7, 0.7);
      tone(t, 150, 0.9, 0.35).frequency.exponentialRampToValueAtTime(40, t + 0.25);
      // bolt cycling
      for (const [dt, f] of [[0.55, 2500], [0.68, 1800], [0.86, 2200]] as const) noise(t + dt, 0.025, "bandpass", f, 2, 0.2);
    },
    glass(delay: number) {
      const t = get().currentTime + delay;
      noise(t, 0.14, "highpass", 1500, 0.7, 0.55);
      for (let i = 0; i < 6; i++) noise(t + Math.random() * 0.06, 0.05 + Math.random() * 0.2, "bandpass", 2500 + Math.random() * 5000, 1.2, 0.35);
      for (let i = 0; i < 18; i++) tone(t + Math.random() * 0.45, 2800 + Math.random() * 5200, 0.03 + Math.random() * 0.06, 0.06 + Math.random() * 0.25);
    },
    tink(v: number) {
      const t = get().currentTime;
      if (t - lastTink < 0.035) return;
      lastTink = t;
      tone(t, 3000 + Math.random() * 5000, Math.min(0.08, 0.01 + v * 0.00006), 0.06 + Math.random() * 0.12);
    },
    clang(delay: number) {
      const t = get().currentTime + delay;
      noise(t, 0.08, "bandpass", 1800, 1, 0.6);
      const parts: [number, number, number][] = [[1, 0.45, 1.8], [1.007, 0.25, 1.6], [2.32, 0.3, 1.2], [4.25, 0.2, 0.8], [6.63, 0.12, 0.5], [9.1, 0.08, 0.3]];
      for (const [m, g, d] of parts) tone(t, 610 * m, g, d);
    },
    thud(delay: number, f = 600) {
      noise(get().currentTime + delay, 0.12, "lowpass", f, 0.8, 0.45);
    },
    ping(delay: number) {
      const t = get().currentTime + delay;
      tone(t, 2400, 0.2, 0.25).frequency.exponentialRampToValueAtTime(1500, t + 0.25);
    },
  };
}

// ---------- component ----------

export type ScopeTarget = {
  /** Text painted on the bottle label. */
  label: string;
  /** Optional small second line on the label. */
  sub?: string;
};

export type SniperScopeProps = {
  /** Where the HOME plate sends you. */
  homeHref?: string;
  /** Starting magnification, 1 to 5. */
  zoom?: number;
  /** One bottle per target (max 8). Defaults to the original bottles. */
  targets?: ScopeTarget[];
  /** Fired with the target index when its bottle shatters. */
  onHit?: (index: number) => void;
  /** While true, the rifle does not fire (e.g. a panel is open). */
  paused?: boolean;
  className?: string;
  children?: ReactNode;
};

const LABEL_FALLBACK = { y0: 0.6, y1: 0.82, paper: [244, 242, 234] as RGB, ink: [30, 50, 90] as RGB };

function specsFor(targets?: ScopeTarget[]): Spec[] {
  if (!targets || !targets.length) return SPECS;
  return targets.slice(0, PLACES.length).map((tg, i) => {
    const s = SPECS[i % SPECS.length]; // los tipos de botella se repiten
    const base = s.label ?? LABEL_FALLBACK;
    return { ...s, label: { ...base, text: tg.label, sub: tg.sub } };
  });
}

export function SniperScope({ homeHref = "/", zoom: zoom0 = 1.8, targets, onHit, paused = false, className, children }: SniperScopeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rangeRef = useRef<HTMLSpanElement>(null);
  const magRef = useRef<HTMLSpanElement>(null);
  const onHitRef = useRef(onHit);
  const pausedRef = useRef(paused);
  useEffect(() => {
    onHitRef.current = onHit;
    pausedRef.current = paused;
  });
  const targetsKey = JSON.stringify(targets ?? null);
  const [left, setLeft] = useState(specsFor(targets).length);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const specs = specsFor(JSON.parse(targetsKey) ?? undefined);
    const root = rootRef.current!;
    const cv = canvasRef.current!;
    const ctx = ctx2d(cv);
    const R = rng(7);
    const fx = rng(Date.now() & 0xffff); // per-shot randomness
    const sfx = makeSound();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const bgCanvas = paintBG(R);
    const focus = paintFocus(R);
    const bottles: Bottle[] = specs.map((spec, i) => ({
      idx: i,
      spec,
      x: PLACES[i][0],
      y: PLACES[i][1],
      ...buildBottle(spec),
      broken: false,
      alpha: 1,
      tier: PLACES[i][1] < 600 ? 0 : 1,
    }));

    let vw = 0;
    let vh = 0;
    let dpr = 1;
    let R0 = 0;
    const resize = () => {
      const r = root.getBoundingClientRect();
      vw = r.width;
      vh = r.height;
      dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = Math.round(vw * dpr);
      cv.height = Math.round(vh * dpr);
      R0 = Math.min(vw, vh) * 0.46;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(root);
    resize();

    let zoom = clamp(zoom0, 1, 5);
    const scale = () => (2 * R0 * zoom) / 900;
    const tgt = { x: 800, y: 500 };
    const aim = { x: 800, y: 500 };
    let velX = 0;
    let velY = 0;
    let t = 0;
    let open = 0;
    let nextShot = 0;
    let recoil = 0;
    let recoilV = 0;
    let shake = 0;
    let flash = 0;
    let steadyHeld = false;
    let steady = 0;
    let gone = false;
    let respawnAt = 0;
    let rangeAt = 0;
    let lastRange = "";
    const pending: { at: number; x: number; y: number }[] = [];
    const shards: Shard[] = [];
    const parts: Particle[] = [];
    const plates = STANDS.map((st) => ({ ...st, art: buildPlate(R, st.kind), phi: 0, phiV: 0, th: 0, thV: 0 }));
    type Plate = (typeof plates)[number];
    const timers: number[] = [];

    const setMag = () => {
      if (magRef.current) magRef.current.textContent = `${zoom.toFixed(1)}×`;
    };
    setMag();

    const add = (p: Partial<Particle> & Pick<Particle, "k" | "x" | "y" | "life">) =>
      parts.push({ vx: 0, vy: 0, size: 1, c: WHITE, rot: 0, vr: 0, grow: 0, a: 1, max: p.life, ...p });
    const burst = (k: Particle["k"], n: number, x: number, y: number, o: { sp: [number, number]; life: [number, number]; size: [number, number]; c: RGB; up?: number; cone?: number; dir?: number; vr?: number }) => {
      for (let i = 0; i < n; i++) {
        const a = o.cone ? (o.dir ?? -Math.PI / 2) + (fx() - 0.5) * o.cone : fx() * Math.PI * 2;
        const sp = o.sp[0] + fx() * (o.sp[1] - o.sp[0]);
        add({
          k, x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - (o.up ?? 0) * fx(),
          life: o.life[0] + fx() * (o.life[1] - o.life[0]),
          size: o.size[0] + fx() * (o.size[1] - o.size[0]),
          c: o.c,
          rot: fx() * 6,
          vr: (fx() - 0.5) * (o.vr ?? 0),
        });
      }
    };

    const platePoint = (plate: Plate, px: number, py: number): Pt | null => {
      const dx = px - plate.cx;
      const dy = py - PLATE.pivot;
      const c = Math.cos(plate.th);
      const s = Math.sin(plate.th);
      const lx = dx * c + dy * s;
      const ly = (-dx * s + dy * c) / Math.max(0.2, Math.cos(plate.phi));
      return Math.abs(lx) <= PLATE.w / 2 && ly >= PLATE.chain && ly <= PLATE.chain + PLATE.h ? [lx, ly - PLATE.chain] : null;
    };
    const inRect = (px: number, py: number, x0: number, y0: number, x1: number, y1: number) => px >= x0 && px <= x1 && py >= y0 && py <= y1;
    const onWood = (px: number, py: number) =>
      PLANKS.some((p) => inRect(px, py, p.x0, p.top, p.x1, p.y1)) ||
      POSTS.some((p) => inRect(px, py, p.x0, 290, p.x1, GROUND)) ||
      inRect(px, py, BOARD.x0, BOARD.y0, BOARD.x1, BOARD.y1);
    const onMetal = (px: number, py: number) =>
      STANDS.some(({ post, arm }) => inRect(px, py, post.x0, STAND_Y0, post.x1, GROUND) || inRect(px, py, arm.x0, ARM_Y0, arm.x1, ARM_Y1));
    const plateAt = (px: number, py: number) => {
      for (const plate of plates) {
        const pp = platePoint(plate, px, py);
        if (pp) return { plate, pp };
      }
      return null;
    };
    const restock = () => {
      respawnAt = 0;
      shards.forEach((s) => (s.fade = true));
      bottles.forEach((b) => {
        if (!b.broken) return;
        b.broken = false;
        b.alpha = 0;
      });
      setLeft(bottles.length);
    };
    const bottleAt = (px: number, py: number) => bottles.find((b) => !b.broken && b.alpha > 0.5 && insideBottle(b.spec, px - b.x, py - b.y));

    const rangeLabel = (px: number, py: number) => {
      const hit = plateAt(px, py);
      if (hit) return hit.plate.kind === "home" ? "INICIO · 52 m" : "RESET · 52 m";
      const tb = bottleAt(px, py);
      if (tb) return `${tb.spec.label?.text ?? "BOTELLA"} · 48 m`;
      if (onMetal(px, py)) return "53 m";
      if (onWood(px, py)) return "49 m";
      if (py > bermY(px) && py < HORIZON + 2 && px > 250 && px < 1550) return "61 m";
      if (py > HORIZON) return `${Math.round(clamp((48 * (GROUND - HORIZON)) / Math.max(1, py - HORIZON), 9, 999))} m`;
      return "– – –";
    };

    const stain = (px: number, py: number, c: RGB) => {
      focus.x.fillStyle = col(c, 0.3);
      focus.x.beginPath();
      focus.x.ellipse(px, py + (fx() - 0.5) * 6, 1 + fx() * 2.5, 0.5 + fx() * 0.4, 0, 0, Math.PI * 2);
      focus.x.fill();
    };
    const surfaceHit = (px: number, y0: number, y1: number, z: number): number | null => {
      if (z >= -22 && z <= 30) for (const s of SURF) if (y0 <= s.y && y1 > s.y && px >= s.x0 && px <= s.x1) return s.y;
      return y1 > GROUND ? GROUND : null;
    };

    const shatter = (b: Bottle, px: number, py: number) => {
      const ix = px - b.x;
      const iy = py - b.y;
      const sp = b.sprite;
      const { h } = b.spec;
      b.broken = true;
      setLeft(bottles.filter((o) => !o.broken).length);
      for (const poly of fracture(ix, iy, fx)) {
        const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
        const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
        if (![[cx, cy] as Pt, ...poly.map((p): Pt => [cx + (p[0] - cx) * 0.6, cy + (p[1] - cy) * 0.6])].some(([qx, qy]) => insideBottle(b.spec, qx, qy))) continue;
        const xs = poly.map((p) => p[0]);
        const ys = poly.map((p) => p[1]);
        const bx0 = Math.min(...xs) - 1;
        const by0 = Math.min(...ys) - 1;
        const bw = Math.max(...xs) + 1 - bx0;
        const bh = Math.max(...ys) + 1 - by0;
        const c = canvas(bw * S, bh * S);
        const x = ctx2d(c);
        x.scale(S, S);
        x.translate(-bx0, -by0);
        x.beginPath();
        poly.forEach((p) => x.lineTo(p[0], p[1]));
        x.closePath();
        x.save();
        x.clip();
        x.drawImage(sp.c, -sp.ox, -sp.oy, sp.w, sp.h);
        x.restore();
        x.globalCompositeOperation = "source-atop"; // fresh-broken edges catch the light
        x.strokeStyle = "rgba(255,255,255,0.6)";
        x.lineWidth = 0.45;
        x.stroke();
        const dx = cx - ix;
        const dy = cy - iy;
        const d = Math.hypot(dx, dy) || 1;
        const stays = iy < -h * 0.25 && cy > -h * 0.13 && d > 14; // the base ring often stays standing
        const speed = (500 + fx() * 900) / (1 + d / 35) + 80 + fx() * 200;
        shards.push({
          c, ox: bx0 - cx, oy: by0 - cy, w: bw, h: bh, r: Math.min(bw, bh) / 2,
          x: b.x + cx, y: b.y + cy, z: 0,
          vx: stays ? 0 : (dx / d) * speed + (fx() - 0.5) * 120,
          vy: stays ? 0 : (dy / d) * speed - fx() * 260,
          vz: stays ? 0 : 150 + fx() * 700 - (fx() < 0.25 ? 900 * fx() : 0),
          rot: 0, vr: stays ? 0 : (fx() - 0.5) * 30,
          sq: 1, sqT: 1, state: stays ? 2 : 0, alpha: 1, fade: false,
        });
      }
      const tint = mix(b.spec.glass, WHITE, 0.6);
      add({ k: "flash", x: px, y: py, life: 0.07, size: 34 });
      burst("glint", 80, px, py, { sp: [300, 1500], life: [0.25, 0.9], size: [0.5, 1.3], c: tint, up: 300 });
      add({ k: "puff", x: px, y: py, vx: (fx() - 0.5) * 40, vy: -20, life: 0.9, size: 8, grow: 55, c: [235, 235, 230], a: 0.3 });
      if (b.spec.liquid && iy + h > b.spec.liquid.top * h * 0.6) {
        const lc = b.spec.liquid.color;
        burst("drop", 70, px, py, { sp: [200, 950], life: [0.8, 1.4], size: [0.6, 1.8], c: mix(lc, WHITE, 0.15), up: 250 });
        add({ k: "puff", x: px, y: py, vx: 0, vy: -10, life: 0.6, size: 6, grow: 40, c: lc, a: 0.4 });
      }
      sfx.glass(0.03);
      const hitIdx = b.idx;
      timers.push(window.setTimeout(() => onHitRef.current?.(hitIdx), 650)); // let the shards fly first
      if (inRect(px, py, BOARD.x0, BOARD.y0, BOARD.x1, BOARD.y1)) hole(focus.x, px + 1.5, py, fx); // the round carries on
    };

    const resolve = (px: number, py: number) => {
      const hit = plateAt(px, py);
      if (hit) {
        const { plate, pp } = hit;
        splat(plate.art.x, pp[0], pp[1], fx);
        plate.phiV += 7;
        plate.thV += (pp[0] / (PLATE.w / 2)) * 1.8;
        burst("spark", 34, px, py, { sp: [300, 1100], life: [0.2, 0.55], size: [0.5, 1.1], c: [255, 190, 90], up: 200 });
        add({ k: "puff", x: px, y: py, vx: 0, vy: -15, life: 0.7, size: 4, grow: 30, c: [170, 170, 175], a: 0.35 });
        sfx.clang(0.03);
        if (plate.kind === "reset") {
          respawnAt = t + 0.45; // restock once the clang lands
          return;
        }
        gone = true;
        timers.push(window.setTimeout(() => setLeaving(true), 1000));
        timers.push(window.setTimeout(() => window.location.assign(homeHref), 1750));
        return;
      }
      const b = bottleAt(px, py);
      if (b) return shatter(b, px, py);
      if (onMetal(px, py)) {
        burst("spark", 18, px, py, { sp: [250, 800], life: [0.15, 0.4], size: [0.4, 0.9], c: [255, 200, 110], up: 150 });
        sfx.ping(0.03);
      } else if (onWood(px, py)) {
        hole(focus.x, px, py, fx);
        burst("chip", 14, px, py, { sp: [150, 550], life: [0.6, 1.2], size: [0.8, 2.2], c: [196, 158, 112], up: 250, vr: 30 });
        add({ k: "puff", x: px, y: py, vx: 0, vy: -15, life: 0.8, size: 3, grow: 24, c: [205, 180, 145], a: 0.45 });
        sfx.thud(0.03);
      } else if (py > Math.min(HORIZON, bermY(px))) {
        for (let i = 0; i < 3; i++) add({ k: "puff", x: px + (fx() - 0.5) * 6, y: py, vx: (fx() - 0.5) * 30, vy: -40 - fx() * 50, life: 1.1, size: 4, grow: 42, c: [160, 135, 100], a: 0.5 });
        burst("chip", 12, px, py, { sp: [150, 450], life: [0.4, 0.9], size: [0.8, 2], c: [110, 88, 60], cone: 1.6, vr: 20 });
        sfx.thud(0.06, 380);
      }
    };

    const fire = () => {
      if (t < nextShot || gone || open < 1 || pausedRef.current) return;
      nextShot = t + 0.95;
      sfx.shot();
      pending.push({ at: t + 0.09, x: aimX, y: aimY });
      recoilV += 1800;
      shake = 1;
      flash = 1;
    };

    // input
    let drag: { x: number; y: number; sx: number; sy: number; at: number } | null = null;
    const onDown = (e: PointerEvent) => {
      root.focus({ preventScroll: true });
      sfx.unlock();
      if (e.pointerType === "mouse") {
        if (e.button === 0) fire();
      } else drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, at: performance.now() };
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        const r = root.getBoundingClientRect();
        tgt.x = clamp((e.clientX - r.left) / vw, 0, 1) * W;
        tgt.y = clamp((e.clientY - r.top) / vh, 0, 1) * H;
      } else if (drag) {
        const s = scale();
        tgt.x = clamp(tgt.x + ((e.clientX - drag.x) / s) * 1.2, 0, W);
        tgt.y = clamp(tgt.y + ((e.clientY - drag.y) / s) * 1.2, 0, H);
        drag.x = e.clientX;
        drag.y = e.clientY;
      }
    };
    const onUp = (e: PointerEvent) => {
      if (drag && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 10 && performance.now() - drag.at < 350) fire();
      drag = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom = clamp(zoom * Math.exp(-e.deltaY * 0.0015), 1, 5);
      setMag();
    };
    const onKey = (e: KeyboardEvent) => {
      steadyHeld = e.shiftKey;
      if (e.type !== "keydown" || e.target instanceof HTMLAnchorElement || e.target instanceof HTMLInputElement) return;
      const st = 24 / zoom;
      if (e.key === "ArrowLeft") tgt.x = clamp(tgt.x - st, 0, W);
      else if (e.key === "ArrowRight") tgt.x = clamp(tgt.x + st, 0, W);
      else if (e.key === "ArrowUp") tgt.y = clamp(tgt.y - st, 0, H);
      else if (e.key === "ArrowDown") tgt.y = clamp(tgt.y + st, 0, H);
      else if (e.key === " " || e.key === "Enter") {
        sfx.unlock();
        fire();
      } else if (e.key === "+" || e.key === "=") zoom = clamp(zoom * 1.15, 1, 5);
      else if (e.key === "-") zoom = clamp(zoom / 1.15, 1, 5);
      else return;
      setMag();
      e.preventDefault();
    };
    root.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    root.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);

    let aimX = aim.x;
    let aimY = aim.y;

    const update = (dt: number) => {
      t += dt;
      open = Math.min(1, open + dt / 0.9);
      const px = aim.x;
      const py = aim.y;
      const k = 1 - Math.exp(-dt * 7);
      aim.x += (tgt.x - aim.x) * k;
      aim.y += (tgt.y - aim.y) * k;
      velX += ((aim.x - px) / dt - velX) * Math.min(1, dt * 10);
      velY += ((aim.y - py) / dt - velY) * Math.min(1, dt * 10);
      steady += ((steadyHeld ? 1 : 0) - steady) * Math.min(1, dt * 4);
      const A = 1.6 * (1 - steady * 0.8) * (reduce ? 0.3 : 1);
      aimX = aim.x + A * (Math.sin(t * 0.6) + Math.sin(t * 1.37 + 1.3) * 0.45 + Math.sin(t * 3.1) * 0.12);
      const hv = 450 / zoom;
      aim.y = clamp(aim.y, hv + 4, H - hv - 4);
      aimY = aim.y + A * (Math.sin(t * 0.83 + 2) * 0.8 + Math.sin(t * 1.9 + 0.5) * 0.35);

      recoilV += (-220 * recoil - 20 * recoilV) * dt;
      recoil += recoilV * dt;
      shake = Math.max(0, shake - dt * 4);
      flash = Math.max(0, flash - dt * 25);

      for (let i = pending.length - 1; i >= 0; i--) {
        if (t >= pending[i].at) {
          resolve(pending[i].x, pending[i].y);
          pending.splice(i, 1);
        }
      }

      for (const plate of plates) {
        plate.phiV += (-28 * Math.sin(plate.phi) - 1.2 * plate.phiV) * dt;
        plate.phi += plate.phiV * dt;
        plate.thV += (-30 * Math.sin(plate.th) - 1.5 * plate.thV) * dt;
        plate.th += plate.thV * dt;
      }

      for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i];
        if (s.fade) s.alpha -= dt * 1.5;
        if (s.alpha <= 0 || s.y > H + 200) {
          shards.splice(i, 1);
          continue;
        }
        if (s.state !== 0) {
          s.sq += (s.sqT - s.sq) * Math.min(1, dt * 10);
          continue;
        }
        s.vy += G * dt;
        s.vx *= 1 - 0.3 * dt;
        const y0 = s.y;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.z += s.vz * dt;
        s.rot += s.vr * dt;
        if (s.z > 30) {
          s.z = 30; // hits the backboard
          s.vz *= -0.3;
          s.vx *= 0.7;
        }
        const hy = surfaceHit(s.x, y0, s.y, s.z);
        if (hy !== null) {
          if (s.vy > 260) {
            sfx.tink(s.vy);
            s.y = hy - 0.5;
            s.vy *= -0.25;
            s.vx *= 0.5;
            s.vz *= 0.4;
            s.vr *= 0.4;
          } else {
            s.state = 1;
            s.y = hy + (hy === GROUND ? fx() * 10 : (fx() - 0.5) * 7) - s.h * 0.1;
            s.sqT = 0.25 + fx() * 0.35; // lying flat
          }
        }
      }

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        const g = p.k === "puff" ? -15 : p.k === "flash" ? 0 : p.k === "spark" ? 1500 : G;
        const dr = p.k === "puff" ? 2.5 : 0.6;
        p.vy += g * dt;
        p.vx *= 1 - dr * dt;
        p.vy *= 1 - dr * dt;
        const y0 = p.y;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.k === "drop" || p.k === "chip" || p.k === "glint") {
          const hy = surfaceHit(p.x, y0, p.y, 0);
          if (hy !== null) {
            if (p.k === "drop") {
              if (hy !== GROUND) stain(p.x, hy, p.c);
              p.life = 0;
            } else {
              p.y = hy - 0.2;
              p.vy *= -0.3;
              p.vx *= 0.5;
              p.vr *= 0.5;
            }
          }
        }
      }

      if (!respawnAt && !gone && bottles.every((b) => b.broken)) respawnAt = t + 3.5;
      if (respawnAt && t >= respawnAt) restock();
      for (const b of bottles) b.alpha = Math.min(1, b.alpha + dt * 1.5);

      if (t > rangeAt) {
        rangeAt = t + 0.08;
        const label = rangeLabel(aimX, aimY);
        if (label !== lastRange && rangeRef.current) rangeRef.current.textContent = lastRange = label;
      }
    };

    const drawWorld = () => {
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bgCanvas, BX0, 0, BW, H);
      ctx.drawImage(focus.c, F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0);

      for (const tier of [0, 1]) {
        ctx.save();
        ctx.beginPath();
        const top = tier === 0 ? BOARD.y0 : PLANKS[0].y1;
        ctx.rect(BOARD.x0, top, BOARD.x1 - BOARD.x0, PLANKS[tier].top - top);
        ctx.clip();
        for (const b of bottles) {
          if (b.broken || b.tier !== tier) continue;
          const s = b.shadow;
          ctx.globalAlpha = b.alpha;
          ctx.drawImage(s.c, b.x - s.ox + 16, b.y - s.oy + 7, s.w, s.h);
        }
        ctx.restore();
      }
      for (const b of bottles) {
        if (b.broken) continue;
        ctx.save();
        ctx.globalAlpha = b.alpha;
        ctx.translate(b.x + 4, b.y + 0.5);
        ctx.scale(1, 0.18);
        const r = b.maxR * 1.5;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, "rgba(25,15,5,0.45)");
        g.addColorStop(1, "rgba(25,15,5,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = b.alpha;
        ctx.drawImage(b.sprite.c, b.x - b.sprite.ox, b.y - b.sprite.oy, b.sprite.w, b.sprite.h);
        ctx.globalAlpha = 1;
      }

      // HOME and RESET plates on their chains
      for (const plate of plates) {
        ctx.save();
        ctx.translate(plate.cx, PLATE.pivot);
        ctx.rotate(plate.th);
        ctx.scale(1, Math.cos(plate.phi));
        for (const cx of [-30, 30]) {
          for (let y = 0; y < PLATE.chain + 4; y += 3.2) {
            const side = Math.round(y / 3.2) % 2 === 0;
            ctx.strokeStyle = "rgb(58,58,62)";
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.ellipse(cx, y + 1.6, side ? 1.3 : 0.45, 2, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = "rgba(200,200,205,0.5)";
            ctx.lineWidth = 0.3;
            ctx.beginPath();
            ctx.ellipse(cx - 0.3, y + 1.6, side ? 1.1 : 0.3, 1.8, 0, Math.PI, Math.PI * 1.6);
            ctx.stroke();
          }
        }
        const pd = PLATE.pad;
        ctx.drawImage(plate.art.c, -PLATE.w / 2 - pd, PLATE.chain - pd, PLATE.w + 2 * pd, PLATE.h + 2 * pd);
        const dark = Math.abs(Math.sin(plate.phi)) * 0.55;
        if (dark > 0.01) {
          ctx.fillStyle = `rgba(0,0,0,${dark})`;
          ctx.beginPath();
          ctx.roundRect(-PLATE.w / 2, PLATE.chain, PLATE.w, PLATE.h, 5);
          ctx.fill();
        }
        ctx.restore();
      }

      for (const s of shards) {
        const sc = clamp(1 - s.z * 0.0022, 0.9, 1.9);
        ctx.save();
        ctx.globalAlpha = clamp(s.alpha, 0, 1);
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.scale(sc, sc * s.sq);
        ctx.drawImage(s.c, s.ox, s.oy, s.w, s.h);
        ctx.restore();
      }

      for (const p of parts) {
        const k = p.life / p.max;
        if (p.k === "glint") {
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = col(p.c, k * (0.55 + 0.45 * Math.sin(t * 60 + p.x)));
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        } else if (p.k === "spark" || p.k === "drop") {
          ctx.globalCompositeOperation = p.k === "spark" ? "lighter" : "source-over";
          ctx.strokeStyle = col(p.c, p.k === "spark" ? k : 0.85);
          ctx.lineWidth = p.size;
          ctx.lineCap = "round";
          const tl = p.k === "spark" ? 0.018 : 0.01;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * tl, p.y - p.vy * tl);
          ctx.stroke();
        } else if (p.k === "chip") {
          ctx.globalCompositeOperation = "source-over";
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = col(p.c, Math.min(1, k * 3));
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
        } else {
          ctx.globalCompositeOperation = p.k === "flash" ? "lighter" : "source-over";
          const r = p.k === "flash" ? p.size : p.size + (1 - k) * p.grow;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          g.addColorStop(0, p.k === "flash" ? `rgba(255,250,235,${k})` : col(p.c, p.a * k));
          g.addColorStop(1, col(p.k === "flash" ? WHITE : p.c, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const drawReticle = (cx: number, cy: number, R: number) => {
      ctx.save();
      ctx.strokeStyle = GREEN;
      ctx.fillStyle = GREEN;
      ctx.shadowColor = "rgba(60,255,120,0.9)";
      ctx.shadowBlur = 7;
      ctx.lineCap = "butt";
      const line = (x0: number, y0: number, x1: number, y1: number, w: number) => {
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      };
      const gap = R * 0.03;
      line(cx - R, cy, cx - gap, cy, 1.1);
      line(cx + gap, cy, cx + R, cy, 1.1);
      line(cx, cy - R, cx, cy - gap, 1.1);
      line(cx, cy + gap, cx, cy + R, 1.1);
      const post = R * 0.52;
      line(cx - R, cy, cx - post, cy, 4.5);
      line(cx + post, cy, cx + R, cy, 4.5);
      line(cx, cy + post, cx, cy + R, 4.5);
      line(cx, cy - R, cx, cy - post, 4.5);
      const step = R * 0.09;
      for (let i = 1; i <= 5; i++) {
        const d = i * step;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          ctx.beginPath();
          ctx.arc(cx + dx * d, cy + dy * d, 2.1, 0, Math.PI * 2);
          ctx.fill();
          const hd = d - step / 2;
          const tick = 3.5;
          if (dx) line(cx + dx * hd, cy - tick, cx + dx * hd, cy + tick, 1);
          else line(cx - tick, cy + dy * hd, cx + tick, cy + dy * hd, 1);
        }
      }
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.018, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const render = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, vw, vh);
      const cx = vw / 2;
      const cy = vh / 2;
      const e = 1 - (1 - open) ** 3;
      const Ro = R0 * e;
      if (Ro < 4) return;
      const s = scale();
      const sx = (fx() - 0.5) * 10 * shake;
      const sy = (fx() - 0.5) * 10 * shake;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, Ro, 0, Math.PI * 2);
      ctx.clip();
      ctx.save();
      ctx.translate(cx + sx, cy + sy + recoil);
      ctx.scale(s, s);
      ctx.translate(-aimX, -aimY);
      drawWorld();
      ctx.restore();

      if (flash > 0) {
        ctx.fillStyle = `rgba(255,220,170,${0.16 * flash})`;
        ctx.fillRect(cx - Ro, cy - Ro, Ro * 2, Ro * 2);
      }
      // eye-relief shadow: slides opposite to the swing, kicks with recoil
      const ex = clamp(-velX * s * 0.05, -R0 * 0.09, R0 * 0.09);
      const ey = clamp(-velY * s * 0.05 + recoil * 0.5, -R0 * 0.12, R0 * 0.12);
      const v = ctx.createRadialGradient(cx + ex, cy + ey, Ro * 0.62, cx + ex, cy + ey, Ro * 1.02);
      v.addColorStop(0, "rgba(0,0,0,0)");
      v.addColorStop(0.55, "rgba(0,0,0,0.22)");
      v.addColorStop(1, "rgba(0,0,0,0.96)");
      ctx.fillStyle = v;
      ctx.fillRect(cx - Ro - 20, cy - Ro - 20, Ro * 2 + 40, Ro * 2 + 40);
      const glare = ctx.createRadialGradient(cx - Ro * 0.45, cy - Ro * 0.5, 0, cx - Ro * 0.45, cy - Ro * 0.5, Ro * 0.6);
      glare.addColorStop(0, "rgba(220,240,255,0.06)");
      glare.addColorStop(1, "rgba(220,240,255,0)");
      ctx.fillStyle = glare;
      ctx.fillRect(cx - Ro, cy - Ro, Ro * 2, Ro * 2);
      drawReticle(cx, cy + recoil * 0.15, Ro);
      ctx.restore();

      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(70,110,255,0.10)";
      ctx.beginPath();
      ctx.arc(cx, cy, Ro - 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.beginPath();
      ctx.arc(cx, cy, Ro + 3, 0, Math.PI * 2);
      ctx.stroke();
    };

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000));
      last = now;
      update(dt);
      render();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      timers.forEach(clearTimeout);
      root.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      root.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [homeHref, zoom0, targetsKey]);

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      aria-label="Mira telescópica. Mueve para apuntar, haz clic o pulsa Espacio para disparar. Cada botella es una sección del CV. Dispara a la placa INICIO para volver o a RESET para reponer las botellas."
      className={cn("relative h-dvh w-full cursor-none touch-none select-none overflow-hidden bg-black outline-none", className)}
      style={{ containerType: "size" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
      <a
        href={homeHref}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-14 focus:z-20 focus:rounded focus:bg-black focus:px-3 focus:py-2 focus:font-sans focus:text-sm focus:text-[rgb(98,255,143)]"
      >
        Volver al inicio
      </a>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-6 p-5 font-sans text-[13px] leading-relaxed text-[rgb(98,255,143)]/75 tabular-nums">
        <div className="flex flex-col">
          <span>
            Mag <span ref={magRef}>1.8×</span>
          </span>
          <span>Botellas en pie {left}</span>
        </div>
        <ul className="m-0 flex list-none flex-col items-end p-0 text-right">
          <li>Cada botella es una sección de mi CV: dispárale para verla</li>
          <li>Placa INICIO para volver · RESET para reponer</li>
          <li>Rueda para zoom, Shift para estabilizar</li>
        </ul>
      </div>

      <span
        ref={rangeRef}
        className="pointer-events-none absolute font-sans text-[12px] font-medium tabular-nums text-[rgb(98,255,143)] [text-shadow:0_0_2px_rgba(0,0,0,0.95),0_0_4px_rgba(0,0,0,0.8),0_0_8px_rgba(60,255,120,0.6)]"
        style={{ left: "calc(50% + 46cqmin * 0.12)", top: "calc(50% + 46cqmin * 0.1)" }}
      />

      {children && <div className="absolute inset-x-0 bottom-0 flex justify-center p-5 font-sans">{children}</div>}

      <div className={cn("pointer-events-none absolute inset-0 bg-black transition-opacity duration-700", leaving ? "opacity-100" : "opacity-0")} />
    </div>
  );
}
