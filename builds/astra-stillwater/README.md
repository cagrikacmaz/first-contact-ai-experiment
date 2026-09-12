# First Contact — The Stillwater

A browser encounter with a suspended, living surface that perceives intervals, contours, vibration, and proximity. You stand in shallow water. The encounter is the interface.

## Run

Install **Node.js 20 or later**, open a terminal in this project directory, and run:

```sh
npm start
```

Open **http://localhost:3000** in a modern browser with WebGL enabled. There is **no dependency installation, build step, API key, account, or external asset download**. The project works without an internet connection once Node is installed. Stop the server with Ctrl+C. If port 3000 is occupied, set the `PORT` environment variable to another port before starting.

The server binds only to your computer's loopback interface. Opening `dist/index.html` directly as a file will not work because the experience uses JavaScript modules; use the command above.

## Entering the encounter

The world is visible immediately. **Step into the stillwater** begins the encounter and requests audio playback. The small sound button mutes/unmutes it. Every important sound has a visible counterpart.

| Action | Mouse / touch | Keyboard |
| --- | --- | --- |
| Move closer or farther | Hold the on-screen arrows on narrow screens | W/S or ↑/↓ |
| Move sideways | — | A/D or ←/→ |
| Offer light | Select Light, click/tap in the scene | 1, then Space |
| Sustain a tone | Select Tone, hold and release in the scene | 2, hold/release Space |
| Draw a contour | Select Trace, drag in the scene | 3, then Space draws an enclosure |
| Listen | Select Listen | L |
| Read observations | Field notes | N |
| Menu / pause | Top-right menu | Escape |

Tones stop after five seconds, even if release is lost. Pointer cancellation, switching tools, opening a menu, losing focus, and hiding the page stop a held input. Menus and hidden tabs pause active encounter time. The help view explains the controls; the **Creator’s Note** is available only after entering.

## What is implemented

- A continuously rendered first-person scene: procedural distant shores and atmosphere, a deforming folded membrane, reflected geometry, water disturbance, luminous moving veins, fine particles, and gesture trails.
- A custom WebGL signed-distance-field renderer. Movement changes the camera position, apparent scale, reflection, and the intelligence's response to proximity.
- Three signal channels plus meaningful silence and approach/retreat. Light rhythms, tone duration, and open/closed contours are interpreted differently.
- Autonomous three-part signals. Later initiatives can reuse the interval pattern of a remembered light or tone gesture.
- Accumulating disposition: repeated measured patterns increase familiarity; interruptions, very long tones, rapid signals, and early encroachment create pressure. Stepping back and leaving space can reduce pressure before withdrawal.
- Changes embodied as membrane height/distance, fold width, color, pulse speed, reflected illumination, ripples, and sound. A terminal withdrawal moves the membrane into the distance.
- Three consequences: a shared interval, withdrawal, or deliberate departure. You can keep exploring after a shared interval. Withdrawal/departure disable further signalling in that encounter; the water and field notes remain.
- Optional chronological field notes with interpretations of observed events, rather than visible disposition meters.
- Synthesized sound: filtered water-like noise, low drones, spatially panned signals, sustained tones, and convolution reverberation. No microphone is used.
- Responsive layout, touch movement arrows, keyboard controls, native modal focus management, live text announcements, and a gentle-motion option that slows the camera/water animation.
- Local persistence with a fresh-encounter action behind an explicit in-product reset confirmation.

## Memory and behavior

The simulation is in `dist/encounter.js`, independently testable from rendering. It retains up to 80 recent actions, eight learned patterns, and 40 observations, along with continuous disposition, position, elapsed active time, and any outcome. A three-signal rhythm is recognized from measured gaps, and returning to a remembered rhythm has a different effect from introducing it for the first time. A closed contour is recognized from its path length and endpoint distance; arbitrary drawn shapes can be echoed with a changed orientation.

The browser stores one encounter under `first-contact-stillwater-v1` in `localStorage`, after signals, important events, and roughly every four active seconds. Reloading offers **Return to the stillwater**. Position, feelings, learned patterns, observations, and consequences persist. Pending individual echo events and temporary gesture trails are deliberately not restored; a resumed encounter schedules its next initiative five active seconds later.

If browser storage is blocked, the experience continues with in-memory state and the field notes explain that it will not survive closing the page. Clearing browser data, using another browser/origin/port, or choosing **Begin a different encounter** starts separate memory. Multiple tabs do not synchronize; use one encounter tab per origin to avoid competing saves.

## Runtime AI and fallback

**No runtime LLM or external AI service is used.** The intelligence is an authored, deterministic behavioral simulation with continuous state, pattern memory, and scheduled initiative. There is no hidden model call or API-key mode. Its full behavior is the default offline experience, so a separate AI fallback is unnecessary.

WebGL is required; a browser without it receives an explicit graphics error rather than a fake interactive fallback. Web Audio is optional: if it is unavailable or muted, the visual behavior and interactions remain functional.

## Technical stack

- Plain HTML, CSS, and browser ES modules; no framework or third-party packages.
- WebGL 1 / GLSL for the 3D scene and reflections.
- Canvas 2D for gesture paths, signal rings, and the tone-duration indicator.
- Web Audio API for procedural sound.
- `localStorage` for device-local continuity.
- A dependency-free Node HTTP server that serves only `dist/`.
- Native Node test runner for the simulation tests.
- An optional read-only WebMCP field-note tool is registered only if `document.modelContext` exists. Unsupported browsers simply omit it.

## Verification

```sh
npm test
npm run check
```

Ten automated behavior tests cover independent initiative, rhythm spacing, historical recognition, contours, tone duration, withdrawal, a patient route to contact, proximity/recovery, persistence, and malformed saves.

Browser verification was performed in Chromium at desktop and 390 × 844 mobile dimensions. The included `tests/browser-smoke.js` can be evaluated on a running page with an agent-browser-compatible JavaScript evaluator; it resets the test browser's current encounter and exercises the real DOM input handlers. It is a browser test script, not part of `npm test`. Real mouse dragging was separately verified to produce the closed-contour field note.

See `SELF_REPORT.md` for the delivery summary and recommended manual checks.

## Limits, fragile areas, and intentional simplifications

- This is one bounded shore and encounter, not an open world. Movement is constrained; there is no free-look, physical collision system, inventory, human avatar, or hand model. Embodiment comes from the camera and water-level movement.
- The geometry and water are stylized procedural approximations. Reflections use ray marching with perturbed surface normals; the sea is not a fluid simulation. Thin details may shimmer or alias, especially on lower-resolution GPUs.
- The renderer caps internal resolution and lowers it once if early frame timing is slow. Integrated/mobile GPUs vary; software WebGL can be slow. Active time is capped at 100 ms per animation frame, so extremely poor frame rates slow the simulation rather than skipping replies.
- The membrane is a finite rule system, not generally intelligent. It recognizes timing and coarse enclosure, not semantic drawings or language. Observation text is authored from event types; it is not generated prose. Trust and pressure are hidden internal values, not evidence of consciousness.
- Some subtle meanings remain ambiguous by design. Directing a close light above the horizon is treated as addressing the body using a screen-space threshold, not exact mesh hit-testing. Gesture trails are screen-space overlays; they are not persistent objects anchored to the sea floor.
- A shared interval is a recorded culmination, not proof of translation. Once reached, it is not revoked, although later gestures still affect visual disposition. The other endings require beginning a new encounter to signal again.
- Sound playback requires a browser user gesture. Synthetic browser automation may not unlock audio, and automated checks cannot judge the subjective sound mix. Test with your own speakers or headphones at a comfortable level.
- Gentle motion slows environmental animation; it is not a fully static mode. A screen reader receives controls, notes, and event announcements, but the spatial world does not have a complete nonvisual equivalent.
- The optional WebMCP API was unavailable in the verification browser; native registration/invocation was not tested. It is not needed for the human experience.
- No known blocking interaction issue remains from the performed checks. Photorealism, free-form semantic understanding, and complete nonvisual equivalence remain outside this implementation.
