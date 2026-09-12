// Field notes: the interpretation layer. The surveyor writes what they think happened. Entries come from
// templates; when the server has a model key, the model rewrites them in the same voice.

import { fmtTime, phraseSimilarity } from './util.js';

const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];
const num = (n) => ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] || String(n);

const T = {
  first_light: () => ['A light, out on the flat. Sixty metres, maybe. Not a reflection: it came from under the water.'],
  first_phrase: () => ['Two lights this time, one after the other, with a gap. Like a knock.'],
  remembered: () => ['It played a rhythm before I had done anything. It is mine. From last night.'],
  new_phrase: (d) => d.accuracy > 0.75
    ? [`I gave it ${num(d.count)}. It gave ${num(d.replyCount)} back, and the spacing was close. Closer than chance.`]
    : [`I ${d.modality === 'light' ? 'flashed' : 'tapped'} ${num(d.count)} times. It answered with ${num(d.replyCount)}. Wrong count, but it answered.`,
       `${num(d.count).replace(/^./, (c) => c.toUpperCase())} from me, ${num(d.replyCount)} from it. Either it cannot count or it is not counting.`],
  repeated: (d) => [`Same phrase again from me. This time it came back ${d.replyCount === d.count ? 'with the right count' : 'nearly right'}. Repetition seems to matter to it.`],
  mirrored: (d) => [`I copied what it had just done. It copied me copying it. I think that is the first thing we have agreed on.`, `I mirrored it and it mirrored me. The spacing was exact. This is not weather.`, `Its phrase, back to it. Then mine, back to me, brighter. We are taking turns now.`],
  extended: (d) => [`I gave its phrase back and it returned it with one more beat on the end. It is not repeating any more. It is adding.`],
  noise: (d) => [`I hammered out ${num(d.count)} quick ones with no pattern. A single dim pulse came back. I think that was a question.`, `Too many, too fast. It gave one flat light and nothing else.`],
  warning: () => ['The light went hard and fast, flickering, and drew back all at once. That was a warning. I should be quieter.'],
  no_reply: () => ['Nothing came back. Either it did not hear, or it is not listening to me right now.'],
  single: () => ['One tap. Nothing. One tap is probably not a word.'],
  single_answered: () => ['One tap from me, one light from it. Knock, knock.'],
  probe: () => ['I stood still and a line of light came across the water toward me and stopped a step short. Then one pulse, right at my feet. It is asking.'],
  dark_probe: () => ['With the lantern out it came looking for me. A thread of light along the crust to where I stood. It finds me by something other than sight.'],
  probe_answered: () => ['I answered the line at my feet. Something in it brightened.'],
  probe_ignored: (d) => d.count >= 3 ? ['I let its question go a third time. The lines have stopped coming.'] : ['I did not answer the line it sent. After a while the light in it thinned out.'],
  blinded: (d) => d.count >= 2 ? ['I raised the lantern again. It went dark in a ring around the light and pulled away further than before. It keeps a distance from the lantern now.'] : ['I held the lantern up to see it better and the whole flat flinched. Dark spread out from where I stood. It does not like the light held on it.'],
  startled: () => ['I ran toward it. It broke up and scattered back. Slower.'],
  touched: (d) => d.first ? ['I walked into the spire it raised. Cold, wet salt. Every light on the flat answered at once, and a sound went through the water I felt in my knees.'] : ['I touched it again. The flat rang.'],
  touched_figure: () => ['I put my hand on the thing it built of me. It answered from everywhere.'],
  broken: () => ['I touched a spire and it collapsed into the water with a crack. The lights went red and pulled back. That was not an offer. I should have waited.'],
  offer: () => ['It raised a single spire two steps in front of me and left it there. Glowing. I think I am allowed to touch it.'],
  gift_offered: () => ['I set the lantern down on the crust and walked away from it in the dark. Now we wait.'],
  gift_examined: () => ['It came to the lantern. Spires rose around it in a ring. It is looking at the one thing I brought.'],
  gift_taken: () => ['The lantern has gone dim. The light did not go out; it went sideways, into the crust. It has taken it.'],
  gift_returned: () => ['The lantern is burning again, but the flame is the wrong colour, and it pulsed my rhythm from where it stood. It gave it back changed.'],
  gift_interrupted: () => ['I went back toward the lantern too soon. It let go of it and withdrew.'],
  gift_taken_back: () => ['I picked the lantern up while it was still examining it. It pulled back. Not angry, I think. Interrupted.'],
  figure: () => ['It built something in front of me. Salt, my height, standing. It pulses in my rhythm. I think this is what it has of me.'],
  withdrawn: () => ['It has gone under. Every light out. The water is only water and I am alone on it.'],
  returned: () => ['A single faint pulse, far out. After all that. It came back.'],
  murmur: (d) => d.yours ? ['It played on its own: my rhythm, slightly changed. It has been keeping it.'] : ['It made a phrase with no prompting from me. Short. I do not know who that was for.'],
  lantern_off: () => ['I put the lantern out. The dark is total. The lights under the water are the only lights.'],
  unheard: () => ['I signalled into the dark. Nothing there to hear it.'],
  dawn: () => ['The ridge is showing. The lights are going down into the salt one by one. It does not stay for daylight.'],
};

const IMPORTANT = new Set(['new_phrase', 'first_light', 'first_phrase', 'remembered', 'mirrored', 'extended', 'warning', 'probe', 'dark_probe', 'blinded', 'touched', 'touched_figure', 'broken', 'offer', 'gift_offered', 'gift_examined', 'gift_taken', 'gift_returned', 'figure', 'withdrawn', 'returned', 'dawn', 'startled']);

export class Notes {
  constructor(ai) {
    this.ai = ai;
    this.entries = [];
    this.kept = [];         // { who:'me'|'it', intervals, modality }
    this.reading = null;
    this.lastAt = -100;
    this.seed = 0;
    this.dirty = true;
    this.mind = null;
  }

  onEvent(type, data) {
    const tpl = T[type];
    if (!tpl) return;
    const t = data.t || 0;
    if (!IMPORTANT.has(type) && t - this.lastAt < 3.5) return;   // don't narrate every beat
    this.lastAt = t;
    this.seed++;
    const options = tpl(data);
    let text = pick(options, this.seed);
    const prev = this.lastText?.[type];
    if (options.length > 1 && text === prev) text = pick(options, this.seed + 1);
    (this.lastText ||= {})[type] = text;
    const entry = { t, type, text, pending: Boolean(this.ai) };
    this.entries.push(entry);
    if (this.entries.length > 60) this.entries.shift();
    this.reading = data.reading || this.reading;
    this.dirty = true;
    if (this.ai) this._rewrite(entry, type, data);
  }

  async _rewrite(entry, type, data) {
    try {
      const recent = this.entries.slice(-6, -1).map((e) => e.text);
      const r = await fetch('/api/note', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          elapsed: fmtTime(data.t || 0), recent,
          reading: this.mind ? this.mind.describe().join(' ') : '',
          event: `${type.replace(/_/g, ' ')}. Template observation: "${entry.text}"`,
        }),
      });
      if (!r.ok) throw new Error('bad');
      const j = await r.json();
      if (j.text) entry.text = j.text;
    } catch { /* keep the template */ }
    entry.pending = false;
    this.dirty = true;
  }

  keep(who, intervals, modality = 'light') {
    const last = this.kept.at(-1);
    if (last && last.who === who && phraseSimilarity(last.intervals, intervals) > 0.98) return;
    this.kept.push({ who, intervals: intervals.slice(), modality });
    if (this.kept.length > 10) this.kept.shift();
    this.dirty = true;
  }

  verdict(mind) {
    if (!mind) return '';
    const m = mind.memory;
    if (mind.withdrawn) return 'Something loud that came too close and would not stop. It has decided I am weather.';
    if (mind.figureBuilt) return 'A shape it can hold: a rhythm that arrives, waits, and comes back the same. It has made a copy of that shape and stood it in the water.';
    if (m.touches > 0) return 'Something that answers, and that can be let close. It let me touch it, and the whole flat said so.';
    if (m.blinded >= 2) return 'A source of the wrong kind of light. It remembers the lantern more than it remembers me.';
    if (m.gifts > 0) return 'Something that gives things away. It took the one thing I brought, kept it a while, and gave it back with its own colour in it.';
    if (m.signature) return 'A repeating pattern in the dark. It has kept one of my phrases and it gives it back when I am quiet.';
    if (mind.coherence > 0.1) return 'Something that makes sounds in the water. It answers, but it is not sure yet that the answers are for anyone.';
    if (mind.memory.probesIgnored >= 2) return 'Something that does not answer when asked. It has mostly stopped asking.';
    return 'Too early to say. It has noticed that something is here.';
  }

  render(els, mind, elapsed) {
    if (!this.dirty && !mind) return;
    this.dirty = false;
    els.clock.textContent = fmtTime(elapsed);
    if (!this.entries.length) {
      els.list.innerHTML = '<div class="note empty">Nothing worth writing yet. The water is still.</div>';
    } else {
      els.list.innerHTML = this.entries.map((e) => `<div class="note${e.pending ? ' pending' : ''}"><span class="t">${fmtTime(e.t)}</span>${esc(e.text)}</div>`).join('');
      els.list.scrollTop = els.list.scrollHeight;
    }
    // kept phrases as rhythm glyphs
    if (!this.kept.length) els.kept.innerHTML = '<div class="glyph">—</div>';
    else els.kept.innerHTML = this.kept.map((k) => glyph(k)).join('');
    // reading
    if (mind) {
      const r = mind.reading();
      const words = mind.describe();
      const rows = [
        ['presence', r.attention, words[0]], ['nearness', Math.max(0, (r.trust + 0.2) / 1.2), words[1]],
        ['unease', r.agitation, words[2]], ['shared', r.coherence, words[3]],
      ];
      els.reading.innerHTML = rows.map(([l, v, w]) => `<div class="reading-row"><span class="lbl">${l}</span><div class="bar"><i style="width:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%"></i></div><span class="word">${w || ''}</span></div>`).join('');
      els.verdict.textContent = this.verdict(mind);
    }
  }
}

function glyph(k) {
  const total = k.intervals.reduce((s, v) => s + v, 0);
  const scale = 180 / Math.max(total, 1.2);
  let x = 0;
  const beats = [`<i class="beat${k.modality === 'tap' ? ' tap' : ''}" style="left:0px"></i>`];
  for (const iv of k.intervals) { x += iv * scale; beats.push(`<i class="beat${k.modality === 'tap' ? ' tap' : ''}" style="left:${x.toFixed(1)}px"></i>`); }
  return `<div class="glyph"><span class="who">${k.who === 'me' ? 'me' : 'it'}</span><div class="beats">${beats.join('')}</div></div>`;
}

function esc(s) { return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
