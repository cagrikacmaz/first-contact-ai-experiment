/**
 * HermeneuticLens.js - Secondary Interpretation Layer
 * Slide-over drawer rendering real-time spectrographic telemetry,
 * affective state gauges, and chronological contact interpretations.
 */
export class HermeneuticLens {
  constructor(container, brain) {
    this.container = container;
    this.brain = brain;
    this.isOpen = false;

    this.createDOM();
    this.setupListeners();
  }

  createDOM() {
    this.panel = document.createElement('div');
    this.panel.className = 'hermeneutic-lens';
    this.panel.innerHTML = `
      <div class="lens-header">
        <div class="lens-title">
          <span class="lens-indicator"></span>
          <span>EXO-ACOUSTIC SPECTROGRAPH // HERMENEUTIC LENS</span>
        </div>
        <button class="lens-close-btn" id="lens-close" title="Close Lens (Tab)">✕</button>
      </div>

      <div class="lens-body">
        <!-- Live Real-time Spectrograph Canvas -->
        <div class="lens-section">
          <div class="section-title">REAL-TIME RESONANCE FIELD</div>
          <canvas id="spectrograph-canvas" class="spectrograph-canvas" width="400" height="110"></canvas>
        </div>

        <!-- Telemetry Meters -->
        <div class="lens-section">
          <div class="section-title">AFFECTIVE ENTITY STATE</div>
          <div class="metric-row">
            <div class="metric-label">TRUST / HARMONY</div>
            <div class="metric-bar-wrap">
              <div class="metric-bar" id="bar-trust" style="width: 20%"></div>
            </div>
            <div class="metric-value" id="val-trust">0.20</div>
          </div>

          <div class="metric-row">
            <div class="metric-label">TENSION / AGITATION</div>
            <div class="metric-bar-wrap">
              <div class="metric-bar bar-agitation" id="bar-agitation" style="width: 5%"></div>
            </div>
            <div class="metric-value" id="val-agitation">0.05</div>
          </div>

          <div class="metric-row">
            <div class="metric-label">CURIOSITY / INQUIRY</div>
            <div class="metric-bar-wrap">
              <div class="metric-bar bar-curiosity" id="bar-curiosity" style="width: 45%"></div>
            </div>
            <div class="metric-value" id="val-curiosity">0.45</div>
          </div>

          <div class="metric-row">
            <div class="metric-label">COMPREHENSION</div>
            <div class="metric-bar-wrap">
              <div class="metric-bar bar-comprehension" id="bar-comprehension" style="width: 5%"></div>
            </div>
            <div class="metric-value" id="val-comprehension">0.05</div>
          </div>
        </div>

        <!-- Current Perceptual Hypothesis -->
        <div class="lens-section">
          <div class="section-title">CURRENT DEDUCED INTERPRETATION</div>
          <div class="hypothesis-box" id="hypothesis-text">
            Entity perceives an erratic thermal-kinetic emitter at cavern perimeter. Analyzing vibrational coherence.
          </div>
        </div>

        <!-- Chronological Contact Log -->
        <div class="lens-section">
          <div class="section-title">CONTACT CHRONOLOGY & DEDUCTIONS</div>
          <div class="contact-log-stream" id="contact-log-stream">
            <!-- Dynamically populated entries -->
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(this.panel);

    this.canvas = this.panel.querySelector('#spectrograph-canvas');
    this.canvasCtx = this.canvas.getContext('2d');
    this.logStream = this.panel.querySelector('#contact-log-stream');
  }

  setupListeners() {
    const closeBtn = this.panel.querySelector('#lens-close');
    closeBtn.addEventListener('click', () => this.toggle(false));

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        this.toggle();
      }
    });

    window.addEventListener('encounter-log-updated', (e) => {
      this.renderLogEntry(e.detail);
      this.updateHypothesis();
    });

    window.addEventListener('encounter-phase-changed', () => {
      this.updateHypothesis();
    });
  }

  toggle(force) {
    this.isOpen = (typeof force === 'boolean') ? force : !this.isOpen;
    if (this.isOpen) {
      this.panel.classList.add('open');
      document.exitPointerLock?.();
    } else {
      this.panel.classList.remove('open');
    }
  }

  updateMetrics() {
    if (!this.isOpen) return;

    const s = this.brain.state;
    const format = (v) => v.toFixed(2);

    this.setMeter('bar-trust', 'val-trust', s.trust);
    this.setMeter('bar-agitation', 'val-agitation', s.agitation);
    this.setMeter('bar-curiosity', 'val-curiosity', s.curiosity);
    this.setMeter('bar-comprehension', 'val-comprehension', s.comprehension);

    this.drawSpectrograph();
  }

  setMeter(barId, valId, value) {
    const bar = this.panel.querySelector(`#${barId}`);
    const val = this.panel.querySelector(`#${valId}`);
    if (bar && val) {
      bar.style.width = `${Math.min(100, Math.max(0, value * 100))}%`;
      val.innerText = value.toFixed(2);
    }
  }

  drawSpectrograph() {
    if (!this.canvasCtx) return;
    const ctx = this.canvasCtx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = 'rgba(2, 6, 23, 0.25)';
    ctx.fillRect(0, 0, w, h);

    const time = performance.now() * 0.003;
    const resonance = this.brain.state.resonance;
    const agitation = this.brain.state.agitation;

    // Draw interference harmonic wave
    ctx.beginPath();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = agitation > 0.4 ? '#ef4444' : resonance > 0.5 ? '#a855f7' : '#38bdf8';

    for (let x = 0; x < w; x++) {
      const freq1 = Math.sin(x * 0.05 + time * 3.0);
      const freq2 = Math.cos(x * 0.12 - time * 2.0) * (0.5 + resonance);
      const noise = (Math.random() - 0.5) * agitation * 30;
      const y = h / 2 + (freq1 + freq2) * 22 + noise;

      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Center baseline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
  }

  renderLogEntry(entry) {
    const item = document.createElement('div');
    item.className = 'log-item';

    let deltaBadges = '';
    if (entry.deltas) {
      for (const [key, val] of Object.entries(entry.deltas)) {
        const isPos = val.startsWith('+');
        deltaBadges += `<span class="delta-badge ${isPos ? 'pos' : 'neg'}">${key}: ${val}</span>`;
      }
    }

    item.innerHTML = `
      <div class="log-meta">
        <span class="log-time">+${entry.timestamp}s</span>
        <span class="log-type">${entry.type}</span>
      </div>
      <div class="log-desc">${entry.description}</div>
      <div class="log-interp">↳ <em>Interpretation:</em> ${entry.interpretation}</div>
      ${deltaBadges ? `<div class="log-deltas">${deltaBadges}</div>` : ''}
    `;

    this.logStream.insertBefore(item, this.logStream.firstChild);
  }

  updateHypothesis() {
    const hypBox = this.panel.querySelector('#hypothesis-text');
    if (!hypBox) return;

    const phase = this.brain.currentPhase;
    const s = this.brain.state;

    let text = '';
    if (phase === 'COMMUNION') {
      text = 'Complete perceptual synthesis. The entity perceives the human as an intentional harmonic counterpart. Perceptual foliation is fully open.';
    } else if (phase === 'AGITATED_DEFENSE') {
      text = 'Warning state. Invasive kinetic proximity or discordant acoustic pulses have triggered defensive crystallization. Further agitation may cause full severance.';
    } else if (phase === 'DISCORD_WITHDRAWAL') {
      text = 'Phase severed. The entity has determined mutual interaction to be destructive or incompatible, retreating beyond reach.';
    } else if (phase === 'RESONANT_DIALOGUE') {
      text = 'Active mutual entrainment. Reciprocal consonant intervals have formed a shared temporal-acoustic cadence between both parties.';
    } else if (phase === 'TENTATIVE_INQUIRY') {
      text = 'Entity is testing structural consistency. It has transmitted tone probes and is analyzing the latency and pitch ratio of responses.';
    } else {
      text = 'Dormant observation. Senses presence in the silt, withholding definitive reaction until intent is demonstrated.';
    }

    hypBox.innerText = text;
  }
}
