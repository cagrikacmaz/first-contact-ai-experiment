export const EntityVertexShader = `
uniform float uTime;
uniform float uAgitation;
uniform float uTrust;
uniform float uResonance;
uniform float uAcousticEnergy;
uniform vec3 uPlayerPos;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;
varying float vDisplacement;
varying float vNoise;

// Simplex-like 3D noise function
vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vNormal = normalize(normalMatrix * normal);
  
  vec3 pos = position;
  
  // Harmonic oscillation based on acoustic frequency
  float breath = sin(uTime * 1.4) * 0.12 + cos(uTime * 0.7) * 0.08;
  
  // Ribbon folding waves
  float ribbonWave = sin(pos.y * 3.0 + uTime * 2.5) * 0.15 * (1.0 + uTrust * 0.8);
  
  // Noise displacement modulated by agitation vs calm
  float noiseVal = snoise(pos * 1.5 + vec3(0.0, uTime * 0.5, 0.0));
  vNoise = noiseVal;
  
  // Spiky agitation effect
  float spike = abs(noiseVal) * uAgitation * 0.45 * sin(uTime * 18.0 + pos.x * 10.0);
  
  // Harmonic resonance expansion waves
  float resonanceRing = sin(length(pos) * 6.0 - uTime * 4.0) * uResonance * 0.25;
  
  // Total displacement along normal
  float disp = breath + ribbonWave + (noiseVal * 0.12) + spike + resonanceRing + (uAcousticEnergy * 0.2);
  vDisplacement = disp;
  
  pos += normal * disp;
  
  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPos.xyz;
  
  vec4 mvPosition = viewMatrix * worldPos;
  vViewPosition = -mvPosition.xyz;
  
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const EntityFragmentShader = `
uniform float uTime;
uniform float uAgitation;
uniform float uTrust;
uniform float uResonance;
uniform float uAcousticEnergy;
uniform vec3 uColorBase;
uniform vec3 uColorGlow;
uniform vec3 uColorAura;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;
varying float vDisplacement;
varying float vNoise;

// Thin-film rainbow iridescence palette generator
vec3 pal(in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  
  // Fresnel term
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
  float innerGlow = pow(1.0 - max(dot(normal, viewDir), 0.0), 1.2);
  
  // Iridescent spectrum calculation based on normal angle and time
  float iriParam = dot(normal, viewDir) * 1.5 + vDisplacement * 2.0 + uTime * 0.15;
  vec3 iridescence = pal(
    iriParam,
    vec3(0.5, 0.5, 0.5),
    vec3(0.5, 0.5, 0.5),
    vec3(1.0, 1.0, 1.0),
    vec3(0.0, 0.33, 0.67)
  );
  
  // Blend colors based on affective state
  // Agitated: sharp obsidian, crimson veins, harsh gold
  // Harmonic / Trust: translucent cyan, lavender, opalescent glass, pearl
  vec3 calmColor = mix(uColorBase, iridescence, 0.55 + uTrust * 0.35);
  vec3 agitatedColor = mix(vec3(0.08, 0.05, 0.12), vec3(0.95, 0.25, 0.1), clamp(uAgitation * 1.2, 0.0, 1.0));
  
  vec3 base = mix(calmColor, agitatedColor, uAgitation);
  
  // Pulse of energy flowing through ribbons
  float pulse = sin(vWorldPosition.y * 4.0 - uTime * 3.0 + vNoise * 2.0) * 0.5 + 0.5;
  vec3 resonanceGlow = uColorAura * pulse * (uResonance + uAcousticEnergy * 1.5);
  
  // Edge rim lighting
  vec3 rim = uColorGlow * fresnel * (1.2 + uTrust * 0.8 + uAgitation * 1.5);
  
  // Combine all lighting layers
  vec3 finalColor = base + rim + resonanceGlow;
  
  // Opacity: Diaphanous crystalline glass with high Fresnel opacity
  float alpha = clamp(0.45 + fresnel * 0.5 + innerGlow * 0.2 + uAgitation * 0.3, 0.3, 0.96);
  
  gl_FragColor = vec4(finalColor, alpha);
}
`;
