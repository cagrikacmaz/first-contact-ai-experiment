// Small shared helpers.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x, y) {
  let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

// Value noise (2D), used for the mountain ridge and wetness lookups on the JS side.
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export function fbm(x, y, oct = 4) {
  let s = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f, y * f); amp *= 0.5; f *= 2.07; }
  return s;
}

export class Emitter {
  constructor() { this.m = new Map(); }
  on(type, fn) { (this.m.get(type) || this.m.set(type, []).get(type)).push(fn); return () => this.off(type, fn); }
  off(type, fn) { const l = this.m.get(type); if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } }
  emit(type, payload) { const l = this.m.get(type); if (l) for (const fn of l.slice()) fn(payload); }
}

export function fmtTime(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Phrase similarity: intervals are gaps between beats (seconds). Returns 0..1.
export function phraseSimilarity(a, b) {
  const ca = a.length + 1, cb = b.length + 1;
  if (ca === 1 && cb === 1) return 1;
  const countScore = 1 - Math.abs(ca - cb) / Math.max(ca, cb);
  if (a.length === 0 || b.length === 0) return countScore * 0.6;
  const na = normalize(a), nb = normalize(b);
  const n = Math.min(na.length, nb.length);
  let diff = 0;
  for (let i = 0; i < n; i++) diff += Math.abs(na[i] - nb[i]);
  const rhythmScore = Math.max(0, 1 - diff / n * 1.6);
  return countScore * 0.55 + rhythmScore * 0.45;
}

function normalize(iv) {
  const mean = iv.reduce((s, v) => s + v, 0) / iv.length || 1;
  return iv.map((v) => v / mean);
}

// Irregularity of a rhythm: 0 for perfectly even, higher for chaotic.
export function irregularity(iv) {
  if (iv.length < 2) return 0;
  const n = normalize(iv);
  let s = 0;
  for (let i = 1; i < n.length; i++) s += Math.abs(n[i] - n[i - 1]);
  return s / (n.length - 1);
}
