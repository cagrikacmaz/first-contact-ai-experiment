# Methodology

## Goal

This experiment was designed as a controlled creative comparison, not a normalized scientific benchmark.

The shared question was:

> If different AI systems receive the same brief, the same quality bar and the same story problem, do we only get different implementations, or different creative interpretations too?

## Builders and native environments

The builders were intentionally allowed to work in their native coding environments rather than being forced into one common harness:

| Builder | Environment |
|---|---|
| GPT-6 Astra High | Codex |
| Claude Fable 5.1 | Claude Code |
| Gemini 3.8 Flash High | Antigravity |
| Claude Opus 4.6 | Antigravity |

This means environment differences are part of the observed setup and should not be interpreted as perfectly normalized model-only effects.

## Controls held constant

- Same frozen creative brief.
- Same high-level quality bar.
- Same requirement to build a browser-based interactive encounter.
- Same requirement for autonomous behavior, memory, multiple meaningful communication channels, consequence, secondary interpretation and an in-world Creator's Note.
- No model-specific hypothesis such as "be cinematic" for one model and "be behavioral" for another.
- No post-hoc creative steering after the build handoff.
- No follow-up bug-fix prompt from the human after a builder declared the result complete; missing or fragile behavior remained part of the result.

## Creative freedom intentionally left open

The models independently chose:

- world and location,
- intelligence form or lack of form,
- sensory model,
- communication mechanics,
- human role,
- visual language,
- technical stack,
- pacing,
- ending and consequences,
- whether to use a runtime LLM.

## Build time

Observed active build times:

- Gemini 3.8 Flash High: approximately **5 minutes**
- GPT-6 Astra High: **25 minutes**
- Claude Opus 4.6: **33 minutes active work**
- Claude Fable 5.1: **54 minutes**

The Opus run encountered an Antigravity quota interruption. The waiting period is excluded from the reported 33 minutes of active model work.

Build duration is treated as descriptive evidence, not as a score.

## Evidence captured

The experiment package preserves:

- source code delivered by each builder,
- builder README/self-report files where supplied,
- real screenshots from each encounter,
- Creator's Note screens,
- secondary analysis/field-note views,
- usage/quota screenshots,
- recorded encounter video.

The edited comparison video is available at:

https://youtu.be/QhWa4g2cqmc

## Editorial visuals vs evidence

The cinematic poster/chapter images in `assets/editorial` were made **after** the runs for communication and video editing. They are visual summaries, not exact screenshots.

Raw encounter evidence is kept separately under `assets/screenshots`.

## Testing philosophy

The participant's own manual encounter remained the primary evidence. The prompt was designed so useful tests could emerge naturally from play, including:

- waiting without acting,
- repeating the same signal,
- hostile/pressuring action followed by de-escalation,
- silence/darkness,
- approach/retreat,
- mirroring,
- checking whether earlier behavior changes later reactions,
- checking whether the world remains active between inputs,
- inspecting the interpretation layer only after experiencing the world.

This repository deliberately avoids converting those observations into a single aggregate score.

## Limitations

- One run per builder is not enough to establish a stable vendor-wide tendency.
- Native tool environments differ.
- Build time and quota conditions differ.
- Rule-based intelligence can still create a convincing encounter; runtime LLM use was not required and is not treated as inherently superior.
- The participant's manual interaction path affects what is observed.
- Editorial interpretation remains subjective.

For these reasons, this should be read as a transparent creative experiment and source package rather than a scientific leaderboard.
