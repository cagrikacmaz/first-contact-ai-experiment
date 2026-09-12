# First Contact — self-report

**What I built.** The Stillwater: a local, full-screen first-person encounter with a folded surface suspended above a reflective sea. The surface itself is the intelligence. The world stays visible during play; controls occupy a small strip and interpretation is optional.

**Core loop.** Observe an unsolicited gesture → move or offer a signal → stop and notice the reply → adjust your next gesture in light of what happened. Continuous motion, independent initiatives, retained state, and consequences connect those exchanges.

**Communication.** Brief lights carry intervals. Held tones carry duration. Drawn contours distinguish enclosures from open paths and can be visually echoed. Silence after an action gives an answer room; approaching too soon or interrupting repeatedly creates pressure. Mouse, touch, and keyboard paths exist.

**Memory.** The simulation keeps recent actions, learned interval patterns, observations, disposition, position, and outcomes. A remembered rhythm earns a different response. State persists in this browser; pending sound events and temporary trails do not survive a reload.

**Change over time.** The intelligence initiates independently, repeats remembered timing, descends and widens with familiarity, rises and tightens under pressure, and can withdraw beyond reach. Patient interaction can establish a shared interval. You can also choose to leave without understanding.

**Strongest part.** The causal link between rhythm, the space left after it, and an answer in the same environment where the participant stands. Silence is usable, the intelligence can take a turn, and previous gestures alter future reception.

**Remaining limits.** One constrained scene; procedural rather than photorealistic rendering; coarse shape recognition; authored interpretations; no free-form cognition; screen-space gesture overlays; no fully equivalent nonvisual mode. Performance and sound mixing need judgment on the user's own hardware. There is no runtime model or API-key dependency.

**Verified.** Ten simulation tests pass. Chromium browser checks verified the three signal input paths, pattern retention, keyboard focus, listening, paused field notes, the optional Creator’s Note, and no horizontal overflow on the mobile viewport. A real pointer-drawn enclosure was recognized. The browser reported no uncaught page errors in these checks. Optional WebMCP support was not available to test.

**Manually test first.**

1. Run `npm start`, enter, and watch without acting until it sends its first three-part signal. Notice both the audible and visible reply.
2. After it finishes, place three lights with modest gaps, then wait. Repeat that spacing later and inspect the field notes for recognition.
3. Draw a loop in the water, wait for the answer, then try an open path. Hold a tone for about a second and release it.
4. Move closer, step back, and reload. Confirm that scale/distance change and the existing encounter returns.
5. Start a separate encounter from the menu and click rapidly until it withdraws. Confirm that waiting does not silently reset the ending. Try a patient series of loops and pauses in another encounter to reach a shared interval.
6. Open the field notes and Creator’s Note, toggle sound, and test the touch arrows on a phone or narrow viewport.
