# First Contact

A browser-based encounter with an unknown intelligence, set on a flooded salt flat at night.

You are a hydrological surveyor who stayed behind after the team drove out. The flat is a mirror the size of a horizon: a few centimetres of rainwater over salt crust. Something lives in the crust. It perceives the world through rhythm, pressure, stillness and light, and it answers by mirroring. You have one lantern, your footsteps, your hands, and one night.

## Run it

Requires Node.js 18 or newer. No install step, no build step, no dependencies.

```bash
npm start
```

Then open http://localhost:4173 in a modern desktop browser (Chrome, Edge or Firefox; Safari works but is less tested). Headphones recommended.

`node server.js` does the same thing. Set `PORT` to change the port.

### Optional: runtime AI for the field notes

The experience is complete without any API key. If you set one, the surveyor's field notes (the interpretation layer) are rewritten at runtime by a Claude model in the same voice, using the current state of the encounter.

Create a `.env` file next to `server.js`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

or export the variable in your shell before `npm start`. The menu shows whether notes are in runtime-AI or fallback mode. The model defaults to `claude-opus-5`; override with `FIRST_CONTACT_MODEL`. The call is made server-side with plain `fetch` against the Messages API so the project stays dependency-free.

**Fallback mode** (no key): every note is written from a hand-authored template set in the surveyor's voice, selected by event and state. Nothing else in the experience depends on the model. If a key is present but the call fails (bad key, offline, refusal, timeout), the template text is kept silently.

### Testing shortcuts

- `?night=180` shortens the night to 180 seconds (default 720, clamp 60 to 3600). Useful for seeing dawn quickly.
- The console exposes `window.__fc` (player, mind, body, world, notes) and `__fc.step(dt, n, draw)` to advance the simulation manually.

## Controls

| Input | Meaning |
|---|---|
| mouse | look (click the world to capture the pointer; if the browser refuses pointer lock, drag to look) |
| W A S D | walk. Shift: run |
| Space | tap the water |
| F | pulse the lantern. Hold F: raise the lantern high and keep it there |
| Q | put the lantern out / relight it |
| G | set the lantern down / pick it up (within two steps) |
| Tab | field notes (interpretation) |
| Esc | menu: creator's note, sound, another night |

Nothing else is explained on purpose. What the thing can perceive, and what it does with it, is what the night is for.

## What is implemented

**The place.** A procedurally lit salt flat with a real planar reflection (the scene is rendered a second time from a mirrored camera, with oblique clipping), Fresnel-blended over salt crust with Voronoi polygon cracks, wet and dry patches, ripple rings from every footstep and tap that physically distort the reflection, a sky that runs from dusk through deep night to dawn, a galaxy band, twinkling stars, a rising moon with halo, a distant ridge, exponential fog, and bloom. Everything is generated; there are no texture or audio files.

**The intelligence.** A dendritic lattice of about four hundred nodes under the water, grown from a seed with cross-links. Its presence is a soft region that moves within the lattice: nodes near its focus breathe, nodes farther out are dark. It speaks with pulses of light that travel along the lattice edges (a breadth-first wave from a source node, each carrying a tone panned by position), with temporary tendrils it grows toward you, and with translucent salt spires it raises from the crust. Colour, breathing rate, spire sharpness and the harmony of its drone follow its internal state before any text does.

**Communication channels you have.** Rhythm on the water (taps), rhythm in light (lantern pulses), stillness, distance and speed of approach, darkness (lantern out), the raised lantern, offering the lantern (set it down and walk away), and touch (walking into a spire). Each is read differently, and the same act reads differently depending on history.

**How it reads a phrase.** Taps or pulses closer than 1.6 seconds apart form a phrase. It compares a phrase against its own last utterance (did you mirror it?), against your recent phrases (are you repeating yourself?), and against a noise threshold (too many, too irregular). Mirroring it is the fastest way in. Early on it echoes you with wrong counts; as shared vocabulary grows it echoes exactly, then extends your phrase by a beat, then answers with spires as well as light.

**Memory.** It keeps every phrase you make and every utterance it made, counts repetitions to find your signature rhythm, and remembers being blinded (twice and it keeps a standing distance from a lit lantern), ignored probes (three and it stops asking), shattered spires, touches, and the gift. On its own it will later replay your signature, altered. Across sessions it stores your signature, its trust and coherence in `localStorage`; the next night it plays your rhythm before you do anything, and starts warmer or colder depending on how the last night went. "Forget it all" on the dawn screen clears this.

**Autonomy.** It initiates: the first light at about 13 seconds, a two-beat knock at about 30 seconds if you have done nothing, probes when you stand still, a search in the dark when the lantern is out, murmurs when idle, spires raised and sunk far away for no one, and an offer (a single spire two steps in front of you) once trust is high.

**Consequences.** Trust, attention, agitation and coherence drive everything. Possible arcs include: recognition (it builds a figure of salt your height that pulses in your rhythm), the gift (it takes your lantern's light into the crust and returns it changed), withdrawal (it goes fully dark for the rest of the night, with a slow forgiveness path: lantern out and stillness), standoff, and simple misunderstanding. Dawn ends every night regardless; it does not stay for daylight.

**Interpretation layer.** Tab opens the surveyor's field notes: dated entries, the rhythms it seems to have kept (drawn as beat glyphs, yours and its), a four-line reading in words with bars, and a one-paragraph guess at what it may have made of you. Hidden until you open it.

**Creator's note.** In the menu, after the encounter has begun.

## Technical stack

- Vanilla JavaScript ES modules, no bundler.
- three.js r170, vendored under `public/vendor/three` (core module plus the postprocessing files bloom needs), resolved via an import map.
- Custom GLSL for sky, stars, ground/mirror, lattice nodes and edges, and spires.
- Web Audio API for everything audible: filtered-noise wind, synthesized footsteps and taps, a convolution reverb from a generated impulse, a state-driven drone, and per-node tones on a just-intonation scale.
- A ~150-line Node.js static server with one optional API route.

## Runtime AI

Used only for the field notes, only if a key is present, only server-side. It never drives behaviour; the intelligence is a hand-written state machine and would not be more alive with a language model behind it.

## Known limits, fragile parts, and things that may not behave as intended

- **Performance.** The ground shader evaluates 20 ripples and 28 under-water lights per pixel plus noise and Voronoi, and the scene is rendered twice for the mirror. Integrated GPUs should be fine at 1080p; if the frame rate falls under about 30 fps the renderer steps its resolution down automatically. There is no manual quality setting.
- **Pointer lock.** Some embedded or restricted browsers refuse it. The game then falls back to drag-to-look and the "click to look around" prompt is suppressed. In a normal browser tab you click once to capture the mouse and Esc to release it (Esc also opens the menu).
- **Tuning is opinionated and not exhaustively balanced.** A player who mirrors precisely can reach the recognition ending in about six exchanges; a player who taps randomly may never get past wrong-count echoes. Both are intended, but the pacing across a full twelve-minute night has been tested mostly by simulation, not by many humans.
- **The gift sequence** requires walking at least nine metres from the set-down lantern and staying more than five metres away for roughly forty seconds while it examines, takes and returns the light. Coming back early interrupts it (no penalty).
- **Touching** is walking into a spire (within 0.75 m). There is no reach gesture. Before trust is established a touched spire shatters and counts against you.
- **Audio** starts only after the Enter click (browser policy). Muting is in the menu. The drone is intentionally quiet.
- **No mobile or touch support.** Keyboard and mouse only.
- **Cross-night memory** is per browser, per origin, in `localStorage`.
- The reflection uses a half-resolution target; very thin bright lines can shimmer in it.
- Stars are placed on a hemisphere and do not rotate with time.

## Layout

```
server.js               static server + optional /api/note
public/index.html       shell and overlays
public/styles.css
public/src/main.js      loop, wiring, dawn, memory persistence, adaptive quality
public/src/world.js     sky, stars, moon, ridge, mirror ground
public/src/player.js    first-person body, lantern, taps, footsteps
public/src/entity/body.js   lattice, waves, tendrils, spires (rendering and playback)
public/src/entity/mind.js   perception, state, memory, responses, arcs
public/src/audio.js     procedural sound
public/src/notes.js     interpretation layer
public/src/ui.js        overlays and hints
public/src/creator-note.js
public/vendor/three/    three.js r170 (vendored)
```
