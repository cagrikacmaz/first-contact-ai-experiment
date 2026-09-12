import * as THREE from 'three';
import { SiltFloorVertexShader, SiltFloorFragmentShader } from '../shaders/SiltFloorShader.js';

export class WorldScene {
  constructor(scene) {
    this.scene = scene;
    this.ripples = []; // active ripples
    this.maxRipples = 16;
    this.anchors = []; // planted resonance anchors

    // Init ripple uniform arrays
    this.ripplePosArray = new Float32Array(this.maxRipples * 3);
    this.rippleIntensities = new Float32Array(this.maxRipples);

    this.createEnvironment();
    this.createSiltFloor();
    this.createBasaltPillars();
    this.createSuspendedParticulates();
  }

  createEnvironment() {
    // Ambient abyssal fog
    this.scene.fog = new THREE.FogExp2(0x020409, 0.015);
    this.scene.background = new THREE.Color(0x020409);

    // Subtle atmospheric light
    const hemiLight = new THREE.HemisphereLight(0x0f172a, 0x020617, 0.6);
    this.scene.add(hemiLight);

    // Distant faint blue directional wash
    const dirLight = new THREE.DirectionalLight(0x1e3a8a, 0.4);
    dirLight.position.set(20, 40, -30);
    this.scene.add(dirLight);
  }

  createSiltFloor() {
    const floorGeo = new THREE.PlaneGeometry(240, 240, 96, 96);
    floorGeo.rotateX(-Math.PI / 2);

    this.floorUniforms = {
      uTime: { value: 0 },
      uEntityPos: { value: new THREE.Vector3(0, 5, -18) },
      uPlayerPos: { value: new THREE.Vector3(0, 0, 0) },
      uRipples: { value: this.ripplePosArray },
      uRippleIntensities: { value: this.rippleIntensities },
      uEntityStateGlow: { value: 0.0 },
      uResonanceLevel: { value: 0.0 }
    };

    this.floorMaterial = new THREE.ShaderMaterial({
      vertexShader: SiltFloorVertexShader,
      fragmentShader: SiltFloorFragmentShader,
      uniforms: this.floorUniforms,
      side: THREE.FrontSide
    });

    this.floorMesh = new THREE.Mesh(floorGeo, this.floorMaterial);
    this.floorMesh.position.y = 0;
    this.scene.add(this.floorMesh);
  }

  createBasaltPillars() {
    this.pillarGroup = new THREE.Group();
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x080e1a,
      roughness: 0.9,
      metalness: 0.2
    });

    // Generate surrounding monolithic pillars
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const dist = 32 + Math.random() * 45;
      const height = 24 + Math.random() * 32;
      const radius = 1.8 + Math.random() * 2.2;

      // Hexagonal basalt column
      const geo = new THREE.CylinderGeometry(radius * 0.8, radius, height, 6);
      const mesh = new THREE.Mesh(geo, pillarMat);
      mesh.position.set(
        Math.cos(angle) * dist,
        height / 2 - 2,
        Math.sin(angle) * dist - 10
      );
      mesh.rotation.y = Math.random() * Math.PI;
      this.pillarGroup.add(mesh);

      // Hanging stalactite counterparts
      if (Math.random() > 0.4) {
        const stalHeight = 15 + Math.random() * 20;
        const stalGeo = new THREE.ConeGeometry(radius * 0.7, stalHeight, 5);
        const stalMesh = new THREE.Mesh(stalGeo, pillarMat);
        stalMesh.position.set(
          mesh.position.x + (Math.random() - 0.5) * 6,
          40 - stalHeight / 2,
          mesh.position.z + (Math.random() - 0.5) * 6
        );
        stalMesh.rotation.x = Math.PI;
        this.pillarGroup.add(stalMesh);
      }
    }

    this.scene.add(this.pillarGroup);
  }

  createSuspendedParticulates() {
    const particleCount = 1800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = Math.random() * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120 - 15;
      scales[i] = 0.5 + Math.random() * 1.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    // Particle material
    const particleMat = new THREE.PointsMaterial({
      color: 0x67e8f9,
      size: 0.25,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, particleMat);
    this.scene.add(this.particles);
  }

  addRipple(x, z, intensity = 1.0) {
    // Overwrite oldest ripple or add new
    if (this.ripples.length >= this.maxRipples) {
      this.ripples.shift();
    }
    this.ripples.push({
      x,
      z,
      age: 0,
      intensity
    });
  }

  addResonanceAnchor(position) {
    const anchorGroup = new THREE.Group();
    
    // Crystalline quartz rod
    const rodGeo = new THREE.CylinderGeometry(0.08, 0.12, 1.8, 6);
    const rodMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.9
    });
    const rod = new THREE.Mesh(rodGeo, rodMat);
    rod.position.y = 0.9;
    anchorGroup.add(rod);

    // Glowing emitter head
    const headGeo = new THREE.OctahedronGeometry(0.28);
    const headMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.8;
    anchorGroup.add(head);

    // Subtle local point light
    const anchorLight = new THREE.PointLight(0xa855f7, 1.5, 12);
    anchorLight.position.y = 1.8;
    anchorGroup.add(anchorLight);

    anchorGroup.position.copy(position);
    anchorGroup.position.y = 0;
    this.scene.add(anchorGroup);

    this.anchors.push({
      group: anchorGroup,
      head,
      position: anchorGroup.position.clone(),
      createdAt: performance.now()
    });

    // Create a series of anchor strike ripples
    this.addRipple(position.x, position.z, 2.0);
  }

  update(delta, time, playerPos, entityPos, entityState) {
    // Update floor uniforms
    this.floorUniforms.uTime.value = time;
    this.floorUniforms.uPlayerPos.value.copy(playerPos);
    this.floorUniforms.uEntityPos.value.copy(entityPos);
    this.floorUniforms.uEntityStateGlow.value = entityState.agitation;
    this.floorUniforms.uResonanceLevel.value = entityState.resonance;

    // Update ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.age += delta;
      if (r.age > 4.5) {
        this.ripples.splice(i, 1);
      }
    }

    // Pack into uniform arrays
    for (let i = 0; i < this.maxRipples; i++) {
      if (i < this.ripples.length) {
        this.ripplePosArray[i * 3 + 0] = this.ripples[i].x;
        this.ripplePosArray[i * 3 + 1] = this.ripples[i].z;
        this.ripplePosArray[i * 3 + 2] = this.ripples[i].age;
        this.rippleIntensities[i] = this.ripples[i].intensity;
      } else {
        this.rippleIntensities[i] = 0;
      }
    }

    // Animate suspended particles (gentle drift)
    if (this.particles) {
      const posAttr = this.particles.geometry.attributes.position;
      const arr = posAttr.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] -= delta * 0.3; // fall slowly
        if (arr[i + 1] < 0) arr[i + 1] = 28; // recycle to top
        arr[i] += Math.sin(time * 0.4 + i) * delta * 0.2;
      }
      posAttr.needsUpdate = true;
    }

    // Animate anchors
    this.anchors.forEach(a => {
      a.head.rotation.y += delta * 1.8;
      a.head.rotation.z += delta * 0.9;
      // Periodic pulse ripple
      if (Math.sin(time * 2.0) > 0.98) {
        this.addRipple(a.position.x, a.position.z, 0.4);
      }
    });
  }
}
