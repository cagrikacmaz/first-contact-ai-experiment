# First Contact

An interactive browser experience about humanity's first encounter with an unknown intelligence, set in the deep ocean.

## How to Run

**Option A — Python server (recommended):**
```bash
cd FirstContactOpus4.6Antigravity
python -m http.server 8080
```
Then open **http://localhost:8080** in a modern browser (Chrome, Firefox, Edge, or Safari).

**Option B — Any static file server:**
```bash
npx serve .
# or
npx http-server .
```

**Option C — Direct file open:**
Open `index.html` directly in your browser. All features work without a server.

> **Best experienced** with headphones, in a darkened room, on a desktop/laptop with a mouse. Mobile/touch is supported but the experience is designed for mouse + keyboard.

## The Experience

You are the sole operator of PILGRIM, a deep-sea research submersible, 7,241 meters below the Arctic ice shelf. The passage behind you has collapsed. Your surface signal is gone.

Something is down here. It has always been down here.

It is not a creature. It is a pattern — a distributed intelligence expressed as organized bioluminescence in the water. It communicates through light, rhythm, and proximity. It has never encountered anything like you.

Neither have you encountered anything like it.

## Controls

| Input | Action |
|-------|--------|
| **Mouse** | Direct your submersible's light |
| **Scroll wheel** | Approach / Retreat |
| **Click** | Send a light pulse |
| **Hold click** | Sustained beam (stronger signal) |
| **S** | Sonar ping |
| **E** | Echo — mirror the entity's last signal |
| **P** | Deploy a luminous probe |
| **Space** | Go dark (cut all emissions) / Resume |
| **Tab** | Toggle analysis panel |
| **Esc** | Close open panels |

## Features

### World & Atmosphere
- Procedurally rendered deep-ocean environment with marine snow, rock formations, and volumetric light
- Canvas 2D rendering with DPR-aware high-resolution output
- Dynamic vignette and viewport framing
- Submersible light cone that follows your gaze

### The Intelligence
- 180-particle bioluminescent entity with organic orbital movement
- 9 behavioral states: dormant → aware → observing → curious → engaged → communicating → bonded, plus alarmed and retreated
- Color shifts express internal state (blue=neutral, cyan=curious, gold=communicating, red=alarmed, violet=retreated)
- Autonomous behaviors — the entity acts on its own, emitting signals, drifting, approaching
- Signal response system with varied reactions to different player inputs

### Communication
- **5 signal types**: light pulse, sustained beam, sonar ping, echo/mirror, probe deployment
- **Movement as communication**: approach speed and retreat carry meaning
- **Silence as communication**: going dark is interpreted as vulnerability/trust
- Different signals produce meaningfully different reactions
- Mirroring (Echo) builds trust and understanding fastest

### Memory & Consequence
- Persistent emotional state: trust, curiosity, fear, understanding
- All interactions are logged and influence future behavior
- Phase transitions are tracked and affect entity distance, intensity, color, movement
- Aggressive actions accumulate and degrade trust
- Gentle, patient actions build connection over time
- The encounter does not reset — every action matters

### Sound
- Procedural audio via Web Audio API (no audio files)
- Deep ocean ambient drone with brown noise water texture
- Sonar pings with delay/echo
- Entity sounds: ethereal tones, harmonic chords, rhythmic patterns
- Hull creaks at random intervals
- Audio dims when going dark, resumes on power-up

### Narrative
- Phased story progression: intro → descent → arrival → encounter
- Context-sensitive narrative text triggered by entity state changes
- Narrative messages appear once and are not repeated
- The story emerges from what happens, not from exposition

### Interpretation
- Secondary analysis panel (Tab or menu) shows:
  - Current entity state description
  - Trust / Curiosity / Fear / Understanding meters
  - Observational insights
  - State transition history
- Designed to be discovered after initial exploration

### Creator's Note
- Accessible via the ☰ menu after the encounter begins
- Written in first person by the AI that created the experience

## Technical Stack

- **Rendering**: Canvas 2D with DPR scaling
- **Audio**: Web Audio API (procedural synthesis, no audio files)
- **Language**: Vanilla JavaScript (ES6+), no frameworks or dependencies
- **Structure**: 3 JS files + 1 HTML file with embedded CSS
- **Runtime AI**: Not used. All behavior is algorithmic. No API keys needed.

## Fallback Mode

There is no fallback mode because no runtime AI or API keys are used. The experience is fully self-contained and works entirely offline.

## Known Limitations

- **No save state**: Refreshing the page resets the encounter. Memory is session-only.
- **Entity visual fidelity**: Canvas 2D radial gradients per particle may have performance implications on very low-end hardware. Tested smooth at 60fps on modern hardware.
- **Communication depth**: The signal interpretation system uses predefined response mappings rather than emergent pattern recognition. The entity's responses are varied but not infinitely deep.
- **Touch controls**: Functional but the scroll-to-approach mechanic is less intuitive on touch devices.
- **Audio**: Procedural audio quality depends on browser implementation. Chrome and Firefox produce the best results.

## Fragile Areas

- The entity appearance timing is hard-coded (16 seconds after start). If the page is very slow to load, the timing may feel off.
- The audio `linearRampToValueAtTime` calls include `cancelScheduledValues` to prevent Chrome warnings, but rapid space-bar toggling may occasionally produce audio artifacts.
- Very rapid clicking may send many signals before the cooldown fully engages.

## File Structure

```
FirstContactOpus4.6Antigravity/
├── index.html          # HTML structure + CSS styling
├── js/
│   ├── engine.js       # Utils, noise, audio engine, environment
│   ├── entity.js       # Entity memory + intelligence behavior
│   └── main.js         # Player, narrative, UI, game loop
├── README.md           # This file
└── REPORT.md           # Self-report
```
