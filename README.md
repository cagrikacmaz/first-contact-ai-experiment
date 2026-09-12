# First Contact: Same Brief, Four AI Models, Four Worlds

<p align="center">
  <img src="assets/editorial/hero-four-models-four-worlds.webp" alt="First Contact — four AI models, four worlds, one brief" width="100%">
</p>

**Experiment 03 in the KAM Studio AI experiment series.**

I gave four AI models the same frozen brief: **build humanity's first encounter with an unknown intelligence from scratch.**

The shared quality bar was intentionally strong: browser-based, playable, cinematic, atmosphere-first, with an intelligence that can act autonomously, remember earlier interactions, and respond differently to different forms of communication. At the same time, the models were given controlled creative freedom over the world, the intelligence, its form, its perception, the communication system, the technology stack, and the outcome of contact.

One instruction mattered especially:

> **Do not begin from a familiar alien archetype, an existing science-fiction universe, or a standard game template.**

The core moment was:

> *I enter a place. Something unknown is there. Neither side fully understands the other. I try to make contact.*

🎥 **Full experiment video:** https://youtu.be/QhWa4g2cqmc

📄 **Shared brief:** [PROMPT.md](PROMPT.md)  
🔬 **Methodology:** [METHODOLOGY.md](METHODOLOGY.md)  
📊 **Comparison notes:** [RESULTS.md](RESULTS.md)

---

## The four builds

| Model | Native environment | World | Active build time | Core communication idea |
|---|---|---|---:|---|
| **GPT-6 Astra High** | Codex | **The Stillwater** | **25 min** | intervals, contours, vibration, proximity, silence |
| **Claude Fable 5.1** | Claude Code | **The Salt Flat** | **54 min** | rhythm, light, footsteps, stillness, memory |
| **Gemini 3.8 Flash High** | Antigravity | **The Chime Caldera / ANAPHORA** | **~5 min** | resonance, sound, geometry, light |
| **Claude Opus 4.6** | Antigravity | **PILGRIM / The Deep** | **33 min active** | light, echo, mimicry, vulnerability, proximity |

> Build time is reported as active model work, not a quality score. Opus hit an Antigravity quota interruption during the run; the pause is not counted in the 33 minutes of active work.

<p align="center">
  <img src="assets/editorial/build-times.webp" alt="Build time comparison" width="82%">
</p>

Time did **not** map neatly to quality. The more interesting observation was that the models appeared to have very different thresholds for when they considered the experience complete.

---

## Same brief, different creative interpretations

<p align="center">
  <img src="assets/editorial/same-brief-four-first-contacts.webp" alt="Same brief, four first contacts" width="100%">
</p>

The biggest difference was not only visual. The builds encoded different ideas of what *communication itself* could mean.

- **The Stillwater** makes timing, contours, proximity and the space left after a gesture meaningful.
- **The Salt Flat** treats rhythm, patience, darkness, gifts and remembered patterns as part of contact.
- **ANAPHORA** frames communication as resonance, harmonic relation, geometry and acoustic/optical signaling.
- **PILGRIM** uses light, sonar, mirroring, silence, approach/retreat and vulnerability as signals.

This repository does **not** claim a scientific winner. It preserves the outputs so other people can inspect the code, run the worlds, and try different interactions themselves.

---

# Try the worlds yourself

## 1. GPT-6 Astra High — The Stillwater

<p align="center">
  <img src="assets/editorial/astra-the-stillwater-card.webp" alt="The Stillwater" width="100%">
</p>

A dark-water encounter with a folded living surface that perceives intervals, contours, vibration and proximity.

Download [Astra / The Stillwater](builds/astra-stillwater.zip), unzip it, then run:

```bash
cd astra-stillwater
npm start
```

Then open `http://localhost:3000`. No dependency install, runtime LLM, API key or external asset download is required for the default experience.

<details>
<summary><b>Real encounter screenshots and Creator's Note</b></summary>

<br>
<p align="center"><img src="assets/screenshots/astra/homepage.webp" width="92%"></p>
<p align="center"><img src="assets/screenshots/astra/creator-note.webp" width="92%"></p>

</details>

---

## 2. Claude Fable 5.1 — The Salt Flat

<p align="center">
  <img src="assets/editorial/fable-the-salt-flat-card.webp" alt="The Salt Flat" width="100%">
</p>

A flooded salt flat at night, where an intelligence beneath the crust learns through rhythm, light, footsteps, stillness and memory.

Download [Fable / The Salt Flat](builds/fable-salt-flat.zip), unzip it, then run:

```bash
cd fable-salt-flat
npm start
```

Then open `http://localhost:4173`. The experience is complete without an API key. Fable also included an **optional** runtime-AI path for rewriting field notes; behavior itself remains rule-based.

<details>
<summary><b>Real encounter screenshot and Creator's Note</b></summary>

<br>
<p align="center"><img src="assets/screenshots/fable/main-world.webp" width="92%"></p>
<p align="center"><img src="assets/screenshots/fable/creator-note-1.webp" width="92%"></p>

</details>

---

## 3. Gemini 3.8 Flash High — The Chime Caldera / ANAPHORA

<p align="center">
  <img src="assets/editorial/gemini-the-chime-caldera-card.webp" alt="The Chime Caldera / ANAPHORA" width="100%">
</p>

A resonant subterranean world inhabited by ANAPHORA, a crystalline intelligence that communicates through sound, geometry and light.

Download [Gemini / The Chime Caldera](builds/gemini-chime-caldera.zip), unzip it, then run:

```bash
cd gemini-chime-caldera
npm install
npm run dev
```

Then open `http://localhost:5173`. The encounter runs locally without a runtime LLM or API key.

<details>
<summary><b>Real encounter screenshot and Creator's Note</b></summary>

<br>
<p align="center"><img src="assets/screenshots/gemini/encounter.webp" width="92%"></p>
<p align="center"><img src="assets/screenshots/gemini/creator-note-1.webp" width="92%"></p>

</details>

---

## 4. Claude Opus 4.6 — PILGRIM / The Deep

<p align="center">
  <img src="assets/editorial/opus-pilgrim-card.webp" alt="PILGRIM / The Deep" width="100%">
</p>

A deep-ocean first contact 7,241 metres beneath Arctic ice, facing a distributed bioluminescent intelligence.

Download [Opus / PILGRIM](builds/opus-pilgrim.zip), unzip it, then run:

```bash
cd opus-pilgrim
python -m http.server 8080
```

Then open `http://localhost:8080`. The experience is self-contained and uses no runtime LLM or API key.

<details>
<summary><b>Real encounter screenshot and Creator's Note</b></summary>

<br>
<p align="center"><img src="assets/screenshots/opus/response.webp" width="92%"></p>
<p align="center"><img src="assets/screenshots/opus/creator-note-1.webp" width="92%"></p>

</details>

---

# Creator's Note requirement

Each builder was asked to leave an optional in-world **Creator's Note / Why I Built This World** after the encounter had begun. The purpose was to compare three things:

1. what the model said it intended,
2. what it actually built,
3. what the participant actually experienced.

The real Creator's Note screens are included in the galleries above rather than paraphrased here.

---

# Suggested tests for your own first contact

The builds are interactive, so do not feel obligated to reproduce my exact run. A few useful things to try:

1. **Do nothing for a while.** Does the intelligence initiate contact on its own?
2. **Repeat the same signal several times.** Does the response change?
3. **Approach, then retreat.** Is distance itself interpreted?
4. **Try silence/darkness where available.** Does absence become a signal?
5. **Mirror the intelligence's own pattern.** Is mimicry recognized?
6. **Create tension and then de-escalate.** Does the encounter remember what happened earlier?
7. **Reload or start another encounter.** What, if anything, persists?

If you run one of the worlds, I would genuinely like to know what happened in your session.

---

# Evidence and transparency

The `/builds` directory contains downloadable ZIP archives of the four delivered projects, with local dependency/cache folders removed where appropriate for repository size and hygiene (for example, Gemini's `node_modules` and Fable's local `.claude` settings). No post-hoc feature fixes were added by me after the model declared the build complete.

The `/assets/screenshots` folders contain **real captured screens from the actual builds**, including Creator's Notes and secondary analysis/field-note views.

The `/assets/editorial` images are **editorial visuals created after the experiment** for the video and publication package. They are not raw screenshots and should not be treated as evidence of exact in-product rendering.

---

# The question behind the experiment

This is not a scientific benchmark and the native environments were intentionally not normalized into one common harness.

The question was narrower:

> **If different AI systems receive the same brief, the same quality bar and the same story problem, do we only get different implementations, or different creative interpretations too?**

For this run, the evidence points strongly toward the second.

---

## Video

▶️ **Watch the full experiment:** https://youtu.be/QhWa4g2cqmc

Experiment by **Çağrı Kaçmaz / KAM Studio**.
