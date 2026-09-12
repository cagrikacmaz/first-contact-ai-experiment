# Self-report

## What I built

A first-person night on a flooded salt flat, where a distributed intelligence living in the salt crust notices you, reaches toward you, and learns you by echoing you. The flat is a mirror; the intelligence is a lattice of light under the water that can raise translucent salt spires. You have a lantern, your footsteps, your hands and about twelve minutes until dawn, when it sinks back into the crust whatever has happened.

It runs from `npm start` with no dependencies. Nothing is loaded from the network: geometry, textures, sky, sound and voice are all generated.

## The core interaction loop

1. You stand in the world. Within fifteen seconds it shows one light far out on the water; at thirty, a two-beat knock. Nothing is explained.
2. You try something: tap the water, pulse the lantern, walk, stand still, put the light out. Every act is seen by it as a pattern of arrivals in time.
3. It answers in the world: pulses travelling along its lattice with tones, a thread of light reaching to your feet, a spire lifting from the crust, or darkness spreading away from you. Colour, tempo and distance shift with its state.
4. You read the answer and adjust. The field notes (Tab) tell you what the surveyor thinks happened, after the world has already shown it.
5. Its memory of steps 2 to 4 changes what step 3 does next time.

## How communication works

The channels you have:

- **Rhythm on the water.** Space taps the water; taps closer than 1.6 s form a phrase.
- **Rhythm in light.** F pulses the lantern; light phrases carry extra weight because light is its native channel.
- **Stillness.** Standing still for six seconds invites a probe: it grows a tendril to a step short of your feet and asks with a single pulse. Answering within ten seconds raises trust; ignoring three probes makes it stop asking.
- **Distance and speed.** It keeps a distance that shrinks with trust and grows with agitation. Walking toward it inside that distance unsettles it; running at it startles it.
- **Darkness.** Lantern out makes you invisible to it except by vibration. It becomes curious and comes looking.
- **The raised lantern.** Holding F for more than 2.6 s within forty metres blinds it: the flat flinches, trust drops, and after two blindings it keeps a standing distance from any lit lantern.
- **The gift.** Set the lantern down (G) and walk nine metres away. It approaches the lantern, raises a ring of spires, draws the light into the crust, and twenty seconds later returns it with its own colour and your rhythm.
- **Touch.** Walk into a spire. If trust is established, every light on the flat answers and a chord goes through the water. If not, the spire shatters and counts against you.

How it reads a phrase: it compares your phrase against its own last utterance (mirroring), against your recent phrases (repetition), and against a noise threshold (eight or more beats, or very irregular). Mirroring is recognised as the first shared act; repetition is recognised as intent; noise is answered with a single dim pulse or, if it is already uneasy, with a hard flicker and retreat. A new phrase is echoed with an accuracy that depends on coherence: early on it returns the wrong count, later the exact count, later still your phrase plus one beat, and eventually spires rise on the beats.

## How memory works

The mind keeps: every human phrase with modality and time; every utterance it made; a signature (the human phrase repeated most often, with a fallback to the last phrase); counts of blindings, shattered spires, touches, gifts, probes answered and ignored; and a list of events. Four continuous variables (attention, trust, agitation, coherence) integrate all of it. Agitation decays slowly; trust and coherence do not decay. Specific scars persist: two blindings enforce a lantern distance for the night, three ignored probes end probing, withdrawal is sticky until a long dark stillness.

Idle murmurs replay your signature, altered, so memory is audible. The gift returns your rhythm from the lantern's position. The recognition figure pulses your rhythm every sixteen seconds.

Across sessions the signature, trust and coherence are saved in `localStorage`. The next night it starts with a fraction of that trust and plays your rhythm unprompted at about twenty-four seconds.

## How the intelligence changes over time

Embodied, in order of visibility: presence (how many nodes are alive, and the radius) follows attention; distance follows trust and agitation; colour shifts from cyan to red with agitation and toward gold with trust and coherence; breathing rate of the lattice follows agitation; spires get sharper when agitated and sink when it flinches; the drone gets louder with presence and dissonant with agitation. Arcs that can occur: recognition (it builds a figure your height), the gift, withdrawal (fully dark), forgiveness after withdrawal, and standoff. Dawn ends every night; the end card summarises what it kept of you.

## The strongest part

The mirror. Rendering a real reflection under the whole encounter means every act has a visible double: taps ripple through the reflected stars, the lattice's light doubles in the water, spires stand on their own inverted image, and the moon's rise is a clock you never read as UI. The intelligence's mirroring behaviour and the mirror world are the same idea, and the moment it echoes your rhythm back with the wrong count feels, in testing, like meeting something rather than operating it.

## What remains limited

- Balance is by simulation and a few hand runs, not many human playtests. Trust can climb quickly for a precise player.
- The intelligence has one expressive body (lattice, tendrils, spires). It does not move its lattice, only its presence within it.
- The interpretation layer is templated; with an API key the model rewrites notes, but the underlying reading is the same state machine.
- Touch is proximity only. There is no hand.
- Only keyboard and mouse. No mobile.
- Performance on weak GPUs relies on automatic resolution step-down; there is no quality menu.
- The night has one arc length. Dawn arrives on the clock, not on the story.

## What to test first, by hand

1. Enter, do nothing for 40 seconds. You should see one light far out at about 13 s, then a two-beat knock at about 30 s, with tones. Look around; the lattice's soft glow should sit on the horizon in front of you.
2. Tap Space three times, evenly. Within a few seconds it should answer with a pulse sequence of a nearby but not identical count. Open Tab: the note should say so, and both rhythms should be drawn as glyphs.
3. Copy its answer back (same count, same spacing). It should answer brighter and faster, and the note should call it the first agreed thing. Repeat two or three times: it should start extending your phrase by a beat and, later, raise spires on beats.
4. Stand still for eight seconds. A line of light should come across the water to a step short of your feet and pulse once. Tap once or twice to answer.
5. Hold F for three seconds while facing it from within forty metres. The flat should flinch dark, a low sound should hit, and it should pull away. Do it again: it now keeps its distance while the lantern is lit. Press Q to put the lantern out and stand still: it should come looking.
6. Once it raises a single spire two steps in front of you, walk into it. The whole flat should answer and a chord should swell. Walk into a spire before that point instead: it should shatter with a crack and the lights turn red.
7. Press G to set the lantern down and walk away at least ten steps. Over the next forty seconds it should come to the lantern, ring it with spires, dim it, then relight it in a different colour and play your rhythm from there.
8. Tap nine times as fast as you can, twice. It should flicker hard and retreat; keep at it and it will go fully dark. Then put the lantern out and stand still for a minute: a single faint pulse should return.
9. Run `?night=180` to reach dawn quickly and read the end card. Choose "Another night": at about 24 s it should play your rhythm before you have done anything.
10. Menu: sound toggle, creator's note, controls. Notes panel while a phrase is playing.
