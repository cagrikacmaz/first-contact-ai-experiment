// First Contact — entry point. Builds the place, the thing in the salt, and you; runs the night.

import * as THREE from 'three';
import { EffectComposer } from '../vendor/three/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/three/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/three/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/three/jsm/postprocessing/OutputPass.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Body } from './entity/body.js';
import { Mind } from './entity/mind.js';
import { AudioEngine } from './audio.js';
import { Notes } from './notes.js';
import { UI } from './ui.js';
import { clamp } from './util.js';

const params = new URLSearchParams(location.search);
const NIGHT = clamp(Number(params.get('night')) || 720, 60, 3600);   // seconds of real time until dawn
const MEM_KEY = 'firstcontact.memory.v1';

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.autoClear = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, 1, 0.05, 4200);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.65, 0.72);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------- pieces
const ui = new UI();
const audio = new AudioEngine();
let remembered = null;
try { remembered = JSON.parse(localStorage.getItem(MEM_KEY) || 'null'); } catch { remembered = null; }

const world = new World(scene, renderer);
const origin = new THREE.Vector3(6, 0, -58);
const body = new Body(scene, audio, origin, 7 + (remembered?.nights || 0));
const notes = new Notes(false);
const mind = new Mind(body, audio, remembered, onMindEvent);
notes.mind = mind;
const player = new Player(camera, scene, audio, world, onPlayerEvent);
player.lookAt(origin.x, origin.z);

fetch('/api/status').then((r) => r.json()).then((s) => {
  notes.ai = Boolean(s.ai);
  document.getElementById('ai-status').textContent = s.ai ? `notes written at runtime by ${s.model}` : 'notes in fallback mode (no model key)';
}).catch(() => { document.getElementById('ai-status').textContent = 'notes in fallback mode'; });

let started = false, elapsed = 0, ended = false;
const noteEls = { list: document.getElementById('notes-list'), kept: document.getElementById('kept'), reading: document.getElementById('reading'), verdict: document.getElementById('verdict'), clock: document.getElementById('notes-clock') };

// ---------------------------------------------------------------- events
function onMindEvent(type, data) {
  if (type === 'said') { notes.keep('it', data.intervals, 'light'); return; }
  if (type === 'heard') { notes.keep('me', data.intervals, data.modality); return; }
  notes.onEvent(type, data);
  switch (type) {
    case 'first_light': setTimeout(() => ui.hint('tap', 'space — tap the water', 6000), 4000); break;
    case 'touched': ui.flashScreen(0.3, 1400); break;
    case 'touched_figure': ui.flashScreen(0.25, 1200); break;
    case 'figure': ui.flashScreen(0.45, 2200); break;
    case 'gift_examined': ui.flashScreen(0.2, 1200); break;
    case 'blinded': ui.flashScreen(0.15, 500); break;
    case 'offer': ui.hint('offer', 'it raised something in front of you', 5000); break;
  }
  if (data.reading && data.reading.trust > 0.45) ui.hint('place', 'G — set the lantern down and step away', 6000);
}

function onPlayerEvent(type, data) {
  switch (type) {
    case 'beat': mind.perceive({ type: 'beat', modality: data.modality, x: data.x, z: data.z }); break;
    case 'lanternOn': case 'lanternOff': case 'lanternPlaced': case 'lanternTaken': mind.perceive({ type, ...data }); break;
    case 'lock': ui.setRelock(started && !data && !ui.isOpen() && !ended && !player.lockFailed); break;
    case 'act':
      if (data === 'tap') ui.hint('pulse', 'F — pulse the lantern · hold F to raise it', 6000);
      if (data === 'tooFar') ui.hint('toofar' + Math.random(), 'the lantern is over there', 2500);
      break;
  }
}

ui.onOpen = () => { player.releaseLock(); ui.setRelock(false); };
ui.onClose = () => { if (started && !ended) tryLock(); };
function tryLock() { try { player.requestLock(); } catch { /* browser cooldown; the user clicks */ } }

canvas.addEventListener('click', () => { if (started && !ended && !ui.isOpen() && !player.locked) tryLock(); });

document.getElementById('enter').addEventListener('click', async () => {
  await audio.init();
  ui.hideIntro();
  started = true; player.enabled = true;
  tryLock();
  setTimeout(() => ui.hint('look', 'move the mouse to look · W A S D to walk', 6000), 2500);
  setTimeout(() => ui.hint('notes', 'tab — field notes', 4500), 40000);
  setTimeout(() => ui.hint('dark', 'Q — put the lantern out', 5000), 95000);
});

document.getElementById('btn-sound').addEventListener('click', (e) => {
  audio.setEnabled(!audio.enabled);
  e.target.textContent = `Sound: ${audio.enabled ? 'on' : 'off'}`;
});
document.getElementById('btn-restart').addEventListener('click', () => { saveMemory(); location.reload(); });
document.getElementById('btn-another').addEventListener('click', () => { saveMemory(); location.reload(); });
document.getElementById('btn-forget').addEventListener('click', () => { localStorage.removeItem(MEM_KEY); location.reload(); });

function saveMemory() {
  try { localStorage.setItem(MEM_KEY, JSON.stringify(mind.exportMemory())); } catch { /* private mode */ }
}

// ---------------------------------------------------------------- size
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.resolution.set(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  world.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
  body.setPixelScale(renderer.getPixelRatio());
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- dawn
function endNight() {
  ended = true;
  saveMemory();
  player.releaseLock();
  const m = mind.memory;
  const lines = [];
  lines.push('<p>Daylight. The crust is drying and the mirror is going with it. Where it was, the water is only water, and there is nothing here that a camera would keep.</p>');
  lines.push(`<p>${notes.verdict(mind)}</p>`);
  const mine = m.phrases.length, its = m.own.length;
  if (mine || its) lines.push(`<p>Through the night I made ${mine} phrase${mine === 1 ? '' : 's'} and it made ${its}.${m.signature ? ' It kept one of mine.' : ''}${m.touches ? ' We touched.' : ''}${m.blinded ? ' I hurt it with the lantern' + (m.blinded > 1 ? ', more than once.' : ' once.') : ''}</p>`);
  lines.push(mind.withdrawn ? '<p>If I come back tomorrow night I do not know whether it will.</p>' : mine ? '<p>If I come back tomorrow night, it will know the rhythm.</p>' : '<p>If I come back tomorrow night, it may still be there.</p>');
  setTimeout(() => ui.showDawn(lines.join('')), 5000);
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
const env = { lanternPos: new THREE.Vector3(), lanternI: 0, ambient: new THREE.Color(), fogColor: new THREE.Color() };
const pr = () => renderer.getPixelRatio();

function update(dt) {
  if (started && !ended) elapsed += dt;
  const nightT = clamp(elapsed / NIGHT, 0, 1);

  player.update(dt, world.time);

  if (started) {
    // touching what it raised
    const near = body.spiresNear(player.pos.x, player.pos.z, 0.75);
    if (near.length) mind.perceive({ type: 'touchSpire', spire: near[0] });

    mind.update(dt, player.perceived(body.focus), nightT);
    player.lantern.override = mind.lanternOverride;
  }

  env.lanternPos.copy(player.lantern.pos); env.lanternI = player.lantern.intensity;
  env.ambient.copy(world.ground.material.uniforms.uAmbient.value); env.fogColor.copy(world.ground.material.uniforms.uFogColor.value);
  body.update(dt, camera.position, env);
  world.ground.setNodeLights(body.nodeLights());
  world.update(dt, nightT, camera, { position: player.lantern.pos, intensity: player.lantern.intensity });
  audio.setWind(0.25 + nightT * 0.4 + (mind.agitation > 0.6 ? 0.2 : 0));

  if (ui.open === 'notes') notes.render(noteEls, mind, elapsed);
  const L = player.lantern;
  ui.setLantern(L.placed ? 'lantern · set down' : L.on ? (L.raise ? 'lantern · raised' : 'lantern') : 'lantern · out');

  if (nightT >= 1 && !ended) endNight();
}

function render() {
  world.renderReflection(camera, {
    before: (h) => body.setPixelScale(pr() * (h / (window.innerHeight * pr()))),
    after: () => body.setPixelScale(pr()),
  });
  composer.render();
}

// Adaptive quality: if the machine cannot hold ~30 fps, step the resolution down rather than the atmosphere.
let frameEMA = 0.016, qualityLevel = 0, frames = 0;
const QUALITY = [1.5, 1.0, 0.75, 0.6];
function stepQualityDown() {
  if (qualityLevel >= QUALITY.length - 1) return;
  qualityLevel++;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY[qualityLevel]));
  resize();
  frameEMA = 0.016;
}

function frame() {
  requestAnimationFrame(frame);
  const raw = clock.getDelta();
  const dt = Math.min(raw, 0.05);
  update(dt);
  render();
  frames++;
  if (frames > 30) {
    frameEMA = frameEMA * 0.95 + Math.min(raw, 0.2) * 0.05;
    if (frames % 90 === 0 && frameEMA > 1 / 30) stepQualityDown();
  }
}
frame();

// debugging hook (harmless in play)
window.__fc = { player, mind, body, world, notes, ui, audio, get elapsed() { return elapsed; },
  step(dt, n = 1, draw = true) { for (let i = 0; i < n; i++) update(dt); if (draw) render(); } };
