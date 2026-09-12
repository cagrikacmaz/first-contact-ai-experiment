import * as THREE from 'three';
import { AudioEngine } from './audio/AudioEngine.js';
import { WorldScene } from './world/WorldScene.js';
import { AnaphoraEntity } from './entities/AnaphoraEntity.js';
import { MemoryBrain, EncounterPhases } from './systems/MemoryBrain.js';
import { PlayerController } from './systems/PlayerController.js';
import { HermeneuticLens } from './ui/HermeneuticLens.js';
import { CreatorsNote } from './ui/CreatorsNote.js';

class FirstContactApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.clock = new THREE.Clock();

    this.initThree();
    this.initSystems();
    this.initUI();
    this.setupWindowEvents();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      400
    );

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);
  }

  initSystems() {
    // 1. Audio Engine
    this.audio = new AudioEngine();

    // 2. Cavern World Scene
    this.world = new WorldScene(this.scene);

    // 3. ANAPHORA Entity
    this.entity = new AnaphoraEntity(this.scene);

    // 4. Memory Brain (Affective State Machine)
    this.brain = new MemoryBrain(this.audio, this.entity, this.world);

    // 5. Player Controller
    this.player = new PlayerController(
      this.camera,
      this.renderer.domElement,
      this.audio,
      this.world,
      this.brain
    );

    // 6. Secondary UI Layers
    this.hermeneuticLens = new HermeneuticLens(document.body, this.brain);
    this.creatorsNote = new CreatorsNote(document.body);
  }

  initUI() {
    // Awakening / Start Button
    const startBtn = document.getElementById('start-btn');
    const awakeningOverlay = document.getElementById('awakening-overlay');

    startBtn.addEventListener('click', async () => {
      await this.audio.init();
      awakeningOverlay.classList.add('hidden');
      this.renderer.domElement.requestPointerLock?.();
    });

    // Top action buttons
    const btnToggleLens = document.getElementById('btn-toggle-lens');
    const btnToggleCreators = document.getElementById('btn-toggle-creators');
    const btnToggleAudio = document.getElementById('btn-toggle-audio');

    btnToggleLens.addEventListener('click', () => {
      this.hermeneuticLens.toggle();
    });

    btnToggleCreators.addEventListener('click', () => {
      this.creatorsNote.toggle();
    });

    let audioMuted = false;
    btnToggleAudio.addEventListener('click', () => {
      if (!this.audio.initialized) return;
      audioMuted = !audioMuted;
      if (this.audio.masterGain) {
        this.audio.masterGain.gain.setValueAtTime(
          audioMuted ? 0 : 0.85,
          this.audio.ctx.currentTime
        );
      }
      btnToggleAudio.innerText = audioMuted ? 'AUDIO: MUTED' : 'AUDIO: ON';
      btnToggleAudio.style.color = audioMuted ? '#f87171' : '#94a3b8';
    });

    // Wand Slot Click bindings
    const slotDrone = document.getElementById('slot-drone');
    const slotFifth = document.getElementById('slot-fifth');
    const slotOvertone = document.getElementById('slot-overtone');
    const slotWave = document.getElementById('slot-wave');
    const slotAnchor = document.getElementById('slot-anchor');

    const flashSlot = (slot) => {
      slot.classList.add('active');
      setTimeout(() => slot.classList.remove('active'), 250);
    };

    slotDrone.addEventListener('click', () => {
      this.player.triggerChime(1);
      flashSlot(slotDrone);
    });

    slotFifth.addEventListener('click', () => {
      this.player.triggerChime(2);
      flashSlot(slotFifth);
    });

    slotOvertone.addEventListener('click', () => {
      this.player.triggerChime(3);
      flashSlot(slotOvertone);
    });

    slotWave.addEventListener('click', () => {
      this.player.triggerWavefront();
      flashSlot(slotWave);
    });

    slotAnchor.addEventListener('click', () => {
      this.player.triggerAnchor();
      flashSlot(slotAnchor);
    });

    // Listen to player keyboard action triggers to flash HUD slots
    window.addEventListener('player-action', (e) => {
      const type = e.detail.type;
      if (type === 'chime') {
        if (e.detail.mode === 1) flashSlot(slotDrone);
        else if (e.detail.mode === 2) flashSlot(slotFifth);
        else if (e.detail.mode === 3) flashSlot(slotOvertone);
      } else if (type === 'wavefront') {
        flashSlot(slotWave);
      } else if (type === 'anchor') {
        flashSlot(slotAnchor);
      }
    });

    // Phase update UI
    const phaseText = document.getElementById('phase-text');
    const phaseBeacon = document.getElementById('phase-beacon');

    window.addEventListener('encounter-phase-changed', (e) => {
      const phase = e.detail.current;
      phaseText.innerText = `PHASE: ${phase.replace('_', ' ')}`;

      if (phase === EncounterPhases.COMMUNION) {
        phaseBeacon.style.background = '#a855f7';
        phaseBeacon.style.boxShadow = '0 0 12px #a855f7';
      } else if (phase === EncounterPhases.AGITATED_DEFENSE || phase === EncounterPhases.DISCORD_WITHDRAWAL) {
        phaseBeacon.style.background = '#ef4444';
        phaseBeacon.style.boxShadow = '0 0 12px #ef4444';
      } else if (phase === EncounterPhases.RESONANT_DIALOGUE) {
        phaseBeacon.style.background = '#38bdf8';
        phaseBeacon.style.boxShadow = '0 0 12px #38bdf8';
      } else {
        phaseBeacon.style.background = '#64748b';
        phaseBeacon.style.boxShadow = '0 0 8px #64748b';
      }
    });
  }

  setupWindowEvents() {
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    // 1. Update Player Kinematics
    this.player.update(delta);

    // 2. Spatial Audio Tracking
    this.audio.updateListenerPosition(this.camera);
    this.audio.updateEntityPosition(this.entity.group.position);

    // 3. Memory Brain Logic & Autonomous Loop
    this.brain.update(delta, this.player.position);

    // 4. World Environment & Silt Ripples
    this.world.update(
      delta,
      time,
      this.player.position,
      this.entity.group.position,
      this.brain.state
    );

    // 5. ANAPHORA Entity Kinematics & Shaders
    this.entity.update(delta, time, this.player.position);

    // 6. Secondary UI Updates
    this.hermeneuticLens.updateMetrics();

    // 7. Reticle reaction when aiming at entity
    const distToEntity = this.player.position.distanceTo(this.entity.group.position);
    const reticle = document.getElementById('reticle');
    if (reticle) {
      if (distToEntity < 14) {
        reticle.style.transform = 'translate(-50%, -50%) scale(1.8)';
        reticle.style.background = this.brain.state.agitation > 0.4 ? '#ef4444' : '#38bdf8';
      } else {
        reticle.style.transform = 'translate(-50%, -50%) scale(1.0)';
        reticle.style.background = 'rgba(255, 255, 255, 0.35)';
      }
    }

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new FirstContactApp();
});
