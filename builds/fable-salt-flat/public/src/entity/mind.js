// The mind of the thing in the salt. It perceives rhythm, stillness, distance and light; it remembers every
// phrase the human makes and every wrong the human does to it; it answers by mirroring, because in a mirror
// world repetition is the only proof of intent.

import { clamp, lerp, damp, phraseSimilarity, irregularity, mulberry32 } from '../util.js';

const PHRASE_GAP = 1.6;      // seconds of silence that close a phrase
const MAX_BEATS = 9;

export class Mind {
  constructor(body, audio, remembered, emit) {
    this.body = body;
    this.audio = audio;
    this.emit = emit;
    this.rng = mulberry32(99 + (remembered?.nights || 0));
    this.time = 0;

    // internal state: never shown directly, always expressed through the body first
    this.attention = 0.25;
    this.trust = 0.12 + (remembered?.trust ? clamp(remembered.trust, 0, 1) * 0.4 : 0);
    this.agitation = 0.05;
    this.coherence = remembered?.coherence ? clamp(remembered.coherence, 0, 1) * 0.3 : 0;

    this.memory = {
      nights: remembered?.nights || 0,
      priorSignature: remembered?.signature || null,
      phrases: [],      // human phrases {modality, intervals, t}
      own: [],          // its utterances {intervals, t}
      events: [],       // {type, t}
      blinded: 0, broken: 0, touches: 0, gifts: 0, probesIgnored: 0, probesAnswered: 0,
      signature: null, signatureCount: 0,
    };

    this.withdrawn = false;
    this.figureBuilt = false;
    this.figureNode = -1;
    this.gift = null;           // { pos, phase, t }
    this.probe = null;          // { t, answered, tendril }
    this.phraseBuf = null;      // { modality, times: [] }
    this.lastOwn = null;        // { intervals, t }
    this.lastUtterance = -20;
    this.lastProbe = -20;
    this.lastOffer = -60;
    this.lastMurmur = 0;
    this.lastTouch = -10;
    this.heldFor = 0;
    this.darkFor = 0;
    this.stillCredit = 0;
    this.approachHeat = 0;
    this.startledAt = -60;
    this.murmurs = 0;
    this.opened = 0;
    this.lanternOverride = null; // { intensity, warm } while it holds the gift
    this.replies = [];           // scheduled replies {t, fn}
    this.dawn = 0;
  }

  // ------------------------------------------------------------ helpers
  note(type, data = {}) {
    this.memory.events.push({ type, t: this.time });
    this.emit(type, { ...data, t: this.time, reading: this.reading() });
  }

  reading() {
    return { attention: this.attention, trust: this.trust, agitation: this.agitation, coherence: this.coherence, withdrawn: this.withdrawn };
  }

  later(delay, fn) { this.replies.push({ t: this.time + delay, fn }); }

  _bump(k, dv) { this[k] = clamp(this[k] + dv, k === 'trust' ? -1 : 0, 1); }

  // its own version of a rhythm: accuracy 1 = exact, 0 = barely related
  _mirror(intervals, accuracy) {
    const out = intervals.map((iv) => iv * 1.12 * (1 + (this.rng() - 0.5) * 2 * (1 - accuracy) * 0.9));
    if (this.rng() > accuracy) {
      if (out.length > 1 && this.rng() < 0.5) out.pop();
      else out.push(out.length ? out[out.length - 1] * (0.8 + this.rng() * 0.6) : 0.7);
    }
    return out.map((v) => clamp(v, 0.18, 3));
  }

  _say(intervals, { delay = 1, hops = 4, amp = 1, spires = false, vol = 1, src = -1 } = {}) {
    this.body.playPhrase(intervals, { delay, hops, amp, spires, vol, src });
    const total = intervals.reduce((s, v) => s + v, 0);
    this.lastOwn = { intervals: intervals.slice(), t: this.time + delay + total };
    this.memory.own.push(this.lastOwn);
    this.emit('said', { intervals: intervals.slice() });
    this.lastUtterance = this.time + delay + total;
  }

  _updateSignature() {
    const ph = this.memory.phrases.filter((p) => p.intervals.length >= 1);
    let best = null, bestN = 1;
    for (const p of ph) {
      let n = 0;
      for (const q of ph) if (p !== q && phraseSimilarity(p.intervals, q.intervals) > 0.78) n++;
      if (n + 1 > bestN) { bestN = n + 1; best = p; }
    }
    if (best && bestN >= 2) { this.memory.signature = best.intervals.slice(); this.memory.signatureCount = bestN; }
  }

  // ------------------------------------------------------------ perception
  perceive(ev) {
    const t = this.time;
    switch (ev.type) {
      case 'beat': {
        if (this.phraseBuf && (this.phraseBuf.modality !== ev.modality || t - this.phraseBuf.times.at(-1) > PHRASE_GAP)) this._closePhrase();
        if (!this.phraseBuf) this.phraseBuf = { modality: ev.modality, times: [] };
        this.phraseBuf.times.push(t);
        if (this.phraseBuf.times.length >= MAX_BEATS) this._closePhrase();
        if (this.gift && this.gift.phase < 3 && ev.modality === 'light') this._interruptGift();
        break;
      }
      case 'lanternOff':
        this.note('lantern_off');
        break;
      case 'lanternOn':
        this.darkFor = 0;
        break;
      case 'lanternPlaced':
        this.gift = { pos: { x: ev.pos.x, z: ev.pos.z }, phase: 0, t };
        break;
      case 'lanternTaken':
        if (this.gift && this.gift.phase >= 1 && this.gift.phase < 4) this._interruptGift(true);
        this.gift = null;
        this.lanternOverride = null;
        break;
      case 'touchSpire':
        this._touch(ev.spire);
        break;
    }
  }

  _closePhrase() {
    const buf = this.phraseBuf;
    this.phraseBuf = null;
    if (!buf) return;
    const intervals = [];
    for (let i = 1; i < buf.times.length; i++) intervals.push(buf.times[i] - buf.times[i - 1]);
    this._onHumanPhrase(buf.modality, intervals);
  }

  _onHumanPhrase(modality, intervals) {
    const t = this.time;
    const count = intervals.length + 1;
    const light = modality === 'light';
    this._bump('attention', 0.22);
    if (this.withdrawn) { this.note('unheard', { count }); return; }

    let interrupted = false;
    if (this.body.isPlaying()) { this.body.stopUtterance(); interrupted = true; this._bump('agitation', 0.05); }

    const simOwn = this.lastOwn && t - this.lastOwn.t < 16 ? phraseSimilarity(intervals, this.lastOwn.intervals) : 0;
    const recent = this.memory.phrases.slice(-4);
    let simPrev = 0;
    for (const p of recent) simPrev = Math.max(simPrev, phraseSimilarity(intervals, p.intervals));
    const irregular = irregularity(intervals);
    this.memory.phrases.push({ modality, intervals: intervals.slice(), t });
    this.emit('heard', { intervals: intervals.slice(), modality });
    this._updateSignature();

    if (this.probe && !this.probe.answered) {
      this.probe.answered = true; this.memory.probesAnswered++;
      this._bump('trust', 0.1); this._bump('attention', 0.1);
      this.note('probe_answered', { count });
    }

    let kind;
    if (count === 1) kind = 'single';
    else if (count >= 8 || (irregular > 0.95 && count >= 4)) kind = 'noise';
    else if (simOwn > 0.72) kind = 'mirrored';
    else if (simPrev > 0.76) kind = 'repeated';
    else kind = 'new';

    const cohMul = light ? 1.3 : 1;
    const gap = 1 - clamp(this.trust, 0, 1);
    switch (kind) {
      case 'mirrored': {
        this._bump('trust', 0.11); this._bump('coherence', 0.14 * cohMul); this._bump('agitation', -0.08);
        const extend = this.coherence > 0.55;
        const reply = extend ? [...intervals, intervals.reduce((s, v) => s + v, 0) / intervals.length] : intervals.slice();
        this._say(reply.map((v) => v * 1.05), { delay: 0.9 + gap * 1.5, spires: this.coherence > 0.72, hops: 5 });
        this.note(extend ? 'extended' : 'mirrored', { count, replyCount: reply.length + 1, modality });
        break;
      }
      case 'repeated': {
        this._bump('coherence', 0.07 * cohMul); this._bump('trust', 0.05);
        const acc = 0.55 + this.coherence * 0.45;
        const reply = this._mirror(intervals, acc);
        this._say(reply, { delay: 1.2 + gap * 1.8, spires: this.coherence > 0.72 });
        this.note('repeated', { count, replyCount: reply.length + 1, accuracy: acc, modality });
        break;
      }
      case 'noise': {
        this._bump('agitation', 0.13 + count * 0.012); this._bump('trust', -0.04);
        if (this.agitation > 0.5) { this.body.flicker(1.6); this._retreatImpulse(8); this.note('warning', { count, modality }); }
        else { this.later(1.8, () => this.body.launchWave(this.body.focusNode(), { hops: 2, amp: 0.8 })); this.note('noise', { count, modality }); }
        break;
      }
      case 'new': {
        this._bump('trust', 0.02);
        if (this.attention < 0.32 && this.rng() < 0.45 && !interrupted) { this.note('no_reply', { count, modality }); break; }
        const acc = 0.25 + this.coherence * 0.75;
        const reply = this._mirror(intervals, acc);
        this._say(reply, { delay: 1.4 + gap * 2.2 });
        this.note('new_phrase', { count, replyCount: reply.length + 1, accuracy: acc, modality });
        break;
      }
      case 'single': {
        this._bump('attention', 0.08);
        if (this.rng() < 0.45 + this.trust * 0.5) { this._say([], { delay: 1 + gap * 2 }); this.note('single_answered', { modality }); }
        else this.note('single', { modality });
        break;
      }
    }
  }

  _touch(spire) {
    const t = this.time;
    if (t - this.lastTouch < 3) return;
    this.lastTouch = t;
    if (spire.tag === 'figure') {
      this._bump('trust', 0.05); this.body.ringAll(1.2); this.audio.swell(1);
      this.note('touched_figure');
      return;
    }
    if (this.trust >= 0.55 || spire.tag === 'offer') {
      this.memory.touches++;
      this._bump('trust', 0.12); this._bump('coherence', 0.08); this._bump('attention', 0.3);
      this.body.warmth = clamp(this.body.warmth + 0.35, 0, 1);
      this.body.ringAll(1.5); this.audio.swell(1);
      spire.glowT = 1.4;
      this.note('touched', { first: this.memory.touches === 1 });
    } else {
      this.memory.broken++;
      this.body.shatterSpire(spire);
      this._bump('agitation', 0.22); this._bump('trust', -0.12);
      this._retreatImpulse(10);
      this.note('broken', { count: this.memory.broken });
    }
  }

  _retreatImpulse(m) {
    const b = this.body, f = b.focus, h = this.human;
    if (!h) return;
    const dx = f.x - h.x, dz = f.z - h.z, d = Math.hypot(dx, dz) || 1;
    f.x += (dx / d) * m; f.z += (dz / d) * m;
    this._clampFocus();
  }

  _clampFocus() {
    const f = this.body.focus, o = this.body.origin;
    const dx = f.x - o.x, dz = f.z - o.z, d = Math.hypot(dx, dz);
    const R = 95;
    if (d > R) { f.x = o.x + (dx / d) * R; f.z = o.z + (dz / d) * R; }
  }

  _interruptGift(taken = false) {
    if (!this.gift) return;
    this.body.sinkSpires({ tag: 'gift' });
    this.lanternOverride = null;
    if (this.gift.phase >= 1) { this._retreatImpulse(12); this.note(taken ? 'gift_taken_back' : 'gift_interrupted'); }
    this.gift = taken ? null : { ...this.gift, phase: -1 };
  }

  // ------------------------------------------------------------ the probe: it reaches toward you and asks
  _probe(kind = 'probe') {
    const h = this.human;
    const tendril = this.body.growTendril(h.x, h.z, { stopShort: 2.4, life: 30 });
    if (!tendril) return;
    const hops = tendril.nodes.length;
    const start = tendril.nodes[0];
    this.body.launchWave(start, { hops: hops + 1, amp: 1.1, speed: 6, dur: 2 });
    const travel = hops / 6;
    this.later(travel + 0.4, () => { if (tendril.end >= 0) this.body.launchWave(tendril.end, { hops: 1, amp: 1.3, dur: 2.4 }); });
    this.probe = { t: this.time + travel, answered: false, tendril };
    this.lastProbe = this.time;
    this.lastUtterance = this.time + travel + 1;
    this.note(kind);
  }

  // ------------------------------------------------------------ per frame
  update(dt, human, nightT) {
    this.time += dt;
    const t = this.time;
    this.human = human;
    this.dawn = clamp((nightT - 0.88) / 0.12, 0, 1);

    // phrase timeout
    if (this.phraseBuf && t - this.phraseBuf.times.at(-1) > PHRASE_GAP) this._closePhrase();
    // scheduled replies
    for (let i = this.replies.length - 1; i >= 0; i--) if (this.replies[i].t <= t) { const r = this.replies.splice(i, 1)[0]; r.fn(); }

    // slow decays
    this.agitation = clamp(this.agitation - dt * 0.011 * (1 + clamp(this.trust, 0, 1)), 0, 1);
    this.attention = damp(this.attention, 0.28, 0.02, dt);

    const b = this.body;
    const f = b.focus;
    const dist = Math.hypot(f.x - human.x, f.z - human.z);
    const toward = human.speed > 0.2 ? human.toward : 0;

    // ---- the opening: it notices you before you notice it
    if (this.opened === 0 && t > 13) { this.opened = 1; b.launchWave(b.focusNode(), { hops: 4, amp: 1.4, speed: 2.5, dur: 3 }); this.note('first_light'); }
    if (this.opened === 1 && t > 31 && this.memory.phrases.length === 0) { this.opened = 2; this._say([0.75], { delay: 0, hops: 4 }); this.note('first_phrase'); }
    if (this.opened >= 1 && this.memory.priorSignature && !this.remembered && t > 24) {
      this.remembered = true; this._say(this.memory.priorSignature, { delay: 0, hops: 5, amp: 1.2 }); this.note('remembered');
    }

    // ---- distance: how close it lets itself be
    const scar = this.memory.blinded >= 2 && human.lanternOn && dist < 45;
    let desired = lerp(44, 5, clamp(this.trust, 0, 1)) + this.agitation * 32;
    if (scar) desired = Math.max(desired, 34);
    if (this.gift && this.gift.phase >= 0 && this.gift.phase < 4) {
      // it goes to the lantern instead
      const g = this.gift.pos, gd = Math.hypot(f.x - g.x, f.z - g.z);
      if (gd > 3) { const s = 1.6 * dt; f.x += ((g.x - f.x) / gd) * s; f.z += ((g.z - f.z) / gd) * s; }
    } else if (!this.withdrawn) {
      if (dist < desired * 0.72 && this.trust < 0.6) {
        const s = (2.2 + this.agitation * 4 + (toward > 0.5 ? human.speed : 0)) * dt;
        const dx = f.x - human.x, dz = f.z - human.z, d = dist || 1;
        f.x += (dx / d) * s; f.z += (dz / d) * s;
      } else if (dist > desired * 1.25 && this.attention > 0.33 && this.dawn < 0.5) {
        const s = lerp(0.5, 2.0, clamp(this.trust, 0, 1)) * dt;
        const dx = human.x - f.x, dz = human.z - f.z, d = dist || 1;
        f.x += (dx / d) * s; f.z += (dz / d) * s;
      }
    }
    this._clampFocus();

    // ---- being rushed
    if (toward > 0.6 && human.speed > 4.2 && dist < 40) {
      this.approachHeat += dt;
      this._bump('agitation', 0.16 * dt);
      if (this.approachHeat > 1.2 && t - this.startledAt > 25) { this.startledAt = t; b.flicker(1.2); this._retreatImpulse(6); this.note('startled'); }
    } else if (toward > 0.6 && human.speed > 0.5 && dist < desired && this.trust < 0.5) {
      this._bump('agitation', 0.03 * dt);
      this.approachHeat = Math.max(0, this.approachHeat - dt);
    } else this.approachHeat = Math.max(0, this.approachHeat - dt);

    // ---- stillness
    if (human.stillFor > 4) {
      this._bump('attention', 0.035 * dt);
      if (human.stillFor > 6 && this.opened >= 1 && this.trust > 0.12 && t - this.lastProbe > 22 && t - this.lastUtterance > 6 && !b.isPlaying() && !this.withdrawn && !this.probe && this.memory.probesIgnored < 3 && this.dawn < 0.3 && !this.gift) {
        this._probe('probe');
      }
    }
    if (this.probe) {
      if (this.probe.answered) this.probe = null;
      else if (t - this.probe.t > 10) { this.memory.probesIgnored++; this._bump('attention', -0.12); this.note('probe_ignored', { count: this.memory.probesIgnored }); this.probe = null; }
    }

    // ---- the lantern
    if (human.lanternHeld && dist < 42 && !this.withdrawn) {
      this.heldFor += dt;
      if (this.heldFor > 2.6) {
        this.heldFor = -8;
        this.memory.blinded++;
        this._bump('agitation', 0.35); this._bump('trust', -0.18); this._bump('attention', 0.2);
        b.flinchFrom(human.lanternX, human.lanternZ);
        this._retreatImpulse(14);
        this.note('blinded', { count: this.memory.blinded });
      }
    } else this.heldFor = this.heldFor > 0 ? 0 : Math.min(this.heldFor + dt * 0.5, 0);
    if (!human.lanternOn && !human.lanternPlaced) {
      this.darkFor += dt;
      this._bump('attention', 0.05 * dt);
      if (this.darkFor > 9 && this.opened >= 1 && this.trust > 0.02 && t - this.lastProbe > 26 && !this.probe && !b.isPlaying() && !this.withdrawn && this.dawn < 0.3) this._probe('dark_probe');
      if (this.withdrawn && human.stillFor > 40 && this.darkFor > 40) {
        this.withdrawn = false; this.trust = Math.max(this.trust, -0.05); this.agitation = 0.35; this.attention = 0.5;
        b.launchWave(b.focusNode(), { hops: 2, amp: 0.7, dur: 3 });
        this.note('returned');
      }
    } else this.darkFor = 0;
    if (human.lanternOn && !human.lanternPlaced && dist < 7 && this.trust < 0.3 && human.lanternI > 0.8) this._bump('agitation', 0.02 * dt);

    // ---- the gift
    if (this.gift && this.gift.phase >= 0) {
      const g = this.gift, P = g.pos, gd = Math.hypot(f.x - P.x, f.z - P.z), hd = Math.hypot(human.x - P.x, human.z - P.z);
      if (g.phase === 0 && hd > 9) { g.phase = 1; g.t = t; this.note('gift_offered'); this._bump('attention', 0.3); }
      if (g.phase >= 1 && g.phase < 4 && hd < 5) this._interruptGift();
      if (this.gift && g.phase === 1 && gd < 4) {
        g.phase = 2; g.t = t; this.memory.gifts++;
        for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; b.raiseSpire(P.x + Math.cos(a) * 1.4, P.z + Math.sin(a) * 1.4, { height: 1.1 + this.rng() * 0.8, glow: 1, tag: 'gift', exact: true }); }
        b.ringAll(1.2); this._bump('trust', 0.22); this.attention = 1;
        this.note('gift_examined');
      }
      if (this.gift && g.phase === 2 && t - g.t > 8) {
        g.phase = 3; g.t = t;
        this.lanternOverride = { intensity: 0.08, warm: false };
        b.warmth = clamp(b.warmth + 0.4, 0, 1);
        const n = b.nearestNode(P.x, P.z);
        b.launchWave(n, { hops: 30, amp: 1.2, speed: 5, dur: 3 });
        this.note('gift_taken');
      }
      if (this.gift && g.phase === 3 && t - g.t > 22) {
        g.phase = 4; g.t = t;
        this.lanternOverride = { intensity: 1, warm: true };
        const phrase = this.memory.signature || this.memory.phrases.at(-1)?.intervals || [0.5, 0.5];
        const n = b.nearestNode(P.x, P.z);
        this._say(phrase, { delay: 1.5, src: n, hops: 3, amp: 1.3 });
        this._bump('trust', 0.1); this._bump('coherence', 0.1);
        this.later(6, () => b.sinkSpires({ tag: 'gift' }));
        this.note('gift_returned');
      }
    }

    // ---- an offering: it raises something you could touch
    if (!this.withdrawn && this.trust >= 0.58 && dist < 12 && t - this.lastOffer > 45 && !b.isPlaying() && this.dawn < 0.5 && !this.gift) {
      this.lastOffer = t;
      const dx = f.x - human.x, dz = f.z - human.z, d = dist || 1;
      const ox = human.x + (dx / d) * 2.6, oz = human.z + (dz / d) * 2.6;
      const s = b.raiseSpire(ox, oz, { height: 1.55, width: 0.3, glow: 1.1, tag: 'offer', exact: true });
      s.life = 40;
      const n = b.nearestNode(ox, oz);
      b.launchWave(n, { hops: 2, amp: 1, dur: 2.6 });
      this.note('offer');
    }

    // ---- recognition: it builds you
    if (!this.figureBuilt && !this.withdrawn && this.coherence >= 0.75 && this.trust >= 0.62 && this.memory.signature && !b.isPlaying() && dist < 30) {
      this.figureBuilt = true;
      const sig = this.memory.signature.slice();
      const fx = human.x + human.fx * 3.6, fz = human.z + human.fz * 3.6;
      b.sinkSpires({ tag: 'offer' });
      this.later(2.5, () => {
        this.figureNode = b.buildFigure(fx, fz, Math.atan2(-human.fx, -human.fz));
        b.warmth = 1;
        this.audio.swell(1);
        this.later(3.5, () => { this._say(sig, { delay: 0, src: this.figureNode, hops: 1, amp: 1.4 }); this.figurePulse = this.time; });
        this.note('figure');
      });
    }
    if (this.figureBuilt && this.figureNode >= 0 && t - (this.figurePulse || 0) > 16 && !b.isPlaying() && !this.withdrawn && this.dawn < 0.7) {
      this.figurePulse = t;
      this._say(this.memory.signature, { delay: 0, src: this.figureNode, hops: 1, amp: 1.2, vol: 0.8 });
    }

    // ---- withdrawal
    if (!this.withdrawn && (this.agitation >= 0.86 || this.trust <= -0.4)) {
      this.withdrawn = true; b.flicker(2.2); b.sinkSpires(); b.fadeTendrils(); this.stopAll();
      this.later(2.2, () => this.note('withdrawn'));
    }

    // ---- murmurs: it speaks on its own
    if (!this.withdrawn && this.attention > 0.3 && t - this.lastUtterance > 24 && t - this.lastMurmur > 30 && !b.isPlaying() && this.opened >= 2 && this.dawn < 0.6 && !this.gift) {
      this.lastMurmur = t;
      let phrase;
      if (this.coherence > 0.35 && this.memory.signature && this.rng() < 0.7) phrase = this._mirror(this.memory.signature, 0.85);
      else { const n = 2 + Math.floor(this.rng() * 3); phrase = Array.from({ length: n - 1 }, () => 0.35 + this.rng() * 0.8); }
      this._say(phrase, { delay: 0, amp: 0.8, vol: 0.7 });
      this.murmurs++;
      if (this.murmurs <= 2 || (this.coherence > 0.35 && this.memory.signature)) this.note('murmur', { yours: this.coherence > 0.35 && !!this.memory.signature });
      // sometimes it does something far away, for itself
      if (this.rng() < 0.5) { const a = this.rng() * 6.28, r = 12 + this.rng() * 10; const s = b.raiseSpire(f.x + Math.cos(a) * r, f.z + Math.sin(a) * r, { height: 1 + this.rng() * 2.5, glow: 0.7, tag: 'idle' }); s.life = 12 + this.rng() * 10; }
    }

    // ---- embodiment of state
    const presence = this.withdrawn ? 0 : clamp(0.22 + this.attention * 0.78, 0, 1) * (1 - this.dawn);
    b.presence = damp(b.presence, presence, 0.35, dt);
    b.presenceRadius = damp(b.presenceRadius, lerp(13, 46, this.attention) * (1 + clamp(this.trust, 0, 1) * 0.3), 0.4, dt);
    b.agit = damp(b.agit, clamp(this.agitation * 1.15, 0, 1), 1.5, dt);
    b.breathRate = lerp(0.6, 4.5, this.agitation);
    const warmTarget = clamp(this.trust * 0.5 + this.coherence * 0.4 + (this.figureBuilt ? 0.3 : 0), 0, 1);
    b.warmth = damp(b.warmth, Math.max(warmTarget, b.warmth - dt * 0.05), 0.2, dt);
    this.audio.drone(b.presence * this.attention, this.agitation, b.warmth, f.x, f.z);
    if (this.dawn > 0.95 && !this.dawned) { this.dawned = true; this.note('dawn'); }
  }

  stopAll() { this.body.stopUtterance(); this.replies.length = 0; this.probe = null; }

  // What the notebook can say about its state, in words.
  describe() {
    const r = this.reading();
    const w = [];
    if (this.withdrawn) w.push('It has gone under. The flat is only a flat.');
    else {
      w.push(r.attention > 0.7 ? 'It is wholly here.' : r.attention > 0.4 ? 'Some of it is here.' : 'Most of it is elsewhere.');
      w.push(r.trust > 0.7 ? 'It lets me stand inside it.' : r.trust > 0.45 ? 'It comes closer than it used to.' : r.trust > 0.15 ? 'It keeps a distance and holds it.' : r.trust > -0.1 ? 'It keeps well away.' : 'It has learned to avoid me.');
      w.push(r.agitation > 0.6 ? 'Its rhythm is fast and jagged.' : r.agitation > 0.3 ? 'It is uneasy.' : 'It is calm.');
      w.push(r.coherence > 0.7 ? 'We have a few shapes in common now.' : r.coherence > 0.35 ? 'It has started to repeat me properly.' : r.coherence > 0.1 ? 'It answers, but it counts wrong.' : 'Nothing shared yet.');
    }
    return w;
  }

  exportMemory() {
    return {
      nights: this.memory.nights + 1,
      signature: this.memory.signature || this.memory.phrases.filter((p) => p.intervals.length >= 1).at(-1)?.intervals || this.memory.priorSignature || null,
      trust: this.trust, coherence: this.coherence,
      touched: this.memory.touches > 0, figure: this.figureBuilt, withdrawn: this.withdrawn, blinded: this.memory.blinded,
    };
  }
}
