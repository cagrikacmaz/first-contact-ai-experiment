import * as THREE from 'three';

/**
 * PlayerController: First-person kinematics, head-bob,
 * piezoelectric footsteps, and resonator wand action bindings.
 */
export class PlayerController {
  constructor(camera, domElement, audio, world, brain) {
    this.camera = camera;
    this.domElement = domElement;
    this.audio = audio;
    this.world = world;
    this.brain = brain;

    // Movement state
    this.position = new THREE.Vector3(0, 1.8, 12); // Start at perimeter of cavern
    this.velocity = new THREE.Vector3();
    this.moveSpeed = 4.5;
    this.sprintMultiplier = 1.8;
    this.isMoving = false;
    this.currentSpeed = 0;

    // Rotation / Mouse look
    this.pitch = 0;
    this.yaw = 0;
    this.mouseSensitivity = 0.0022;
    this.isPointerLocked = false;
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    // Head-bob & footsteps
    this.bobTimer = 0;
    this.footstepDist = 0;

    // Key states
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      crouch: false
    };

    this.camera.position.copy(this.position);
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Keyboard inputs
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    // Pointer lock & drag fallback
    this.domElement.addEventListener('click', () => {
      if (!this.isPointerLocked && document.pointerLockElement !== this.domElement) {
        this.domElement.requestPointerLock?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement === this.domElement);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.yaw -= e.movementX * this.mouseSensitivity;
        this.pitch -= e.movementY * this.mouseSensitivity;
        this.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.pitch));
      } else if (this.isDragging) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.yaw -= dx * this.mouseSensitivity;
        this.pitch -= dy * this.mouseSensitivity;
        this.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.pitch));
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    this.domElement.addEventListener('mousedown', (e) => {
      if (!this.isPointerLocked) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Touch support for mobile / touch devices
    let touchStartX = 0;
    let touchStartY = 0;
    this.domElement.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.domElement.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        this.yaw -= dx * 0.003;
        this.pitch -= dy * 0.003;
        this.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.pitch));
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });
  }

  onKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = true;
        break;
      case 'KeyC':
        this.keys.crouch = true;
        break;

      // Interaction Hotkeys
      case 'Digit1':
      case 'Numpad1':
        this.triggerChime(1);
        break;
      case 'Digit2':
      case 'Numpad2':
        this.triggerChime(2);
        break;
      case 'Digit3':
      case 'Numpad3':
        this.triggerChime(3);
        break;
      case 'KeyQ':
      case 'KeyE':
        this.triggerWavefront();
        break;
      case 'KeyR':
      case 'KeyF':
        this.triggerAnchor();
        break;
    }
  }

  onKeyUp(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = false;
        break;
      case 'KeyC':
        this.keys.crouch = false;
        break;
    }
  }

  triggerChime(mode) {
    this.audio.playPlayerChime(mode);
    this.world.addRipple(this.position.x, this.position.z, 1.2);
    this.brain.onPlayerChime(mode);

    window.dispatchEvent(new CustomEvent('player-action', {
      detail: { type: 'chime', mode }
    }));
  }

  triggerWavefront() {
    this.brain.onPlayerWavefront(this.position);
    window.dispatchEvent(new CustomEvent('player-action', {
      detail: { type: 'wavefront' }
    }));
  }

  triggerAnchor() {
    // Drop anchor slightly in front of player
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();

    const anchorPos = this.position.clone().add(dir.multiplyScalar(2.5));
    anchorPos.y = 0;

    this.brain.onPlayerPlaceAnchor(anchorPos);
    window.dispatchEvent(new CustomEvent('player-action', {
      detail: { type: 'anchor', position: anchorPos }
    }));
  }

  update(delta) {
    // Compute movement direction based on yaw
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const moveDir = new THREE.Vector3();
    if (this.keys.forward) moveDir.add(forward);
    if (this.keys.backward) moveDir.sub(forward);
    if (this.keys.right) moveDir.add(right);
    if (this.keys.left) moveDir.sub(right);

    const isMovingInput = moveDir.lengthSq() > 0.001;
    if (isMovingInput) moveDir.normalize();

    // Speed calculation
    const baseSpeed = this.keys.crouch ? 1.8 : (this.keys.sprint ? this.moveSpeed * this.sprintMultiplier : this.moveSpeed);
    const targetVel = moveDir.multiplyScalar(baseSpeed);

    // Smooth inertia
    this.velocity.lerp(targetVel, delta * 8.0);
    const frameMove = this.velocity.clone().multiplyScalar(delta);
    this.position.add(frameMove);

    // Cavern boundary clamp (keep within circular caldera floor)
    const distFromOrigin = Math.hypot(this.position.x, this.position.z);
    if (distFromOrigin > 55) {
      const angle = Math.atan2(this.position.z, this.position.x);
      this.position.x = Math.cos(angle) * 55;
      this.position.z = Math.sin(angle) * 55;
    }

    this.currentSpeed = this.velocity.length();
    this.isMoving = this.currentSpeed > 0.3;

    // Head-bob & Piezoelectric footsteps
    let eyeHeight = this.keys.crouch ? 1.0 : 1.75;
    if (this.isMoving) {
      this.bobTimer += delta * (this.currentSpeed * 2.2);
      const bobY = Math.sin(this.bobTimer * 2.0) * 0.06;
      eyeHeight += bobY;

      // Footstep distance accumulator
      this.footstepDist += frameMove.length();
      if (this.footstepDist > 1.8) {
        this.footstepDist = 0;
        this.audio.playFootstep();
        this.world.addRipple(this.position.x, this.position.z, 0.45);
      }
    }

    // Apply orientation to camera
    this.camera.position.set(this.position.x, eyeHeight, this.position.z);
    
    // Euler angles (YXZ order)
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);

    // Notify brain of player kinematics
    this.brain.updatePlayerMovement(this.position, this.isMoving, this.currentSpeed);
  }
}
