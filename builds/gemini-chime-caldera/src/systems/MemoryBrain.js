/**
 * MemoryBrain.js - Affective Neural State Machine & Encounter Memory
 * Models the internal cognitive/affective state of ANAPHORA,
 * tracking trust, tension, cadence, harmonic reciprocity, and autonomous behavior.
 */

export const EncounterPhases = {
  DORMANT_OBSERVER: 'DORMANT_OBSERVER',
  TENTATIVE_INQUIRY: 'TENTATIVE_INQUIRY',
  RESONANT_DIALOGUE: 'RESONANT_DIALOGUE',
  COMMUNION: 'COMMUNION',
  AGITATED_DEFENSE: 'AGITATED_DEFENSE',
  DISCORD_WITHDRAWAL: 'DISCORD_WITHDRAWAL',
  SILENT_EQUIPOISE: 'SILENT_EQUIPOISE'
};

export class MemoryBrain {
  constructor(audio, entity, world) {
    this.audio = audio;
    this.entity = entity;
    this.world = world;

    // Continuous affective dimensions (0.0 to 1.0)
    this.state = {
      trust: 0.2,
      agitation: 0.05,
      curiosity: 0.45,
      resonance: 0.15,
      comprehension: 0.05
    };

    this.currentPhase = EncounterPhases.DORMANT_OBSERVER;

    // Chronological memory of events
    this.memoryLog = [];
    this.recentEvents = []; // Last 20 interaction events

    // Autonomous behavior timers
    this.autonomousTimer = 0;
    this.nextAutonomousInterval = 7.0; // seconds
    this.awaitingResponse = null; // Active inquiry waiting for player response

    // Movement tracking
    this.lastPlayerPos = null;
    this.timeSinceLastPlayerAction = 0;
    this.consecutiveHarmonics = 0;
    this.consecutiveDiscords = 0;

    // Log the moment of initial encounter
    this.recordLog(
      'FIRST_DETECTION',
      'Entity detected unfamiliar kinetic-thermal field at cavern perimeter.',
      'Cautious equilibrium maintained. Senses vibrational tension in silt.'
    );
  }

  recordLog(eventType, eventDesc, interpretation, deltas = {}) {
    const entry = {
      id: Date.now() + Math.random(),
      timestamp: (performance.now() / 1000).toFixed(1),
      type: eventType,
      description: eventDesc,
      interpretation: interpretation,
      deltas: deltas,
      phase: this.currentPhase,
      affectiveSnapshot: { ...this.state }
    };

    this.memoryLog.push(entry);
    if (this.memoryLog.length > 80) this.memoryLog.shift();

    // Custom event dispatch for UI
    window.dispatchEvent(new CustomEvent('encounter-log-updated', { detail: entry }));
  }

  /**
   * Handle player chime event
   * @param {number} mode 1: Low Drone, 2: Mid Fifth, 3: High Overtone
   */
  onPlayerChime(mode) {
    this.timeSinceLastPlayerAction = 0;
    const now = performance.now() / 1000;

    // Record chime in recent events
    this.recentEvents.push({ type: 'chime', mode, time: now });
    if (this.recentEvents.length > 20) this.recentEvents.shift();

    // Check cadence: rapid spamming triggers agitation
    const rapidSpam = this.calculateSpamRate();
    if (rapidSpam > 2.2) {
      this.state.agitation = Math.min(1.0, this.state.agitation + 0.25);
      this.state.trust = Math.max(0.0, this.state.trust - 0.15);
      this.consecutiveDiscords++;
      this.consecutiveHarmonics = 0;

      this.audio.playEntityVoice('agitated_discord');
      this.entity.triggerAcousticReaction(1.8);

      this.recordLog(
        'ACOUSTIC_OVERLOAD',
        `Rapid erratic chimes emitted (Cadence: ${rapidSpam.toFixed(1)}/s).`,
        'Entity perceives erratic acoustic bombardment as hostile turbulence. Coiling defensively.',
        { agitation: '+0.25', trust: '-0.15' }
      );
      this.evaluatePhase();
      this.applyEntityKinematics();
      return;
    }

    // Check if answering an active inquiry
    if (this.awaitingResponse) {
      const timeToRespond = now - this.awaitingResponse.time;
      const expectedMode = this.awaitingResponse.expectedMode;

      if (mode === expectedMode || mode === 2) {
        // Harmonic match!
        this.state.trust = Math.min(1.0, this.state.trust + 0.22);
        this.state.resonance = Math.min(1.0, this.state.resonance + 0.25);
        this.state.agitation = Math.max(0.0, this.state.agitation - 0.1);
        this.state.comprehension = Math.min(1.0, this.state.comprehension + 0.18);
        this.consecutiveHarmonics++;
        this.consecutiveDiscords = 0;

        this.audio.playEntityVoice('harmonic_reply');
        this.entity.triggerAcousticReaction(1.2);

        this.recordLog(
          'PHASE_LOCK_ESTABLISHED',
          `Player reciprocated acoustic tone [Mode ${mode}] after ${(timeToRespond).toFixed(1)}s.`,
          'Reciprocal frequency resonance detected. The entity recognizes intent and non-random structure.',
          { trust: '+0.22', resonance: '+0.25', comprehension: '+0.18' }
        );
      } else {
        // Partial harmonic dissonance
        this.state.curiosity = Math.min(1.0, this.state.curiosity + 0.12);
        this.state.comprehension = Math.min(1.0, this.state.comprehension + 0.05);

        this.audio.playEntityVoice('inquiry');
        this.entity.triggerAcousticReaction(0.8);

        this.recordLog(
          'ASYMMETRIC_ECHO',
          `Player emitted contrasting harmonic interval [Mode ${mode}].`,
          'Entity observes asymmetric overtone; registering exploratory variation.',
          { curiosity: '+0.12' }
        );
      }
      this.awaitingResponse = null;
    } else {
      // Spontaneous player chime
      if (mode === 1) {
        // Ground drone: grounding, calming
        this.state.agitation = Math.max(0.0, this.state.agitation - 0.08);
        this.state.curiosity = Math.min(1.0, this.state.curiosity + 0.1);
        this.audio.playEntityVoice('harmonic_reply');
        this.entity.triggerAcousticReaction(0.9);

        this.recordLog(
          'SUB_BASAL_ALIGNMENT',
          'Player emitted 55 Hz sub-harmonic drone.',
          'Entity perceives piezoelectric silt ground-resonance. Calming effect noted.',
          { agitation: '-0.08', curiosity: '+0.10' }
        );
      } else if (mode === 2) {
        // Mid fifth: harmonic inquiry
        this.state.resonance = Math.min(1.0, this.state.resonance + 0.12);
        this.state.trust = Math.min(1.0, this.state.trust + 0.08);
        this.audio.playEntityVoice('harmonic_reply');
        this.entity.triggerAcousticReaction(1.1);

        this.recordLog(
          'FIFTH_CONSONANCE',
          'Player pulsed harmonic fifth (165 Hz).',
          'Consonant ratio established. Ribbon foliation aligns in symmetric standing wave.',
          { resonance: '+0.12', trust: '+0.08' }
        );
      } else if (mode === 3) {
        // High crystalline chime
        this.state.curiosity = Math.min(1.0, this.state.curiosity + 0.18);
        this.entity.triggerAcousticReaction(1.4);
        this.audio.playEntityVoice('inquiry');

        this.recordLog(
          'CRYSTALLINE_OVERTONE',
          'Player sounded 440 Hz crystalline overtone.',
          'Orbiting acoustic shards vibrate in sympathetically induced flutter.',
          { curiosity: '+0.18' }
        );
      }
    }

    this.evaluatePhase();
    this.applyEntityKinematics();
  }

  /**
   * Handle player optical wavefront pulse
   */
  onPlayerWavefront(pos) {
    this.timeSinceLastPlayerAction = 0;
    this.state.curiosity = Math.min(1.0, this.state.curiosity + 0.2);
    this.state.resonance = Math.min(1.0, this.state.resonance + 0.1);
    this.entity.triggerAcousticReaction(1.2);

    this.audio.playWavefrontPulse();
    this.world.addRipple(pos.x, pos.z, 2.2);

    // Entity responds with curious inquiry
    setTimeout(() => {
      this.audio.playEntityVoice('inquiry');
    }, 600);

    this.recordLog(
      'LUMINOUS_INTERFERENCE_RING',
      'Optical wavefront projected across silt floor toward entity.',
      'Surface photoreceptive ribbons absorb coherent light ring. Entity uncurls curious outer foliation.',
      { curiosity: '+0.20', resonance: '+0.10' }
    );

    this.evaluatePhase();
    this.applyEntityKinematics();
  }

  /**
   * Handle placing a Resonance Anchor
   */
  onPlayerPlaceAnchor(pos) {
    this.timeSinceLastPlayerAction = 0;
    this.state.curiosity = Math.min(1.0, this.state.curiosity + 0.35);
    this.state.trust = Math.min(1.0, this.state.trust + 0.15);

    this.audio.playAnchorStrike();
    this.world.addResonanceAnchor(pos);
    this.entity.triggerAcousticReaction(2.0);

    // Draw entity toward anchor position
    this.entity.targetPosition.set(
      pos.x + (Math.random() - 0.5) * 4.0,
      4.2,
      pos.z - 4.0
    );

    setTimeout(() => {
      this.audio.playEntityVoice('inquiry');
    }, 1200);

    this.recordLog(
      'PHYSICAL_OFFERING_PLANTED',
      'Resonance Anchor anchored into piezoelectric silt floor.',
      'Standing wave node detected. Entity drifts toward the anchor, analyzing reflected harmonics.',
      { curiosity: '+0.35', trust: '+0.15' }
    );

    this.evaluatePhase();
    this.applyEntityKinematics();
  }

  /**
   * Track player movement stance & distance
   */
  updatePlayerMovement(playerPos, isMoving, speed) {
    if (!this.lastPlayerPos) {
      this.lastPlayerPos = playerPos.clone();
      return;
    }

    const distToEntity = playerPos.distanceTo(this.entity.position);

    // Aggressive sprinting directly at the entity
    if (isMoving && speed > 7.0 && distToEntity < 14) {
      this.state.agitation = Math.min(1.0, this.state.agitation + 0.15);
      this.state.trust = Math.max(0.0, this.state.trust - 0.1);
      
      this.audio.playEntityVoice('agitated_discord');
      this.recordLog(
        'KINETIC_SHOCKWAVE',
        `Player charged rapidly (Distance: ${distToEntity.toFixed(1)}m, Speed: ${speed.toFixed(1)}m/s).`,
        'Invasive kinetic turbulence perceived. Entity contracts into sharp protective lattice.',
        { agitation: '+0.15', trust: '-0.10' }
      );
      this.evaluatePhase();
      this.applyEntityKinematics();
    }

    // Peaceful stillness / listening presence
    if (!isMoving && distToEntity < 18) {
      this.state.agitation = Math.max(0.0, this.state.agitation - 0.005);
      this.state.trust = Math.min(1.0, this.state.trust + 0.004);
    }

    this.lastPlayerPos.copy(playerPos);
  }

  calculateSpamRate() {
    const now = performance.now() / 1000;
    const veryRecent = this.recentEvents.filter(e => now - e.time < 3.0);
    return veryRecent.length / 3.0;
  }

  /**
   * Evaluates narrative encounter phase
   */
  evaluatePhase() {
    const s = this.state;
    let nextPhase = this.currentPhase;

    if (s.agitation > 0.65) {
      nextPhase = EncounterPhases.AGITATED_DEFENSE;
    } else if (s.agitation > 0.85 || this.consecutiveDiscords >= 3) {
      nextPhase = EncounterPhases.DISCORD_WITHDRAWAL;
    } else if (s.trust > 0.65 && s.resonance > 0.65 && s.comprehension > 0.5) {
      nextPhase = EncounterPhases.COMMUNION;
    } else if (s.trust > 0.35 && s.resonance > 0.3) {
      nextPhase = EncounterPhases.RESONANT_DIALOGUE;
    } else if (s.curiosity > 0.35) {
      nextPhase = EncounterPhases.TENTATIVE_INQUIRY;
    } else {
      nextPhase = EncounterPhases.DORMANT_OBSERVER;
    }

    if (nextPhase !== this.currentPhase) {
      const prevPhase = this.currentPhase;
      this.currentPhase = nextPhase;

      if (nextPhase === EncounterPhases.COMMUNION) {
        this.audio.playEntityVoice('communion');
        this.recordLog(
          'STATE_TRANSITION: COMMUNION',
          'Complete harmonic synthesis and perceptual alignment achieved.',
          'The foliation unfurls in all dimensions. Acoustic boundaries dissolve into cathedral of light.'
        );
      } else if (nextPhase === EncounterPhases.AGITATED_DEFENSE) {
        this.audio.playEntityVoice('agitated_discord');
        this.recordLog(
          'STATE_TRANSITION: AGITATED DEFENSE',
          'Sustained dissonance or invasive spatial violation.',
          'Entity adopts defensive obsidian configuration; emitting warning sub-harmonics.'
        );
      } else if (nextPhase === EncounterPhases.DISCORD_WITHDRAWAL) {
        this.audio.playEntityVoice('withdraw');
        this.recordLog(
          'STATE_TRANSITION: WITHDRAWAL',
          'Communication collapse. Resonance severed.',
          'Entity recedes into the vaulted abyssal ceiling.'
        );
      }

      window.dispatchEvent(new CustomEvent('encounter-phase-changed', {
        detail: { previous: prevPhase, current: nextPhase }
      }));
    }
  }

  applyEntityKinematics() {
    // Modify target position based on phase
    if (this.currentPhase === EncounterPhases.COMMUNION) {
      // Approach gently to hover within majestic proximity
      this.entity.targetPosition.set(0, 4.0, -9.0);
    } else if (this.currentPhase === EncounterPhases.AGITATED_DEFENSE) {
      // Back away and elevate
      this.entity.targetPosition.set(0, 8.5, -26.0);
    } else if (this.currentPhase === EncounterPhases.DISCORD_WITHDRAWAL) {
      // Retreat far up into the dark ceiling
      this.entity.targetPosition.set(0, 18.0, -38.0);
    } else if (this.currentPhase === EncounterPhases.RESONANT_DIALOGUE) {
      // Float at conversational proximity
      this.entity.targetPosition.set(0, 5.0, -13.0);
    } else {
      // Default home
      this.entity.targetPosition.copy(this.entity.homePosition);
    }

    this.entity.updateAffectiveState(this.state);
  }

  /**
   * Autonomous living behavior loop
   * The entity does not freeze between player clicks!
   */
  update(delta, playerPos) {
    this.timeSinceLastPlayerAction += delta;
    this.autonomousTimer += delta;

    // Gradual passive calming decay if no agitation
    if (this.state.agitation > 0.05) {
      this.state.agitation = Math.max(0.05, this.state.agitation - delta * 0.02);
    }

    // Passive decay of resonance if prolonged silence
    if (this.timeSinceLastPlayerAction > 20.0) {
      this.state.resonance = Math.max(0.1, this.state.resonance - delta * 0.015);
    }

    // Autonomous inquiry pulse
    if (this.autonomousTimer >= this.nextAutonomousInterval) {
      this.autonomousTimer = 0;
      this.nextAutonomousInterval = 7.0 + Math.random() * 5.0;

      this.executeAutonomousAction(playerPos);
    }

    // Sync affective state with entity shaders & physics
    this.entity.updateAffectiveState(this.state);
  }

  executeAutonomousAction(playerPos) {
    if (this.currentPhase === EncounterPhases.DISCORD_WITHDRAWAL) return;

    // Entity decides to emit an autonomous acoustic probe
    const probeMode = Math.random() > 0.5 ? 2 : 1;
    this.awaitingResponse = {
      time: performance.now() / 1000,
      expectedMode: probeMode
    };

    this.audio.playEntityVoice('inquiry');
    this.entity.triggerAcousticReaction(1.2);

    // Ripple outward from entity's position on silt floor
    this.world.addRipple(this.entity.position.x, this.entity.position.z, 1.8);

    // Gentle spatial repositioning (curious drift)
    if (this.currentPhase !== EncounterPhases.AGITATED_DEFENSE) {
      const offsetX = (Math.random() - 0.5) * 6.0;
      const offsetZ = -14.0 + (Math.random() - 0.5) * 5.0;
      this.entity.targetPosition.set(offsetX, 5.2 + Math.random() * 1.5, offsetZ);
    }

    this.recordLog(
      'AUTONOMOUS_INQUIRY',
      `Entity transmitted autonomous harmonic probe [Seeking Consonance].`,
      'Awaiting reciprocal acoustic interval from observer. Observing silt ripples.'
    );
  }
}
