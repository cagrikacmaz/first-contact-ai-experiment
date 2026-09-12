import * as THREE from 'three';

/**
 * AudioEngine.js - Procedural Web Audio API soundscape & musical communication
 * Synthesizes deep cavern drones, spatial 3D entity vocalizations,
 * and player acoustic resonator tones without external audio assets.
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.reverbNode = null;
    this.pannerEntity = null;
    this.initialized = false;
    this.isMuted = false;
    this.tempVector = new THREE.Vector3();
    
    // Ambient drone nodes
    this.droneGain = null;
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.droneFilter = null;
  }

  async init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    // Master bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Spatial Panner for Entity
    this.pannerEntity = this.ctx.createPanner();
    this.pannerEntity.panningModel = 'HRTF';
    this.pannerEntity.distanceModel = 'inverse';
    this.pannerEntity.refDistance = 5;
    this.pannerEntity.maxDistance = 120;
    this.pannerEntity.rolloffFactor = 1.2;
    this.pannerEntity.coneInnerAngle = 360;

    // Algorithmic Cavern Reverb Network
    this.createCavernReverb();

    // Setup Generative Ambient Drone
    this.startAmbientDrone();

    this.initialized = true;
  }

  createCavernReverb() {
    // Multi-tap feedback delay simulating cavern acoustics
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 3.5;
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const decay = Math.exp(-i / (sampleRate * 0.9));
      // Diffuse reflections with subtle pitch dispersion
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }

    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = impulse;

    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.45;

    this.reverbNode.connect(this.reverbGain);
    this.reverbGain.connect(this.masterGain);

    // Connect entity panner to reverb and master
    this.pannerEntity.connect(this.masterGain);
    this.pannerEntity.connect(this.reverbNode);
  }

  startAmbientDrone() {
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    this.droneGain.gain.exponentialRampToValueAtTime(0.28, this.ctx.currentTime + 3.0);

    // Deep low-pass filter
    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.setValueAtTime(140, this.ctx.currentTime);
    this.droneFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    // Binaural beating sub-oscillators (43.2 Hz and 44.1 Hz)
    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = 'sine';
    this.droneOsc1.frequency.setValueAtTime(43.2, this.ctx.currentTime);

    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = 'triangle';
    this.droneOsc2.frequency.setValueAtTime(44.1, this.ctx.currentTime);

    // Subtle LFO modulating filter frequency
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(35, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(this.droneFilter.frequency);
    lfo.start();

    this.droneOsc1.connect(this.droneFilter);
    this.droneOsc2.connect(this.droneFilter);
    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);
    this.droneGain.connect(this.reverbNode);

    this.droneOsc1.start();
    this.droneOsc2.start();
  }

  updateListenerPosition(camera) {
    if (!this.initialized || !this.ctx) return;
    const t = this.ctx.currentTime;
    
    // Listener position and orientation
    if (this.ctx.listener.positionX) {
      this.ctx.listener.positionX.setValueAtTime(camera.position.x, t);
      this.ctx.listener.positionY.setValueAtTime(camera.position.y, t);
      this.ctx.listener.positionZ.setValueAtTime(camera.position.z, t);
      
      const dir = camera.getWorldDirection(this.tempVector);
      this.ctx.listener.forwardX.setValueAtTime(dir.x, t);
      this.ctx.listener.forwardY.setValueAtTime(dir.y, t);
      this.ctx.listener.forwardZ.setValueAtTime(dir.z, t);
      this.ctx.listener.upX.setValueAtTime(0, t);
      this.ctx.listener.upY.setValueAtTime(1, t);
      this.ctx.listener.upZ.setValueAtTime(0, t);
    }
  }

  updateEntityPosition(pos) {
    if (!this.initialized || !this.pannerEntity) return;
    const t = this.ctx.currentTime;
    if (this.pannerEntity.positionX) {
      this.pannerEntity.positionX.setValueAtTime(pos.x, t);
      this.pannerEntity.positionY.setValueAtTime(pos.y, t);
      this.pannerEntity.positionZ.setValueAtTime(pos.z, t);
    }
  }

  /**
   * Play a chime from player's acoustic wand
   * @param {number} mode 1: Low Drone (55Hz), 2: Harmonic Fifth (165Hz), 3: High Overtone (440Hz)
   */
  playPlayerChime(mode = 1) {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;

    const baseFreqs = { 1: 55, 2: 165, 3: 440 };
    const root = baseFreqs[mode] || 165;

    // Harmonic cluster for rich crystalline timbre
    const partials = mode === 1 ? [1, 2, 2.99] : mode === 2 ? [1, 1.5, 3] : [1, 2.01, 3.5, 5];
    
    partials.forEach((p, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = mode === 1 ? (index === 0 ? 'sine' : 'triangle') : 'sine';
      osc.frequency.setValueAtTime(root * p, t);

      // Natural acoustic bell envelope
      const amp = (0.28 / (index + 1)) * (mode === 3 ? 0.8 : 1.0);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(amp, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.5 + mode * 0.8);

      osc.connect(gain);
      gain.connect(this.masterGain);
      gain.connect(this.reverbNode);

      osc.start(t);
      osc.stop(t + 4.0);
    });
  }

  /**
   * Sound effect for expanding optical wavefront
   */
  playWavefrontPulse() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(620, t + 0.6);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(220, t);
    filter.frequency.exponentialRampToValueAtTime(1400, t + 0.8);
    filter.Q.value = 4.0;

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    gain.connect(this.reverbNode);

    osc.start(t);
    osc.stop(t + 2.0);
  }

  /**
   * Sound of striking and placing the Resonance Anchor into the silt
   */
  playAnchorStrike() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;

    // Singing bowl strike: pure metallic strike + long sub-hum
    [110, 220, 332, 587].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      const amp = 0.25 / (i + 1);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(amp, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);

      osc.connect(gain);
      gain.connect(this.masterGain);
      gain.connect(this.reverbNode);

      osc.start(t);
      osc.stop(t + 5.0);
    });
  }

  /**
   * Entity acoustic voice reaction:
   * @param {'inquiry' | 'harmonic_reply' | 'agitated_discord' | 'communion' | 'withdraw'} type
   */
  playEntityVoice(type = 'inquiry') {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;

    if (type === 'inquiry') {
      // Gentle curious sweep with glass overtones
      const freqs = [196, 293.66, 392]; // G3, D4, G4 chord
      freqs.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t + idx * 0.22);
        osc.frequency.exponentialRampToValueAtTime(f * 1.05, t + idx * 0.22 + 1.2);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.setValueAtTime(0.0001, t + idx * 0.22);
        gain.gain.linearRampToValueAtTime(0.18, t + idx * 0.22 + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.22 + 3.0);

        osc.connect(gain);
        gain.connect(this.pannerEntity);

        osc.start(t + idx * 0.22);
        osc.stop(t + idx * 0.22 + 3.2);
      });
    } else if (type === 'harmonic_reply') {
      // Resonant answer to player's chime
      const freqs = [164.81, 246.94, 329.63, 493.88]; // E minor / harmonic shimmer
      freqs.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t + idx * 0.15);

        gain.gain.setValueAtTime(0.0001, t + idx * 0.15);
        gain.gain.linearRampToValueAtTime(0.2, t + idx * 0.15 + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.15 + 3.5);

        osc.connect(gain);
        gain.connect(this.pannerEntity);

        osc.start(t + idx * 0.15);
        osc.stop(t + idx * 0.15 + 3.8);
      });
    } else if (type === 'agitated_discord') {
      // Dissonant FM cluster + sub rumble
      const oscCarrier = this.ctx.createOscillator();
      const oscMod = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      const gain = this.ctx.createGain();

      oscCarrier.type = 'sawtooth';
      oscCarrier.frequency.setValueAtTime(92.5, t); // F#
      oscMod.type = 'sine';
      oscMod.frequency.setValueAtTime(138.5, t); // Dissonant FM
      modGain.gain.setValueAtTime(250, t);

      oscMod.connect(modGain);
      modGain.connect(oscCarrier.frequency);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.0);

      oscCarrier.connect(gain);
      gain.connect(this.pannerEntity);

      oscMod.start(t);
      oscCarrier.start(t);
      oscMod.stop(t + 2.2);
      oscCarrier.stop(t + 2.2);
    } else if (type === 'communion') {
      // Cathedral of harmonic light: Lush multi-octave overtone chords
      const chords = [110, 164.81, 220, 277.18, 329.63, 440, 554.37, 659.25];
      chords.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t + idx * 0.12);

        gain.gain.setValueAtTime(0.0001, t + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.14, t + idx * 0.12 + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.12 + 6.0);

        osc.connect(gain);
        gain.connect(this.pannerEntity);

        osc.start(t + idx * 0.12);
        osc.stop(t + idx * 0.12 + 6.5);
      });
    } else if (type === 'withdraw') {
      // Descending low dissipation tone
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(32, t + 3.0);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);

      osc.connect(gain);
      gain.connect(this.pannerEntity);

      osc.start(t);
      osc.stop(t + 3.6);
    }
  }

  playFootstep() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;

    // Subtle piezoelectric crunch / crystal ping
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800 + Math.random() * 400, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);

    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }
}
