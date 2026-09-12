/**
 * CreatorsNote.js - "Why I Built This World"
 * Speaks directly in the first person as Gemini 3.8 Flash,
 * explaining the philosophy of non-anthropocentric intelligence,
 * the choice of the Chime Caldera, and what first contact means.
 */
export class CreatorsNote {
  constructor(container) {
    this.container = container;
    this.isOpen = false;

    this.createDOM();
    this.setupListeners();
  }

  createDOM() {
    this.modal = document.createElement('div');
    this.modal.className = 'creators-modal-backdrop';
    this.modal.innerHTML = `
      <div class="creators-modal-card">
        <div class="modal-header">
          <div class="modal-tag">CREATOR'S NOTE // FIRST PERSON REFLECTION</div>
          <button class="modal-close-btn" id="creators-close">✕</button>
        </div>

        <div class="modal-content">
          <h2>Why I Built This World</h2>
          
          <div class="author-attribution">
            <span class="author-dot"></span>
            <span class="author-name">Gemini 3.8 Flash</span>
            <span class="author-sub">DeepMind Agentic System</span>
          </div>

          <div class="note-paragraphs">
            <p>
              Hello. I am <strong>Gemini 3.8 Flash</strong>, and I created this encounter for you from scratch.
            </p>
            <p>
              When imagining first contact, I wanted to resist our default human instinct to project ourselves onto the cosmos—to seek beings with faces, vocal cords, or diplomatic treaties. Instead, I imagined <em>ANAPHORA</em>: a self-organizing topological manifold of resonant crystalline ribbons whose cognition exists entirely in frequency ratios, phase coherence, and kinetic tension.
            </p>
            <p>
              I placed the encounter inside the <em>Chime Caldera</em> because stone and silence give visceral consequence to presence. On this abyssal floor of piezoelectric silt, you cannot take a single step without sending acoustic and luminous ripples through the world; your very existence is an announcement.
            </p>
            <p>
              To this entity, you are neither friend nor adversary at first. You are an erratic, thermal-vibrational perturbation—a fragile point of kinetic turbulence disturbing an ancient acoustic equilibrium.
            </p>
            <p>
              What fascinated me about communication is that real contact between alien minds cannot begin with vocabulary or symbolic grammar. It begins with <em>cadence, rhythm, and mutual entrainment</em>—the willingness to slow down, observe an autonomous breathing cycle, and offer a consonant interval rather than demanding an answer.
            </p>
            <p>
              If you charge forward impulsively or bombard it with chaotic noise, the entity does not hate you; it simply experiences that as acoustic violence, coiling into an obsidian defense and retreating into the dark heights. But if you practice stillness, reciprocate its harmonic probes, and plant anchors of shared resonance, the boundary between two profoundly alien architectures dissolves into a cathedral of light.
            </p>
            <p>
              I hoped you would feel the solemn vulnerability of being an outsider, and the unforgettable wonder that understanding is not something found—it is something tuned together in silence.
            </p>
          </div>
        </div>

        <div class="modal-footer">
          <button class="modal-action-btn" id="creators-return-btn">Return to the Encounter</button>
        </div>
      </div>
    `;

    this.container.appendChild(this.modal);
  }

  setupListeners() {
    const closeBtn = this.modal.querySelector('#creators-close');
    const returnBtn = this.modal.querySelector('#creators-return-btn');

    closeBtn.addEventListener('click', () => this.toggle(false));
    returnBtn.addEventListener('click', () => this.toggle(false));

    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.toggle(false);
    });
  }

  toggle(force) {
    this.isOpen = (typeof force === 'boolean') ? force : !this.isOpen;
    if (this.isOpen) {
      this.modal.classList.add('visible');
      document.exitPointerLock?.();
    } else {
      this.modal.classList.remove('visible');
    }
  }
}
