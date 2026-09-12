// You: a surveyor with a lantern, standing in two centimetres of water. First-person movement, the lantern,
// tapping the water, and the small sounds and ripples of a body moving through a still place.

import * as THREE from 'three';
import { clamp, damp, lerp } from './util.js';

const EYE = 1.62;
const WALK = 2.3, RUN = 5.2;

export class Player {
  constructor(camera, scene, audio, world, emit) {
    this.camera = camera; this.scene = scene; this.audio = audio; this.world = world; this.emit = emit;
    this.pos = new THREE.Vector3(0, EYE, 0);
    this.vel = new THREE.Vector3();
    this.yaw = Math.PI;      // facing -z... yaw=PI looks toward +z; we'll set to face the origin of the thing
    this.pitch = 0;
    this.keys = new Set();
    this.locked = false;
    this.lockFailed = false;
    this.enabled = false;
    this.stillFor = 0;
    this.speed = 0;
    this.bob = 0;
    this.stepAcc = 0;
    this.fHeld = 0;
    this.fDown = false;
    this.forward = new THREE.Vector3(0, 0, -1);

    this.lantern = {
      on: true, placed: false, raise: 0, pulse: 0, intensity: 1, warm: 0,
      pos: new THREE.Vector3(), placedPos: new THREE.Vector3(), override: null,
    };
    this._buildLantern();
    this._bind();
  }

  _buildLantern() {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 2.4, 1.3), fog: false }));
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 10, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.62, 0.3), transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false }));
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.38, 0.22), transparent: true, opacity: 0.7 });
    const cap = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.006, 6, 14), ringMat);
    cap.rotation.x = Math.PI / 2; cap.position.y = 0.062;
    const base = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.006, 6, 14), ringMat);
    base.rotation.x = Math.PI / 2; base.position.y = -0.062;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 0.7, 0.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.55 }));
    halo.scale.set(0.9, 0.9, 1);
    g.add(core, glass, cap, base, halo);
    this.lanternMesh = g; this.lanternCore = core; this.lanternHalo = halo; this.lanternGlass = glass;
    this.scene.add(g);
  }

  _bind() {
    const el = document.body;
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (e.repeat) return;
      const k = e.code;
      this.keys.add(k);
      if (k === 'Space') { e.preventDefault(); this.tap(); }
      if (k === 'KeyF') { this.fDown = true; this.fHeld = 0; }
      if (k === 'KeyQ') this.toggleLantern();
      if (k === 'KeyG') this.placeOrTake();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'KeyF' && this.fDown) {
        this.fDown = false;
        if (this.fHeld < 0.42) this.pulse();
        this.lantern.raise = 0;
      }
    });
    window.addEventListener('blur', () => { this.keys.clear(); this.fDown = false; this.lantern.raise = 0; });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === el;
      this.emit('lock', this.locked);
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (!this.locked && !(this.lockFailed && e.buttons === 1)) return;
      this.yaw -= e.movementX * 0.0021;
      this.pitch = clamp(this.pitch - e.movementY * 0.0021, -1.35, 1.35);
    });
  }

  requestLock() {
    // If the browser refuses pointer lock (some embedded views do), fall back to drag-to-look.
    try { const p = document.body.requestPointerLock?.(); if (p && p.catch) p.catch(() => { this.lockFailed = true; }); }
    catch { this.lockFailed = true; }
  }
  get canMove() { return this.locked || this.lockFailed; }
  releaseLock() { if (document.pointerLockElement) document.exitPointerLock(); }

  lookAt(x, z) { this.yaw = Math.atan2(-(x - this.pos.x), -(z - this.pos.z)); }

  // ------------------------------------------------------------ acts
  tap() {
    this.world.ground.addRipple(this.pos.x + this.forward.x * 0.6, this.pos.z + this.forward.z * 0.6, 1.0, this.world.time);
    this.audio.tap();
    this.emit('beat', { modality: 'tap', x: this.pos.x, z: this.pos.z });
    this.emit('act', 'tap');
  }

  pulse() {
    if (!this.lantern.on) { this.toggleLantern(); return; }
    this.lantern.pulse = 1;
    this.audio.lanternPulse();
    this.emit('beat', { modality: 'light', x: this.lantern.pos.x, z: this.lantern.pos.z });
    this.emit('act', 'pulse');
  }

  toggleLantern() {
    if (this.lantern.placed) return;
    this.lantern.on = !this.lantern.on;
    this.audio.lanternClick();
    this.emit(this.lantern.on ? 'lanternOn' : 'lanternOff', {});
    this.emit('act', this.lantern.on ? 'lanternOn' : 'lanternOff');
  }

  placeOrTake() {
    const L = this.lantern;
    if (!L.placed) {
      L.placed = true; L.on = true;
      L.placedPos.set(this.pos.x + this.forward.x * 0.9, 0.16, this.pos.z + this.forward.z * 0.9);
      this.audio.lanternClick();
      this.world.ground.addRipple(L.placedPos.x, L.placedPos.z, 0.6, this.world.time);
      this.emit('lanternPlaced', { pos: L.placedPos.clone() });
      this.emit('act', 'place');
    } else {
      const d = Math.hypot(this.pos.x - L.placedPos.x, this.pos.z - L.placedPos.z);
      if (d > 2.2) { this.emit('act', 'tooFar'); return; }
      L.placed = false; L.override = null;
      this.audio.lanternClick();
      this.emit('lanternTaken', {});
      this.emit('act', 'take');
    }
  }

  // ------------------------------------------------------------ frame
  update(dt, time) {
    const L = this.lantern;
    if (this.fDown) { this.fHeld += dt; if (this.fHeld >= 0.42 && L.on && !L.placed) L.raise = 1; }

    // movement
    const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const r = new THREE.Vector3(f.z, 0, -f.x).negate();
    this.forward.copy(f);
    let ix = 0, iz = 0;
    if (this.enabled && this.canMove) {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) iz += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) iz -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) ix += 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) ix -= 1;
    }
    const running = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const want = new THREE.Vector3().addScaledVector(f, iz).addScaledVector(r, ix);
    if (want.lengthSq() > 0) want.normalize().multiplyScalar(running ? RUN : WALK);
    this.vel.x = damp(this.vel.x, want.x, 8, dt);
    this.vel.z = damp(this.vel.z, want.z, 8, dt);
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    this.speed = Math.hypot(this.vel.x, this.vel.z);

    if (this.speed < 0.15) this.stillFor += dt; else this.stillFor = 0;

    // footsteps
    this.stepAcc += this.speed * dt;
    const stride = running ? 1.25 : 0.8;
    if (this.stepAcc > stride) {
      this.stepAcc -= stride;
      this.audio.step(this.speed / RUN, 1);
      this.world.ground.addRipple(this.pos.x + (Math.random() - 0.5) * 0.4, this.pos.z + (Math.random() - 0.5) * 0.4, 0.18 + this.speed * 0.06, time);
      this.emit('step', { speed: this.speed });
    }
    this.bob += this.speed * dt * (running ? 2.2 : 2.6);
    const bobY = Math.sin(this.bob * 2) * 0.022 * Math.min(this.speed / WALK, 1.2);

    // camera
    this.camera.position.set(this.pos.x, EYE + bobY, this.pos.z);
    this.camera.rotation.set(0, 0, 0, 'YXZ');
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.updateMatrixWorld();

    // lantern
    L.pulse = Math.max(0, L.pulse - dt * 4.5);
    const ov = L.override;
    const base = L.on ? 1 : 0;
    const target = base * (1 + L.raise * 3.2 + L.pulse * 4.5) * (ov ? ov.intensity : 1);
    L.intensity = damp(L.intensity, target, L.pulse > 0 ? 40 : 6, dt);
    L.warm = damp(L.warm, ov?.warm ? 1 : 0, 1, dt);
    if (L.placed) {
      L.pos.copy(L.placedPos);
      this.lanternMesh.position.copy(L.placedPos);
      this.lanternMesh.rotation.set(0, 0, 0);
    } else {
      const hand = new THREE.Vector3().copy(this.camera.position)
        .addScaledVector(f, 0.55).addScaledVector(r, 0.34).add(new THREE.Vector3(0, -0.42 + L.raise * 0.62 + bobY * 0.5, 0));
      const swing = Math.sin(this.bob) * 0.02 * Math.min(this.speed, 1);
      hand.x += swing;
      L.pos.copy(hand);
      this.lanternMesh.position.copy(hand);
      this.lanternMesh.rotation.set(0, this.yaw, Math.sin(this.bob) * 0.05 * Math.min(this.speed, 1));
    }
    const vis = L.intensity;
    const warmCol = lerp(1, 0.55, L.warm), warmB = lerp(1.3, 2.4, L.warm);
    this.lanternCore.material.color.setRGB(3.2 * vis * warmCol + 0.02, 2.2 * vis + 0.02, warmB * vis + 0.03);
    this.lanternHalo.material.opacity = clamp(0.35 * vis, 0, 1);
    this.lanternHalo.material.color.setRGB(lerp(1, 0.6, L.warm), lerp(0.7, 0.9, L.warm), lerp(0.4, 1.0, L.warm));
    this.lanternGlass.material.opacity = 0.05 + 0.2 * Math.min(vis, 1);
    this.lanternHalo.scale.setScalar(0.7 + 0.35 * Math.min(vis, 3));

    this.audio.setListener(this.pos.x, this.pos.z, f.x, f.z);
  }

  // The snapshot the mind perceives.
  perceived(focus) {
    const dx = focus.x - this.pos.x, dz = focus.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
    const toward = this.speed > 0.1 ? (this.vel.x * dx + this.vel.z * dz) / (this.speed * d) : 0;
    const L = this.lantern;
    return {
      x: this.pos.x, z: this.pos.z, fx: this.forward.x, fz: this.forward.z,
      speed: this.speed, toward, stillFor: this.stillFor,
      lanternOn: L.on, lanternPlaced: L.placed, lanternHeld: L.raise > 0.5 && L.on && !L.placed,
      lanternI: L.intensity, lanternX: L.pos.x, lanternZ: L.pos.z, dist: d,
    };
  }
}

function haloTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
