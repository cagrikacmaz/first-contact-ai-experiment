export const SiltFloorVertexShader = `
varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const SiltFloorFragmentShader = `
uniform float uTime;
uniform vec3 uEntityPos;
uniform vec3 uPlayerPos;
uniform vec3 uRipples[16]; // x: worldX, y: worldZ, z: age/phase
uniform float uRippleIntensities[16];
uniform float uEntityStateGlow; // 0 (calm) to 1 (agitated)
uniform float uResonanceLevel;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;

// Micro noise for crystalline silt sparkle
float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

void main() {
  vec2 worldXZ = vWorldPosition.xz;
  
  // Base deep abyssal floor color (dark slate, midnight obsidian silt)
  vec3 siltBase = vec3(0.015, 0.02, 0.035);
  
  // Sparkle from piezoelectric micro-crystals in silt
  float sparkle = step(0.97, hash21(floor(worldXZ * 18.0))) * 0.15;
  vec3 siltSparkle = vec3(0.4, 0.6, 0.9) * sparkle;
  
  // Dynamic Acoustic / Footstep Ripples
  float totalRipple = 0.0;
  for (int i = 0; i < 16; i++) {
    if (uRippleIntensities[i] > 0.01) {
      vec2 center = uRipples[i].xy;
      float age = uRipples[i].z;
      float dist = length(worldXZ - center);
      
      // Expanding wavefront ring
      float ringDist = abs(dist - age * 8.0);
      float ring = exp(-ringDist * ringDist * 1.8) * exp(-age * 0.9) * uRippleIntensities[i];
      
      // Secondary harmonic ring
      float harmonicRing = exp(-pow(dist - age * 5.0, 2.0) * 2.5) * exp(-age * 1.4) * uRippleIntensities[i] * 0.5;
      
      totalRipple += ring + harmonicRing;
    }
  }
  
  // Entity distance lighting / caustic reflection pool
  float distToEntity = length(worldXZ - uEntityPos.xz);
  float entityGlow = exp(-distToEntity * 0.12) * (1.2 + uResonanceLevel * 1.0);
  vec3 entityAura = mix(
    vec3(0.1, 0.6, 0.8), // Calming cyan
    vec3(0.9, 0.25, 0.1), // Agitated crimson
    uEntityStateGlow
  ) * entityGlow * 0.7;
  
  // Interference standing waves beneath the entity
  float standingWave = sin(distToEntity * 3.5 - uTime * 3.0) * 0.5 + 0.5;
  standingWave *= exp(-distToEntity * 0.2) * (0.3 + uResonanceLevel * 0.7);
  vec3 standingGlow = vec3(0.3, 0.75, 1.0) * standingWave;
  
  // Ripple color (cyan phosphorescence shifting to violet under high resonance)
  vec3 rippleColor = mix(
    vec3(0.15, 0.8, 0.85),
    vec3(0.7, 0.35, 1.0),
    uResonanceLevel
  ) * totalRipple * 1.4;
  
  // Subtle glow around player's feet
  float distToPlayer = length(worldXZ - uPlayerPos.xz);
  float playerHalo = exp(-distToPlayer * 0.8) * 0.08;
  vec3 playerGlow = vec3(0.2, 0.5, 0.9) * playerHalo;
  
  // Distance fog for atmospheric depth
  float camDist = length(cameraPosition.xz - worldXZ);
  float fogFactor = clamp((camDist - 8.0) / 75.0, 0.0, 0.95);
  
  vec3 finalFloor = siltBase + siltSparkle + entityAura + standingGlow + rippleColor + playerGlow;
  vec3 fogColor = vec3(0.01, 0.015, 0.025);
  
  gl_FragColor = vec4(mix(finalFloor, fogColor, fogFactor), 1.0);
}
`;
