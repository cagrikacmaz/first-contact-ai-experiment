# FIRST CONTACT // ANAPHORA (The Resonant Foliation)

An immersive, real-time 3D interactive encounter with an unknown topological intelligence, built from scratch in modern WebGL (Three.js), custom GLSL shaders, and procedural Web Audio.

---

## 1. How to Run

### Prerequisite
- **Node.js** (v18 or higher recommended; verified on Node v22)
- Any modern web browser with WebGL 2.0 and Web Audio API support (Chrome, Edge, Firefox, Safari, Brave).

### Single Startup Command
In the project directory, run:

```bash
npm install && npm run dev
```

Then open your browser at:
```
http://localhost:5173/
```

Click **"ENTER THE CALDERA"** to activate the spatial audio context and step onto the piezoelectric silt floor.

---

## 2. Features Implemented

- **The World (*The Chime Caldera*):**
  - Cathedral-scale subterranean cavern with towering hexagonal basalt pillars and hanging mineral stalactites.
  - Custom GLSL **Piezoelectric Silt Floor Shader** with real-time anisotropic sparkle, distance fog, and dynamic phosphorescent ripple rings triggered by footsteps, acoustic chimes, optical wavefronts, and entity energy pulses.
  - Atmospheric suspended particulates drifting with cavern micro-currents.

- **The Unknown Intelligence (*ANAPHORA*):**
  - A non-biological, non-mechanical self-organizing manifold of crystalline glass ribbons.
  - Multi-pass custom vertex displacement and thin-film rainbow iridescence (Fresnel / thin-film interference) shaders.
  - Resonant pulsing nucleus and 42 orbiting acoustic shards that align in laminar symmetry during harmony or scatter into chaotic orbits when agitated.
  - Autonomous 3D kinematics: breathes, hovers, drifts, inspects the observer, and responds physically to proximity and sonic cadence.

- **Human Agency & Resonator Wand:**
  - **First-Person Kinematic Presence:** Natural walk/sprint physics, head-bob, and piezoelectric footsteps with audio feedback.
  - **Acoustic Phrasing (Chimes):**
    - `[1]` Sub-Drone (55 Hz): Grounding fundamental tone that aligns with silt resonance.
    - `[2]` Harmonic 5th (165 Hz): Consonant interval that invites reciprocal inquiry.
    - `[3]` Crystalline Overtone (440 Hz): High-frequency glass overtone causing shard flutter.
  - **Luminous Interference Wavefronts (`[Q]` / `[E]`):** Projects expanding rings of coherent light across the silt floor.
  - **Resonance Anchor (`[R]` / `[F]`):** Plants a physical quartz standing-wave probe into the ground that reflects the entity's acoustic reflections back to it, drawing it closer.
  - **Kinetic Stance:** Stillness / listening presence calms the entity; sprinting directly at it triggers defensive contraction.

- **Affective Memory Matrix & State Machine (`MemoryBrain`):**
  - Continuous cognitive tracking across 4 dimensions: `Trust`, `Agitation`, `Curiosity`, `Comprehension`, and `Resonance`.
  - Memory buffer of recent interactions tracking input cadence (patience vs spam), harmonic consonant ratios, and distance changes.
  - Multiple narrative phases: `DORMANT_OBSERVER`, `TENTATIVE_INQUIRY`, `RESONANT_DIALOGUE`, `COMMUNION`, `AGITATED_DEFENSE`, `DISCORD_WITHDRAWAL`.

- **Living, Autonomous Encounter:**
  - The world does not freeze between player clicks. Every 7–12 seconds, ANAPHORA autonomously emits harmonic probes, sweeps across the cavern, or tests the player with an acoustic call-and-response challenge.

- **Procedural Web Audio Engine:**
  - 100% synthetic in-browser audio (zero external audio files).
  - Binaural sub-bass drone (43.2 Hz & 44.1 Hz beating frequencies with LFO resonance).
  - Algorithmic cavern convolution reverb simulating vast subterranean decay.
  - Spatial 3D HRTF panner tracking the entity's position relative to the player's camera.
  - Procedural FM synthesis for entity vocalizations, bell harmonics, and dissonant warning rumbles.

- **Secondary Interpretation Layer (*The Hermeneutic Lens* - `Tab`):**
  - Slide-over analytical spectrograph displaying live acoustic waveforms.
  - Real-time affective meters (Trust, Tension, Curiosity, Comprehension).
  - Chronological contact journal logging every physical event, its affective delta, and the entity's interpreted meaning.

- **Creator's Note (*"Why I Built This World"* - `[?]`):**
  - A first-person reflection written by the AI model (**Gemini 3.8 Flash**), articulating the philosophy of non-anthropomorphic intelligence and the meaning of contact without human vocabulary.

---

## 3. Technical Stack

- **Framework & Bundler:** Vite 5 (ES Modules)
- **3D Graphics:** Three.js (WebGL 2.0 with custom GLSL Vertex & Fragment Shaders)
- **Audio:** Web Audio API (HRTF Spatial Panning, Procedural Oscillators, Convolution Reverb, Biquad Filters, LFOs)
- **UI & Layout:** Pure Vanilla ES6 + Modern CSS (Custom glassmorphism, responsive grid, Canvas 2D API for spectrograph)

---

## 4. Runtime AI & Fallback Mode

- **Architecture:** The encounter is powered by an autonomous, deterministic **Affective Neural State Machine & Procedural Semantic Brain** running locally in JavaScript.
- **API Keys:** **None required.** The simulation operates 100% offline and locally out-of-the-box.
- **Fallback Status:** The local affective engine is complete and fully featured; it does not degrade into a static or scripted shell. Every tone ratio, timing cadence, and kinetic vector is dynamically evaluated in real-time.

---

## 5. Known Limitations, Fragilities & Design Intent

- **Browser Audio Autoplay Policies:** Modern browsers require user gesture before allowing audio context activation. The experience handles this via the "Enter the Caldera" awakening screen.
- **Pointer Lock on Different OS/Browsers:** On some platforms, browser pointer lock prompts for confirmation or may be exited with `Esc`. If pointer lock is released, mouse-drag looking and touch controls remain active.
- **Non-Anthropomorphic Narrative:** The encounter intentionally does not have English spoken dialogue with the alien. Understanding must be felt through movement, sound, geometry, and the secondary spectrograph.
