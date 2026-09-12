import * as THREE from 'three';
import { EntityVertexShader, EntityFragmentShader } from '../shaders/EntityShaders.js';

/**
 * AnaphoraEntity: The Resonant Foliation
 * A procedural topological manifold of crystalline glass ribbons,
 * an inner resonant nucleus, and orbiting acoustic shards.
 */
export class AnaphoraEntity {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    // World position and movement targets
    this.position = new THREE.Vector3(0, 5.5, -18);
    this.targetPosition = new THREE.Vector3(0, 5.5, -18);
    this.velocity = new THREE.Vector3();
    this.homePosition = new THREE.Vector3(0, 5.5, -18);

    // Dynamic affective state (interpolated)
    this.state = {
      trust: 0.15,
      agitation: 0.05,
      curiosity: 0.35,
      resonance: 0.1,
      acousticEnergy: 0.0
    };

    // Target affective values from Brain
    this.targetState = { ...this.state };

    // Create sub-components
    this.createCore();
    this.createRibbonFoliation();
    this.createOrbitingShards();
    this.createPointLight();

    this.group.position.copy(this.position);
    this.scene.add(this.group);
  }

  createCore() {
    const geo = new THREE.IcosahedronGeometry(1.6, 3);
    this.coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x4df3ff,
      emissive: 0x1188aa,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9,
      wireframe: true
    });
    this.coreMesh = new THREE.Mesh(geo, this.coreMaterial);
    this.group.add(this.coreMesh);
  }

  createRibbonFoliation() {
    // Multi-layered parametric foliation ribbons
    this.shaderUniforms = {
      uTime: { value: 0 },
      uAgitation: { value: this.state.agitation },
      uTrust: { value: this.state.trust },
      uResonance: { value: this.state.resonance },
      uAcousticEnergy: { value: 0 },
      uPlayerPos: { value: new THREE.Vector3() },
      uColorBase: { value: new THREE.Color(0x38bdf8) },
      uColorGlow: { value: new THREE.Color(0x67e8f9) },
      uColorAura: { value: new THREE.Color(0xa855f7) }
    };

    this.foliationMaterial = new THREE.ShaderMaterial({
      vertexShader: EntityVertexShader,
      fragmentShader: EntityFragmentShader,
      uniforms: this.shaderUniforms,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    // Outer ribbon manifold 1
    const geoRibbon1 = new THREE.TorusKnotGeometry(3.2, 0.9, 180, 48, 2, 5);
    this.ribbonMesh1 = new THREE.Mesh(geoRibbon1, this.foliationMaterial);
    this.group.add(this.ribbonMesh1);

    // Secondary folding layer 2
    const geoRibbon2 = new THREE.TorusKnotGeometry(2.4, 0.6, 140, 36, 3, 7);
    this.ribbonMesh2 = new THREE.Mesh(geoRibbon2, this.foliationMaterial);
    this.ribbonMesh2.rotation.x = Math.PI / 2;
    this.group.add(this.ribbonMesh2);
  }

  createOrbitingShards() {
    this.shardCount = 42;
    this.shards = [];
    this.shardGroup = new THREE.Group();

    const shardGeo = new THREE.TetrahedronGeometry(0.35);
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0x99eeff,
      roughness: 0.15,
      metalness: 0.85,
      transparent: true,
      opacity: 0.85
    });

    for (let i = 0; i < this.shardCount; i++) {
      const mesh = new THREE.Mesh(shardGeo, shardMat);
      const angle = (i / this.shardCount) * Math.PI * 2;
      const radius = 4.5 + Math.random() * 2.5;
      const height = (Math.random() - 0.5) * 4.0;
      
      mesh.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

      this.shards.push({
        mesh,
        baseAngle: angle,
        baseRadius: radius,
        baseHeight: height,
        speed: 0.4 + Math.random() * 0.4,
        rotSpeed: (Math.random() - 0.5) * 2.0
      });
      this.shardGroup.add(mesh);
    }
    this.group.add(this.shardGroup);
  }

  createPointLight() {
    this.light = new THREE.PointLight(0x38bdf8, 3.5, 45, 1.2);
    this.light.position.set(0, 0, 0);
    this.group.add(this.light);
  }

  /**
   * Called by Brain to update affective targets
   */
  updateAffectiveState(newState) {
    Object.assign(this.targetState, newState);
  }

  /**
   * Stimulate with acoustic pulse
   */
  triggerAcousticReaction(energy = 1.0) {
    this.state.acousticEnergy = Math.min(this.state.acousticEnergy + energy, 2.5);
  }

  update(delta, time, playerPos) {
    // Smooth lerp of affective dimensions
    const lerpSpeed = 2.5 * delta;
    this.state.trust += (this.targetState.trust - this.state.trust) * lerpSpeed;
    this.state.agitation += (this.targetState.agitation - this.state.agitation) * lerpSpeed;
    this.state.curiosity += (this.targetState.curiosity - this.state.curiosity) * lerpSpeed;
    this.state.resonance += (this.targetState.resonance - this.state.resonance) * lerpSpeed;

    // Decay transient acoustic energy
    this.state.acousticEnergy = Math.max(0, this.state.acousticEnergy - delta * 1.5);

    // Update shader uniforms
    this.shaderUniforms.uTime.value = time;
    this.shaderUniforms.uTrust.value = this.state.trust;
    this.shaderUniforms.uAgitation.value = this.state.agitation;
    this.shaderUniforms.uResonance.value = this.state.resonance;
    this.shaderUniforms.uAcousticEnergy.value = this.state.acousticEnergy;
    this.shaderUniforms.uPlayerPos.value.copy(playerPos);

    // Affective color shifting
    if (this.state.agitation > 0.4) {
      // Crimson / obsidian warning
      this.shaderUniforms.uColorBase.value.lerp(new THREE.Color(0xef4444), delta * 3.0);
      this.shaderUniforms.uColorGlow.value.lerp(new THREE.Color(0xf97316), delta * 3.0);
      this.light.color.lerp(new THREE.Color(0xff3322), delta * 3.0);
      this.light.intensity = 4.0 + Math.sin(time * 20.0) * 1.8;
    } else if (this.state.resonance > 0.6) {
      // Celestial violet / opalescent communion
      this.shaderUniforms.uColorBase.value.lerp(new THREE.Color(0xa855f7), delta * 2.0);
      this.shaderUniforms.uColorGlow.value.lerp(new THREE.Color(0x38bdf8), delta * 2.0);
      this.light.color.lerp(new THREE.Color(0xd8b4fe), delta * 2.0);
      this.light.intensity = 5.0 + Math.sin(time * 3.0) * 1.5;
    } else {
      // Calm cyan / glass turquoise
      this.shaderUniforms.uColorBase.value.lerp(new THREE.Color(0x0284c7), delta * 2.0);
      this.shaderUniforms.uColorGlow.value.lerp(new THREE.Color(0x38bdf8), delta * 2.0);
      this.light.color.lerp(new THREE.Color(0x38bdf8), delta * 2.0);
      this.light.intensity = 3.0 + Math.sin(time * 1.5) * 0.8;
    }

    // Kinematic floating motion
    const bob = Math.sin(time * 1.2) * 0.6 + Math.cos(time * 0.5) * 0.3;
    const sway = Math.sin(time * 0.7) * 0.4;
    
    // Smooth movement toward targetPosition
    this.position.lerp(this.targetPosition, delta * 1.2);
    this.group.position.set(
      this.position.x + sway,
      this.position.y + bob,
      this.position.z
    );

    // Rotation of ribbon manifolds
    const rotBase = (0.2 + this.state.resonance * 0.5 + this.state.agitation * 1.2) * delta;
    this.ribbonMesh1.rotation.y += rotBase;
    this.ribbonMesh1.rotation.x += rotBase * 0.6;
    this.ribbonMesh2.rotation.z -= rotBase * 0.8;
    this.ribbonMesh2.rotation.y += rotBase * 0.4;

    // Scale breathing: expands with trust/communion, contracts when defensive
    const scaleBase = 1.0 + (this.state.trust * 0.5) - (this.state.agitation * 0.3) + Math.sin(time * 1.4) * 0.06;
    this.ribbonMesh1.scale.setScalar(scaleBase);
    this.ribbonMesh2.scale.setScalar(scaleBase * 0.9);

    // Core pulsation
    this.coreMesh.rotation.y -= delta * 0.5;
    this.coreMesh.rotation.z += delta * 0.3;
    const coreScale = 0.8 + Math.sin(time * 3.0) * 0.1 + this.state.acousticEnergy * 0.3;
    this.coreMesh.scale.setScalar(coreScale);

    // Shards kinematics: orbit smoothly or flutter erratically
    this.shards.forEach((s, idx) => {
      const agitOffset = (Math.random() - 0.5) * this.state.agitation * 0.4;
      s.baseAngle += s.speed * delta * (1.0 + this.state.resonance * 1.5 + this.state.agitation * 3.0);
      
      const r = s.baseRadius + (this.state.trust * 1.8) - (this.state.agitation * 1.5);
      s.mesh.position.x = Math.cos(s.baseAngle) * r + agitOffset;
      s.mesh.position.z = Math.sin(s.baseAngle) * r + agitOffset;
      s.mesh.position.y = s.baseHeight + Math.sin(time * 2.0 + idx) * 0.4;
      
      s.mesh.rotation.x += s.rotSpeed * delta;
      s.mesh.rotation.y += s.rotSpeed * delta * 1.2;
    });

    // Face player slightly (orientation bias)
    const lookTarget = new THREE.Vector3(playerPos.x, this.group.position.y, playerPos.z);
    this.group.lookAt(lookTarget);
  }
}
