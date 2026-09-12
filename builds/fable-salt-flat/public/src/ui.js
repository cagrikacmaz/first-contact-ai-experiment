// Overlays: arrival, contextual hints, the notes/menu/creator panels, and dawn. Kept deliberately thin so the
// world stays the interface.

import { CREATOR_NOTE_HTML } from './creator-note.js';

export class UI {
  constructor() {
    this.$ = (id) => document.getElementById(id);
    this.intro = this.$('intro'); this.hud = this.$('hud'); this.hintEl = this.$('hint');
    this.relock = this.$('relock'); this.lanternState = this.$('lantern-state');
    this.panels = { notes: this.$('notes'), menu: this.$('menu'), creator: this.$('creator') };
    this.dawnEl = this.$('dawn');
    this.$('creator-text').innerHTML = CREATOR_NOTE_HTML;
    this.open = null;
    this.hintQueue = [];
    this.hintShown = new Set();
    this.hintTimer = null;
    this.onOpen = () => {}; this.onClose = () => {};
    this.flash = document.createElement('div'); this.flash.id = 'flash'; document.body.appendChild(this.flash);
    this._bind();
  }

  _bind() {
    document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => this.close()));
    document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => this.show(b.dataset.open)));
    this.$('btn-notes').addEventListener('click', () => this.toggle('notes'));
    this.$('btn-menu').addEventListener('click', () => this.toggle('menu'));
    window.addEventListener('keydown', (e) => {
      if (this.intro && !this.intro.classList.contains('hidden')) return;
      if (e.code === 'Tab') { e.preventDefault(); this.toggle('notes'); }
      if (e.code === 'Escape') {
        // Escape also leaves pointer lock; treat it as "menu" only when nothing is open
        if (this.open) this.close(); else setTimeout(() => { if (!this.open) this.show('menu'); }, 60);
      }
    });
  }

  show(name) {
    for (const k in this.panels) this.panels[k].classList.toggle('hidden', k !== name);
    this.open = name;
    this.onOpen(name);
  }
  close() {
    for (const k in this.panels) this.panels[k].classList.add('hidden');
    const was = this.open; this.open = null;
    this.onClose(was);
  }
  toggle(name) { if (this.open === name) this.close(); else this.show(name); }
  isOpen() { return Boolean(this.open); }

  // Hints are shown once each, briefly, at the bottom of the world.
  hint(key, text, ms = 5200) {
    if (this.hintShown.has(key)) return;
    this.hintShown.add(key);
    this.hintQueue.push({ text, ms });
    this._pump();
  }
  _pump() {
    if (this.hintTimer || !this.hintQueue.length) return;
    const h = this.hintQueue.shift();
    this.hintEl.textContent = h.text;
    this.hintEl.classList.add('show');
    this.hintTimer = setTimeout(() => {
      this.hintEl.classList.remove('show');
      this.hintTimer = setTimeout(() => { this.hintTimer = null; this._pump(); }, 1600);
    }, h.ms);
  }

  setRelock(show) { this.relock.classList.toggle('hidden', !show); }
  setLantern(text) { this.lanternState.textContent = text; }

  flashScreen(alpha = 0.5, ms = 900) {
    this.flash.style.transition = 'none'; this.flash.style.opacity = String(alpha);
    requestAnimationFrame(() => { this.flash.style.transition = `opacity ${ms}ms ease-out`; this.flash.style.opacity = '0'; });
  }

  hideIntro() { this.intro.classList.add('fading'); setTimeout(() => this.intro.classList.add('hidden'), 2500); this.hud.classList.remove('hidden'); }

  showDawn(html) {
    this.close();
    this.$('dawn-text').innerHTML = html;
    this.dawnEl.classList.remove('hidden');
    requestAnimationFrame(() => this.dawnEl.classList.add('lit'));
  }
}
