// Procedural audio: wind, water, footsteps, the lantern, and the voice of the thing in the salt.
// Everything is synthesized with the Web Audio API; there are no audio files.

import { clamp, lerp } from './util.js';

const SCALE = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2, 3, 10 / 3, 4, 9 / 2];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.listener = { x: 0, z: 0, fx: 0, fz: -1 };
    this._droneState = { attention: 0, agitation: 0, warmth: 0 };
  }

  async init() {
    if (this.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);

    // Reverb bus
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(3.2, 2.4);
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.value = 0.45;
    this.reverb.connect(this.reverbGain).connect(this.master);

    this.dry = ctx.createGain();
    this.dry.connect(this.master);

    this._noiseBuffer = this._noise(4);
    this._startWind();
    this._startDrone();
    if (ctx.state === 'suspended') await ctx.resume();
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.1);
  }

  setListener(x, z, fx, fz) { this.listener = { x, z, fx, fz }; }

  // Pan/gain for a world position relative to the listener.
  _spatial(x, z, ref = 18) {
    const L = this.listener;
    const dx = x - L.x, dz = z - L.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.001) return { pan: 0, gain: 1 };
    const nx = dx / d, nz = dz / d;
    // right vector = forward rotated -90°
    const rx = -L.fz, rz = L.fx;
    const pan = clamp(nx * rx + nz * rz, -1, 1) * 0.8;
    const gain = 1 / (1 + (d / ref) * (d / ref));
    return { pan, gain };
  }

  _noise(seconds) {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(2, ctx.sampleRate * seconds, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  _impulse(seconds, decay) {
    const ctx = this.ctx;
    const len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  _startWind() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 320; bp.Q.value = 0.6;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0.05;
    src.connect(bp).connect(lp).connect(this.windGain).connect(this.dry);
    src.start();
    // slow LFOs on filter and gain for gusts
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain(); lfoG.gain.value = 180;
    lfo.connect(lfoG).connect(bp.frequency); lfo.start();
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.043;
    const lfo2G = ctx.createGain(); lfo2G.gain.value = 0.02;
    lfo2.connect(lfo2G).connect(this.windGain.gain); lfo2.start();
    this._windBase = 0.05;
  }

  setWind(level) {
    if (!this.windGain) return;
    this._windBase = lerp(0.03, 0.14, level);
    this.windGain.gain.setTargetAtTime(this._windBase, this.ctx.currentTime, 2);
  }

  _startDrone() {
    const ctx = this.ctx;
    this.droneGain = ctx.createGain(); this.droneGain.gain.value = 0;
    const pan = ctx.createStereoPanner(); pan.pan.value = 0;
    this.dronePan = pan;
    this.droneGain.connect(pan).connect(this.reverb);
    this.droneOsc = [];
    const freqs = [110, 165, 220, 330];
    for (const f of freqs) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0.25;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + Math.random() * 0.08;
      const lg = ctx.createGain(); lg.gain.value = 0.12;
      lfo.connect(lg).connect(g.gain); lfo.start();
      o.connect(g).connect(this.droneGain); o.start();
      this.droneOsc.push({ o, base: f });
    }
  }

  // Ambient hum of its presence. attention = loudness; agitation = dissonance; warmth = brighter partial.
  drone(attention, agitation, warmth, x, z) {
    if (!this.droneGain) return;
    const t = this.ctx.currentTime;
    const sp = this._spatial(x, z, 40);
    this.droneGain.gain.setTargetAtTime(attention * 0.07 * (0.5 + sp.gain), t, 1.2);
    this.dronePan.pan.setTargetAtTime(sp.pan, t, 0.8);
    const det = agitation * 0.07;
    this.droneOsc[1].o.frequency.setTargetAtTime(165 * (1 - det), t, 1);
    this.droneOsc[3].o.frequency.setTargetAtTime(330 * (1 + det * 0.5) * (warmth > 0.5 ? 1.25 : 1), t, 1.5);
  }

  step(speed, wet = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this._noiseBuffer;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const hp = ctx.createBiquadFilter(); hp.type = wet ? 'highpass' : 'bandpass'; hp.frequency.value = wet ? 1800 : 500;
    const g = ctx.createGain();
    const vol = (0.06 + speed * 0.05) * (wet ? 1 : 0.6);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + (wet ? 0.22 : 0.12));
    src.connect(hp).connect(g).connect(this.dry);
    g.connect(this.reverb);
    src.start(t); src.stop(t + 0.3);
    // low thump
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    const og = ctx.createGain(); og.gain.setValueAtTime(0.05 + speed * 0.04, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(og).connect(this.dry); o.start(t); o.stop(t + 0.15);
  }

  tap() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(1100, t); o.frequency.exponentialRampToValueAtTime(420, t + 0.09);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(this.dry); g.connect(this.reverb);
    o.start(t); o.stop(t + 0.4);
    const src = ctx.createBufferSource(); src.buffer = this._noiseBuffer;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.18, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    src.connect(hp).connect(ng).connect(this.dry); src.start(t); src.stop(t + 0.1);
  }

  lanternPulse() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this._noiseBuffer;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 5000; bp.Q.value = 2;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    src.connect(bp).connect(g).connect(this.dry); src.start(t); src.stop(t + 0.3);
  }

  lanternClick() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 2200;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    o.connect(g).connect(this.dry); o.start(t); o.stop(t + 0.04);
  }

  // The voice of the thing: a tone born at a world position.
  tone(x, z, pitchIndex, { agitation = 0, warmth = 0, dur = 1.6, vol = 1, attack = 0.12 } = {}) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const sp = this._spatial(x, z, 22);
    const base = 165 * SCALE[((pitchIndex % SCALE.length) + SCALE.length) % SCALE.length];
    const detune = (Math.random() * 2 - 1) * agitation * 70;
    const pan = ctx.createStereoPanner(); pan.pan.value = sp.pan;
    const g = ctx.createGain();
    const peak = 0.16 * vol * (0.35 + sp.gain);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack * (1 - agitation * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * (1 - agitation * 0.5));
    g.connect(pan);
    pan.connect(this.reverb);
    const d = ctx.createGain(); d.gain.value = 0.5; pan.connect(d).connect(this.dry);

    const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = base; o1.detune.value = detune;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = base * 2.002; o2.detune.value = detune;
    const g2 = ctx.createGain(); g2.gain.value = 0.18 + warmth * 0.25;
    o1.connect(g); o2.connect(g2).connect(g);
    o1.start(t); o2.start(t);
    o1.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
    if (agitation > 0.35) {
      const o3 = ctx.createOscillator(); o3.type = 'sawtooth'; o3.frequency.value = base * 1.414;
      const g3 = ctx.createGain(); g3.gain.value = (agitation - 0.3) * 0.25;
      o3.connect(g3).connect(g); o3.start(t); o3.stop(t + dur * 0.5);
    }
  }

  // A crack of salt breaking.
  crack(x, z) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const sp = this._spatial(x, z, 14);
    const src = ctx.createBufferSource(); src.buffer = this._noiseBuffer;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.6 * (0.3 + sp.gain), t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    const pan = ctx.createStereoPanner(); pan.pan.value = sp.pan;
    src.connect(hp).connect(g).connect(pan).connect(this.dry); pan.connect(this.reverb);
    src.start(t); src.stop(t + 0.6);
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.4);
    const og = ctx.createGain(); og.gain.setValueAtTime(0.25, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(og).connect(pan); o.start(t); o.stop(t + 0.5);
  }

  // The whole flat answers: a chord swell.
  swell(warmth = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const notes = warmth > 0.5 ? [0, 2, 4, 5, 7] : [0, 1, 3, 6];
    notes.forEach((n, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 110 * SCALE[n];
      const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 220 * SCALE[n] * 1.003;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 1.2 + i * 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 7 + i * 0.5);
      const g2 = ctx.createGain(); g2.gain.value = 0.3;
      o.connect(g); o2.connect(g2).connect(g); g.connect(this.reverb);
      o.start(t); o2.start(t); o.stop(t + 8 + i); o2.stop(t + 8 + i);
    });
  }

  // A low, felt pressure: the flat flinching.
  flinch() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(48, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.2);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(g).connect(this.dry); o.start(t); o.stop(t + 1.5);
    const src = ctx.createBufferSource(); src.buffer = this._noiseBuffer;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2500, t); lp.frequency.exponentialRampToValueAtTime(200, t + 0.9);
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.25, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 1);
    src.connect(lp).connect(ng).connect(this.reverb); src.start(t); src.stop(t + 1.1);
  }
}
