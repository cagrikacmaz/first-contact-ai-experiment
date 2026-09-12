// The place: a flooded salt flat at night. Sky, stars, moon, a distant ridge, and a mirror of shallow water
// over salt crust that shows ripples and the light of whatever lives beneath it.

import * as THREE from 'three';
import { clamp, lerp, smoothstep, fbm, mulberry32 } from './util.js';

const NODE_LIGHTS = 28;
const RIPPLES = 20;

// ---------------------------------------------------------------- sky keyframes
const SKY_KEYS = [
  // t, horizon, zenith, duskAmt, stars, ambient, fogColor, moonI
  { t: 0.00, horizon: [0.62, 0.30, 0.18], zenith: [0.03, 0.05, 0.14], dusk: 1.0, stars: 0.08, amb: 0.10, fog: [0.16, 0.10, 0.10], moon: 0.0 },
  { t: 0.12, horizon: [0.16, 0.10, 0.12], zenith: [0.010, 0.014, 0.040], dusk: 0.35, stars: 0.75, amb: 0.045, fog: [0.045, 0.036, 0.050], moon: 0.15 },
  { t: 0.30, horizon: [0.07, 0.08, 0.12], zenith: [0.005, 0.007, 0.018], dusk: 0.0, stars: 1.0, amb: 0.045, fog: [0.024, 0.026, 0.038], moon: 0.6 },
  { t: 0.80, horizon: [0.065, 0.075, 0.115], zenith: [0.005, 0.007, 0.018], dusk: 0.0, stars: 1.0, amb: 0.045, fog: [0.022, 0.025, 0.036], moon: 0.7 },
  { t: 0.92, horizon: [0.26, 0.21, 0.24], zenith: [0.03, 0.05, 0.11], dusk: 0.0, stars: 0.5, amb: 0.08, fog: [0.10, 0.09, 0.11], moon: 0.3 },
  { t: 1.00, horizon: [0.70, 0.56, 0.48], zenith: [0.16, 0.26, 0.44], dusk: 0.0, stars: 0.0, amb: 0.30, fog: [0.42, 0.40, 0.41], moon: 0.0 },
];

function skyAt(t) {
  t = clamp(t, 0, 1);
  let a = SKY_KEYS[0], b = SKY_KEYS[SKY_KEYS.length - 1];
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    if (t >= SKY_KEYS[i].t && t <= SKY_KEYS[i + 1].t) { a = SKY_KEYS[i]; b = SKY_KEYS[i + 1]; break; }
  }
  const f = smoothstep(a.t, b.t, t);
  const mixv = (u, v) => u.map((x, i) => lerp(x, v[i], f));
  return {
    horizon: mixv(a.horizon, b.horizon), zenith: mixv(a.zenith, b.zenith), fog: mixv(a.fog, b.fog),
    dusk: lerp(a.dusk, b.dusk, f), stars: lerp(a.stars, b.stars, f), amb: lerp(a.amb, b.amb, f), moon: lerp(a.moon, b.moon, f),
  };
}

// ---------------------------------------------------------------- shaders
const GLSL_NOISE = /* glsl */`
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }
  float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*vnoise(p); p*=2.07; a*=.5;} return s; }
`;

const SKY_VERT = /* glsl */`
  varying vec3 vDir;
  void main(){ vDir = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;
const SKY_FRAG = /* glsl */`
  uniform vec3 uHorizon, uZenith, uDuskDir, uDuskColor, uBandN; uniform float uDusk, uStars, uTime;
  varying vec3 vDir;
  ${GLSL_NOISE}
  void main(){
    vec3 d = normalize(vDir);
    float h = clamp(d.y, -1.0, 1.0);
    float up = pow(clamp(h, 0.0, 1.0), 0.55);
    vec3 col = mix(uHorizon, uZenith, up);
    // below the horizon the sky is never seen (ground covers it) but keep it sane for the reflection edge
    col = mix(col, uHorizon * 0.9, smoothstep(0.0, -0.05, h));
    // dusk glow toward where the sun went down
    float dd = max(dot(d, uDuskDir), 0.0);
    col += uDuskColor * uDusk * pow(dd, 5.0) * (1.0 - clamp(h * 3.5, 0.0, 1.0)) * 0.9;
    col += uDuskColor * uDusk * pow(dd, 1.5) * (1.0 - clamp(h * 1.5, 0.0, 1.0)) * 0.18;
    // the galaxy band
    float b = dot(d, uBandN);
    float band = exp(-b * b * 55.0) * uStars;
    float tex = fbm(d.xz * 9.0 + d.y * 4.0) * fbm(d.zy * 15.0 + 3.1);
    col += vec3(0.42, 0.45, 0.55) * band * (0.04 + tex * 0.16) * smoothstep(-0.02, 0.15, h);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const STAR_VERT = /* glsl */`
  attribute float aSize; attribute float aPhase; attribute float aTint;
  uniform float uTime, uStars, uPixelScale; varying float vA; varying float vTint;
  void main(){
    vec4 mv = modelViewMatrix * vec4(position,1.0);
    float tw = 0.75 + 0.25 * sin(uTime * (0.8 + aPhase * 2.0) + aPhase * 40.0);
    vA = uStars * tw * (0.5 + 0.5 * smoothstep(0.0, 0.08, normalize(position).y));
    vTint = aTint;
    gl_PointSize = aSize * uPixelScale;
    gl_Position = projectionMatrix * mv;
  }
`;
const STAR_FRAG = /* glsl */`
  varying float vA; varying float vTint;
  void main(){
    vec2 c = gl_PointCoord - 0.5; float r = length(c) * 2.0;
    float a = smoothstep(1.0, 0.1, r);
    vec3 col = mix(vec3(0.85, 0.9, 1.0), vec3(1.0, 0.9, 0.75), vTint);
    gl_FragColor = vec4(col * a * vA * 1.6, a * vA);
  }
`;

const GROUND_VERT = /* glsl */`
  uniform mat4 uTextureMatrix;
  varying vec3 vWorld; varying vec4 vUv4;
  void main(){
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vUv4 = uTextureMatrix * wp;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const GROUND_FRAG = /* glsl */`
  uniform sampler2D tReflect;
  uniform float uTime;
  uniform vec3 uCamPos;
  uniform vec3 uLanternPos; uniform float uLanternI; uniform vec3 uLanternColor;
  uniform vec4 uNodes[${NODE_LIGHTS}];
  uniform vec3 uNodeColor, uNodeColorWarm;
  uniform vec4 uRipples[${RIPPLES}];
  uniform vec3 uFogColor; uniform float uFogDensity;
  uniform vec3 uMoonDir, uMoonColor; uniform float uMoonI;
  uniform vec3 uAmbient;
  uniform float uDawn;
  varying vec3 vWorld; varying vec4 vUv4;
  ${GLSL_NOISE}
  float voro(vec2 p){ vec2 i=floor(p), f=fract(p); float d1=8., d2=8.;
    for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 g=vec2(float(x),float(y));
      vec2 o=vec2(hash(i+g), hash(i+g+31.7)); vec2 r=g+o-f; float d=dot(r,r);
      if(d<d1){ d2=d1; d1=d; } else if(d<d2){ d2=d; } }
    return sqrt(d2)-sqrt(d1); }
  void main(){
    vec2 p = vWorld.xz;
    float dist = length(vWorld - uCamPos);
    // where the water lies (1) and where the crust is dry (0)
    float wn = fbm(p * 0.014 + 7.3);
    float wet = smoothstep(0.33, 0.41, wn);
    // ripples: expanding rings that perturb the reflection
    vec2 grad = vec2(0.0); float ring = 0.0;
    for (int i = 0; i < ${RIPPLES}; i++) {
      vec4 r = uRipples[i]; float age = uTime - r.z;
      if (r.w > 0.0 && age > 0.0 && age < 7.0) {
        vec2 dv = p - r.xy; float d = length(dv); float front = age * 2.4;
        float env = r.w * exp(-age * 0.5) * exp(-d * 0.30) * smoothstep(front + 0.5, front - 1.2, d) * smoothstep(0.0, 0.15, age);
        float w = sin(d * 4.5 - age * 10.0) * env;
        grad += (dv / max(d, 0.01)) * w; ring += max(w, 0.0);
      }
    }
    grad *= wet;
    vec4 uv4 = vUv4; uv4.xy += grad * 0.035 * uv4.w;
    vec3 refl = texture2DProj(tReflect, uv4).rgb;
    vec3 V = normalize(uCamPos - vWorld);
    float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 2.2);
    float R = mix(0.22, 1.0, fres);
    // salt crust
    float cell = voro(p * 0.85);
    float crack = 1.0 - smoothstep(0.0, 0.07, cell);
    float saltN = fbm(p * 1.3);
    vec3 albedo = vec3(0.90, 0.89, 0.85) * (0.82 + 0.18 * saltN) * (1.0 - crack * 0.5);
    // light on the crust
    vec3 light = uAmbient;
    light += uMoonColor * uMoonI * max(uMoonDir.y, 0.0);
    vec3 ld = uLanternPos - vWorld; float ld2 = dot(ld, ld); float ln = ld.y / sqrt(ld2 + 0.001);
    light += uLanternColor * uLanternI * max(ln, 0.0) / (1.0 + ld2 * 0.30);
    // light from below the water
    vec3 glow = vec3(0.0);
    for (int i = 0; i < ${NODE_LIGHTS}; i++) {
      vec4 n = uNodes[i];
      if (n.z > 0.001) { vec2 dv = p - n.xy; float d2 = dot(dv, dv);
        vec3 c = mix(uNodeColor, uNodeColorWarm, n.w); glow += c * min(n.z, 1.2) * exp(-d2 * 0.14); }
    }
    vec3 dry = albedo * (light + glow * 0.25);
    vec3 under = albedo * 0.30 * light + glow * 0.45 * (0.6 + 0.4 * saltN);
    vec3 water = mix(under, refl, R) + ring * (light * 0.6 + glow * 0.8 + vec3(0.02)) * 0.5;
    vec3 col = mix(dry, water, wet);
    col += (1.0 - abs(wet * 2.0 - 1.0)) * 0.03 * light;   // pale rim where crust meets water
    col = mix(col, col * vec3(1.05, 1.0, 0.95), uDawn);
    float f = 1.0 - exp(-dist * dist * uFogDensity * uFogDensity);
    col = mix(col, uFogColor, f);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ---------------------------------------------------------------- the ground
class MirrorGround {
  constructor(scene) {
    this.rt = new THREE.WebGLRenderTarget(512, 512, { type: THREE.HalfFloatType, depthBuffer: true });
    this.virtualCamera = new THREE.PerspectiveCamera();
    this.textureMatrix = new THREE.Matrix4();
    this.ripples = new Float32Array(RIPPLES * 4);
    this.rippleIdx = 0;
    this.nodes = new Float32Array(NODE_LIGHTS * 4);

    const uniforms = {
      tReflect: { value: this.rt.texture },
      uTextureMatrix: { value: this.textureMatrix },
      uTime: { value: 0 },
      uCamPos: { value: new THREE.Vector3() },
      uLanternPos: { value: new THREE.Vector3(0, 1, 0) },
      uLanternI: { value: 1 },
      uLanternColor: { value: new THREE.Color(1.0, 0.72, 0.42) },
      uNodes: { value: Array.from({ length: NODE_LIGHTS }, () => new THREE.Vector4()) },
      uNodeColor: { value: new THREE.Color(0.55, 0.95, 1.0) },
      uNodeColorWarm: { value: new THREE.Color(1.0, 0.86, 0.6) },
      uRipples: { value: Array.from({ length: RIPPLES }, () => new THREE.Vector4()) },
      uFogColor: { value: new THREE.Color(0.03, 0.03, 0.05) },
      uFogDensity: { value: 0.0009 },
      uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
      uMoonColor: { value: new THREE.Color(0.75, 0.82, 1.0) },
      uMoonI: { value: 0 },
      uAmbient: { value: new THREE.Color(0.05, 0.05, 0.07) },
      uDawn: { value: 0 },
    };
    this.material = new THREE.ShaderMaterial({ uniforms, vertexShader: GROUND_VERT, fragmentShader: GROUND_FRAG });
    const geo = new THREE.PlaneGeometry(5000, 5000, 1, 1);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.matrixAutoUpdate = false; this.mesh.updateMatrix();
    scene.add(this.mesh);

    this._plane = new THREE.Plane();
    this._normal = new THREE.Vector3(0, 1, 0);
    this._view = new THREE.Vector3();
    this._target = new THREE.Vector3();
    this._lookAt = new THREE.Vector3();
    this._rot = new THREE.Matrix4();
    this._q = new THREE.Vector4();
    this._clip = new THREE.Vector4();
  }

  setSize(w, h) { this.rt.setSize(Math.max(2, Math.floor(w * 0.5)), Math.max(2, Math.floor(h * 0.5))); }

  addRipple(x, z, amp, time) {
    const i = (this.rippleIdx++ % RIPPLES);
    this.material.uniforms.uRipples.value[i].set(x, z, time, amp);
  }

  setNodeLights(list) {
    const u = this.material.uniforms.uNodes.value;
    for (let i = 0; i < NODE_LIGHTS; i++) {
      const n = list[i];
      if (n) u[i].set(n.x, n.z, n.i, n.w); else u[i].set(0, 0, 0, 0);
    }
  }

  renderReflection(renderer, scene, camera, hooks) {
    const vc = this.virtualCamera;
    const camPos = camera.getWorldPosition(new THREE.Vector3());
    const normal = this._normal;
    this._view.set(camPos.x, -camPos.y, camPos.z);
    this._rot.extractRotation(camera.matrixWorld);
    this._lookAt.set(0, 0, -1).applyMatrix4(this._rot).add(camPos);
    this._target.set(this._lookAt.x, -this._lookAt.y, this._lookAt.z);
    vc.position.copy(this._view);
    vc.up.set(0, 1, 0).applyMatrix4(this._rot);
    vc.up.y *= -1;
    vc.lookAt(this._target);
    vc.near = camera.near; vc.far = camera.far;
    vc.updateMatrixWorld();
    vc.projectionMatrix.copy(camera.projectionMatrix);

    this.textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.textureMatrix.multiply(vc.projectionMatrix);
    this.textureMatrix.multiply(vc.matrixWorldInverse);

    // Oblique near-plane clipping so nothing below the surface leaks into the mirror.
    this._plane.setFromNormalAndCoplanarPoint(normal, new THREE.Vector3(0, 0, 0));
    this._plane.applyMatrix4(vc.matrixWorldInverse);
    const clip = this._clip.set(this._plane.normal.x, this._plane.normal.y, this._plane.normal.z, this._plane.constant);
    const pm = vc.projectionMatrix, q = this._q;
    q.x = (Math.sign(clip.x) + pm.elements[8]) / pm.elements[0];
    q.y = (Math.sign(clip.y) + pm.elements[9]) / pm.elements[5];
    q.z = -1.0;
    q.w = (1.0 + pm.elements[10]) / pm.elements[14];
    clip.multiplyScalar(2.0 / clip.dot(q));
    pm.elements[2] = clip.x; pm.elements[6] = clip.y; pm.elements[10] = clip.z + 1.0 - 0.003; pm.elements[14] = clip.w;

    this.mesh.visible = false;
    const prevRT = renderer.getRenderTarget();
    if (hooks?.before) hooks.before(this.rt.height);
    const starU = this._starMat?.uniforms.uPixelScale; const starPrev = starU ? starU.value : 1;
    if (starU) starU.value = starPrev * 0.5;
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.render(scene, vc);
    renderer.setRenderTarget(prevRT);
    if (starU) starU.value = starPrev;
    if (hooks?.after) hooks.after();
    this.mesh.visible = true;
  }
}

// ---------------------------------------------------------------- the world
export class World {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.nightT = 0;
    this.time = 0;

    scene.fog = new THREE.FogExp2(0x050507, 0.0009);

    // sky
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uHorizon: { value: new THREE.Color() }, uZenith: { value: new THREE.Color() },
        uDuskDir: { value: new THREE.Vector3(-0.85, 0.05, 0.5).normalize() },
        uDuskColor: { value: new THREE.Color(0.95, 0.42, 0.18) },
        uBandN: { value: new THREE.Vector3(0.6, 0.45, 0.65).normalize() },
        uDusk: { value: 1 }, uStars: { value: 0 }, uTime: { value: 0 },
      },
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1900, 48, 24), this.skyMat);
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    // stars
    const rng = mulberry32(1234);
    const N = 2600;
    const pos = new Float32Array(N * 3), size = new Float32Array(N), phase = new Float32Array(N), tint = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const u = rng(), v = rng();
      const th = 2 * Math.PI * u, ph = Math.acos(1 - v); // hemisphere-ish, denser overhead
      const r = 1800;
      const y = Math.cos(ph) * r, s = Math.sin(ph) * r;
      pos[i * 3] = Math.cos(th) * s; pos[i * 3 + 1] = Math.abs(y) * 0.98 + 2; pos[i * 3 + 2] = Math.sin(th) * s;
      const mag = rng();
      size[i] = 1.2 + Math.pow(mag, 6) * 5.5; phase[i] = rng(); tint[i] = rng() < 0.2 ? 1 : 0;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    sg.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    sg.setAttribute('aTint', new THREE.BufferAttribute(tint, 1));
    this.starMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uStars: { value: 0 }, uPixelScale: { value: 1 } },
      vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    });
    this.stars = new THREE.Points(sg, this.starMat);
    this.stars.frustumCulled = false;
    scene.add(this.stars);

    // moon
    this.moonMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.55, 1.4), fog: false });
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(16, 24, 16), this.moonMat);
    scene.add(this.moon);
    this.moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeHaloTexture(), color: new THREE.Color(0.6, 0.65, 0.85), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    this.moonHalo.scale.set(260, 260, 1);
    scene.add(this.moonHalo);
    this.moonDir = new THREE.Vector3(0.7, 0.2, -0.65).normalize();

    // distant ridge
    this._buildRidge(scene);

    // the water and the salt
    this.ground = new MirrorGround(scene);
    this.ground._starMat = this.starMat;
  }

  _buildRidge(scene) {
    const segs = 360, R = 1500;
    const verts = [], idx = [];
    const rng = mulberry32(77);
    const heights = [];
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      let h = fbm(Math.cos(a) * 3 + 10, Math.sin(a) * 3 + 10, 5) * 220 - 30;
      // some sectors are open horizon
      const open = fbm(Math.cos(a) * 1.3 + 3, Math.sin(a) * 1.3 + 3, 2);
      h *= smoothstep(0.35, 0.62, open);
      heights.push(Math.max(h, 0));
    }
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const x = Math.cos(a) * R, z = Math.sin(a) * R;
      verts.push(x, -40, z, x, heights[i] + rng() * 4, z);
    }
    for (let i = 0; i < segs; i++) {
      const a = i * 2, b = ((i + 1) % segs) * 2;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setIndex(idx);
    this.ridgeMat = new THREE.MeshBasicMaterial({ color: 0x07070a, side: THREE.DoubleSide });
    const ridge = new THREE.Mesh(g, this.ridgeMat);
    ridge.frustumCulled = false;
    scene.add(ridge);
  }

  setSize(w, h) {
    this.ground.setSize(w, h);
    this.starMat.uniforms.uPixelScale.value = this.renderer.getPixelRatio();
  }

  // Progress of the night, 0 = dusk, 1 = dawn.
  update(dt, nightT, camera, lantern) {
    this.time += dt;
    this.nightT = nightT;
    const s = skyAt(nightT);
    const u = this.skyMat.uniforms;
    u.uHorizon.value.setRGB(...s.horizon); u.uZenith.value.setRGB(...s.zenith);
    u.uDusk.value = s.dusk; u.uStars.value = s.stars; u.uTime.value = this.time;
    this.starMat.uniforms.uStars.value = s.stars; this.starMat.uniforms.uTime.value = this.time;

    // moon: rises in the east-southeast over the first half of the night and stays
    const el = lerp(-0.12, 0.62, smoothstep(0.06, 0.55, nightT)) - smoothstep(0.85, 1.0, nightT) * 0.3;
    const az = -0.85 + nightT * 0.6;
    this.moonDir.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).normalize();
    this.moon.position.copy(this.moonDir).multiplyScalar(1750);
    this.moonHalo.position.copy(this.moonDir).multiplyScalar(1700);
    const moonVis = s.moon * smoothstep(-0.02, 0.06, el);
    this.moonMat.color.setRGB(1.6 * moonVis + 0.05, 1.55 * moonVis + 0.05, 1.4 * moonVis + 0.06);
    this.moonHalo.material.opacity = moonVis * 0.35;
    this.moon.visible = this.moonHalo.visible = el > -0.05 && s.moon > 0.01;

    this.scene.fog.color.setRGB(...s.fog);
    this.ridgeMat.color.setRGB(s.fog[0] * 0.25, s.fog[1] * 0.25, s.fog[2] * 0.3);

    const g = this.ground.material.uniforms;
    g.uTime.value = this.time;
    g.uCamPos.value.copy(camera.position);
    g.uFogColor.value.setRGB(...s.fog);
    g.uMoonDir.value.copy(this.moonDir);
    g.uMoonI.value = moonVis * 0.35;
    g.uAmbient.value.setRGB(s.amb * 0.9, s.amb * 0.95, s.amb * 1.2);
    g.uDawn.value = smoothstep(0.9, 1.0, nightT);
    if (lantern) {
      g.uLanternPos.value.copy(lantern.position);
      g.uLanternI.value = lantern.intensity;
    }
    this.sky.position.copy(camera.position);
    this.stars.position.copy(camera.position);
  }

  renderReflection(camera, hooks) {
    this.ground.renderReflection(this.renderer, this.scene, camera, hooks);
  }
}

function makeHaloTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const gr = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.2, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
