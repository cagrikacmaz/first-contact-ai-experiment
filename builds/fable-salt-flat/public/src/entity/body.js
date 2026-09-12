// The body of the thing in the salt: a dendritic lattice of nodes under the water, pulses of light that
// travel along it, and translucent spires it can raise from the crust. This module knows nothing about
// intent; it only renders and plays what the mind asks for.

import * as THREE from 'three';
import { clamp, lerp, damp, smoothstep, mulberry32 } from '../util.js';

const MAX_NODES = 1000;
const MAX_EDGES = 1400;
const MAX_SPIRES = 72;

const NODE_VERT = /* glsl */`
  attribute float aLight; attribute float aWarm;
  uniform float uPixelScale; uniform float uAgit; uniform float uWarm;
  uniform vec3 uColor, uColorAgit, uColorWarm;
  varying vec3 vColor; varying float vLight;
  void main(){
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float l = aLight;
    vLight = l;
    float w = clamp(uWarm + aWarm, 0.0, 1.0);
    vColor = mix(mix(uColor, uColorAgit, uAgit), uColorWarm, w);
    float sz = (4.0 + 9.0 * min(l, 1.5)) * uPixelScale;
    gl_PointSize = clamp(sz * 70.0 / max(-mv.z, 1.0), 2.0, 90.0 * uPixelScale);
    gl_Position = projectionMatrix * mv;
  }
`;
const NODE_FRAG = /* glsl */`
  varying vec3 vColor; varying float vLight;
  void main(){
    vec2 c = gl_PointCoord - 0.5; float r = length(c) * 2.0;
    float core = smoothstep(0.55, 0.0, r);
    float halo = smoothstep(1.0, 0.2, r) * 0.35;
    float a = (core + halo) * vLight;
    if (a < 0.003) discard;
    gl_FragColor = vec4(vColor * a * 1.1 + vec3(core * vLight * 0.22), a);
  }
`;
const EDGE_VERT = /* glsl */`
  attribute float aLight; attribute float aWarm;
  uniform float uAgit; uniform float uWarm; uniform vec3 uColor, uColorAgit, uColorWarm;
  varying vec3 vColor; varying float vLight;
  void main(){
    vLight = aLight;
    float w = clamp(uWarm + aWarm, 0.0, 1.0);
    vColor = mix(mix(uColor, uColorAgit, uAgit), uColorWarm, w);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const EDGE_FRAG = /* glsl */`
  varying vec3 vColor; varying float vLight;
  void main(){ if (vLight < 0.004) discard; gl_FragColor = vec4(vColor * vLight * 0.9, vLight * 0.7); }
`;

const SPIRE_VERT = /* glsl */`
  attribute float aGlow; attribute float aWarm;
  varying vec3 vN; varying vec3 vW; varying float vGlow; varying float vH; varying float vWarm;
  void main(){
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    vGlow = aGlow; vWarm = aWarm; vH = clamp(position.y, 0.0, 1.0);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const SPIRE_FRAG = /* glsl */`
  uniform vec3 uCamPos; uniform vec3 uColor, uColorAgit, uColorWarm; uniform float uAgit, uWarm;
  uniform vec3 uLanternPos; uniform float uLanternI; uniform vec3 uAmbient; uniform vec3 uFogColor; uniform float uFogDensity;
  varying vec3 vN; varying vec3 vW; varying float vGlow; varying float vH; varying float vWarm;
  void main(){
    vec3 N = normalize(vN);
    vec3 V = normalize(uCamPos - vW);
    float ndv = max(dot(N, V), 0.0);
    float rim = pow(1.0 - ndv, 2.6);
    vec3 c = mix(mix(uColor, uColorAgit, uAgit), uColorWarm, clamp(uWarm + vWarm, 0.0, 1.0));
    vec3 ld = uLanternPos - vW; float ld2 = dot(ld, ld);
    float lant = uLanternI * max(dot(N, normalize(ld)), 0.0) / (1.0 + ld2 * 0.25);
    vec3 base = vec3(0.80, 0.84, 0.88) * (uAmbient * 1.4 + vec3(1.0, 0.75, 0.45) * lant * 0.8);
    vec3 inner = c * vGlow * (0.22 + 0.5 * (1.0 - vH)) * (0.45 + rim * 0.9);
    vec3 col = base * (0.5 + 0.5 * ndv) + inner + c * rim * 0.12;
    float alpha = clamp(0.5 + rim * 0.4 + vGlow * 0.25 + lant * 0.5, 0.0, 1.0);
    float dist = length(uCamPos - vW);
    float f = 1.0 - exp(-dist * dist * uFogDensity * uFogDensity);
    col = mix(col, uFogColor, f);
    gl_FragColor = vec4(col, alpha);
  }
`;

function crystalGeometry() {
  const sides = 5, apex = [0, 1, 0], bottom = [0, -0.3, 0];
  const ring = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    ring.push([Math.cos(a) * (0.8 + 0.4 * ((i * 7) % 3) / 2), 0.02, Math.sin(a) * (0.8 + 0.4 * ((i * 5) % 3) / 2)]);
  }
  const pos = [];
  const tri = (a, b, c) => pos.push(...a, ...b, ...c);
  for (let i = 0; i < sides; i++) {
    const a = ring[i], b = ring[(i + 1) % sides];
    tri(apex, b, a);
    tri(bottom, a, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

export class Body {
  constructor(scene, audio, origin, seed = 1) {
    this.scene = scene;
    this.audio = audio;
    this.origin = origin.clone();
    this.time = 0;
    this.rng = mulberry32(seed);

    // node storage
    this.count = 0;
    this.x = new Float32Array(MAX_NODES);
    this.z = new Float32Array(MAX_NODES);
    this.aliveT = new Float32Array(MAX_NODES);   // target aliveness
    this.alive = new Float32Array(MAX_NODES);    // smoothed
    this.light = new Float32Array(MAX_NODES);    // smoothed light
    this.phase = new Float32Array(MAX_NODES);
    this.pitch = new Int16Array(MAX_NODES);
    this.kind = new Uint8Array(MAX_NODES);       // 0 lattice, 1 tendril, 2 figure
    this.warm = new Float32Array(MAX_NODES);
    this.adj = Array.from({ length: MAX_NODES }, () => []);
    this.edges = [];
    this._bfsCache = new Map();

    // behaviour state
    this.focus = origin.clone();
    this.presence = 0;          // 0..1 how much of it is here
    this.presenceRadius = 22;   // metres
    this.agit = 0;              // colour state
    this.warmth = 0;
    this.breathRate = 0.7;
    this.flickerUntil = -1;
    this.waves = [];
    this.beats = [];            // scheduled beats
    this.lastBeatEnd = -1;
    this.tendrils = [];         // { nodes: [], born, life }
    this.spires = [];           // { node, h, targetH, w, glow, glowT, active, sharp, tag }

    this._grow();
    this._buildMeshes();
  }

  // ------------------------------------------------------------ lattice growth
  _addNode(x, z, kind = 0) {
    if (this.count >= MAX_NODES) return -1;
    const i = this.count++;
    this.x[i] = x; this.z[i] = z; this.kind[i] = kind;
    this.phase[i] = this.rng() * Math.PI * 2;
    this.pitch[i] = Math.floor(this.rng() * 12);
    this.aliveT[i] = 0; this.alive[i] = 0; this.light[i] = 0; this.warm[i] = 0;
    this._bfsCache.clear();
    return i;
  }

  _link(a, b) {
    if (a < 0 || b < 0 || a === b) return;
    if (this.adj[a].includes(b)) return;
    this.adj[a].push(b); this.adj[b].push(a);
    this.edges.push(a, b);
    this._bfsCache.clear();
  }

  _grow() {
    const rng = this.rng;
    const root = this._addNode(this.origin.x, this.origin.z, 0);
    const branches = 7;
    const walk = (from, angle, steps, depth) => {
      let prev = from, x = this.x[from], z = this.z[from], a = angle;
      for (let s = 0; s < steps; s++) {
        a += (rng() - 0.5) * 0.9;
        const len = 5 + rng() * 4;
        x += Math.cos(a) * len; z += Math.sin(a) * len;
        const n = this._addNode(x, z, 0);
        if (n < 0) return;
        this._link(prev, n);
        prev = n;
        if (depth < 3 && rng() < 0.22) walk(n, a + (rng() < 0.5 ? 1 : -1) * (0.6 + rng() * 0.8), Math.floor(steps * 0.55), depth + 1);
      }
    };
    for (let b = 0; b < branches; b++) {
      walk(root, (b / branches) * Math.PI * 2 + rng() * 0.4, 13 + Math.floor(rng() * 5), 0);
    }
    // cross-links between close nodes make it a lattice rather than a tree
    const n = this.count;
    for (let i = 0; i < n; i++) {
      let links = 0;
      for (let j = i + 1; j < n && links < 2; j++) {
        const dx = this.x[i] - this.x[j], dz = this.z[i] - this.z[j];
        if (dx * dx + dz * dz < 36 && !this.adj[i].includes(j) && this.adj[i].length < 4 && this.adj[j].length < 4) { this._link(i, j); links++; }
      }
    }
    this.latticeCount = this.count;
  }

  _buildMeshes() {
    // nodes
    const pos = new Float32Array(MAX_NODES * 3);
    this.nodeLightAttr = new THREE.BufferAttribute(new Float32Array(MAX_NODES), 1);
    this.nodeWarmAttr = new THREE.BufferAttribute(new Float32Array(MAX_NODES), 1);
    this.nodePosAttr = new THREE.BufferAttribute(pos, 3);
    const ng = new THREE.BufferGeometry();
    ng.setAttribute('position', this.nodePosAttr);
    ng.setAttribute('aLight', this.nodeLightAttr);
    ng.setAttribute('aWarm', this.nodeWarmAttr);
    this.sharedUniforms = {
      uColor: { value: new THREE.Color(0.35, 0.88, 1.0) },
      uColorAgit: { value: new THREE.Color(1.0, 0.28, 0.40) },
      uColorWarm: { value: new THREE.Color(1.0, 0.86, 0.58) },
      uAgit: { value: 0 }, uWarm: { value: 0 },
    };
    this.nodeMat = new THREE.ShaderMaterial({
      uniforms: { ...this.sharedUniforms, uPixelScale: { value: 1 } },
      vertexShader: NODE_VERT, fragmentShader: NODE_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.nodeMesh = new THREE.Points(ng, this.nodeMat);
    this.nodeMesh.frustumCulled = false;
    this.scene.add(this.nodeMesh);

    // edges
    this.edgePosAttr = new THREE.BufferAttribute(new Float32Array(MAX_EDGES * 2 * 3), 3);
    this.edgeLightAttr = new THREE.BufferAttribute(new Float32Array(MAX_EDGES * 2), 1);
    this.edgeWarmAttr = new THREE.BufferAttribute(new Float32Array(MAX_EDGES * 2), 1);
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', this.edgePosAttr);
    eg.setAttribute('aLight', this.edgeLightAttr);
    eg.setAttribute('aWarm', this.edgeWarmAttr);
    this.edgeMat = new THREE.ShaderMaterial({
      uniforms: this.sharedUniforms, vertexShader: EDGE_VERT, fragmentShader: EDGE_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.edgeMesh = new THREE.LineSegments(eg, this.edgeMat);
    this.edgeMesh.frustumCulled = false;
    this.scene.add(this.edgeMesh);

    // spires
    this.spireGlowAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_SPIRES), 1);
    this.spireWarmAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_SPIRES), 1);
    const sg = crystalGeometry();
    sg.setAttribute('aGlow', this.spireGlowAttr);
    sg.setAttribute('aWarm', this.spireWarmAttr);
    this.spireMat = new THREE.ShaderMaterial({
      uniforms: {
        ...this.sharedUniforms,
        uCamPos: { value: new THREE.Vector3() },
        uLanternPos: { value: new THREE.Vector3() }, uLanternI: { value: 0 },
        uAmbient: { value: new THREE.Color(0.05, 0.05, 0.07) },
        uFogColor: { value: new THREE.Color(0.03, 0.03, 0.05) }, uFogDensity: { value: 0.0009 },
      },
      vertexShader: SPIRE_VERT, fragmentShader: SPIRE_FRAG, transparent: true, depthWrite: true,
    });
    this.spireMesh = new THREE.InstancedMesh(sg, this.spireMat, MAX_SPIRES);
    this.spireMesh.frustumCulled = false;
    this._m4 = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._v3 = new THREE.Vector3(); this._s3 = new THREE.Vector3(); this._sc = new THREE.Vector3();
    for (let i = 0; i < MAX_SPIRES; i++) {
      this.spires.push({ node: -1, x: 0, z: 0, h: 0, targetH: 0, w: 0.35, rot: this.rng() * 6.28, glow: 0, glowT: 0, active: false, sharp: 0, tag: null, born: 0 });
      this._writeSpire(i);
    }
    this.scene.add(this.spireMesh);
    this._syncStatic();
  }

  _syncStatic() {
    const p = this.nodePosAttr.array;
    for (let i = 0; i < this.count; i++) { p[i * 3] = this.x[i]; p[i * 3 + 1] = 0.06; p[i * 3 + 2] = this.z[i]; }
    this.nodePosAttr.needsUpdate = true;
    this.nodeMesh.geometry.setDrawRange(0, this.count);
    const e = this.edgePosAttr.array;
    const ne = Math.min(this.edges.length / 2, MAX_EDGES);
    for (let k = 0; k < ne; k++) {
      const a = this.edges[k * 2], b = this.edges[k * 2 + 1];
      e[k * 6] = this.x[a]; e[k * 6 + 1] = 0.04; e[k * 6 + 2] = this.z[a];
      e[k * 6 + 3] = this.x[b]; e[k * 6 + 4] = 0.04; e[k * 6 + 5] = this.z[b];
    }
    this.edgePosAttr.needsUpdate = true;
    this.edgeMesh.geometry.setDrawRange(0, ne * 2);
    this._staticDirty = false;
  }

  // ------------------------------------------------------------ queries
  nearestNode(x, z, aliveOnly = false, minAlive = 0.15) {
    let best = -1, bd = Infinity;
    for (let i = 0; i < this.count; i++) {
      if (aliveOnly && this.alive[i] < minAlive) continue;
      const dx = this.x[i] - x, dz = this.z[i] - z, d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  nodeDistance(i, x, z) { return Math.hypot(this.x[i] - x, this.z[i] - z); }

  _bfs(src) {
    let hd = this._bfsCache.get(src);
    if (hd) return hd;
    hd = new Int16Array(MAX_NODES).fill(-1);
    const q = [src]; hd[src] = 0;
    for (let qi = 0; qi < q.length; qi++) {
      const n = q[qi];
      for (const m of this.adj[n]) if (hd[m] < 0) { hd[m] = hd[n] + 1; q.push(m); }
    }
    if (this._bfsCache.size > 40) this._bfsCache.clear();
    this._bfsCache.set(src, hd);
    return hd;
  }

  // ------------------------------------------------------------ actions
  // A pulse of light born at a node, travelling outward along the lattice.
  launchWave(src, { hops = 4, amp = 1, speed = 4.5, sign = 1, tone = true, dur = 1.6, vol = 1 } = {}) {
    if (src < 0 || src >= this.count) return;
    this.waves.push({ src, t0: this.time, hops, amp, speed, sign, hd: this._bfs(src) });
    if (tone && sign > 0) this.audio.tone(this.x[src], this.z[src], this.pitch[src], { agitation: this.agit, warmth: this.warmth, dur, vol });
    if (this.waves.length > 40) this.waves.splice(0, this.waves.length - 40);
  }

  // Schedule a rhythm. intervals = seconds between beats; a phrase of n beats has n-1 intervals.
  playPhrase(intervals, { src = -1, hops = 4, amp = 1, delay = 0, spires = false, vol = 1 } = {}) {
    const source = src >= 0 ? src : this.focusNode();
    let t = this.time + delay;
    const beats = [{ t, src: source, hops, amp, spires, vol }];
    for (const iv of intervals) { t += Math.max(0.12, iv); beats.push({ t, src: source, hops, amp, spires, vol }); }
    this.beats.push(...beats);
    this.beats.sort((a, b) => a.t - b.t);
    this.lastBeatEnd = Math.max(this.lastBeatEnd, t + 0.6);
  }

  isPlaying() { return this.time < this.lastBeatEnd; }
  stopUtterance() { this.beats.length = 0; this.lastBeatEnd = -1; }

  focusNode() { const n = this.nearestNode(this.focus.x, this.focus.z, true, 0.05); return n >= 0 ? n : this.nearestNode(this.focus.x, this.focus.z); }

  // Grow a line of temporary nodes from the nearest living node toward a point.
  growTendril(tx, tz, { stopShort = 2.2, life = 25, from = -1 } = {}) {
    const start = from >= 0 ? from : this.nearestNode(tx, tz, true, 0.2);
    if (start < 0) return null;
    const sx = this.x[start], sz = this.z[start];
    const dx = tx - sx, dz = tz - sz, d = Math.hypot(dx, dz);
    if (d < stopShort + 1) return { nodes: [start], end: start, born: this.time, life };
    const n = clamp(Math.round((d - stopShort) / 2.6), 1, 40);
    const nodes = [start];
    const px = -dz / d, pz = dx / d;
    const bend = (this.rng() - 0.5) * 3;
    let prev = start;
    for (let i = 1; i <= n; i++) {
      const f = i / n;
      const along = f * (d - stopShort);
      const side = Math.sin(f * Math.PI) * bend;
      const nx = sx + (dx / d) * along + px * side, nz = sz + (dz / d) * along + pz * side;
      const idx = this._addNode(nx, nz, 1);
      if (idx < 0) break;
      this.aliveT[idx] = 1; this.alive[idx] = 0.0;
      this._link(prev, idx);
      prev = idx; nodes.push(idx);
    }
    const t = { nodes, end: prev, born: this.time, life };
    this.tendrils.push(t);
    this._staticDirty = true;
    return t;
  }

  fadeTendrils() { for (const t of this.tendrils) t.life = 0; }

  // Raise a spire at a position (snaps to the nearest node's position, or exact if exact=true).
  raiseSpire(x, z, { height = 2.5, width = 0.35, sharp = 0, glow = 0.8, tag = null, exact = false } = {}) {
    let s = this.spires.find((p) => !p.active);
    if (!s) s = this.spires.reduce((a, b) => (a.born < b.born ? a : b));
    const node = exact ? -1 : this.nearestNode(x, z);
    s.active = true; s.node = node;
    s.x = exact || node < 0 ? x : this.x[node]; s.z = exact || node < 0 ? z : this.z[node];
    s.h = 0.02; s.targetH = height; s.w = width; s.sharp = sharp; s.glowT = glow; s.glow = 0; s.tag = tag; s.born = this.time;
    s.rot = this.rng() * 6.28;
    return s;
  }

  sinkSpires({ near = null, radius = 1e9, tag = undefined } = {}) {
    for (const s of this.spires) {
      if (!s.active) continue;
      if (tag !== undefined && s.tag !== tag) continue;
      if (near && Math.hypot(s.x - near.x, s.z - near.z) > radius) continue;
      s.targetH = 0;
    }
  }

  spiresNear(x, z, r) { return this.spires.filter((s) => s.active && s.h > 0.5 && Math.hypot(s.x - x, s.z - z) < r); }

  shatterSpire(s) {
    this.audio.crack(s.x, s.z);
    s.targetH = 0; s.h *= 0.4; s.glowT = 0;
    const n = this.nearestNode(s.x, s.z);
    if (n >= 0) this.launchWave(n, { hops: 5, amp: 1.2, sign: -1, speed: 12, tone: false });
  }

  // A darkening that spreads from a point: the flat flinching away.
  flinchFrom(x, z) {
    const n = this.nearestNode(x, z, true, 0.05);
    if (n >= 0) this.launchWave(n, { hops: 9, amp: 1.5, sign: -1, speed: 10, tone: false });
    this.audio.flinch();
    this.sinkSpires({ near: { x, z }, radius: 30 });
  }

  flicker(seconds) { this.flickerUntil = this.time + seconds; }

  // Every living node answers at once.
  ringAll(amp = 1.4) {
    const n = this.focusNode();
    this.launchWave(n, { hops: 60, amp, speed: 9, dur: 3.5 });
  }

  // A cluster of spires the height of a person, standing where asked.
  buildFigure(x, z, facing) {
    const parts = [
      [0, 0, 1.75, 0.18], [0.22, 0.05, 1.05, 0.14], [-0.22, 0.05, 1.05, 0.14], [0.16, -0.1, 1.5, 0.12], [-0.16, -0.1, 1.5, 0.12],
      [0.4, 0.15, 0.7, 0.1], [-0.4, 0.15, 0.7, 0.1], [0.05, 0.25, 1.35, 0.12], [-0.05, -0.25, 1.35, 0.12],
    ];
    const c = Math.cos(facing), s = Math.sin(facing);
    const center = this._addNode(x, z, 2);
    if (center >= 0) { this.warm[center] = 1; this.aliveT[center] = 1; const near = this.nearestNode(x, z, true, 0.1); if (near >= 0 && near !== center) this._link(near, center); }
    for (const [ox, oz, h, w] of parts) {
      const wx = x + ox * c - oz * s, wz = z + ox * s + oz * c;
      const sp = this.raiseSpire(wx, wz, { height: h, width: w, glow: 0.9, tag: 'figure', exact: true });
      sp.warm = 1;
    }
    this._staticDirty = true;
    return center;
  }

  // ------------------------------------------------------------ per-frame
  update(dt, camPos, env) {
    this.time += dt;
    const t = this.time;

    // colour state
    this.sharedUniforms.uAgit.value = damp(this.sharedUniforms.uAgit.value, this.agit, 2, dt);
    this.sharedUniforms.uWarm.value = damp(this.sharedUniforms.uWarm.value, this.warmth, 1, dt);
    if (env) {
      this.spireMat.uniforms.uCamPos.value.copy(camPos);
      this.spireMat.uniforms.uLanternPos.value.copy(env.lanternPos);
      this.spireMat.uniforms.uLanternI.value = env.lanternI;
      this.spireMat.uniforms.uAmbient.value.copy(env.ambient);
      this.spireMat.uniforms.uFogColor.value.copy(env.fogColor);
    }

    // scheduled beats
    while (this.beats.length && this.beats[0].t <= t) {
      const b = this.beats.shift();
      this.launchWave(b.src, { hops: b.hops, amp: b.amp, vol: b.vol });
      if (b.spires) {
        const s = this.raiseSpire(this.x[b.src] + (this.rng() - 0.5) * 3, this.z[b.src] + (this.rng() - 0.5) * 3, { height: 1.2 + this.rng() * 1.5, glow: 1, tag: 'beat' });
        s.life = 2.2;
      }
    }

    // tendrils age
    for (let i = this.tendrils.length - 1; i >= 0; i--) {
      const tr = this.tendrils[i];
      if (t - tr.born > tr.life) {
        for (const n of tr.nodes) if (this.kind[n] === 1) this.aliveT[n] = 0;
        this.tendrils.splice(i, 1);
      }
    }

    // aliveness: presence around the focus
    const fx = this.focus.x, fz = this.focus.z, R = this.presenceRadius;
    const flick = t < this.flickerUntil ? (0.25 + Math.random() * 1.3) : 1;
    const breath = this.breathRate;
    for (let i = 0; i < this.count; i++) {
      let target;
      if (this.kind[i] === 1) target = this.aliveT[i];
      else if (this.kind[i] === 2) target = this.aliveT[i] * this.presence;
      else {
        const d = Math.hypot(this.x[i] - fx, this.z[i] - fz);
        target = smoothstep(R, R * 0.45, d) * this.presence;
      }
      this.alive[i] = damp(this.alive[i], target, this.kind[i] === 1 ? 4 : 0.9, dt);
    }

    // light = breathing base + waves
    const L = this.nodeLightAttr.array;
    for (let i = 0; i < this.count; i++) {
      const a = this.alive[i];
      L[i] = a * (0.16 + 0.09 * Math.sin(t * breath + this.phase[i])) * flick;
    }
    for (let w = this.waves.length - 1; w >= 0; w--) {
      const wv = this.waves[w];
      const r = (t - wv.t0) * wv.speed;
      if (r > wv.hops + 3) { this.waves.splice(w, 1); continue; }
      const hd = wv.hd;
      const fade = 1 - smoothstep(wv.hops - 1, wv.hops + 2, r);
      for (let i = 0; i < this.count; i++) {
        const h = hd[i];
        if (h < 0 || h > wv.hops + 2) continue;
        const dd = h - r;
        const g = Math.exp(-dd * dd * 1.2) * wv.amp * fade;
        if (g < 0.002) continue;
        const reach = wv.sign > 0 ? Math.max(this.alive[i], 0.35) : 1;
        L[i] += g * reach * wv.sign * 1.1;
      }
    }
    for (let i = 0; i < this.count; i++) {
      const target = clamp(L[i], 0, 2.2);
      this.light[i] = damp(this.light[i], target, 14, dt);
      L[i] = this.light[i];
    }
    this.nodeLightAttr.needsUpdate = true;
    const W = this.nodeWarmAttr.array;
    for (let i = 0; i < this.count; i++) W[i] = this.warm[i];
    this.nodeWarmAttr.needsUpdate = true;

    // edges
    const EL = this.edgeLightAttr.array, EW = this.edgeWarmAttr.array;
    const ne = Math.min(this.edges.length / 2, MAX_EDGES);
    for (let k = 0; k < ne; k++) {
      const a = this.edges[k * 2], b = this.edges[k * 2 + 1];
      const la = this.light[a], lb = this.light[b];
      EL[k * 2] = Math.min(la, lb) * 0.5 + Math.max(la, lb) * 0.25;
      EL[k * 2 + 1] = EL[k * 2];
      EW[k * 2] = this.warm[a]; EW[k * 2 + 1] = this.warm[b];
    }
    this.edgeLightAttr.needsUpdate = true; this.edgeWarmAttr.needsUpdate = true;
    if (this._staticDirty) this._syncStatic();

    // spires
    for (let i = 0; i < MAX_SPIRES; i++) {
      const s = this.spires[i];
      if (!s.active) continue;
      if (s.life !== undefined && t - s.born > s.life) { s.targetH = 0; }
      const rate = s.targetH > s.h ? (1.2 + s.sharp * 3) : 2.2;
      s.h = damp(s.h, s.targetH, rate, dt);
      const nodeL = s.node >= 0 ? this.light[s.node] : (this.presence * 0.4 + 0.3);
      s.glow = damp(s.glow, s.glowT * (0.35 + nodeL) * flick, 6, dt);
      if (s.targetH <= 0.001 && s.h < 0.03) { s.active = false; s.h = 0; s.life = undefined; s.warm = 0; }
      this._writeSpire(i);
    }
    this.spireMesh.instanceMatrix.needsUpdate = true;
    this.spireGlowAttr.needsUpdate = true; this.spireWarmAttr.needsUpdate = true;
  }

  _writeSpire(i) {
    const s = this.spires[i];
    const h = Math.max(s.h, 0.0001);
    const w = s.w * (0.6 + 0.4 * Math.min(h / Math.max(s.targetH, 0.01), 1)) * (1 - s.sharp * 0.4);
    this._q.setFromAxisAngle(this._v3.set(0, 1, 0), s.rot);
    this._m4.compose(this._s3.set(s.x, 0, s.z), this._q, this._sc.set(s.active ? w : 0.0001, h, s.active ? w : 0.0001));
    this.spireMesh.setMatrixAt(i, this._m4);
    this.spireGlowAttr.array[i] = s.active ? s.glow : 0;
    this.spireWarmAttr.array[i] = s.warm || 0;
  }

  // Brightest nodes, for lighting the crust from beneath.
  nodeLights(max = 28) {
    const out = [];
    for (let i = 0; i < this.count; i++) {
      const l = this.light[i];
      if (l > 0.05) out.push({ x: this.x[i], z: this.z[i], i: l, w: clamp(this.warmth + this.warm[i], 0, 1) });
    }
    out.sort((a, b) => b.i - a.i);
    return out.slice(0, max);
  }

  setPixelScale(v) { this.nodeMat.uniforms.uPixelScale.value = v; }
}
