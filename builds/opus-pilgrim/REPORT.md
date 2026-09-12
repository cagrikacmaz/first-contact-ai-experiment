# Self-Report: First Contact

## What I Built

An interactive deep-sea encounter between a human submersible operator and a bioluminescent distributed intelligence discovered in an abyssal cavern beneath the Arctic Ocean. The experience runs entirely in the browser using Canvas 2D rendering and procedural Web Audio.

## Core Interaction Loop

1. The player observes the entity from a distance
2. The player sends a signal (light, sound, echo, probe, silence, or movement)
3. The entity processes the signal through its memory system, updating trust/curiosity/fear/understanding
4. After a variable delay, the entity responds visually and behaviorally
5. The entity's phase may change (e.g., from "observing" to "curious"), affecting its distance, color, movement speed, and signal patterns
6. The entity also acts autonomously — drifting, emitting signals, approaching or retreating on its own
7. The player observes the response and adjusts their approach

## How Communication Works

Five signal types, each interpreted differently:

- **Light pulse / sustained beam**: Noticed immediately. Gentle pulses build curiosity; intense beams increase fear.
- **Sonar**: Strong curiosity trigger. Moderate trust builder.
- **Echo (mirror)**: The most powerful trust builder. Repeating the entity's signal tells it "I see your pattern." Builds trust at 5-10x the rate of other signals. Builds understanding.
- **Probe**: Sending a physical object toward the entity. Builds curiosity and trust. The entity visually "reaches" for probes.
- **Silence (going dark)**: Interpreted as vulnerability. Reduces fear, slowly builds trust.
- **Movement**: Slow approach is gentle. Rapid approach triggers fear. Retreat is neutral.

The entity does not use human language. It communicates through light patterns (expanding rings, geometric shapes, pulsing), color shifts, proximity changes, and its own emitted signals (tonal sounds).

## How Memory Works

The `EntityMemory` class maintains four continuous emotional variables:

- **Trust** (-1 to 1): Accumulated through gentle actions, especially mirroring. Decays slowly without interaction. Degraded by aggressive actions.
- **Curiosity** (0 to 1): Grows naturally over time and with signals. Drives approach behavior.
- **Fear** (0 to 1): Triggered by rapid approach, intense beams. Decays naturally. Reduced by silence.
- **Understanding** (0 to 1): Primarily built through mirroring (echo). Represents mutual signal comprehension.

These values determine the entity's **phase** (behavioral state), which drives all visual and behavioral expression. Phase transitions are logged for the interpretation panel.

All individual signals are recorded in a history array (last 80 signals), with timestamps and trust snapshots.

## How the Intelligence Changes Over Time

The entity progresses through phases based on accumulated emotional state:

| Phase | Trust | Curiosity | Fear | Behavior |
|-------|-------|-----------|------|----------|
| Dormant | — | low | — | Distant, dim, slow |
| Aware | — | — | — | Slightly brighter |
| Observing | — | moderate | — | Steady, watching |
| Curious | >0.1 | >0.45 | — | Approaching, faster, emits signals |
| Engaged | >0.15 | >0.45 | — | Close, bright, responds actively |
| Communicating | >0.4 | — | — | Very close, gold color, geometric patterns |
| Bonded | >0.65 | — | — | Surrounding viewport, golden, calm |
| Alarmed | — | — | >0.45 | Retreating, red flashes, scattered particles |
| Retreated | — | — | >0.75 | Gone, violet, very dim |

Phase transitions are not one-way. Fear can pull the entity back from engaged to alarmed. Trust decay can regress communicating to curious. The relationship is dynamic and fragile.

## Strongest Part of the Experience

The **atmosphere and presence**. The deep-ocean environment with marine snow, volumetric light, and the bioluminescent entity creates a genuine feeling of being somewhere unknown. The procedural audio (deep drone, water noise, sonar echoes, entity tones, hull creaks) reinforces this. The entity feels like something alive in that space rather than a UI element.

The **mirroring mechanic** is the most satisfying interaction. When the entity emits a signal and you press E to echo it, and the entity responds by brightening, approaching, and emitting a greeting — that moment of mutual recognition feels earned.

The **silence mechanic** is the most surprising. Going dark (Space) and simply waiting — letting the entity come to you — is genuinely effective and feels counter-intuitive in a way that rewards patience.

## What Remains Limited

- **Signal pattern complexity**: The entity does not truly analyze rhythmic patterns in your clicks. It categorizes signals by type and intensity, not by temporal pattern. A rapid series of clicks is treated the same as spaced-out clicks (within cooldown).
- **Visual entity states**: While color and movement change with phase, the entity doesn't form recognizable shapes or symbols. It remains an abstract particle cloud. More complex visual communication (forming images, mirroring the player's light patterns spatially) would strengthen the experience.
- **No persistence**: The encounter resets on page refresh. Local storage persistence would allow multi-session relationships.
- **No LLM integration**: The entity's interpretive capacity is purely rule-based. An LLM could add emergent, surprising dialogue or interpretation that feels less predictable.
- **Single encounter trajectory**: There is one entity, one environment. Multiple encounters with different intelligences or environments would add replayability.

## What to Test First

1. **Click to start** — verify the start screen transitions smoothly to the dark ocean with marine snow and ambient sound
2. **Wait ~18 seconds** — the entity should appear as faint lights in the upper portion of the screen
3. **Move the mouse** — the light cone should follow, illuminating marine snow
4. **Click** — you should hear a subtle click sound and see a pulse ring at your cursor; the entity should react
5. **Press S** — sonar ping with echo effect; entity brightens or shifts
6. **Scroll down** — approach the entity; it should grow larger
7. **Scroll down rapidly** — the entity should scatter/retreat (alarmed)
8. **Press Space** — go dark; screen dims, audio quiets, entity may cautiously approach
9. **Press Space again** — resume; audio returns
10. **Press E** after the entity emits a signal — trust should build visibly (entity approaches, color shifts toward gold)
11. **Press P** — deploy a probe; small glowing dot drifts upward; entity reaches for it
12. **Press Tab** — analysis panel slides in from right showing emotional state and history
13. **Click ☰ → Creator's Note** — verify the note is accessible and well-formatted
14. **Repeat mirroring (E) several times** — the entity should eventually reach "communicating" (gold color, geometric patterns) and then "bonded" (close, golden, calm)
15. **Aggressive test**: rapid clicking + rapid scroll approach — entity should become alarmed, retreat, turn red
