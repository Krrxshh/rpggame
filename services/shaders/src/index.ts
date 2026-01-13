/**
 * Shaders Service
 * Raw GLSL shader exports as strings for use with Three.js
 */

// Displacement Vertex Shader
export const displacementVertexShader = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uDisplacementScale;
uniform float uNoiseFrequency;
uniform float uNoiseSpeed;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

// Simplex 3D noise
vec4 permute(vec4 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  
  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  
  vec3 noisePos = position * uNoiseFrequency + uTime * uNoiseSpeed;
  float noise = snoise(noisePos);
  
  vec3 displaced = position + normal * noise * uDisplacementScale;
  
  vPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

// Rim Light Fragment Shader
export const rimLightFragmentShader = /* glsl */ `
precision highp float;

uniform vec3 uColor;
uniform vec3 uRimColor;
uniform float uRimPower;
uniform float uRimIntensity;
uniform vec3 uLightDirection;
uniform float uAmbientIntensity;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDirection = normalize(cameraPosition - vPosition);
  vec3 lightDir = normalize(uLightDirection);
  
  float diffuse = max(dot(normal, lightDir), 0.0);
  
  float rimFactor = 1.0 - max(dot(viewDirection, normal), 0.0);
  rimFactor = pow(rimFactor, uRimPower) * uRimIntensity;
  
  vec3 ambient = uColor * uAmbientIntensity;
  vec3 diffuseColor = uColor * diffuse;
  vec3 rimColor = uRimColor * rimFactor;
  
  vec3 finalColor = ambient + diffuseColor + rimColor;
  
  finalColor = finalColor / (finalColor + vec3(1.0));
  finalColor = pow(finalColor, vec3(1.0 / 2.2));
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// Simple vertex shader for rim light
export const basicVertexShader = /* glsl */ `
precision highp float;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Create uniforms helper
export function createDisplacementUniforms(options?: {
  time?: number;
  displacementScale?: number;
  noiseFrequency?: number;
  noiseSpeed?: number;
}) {
  return {
    uTime: { value: options?.time ?? 0 },
    uDisplacementScale: { value: options?.displacementScale ?? 0.1 },
    uNoiseFrequency: { value: options?.noiseFrequency ?? 2.0 },
    uNoiseSpeed: { value: options?.noiseSpeed ?? 0.5 },
  };
}

export function createRimLightUniforms(options?: {
  color?: [number, number, number];
  rimColor?: [number, number, number];
  rimPower?: number;
  rimIntensity?: number;
  lightDirection?: [number, number, number];
  ambientIntensity?: number;
}) {
  return {
    uColor: { value: options?.color ?? [0.5, 0.5, 0.5] },
    uRimColor: { value: options?.rimColor ?? [1.0, 1.0, 1.0] },
    uRimPower: { value: options?.rimPower ?? 2.0 },
    uRimIntensity: { value: options?.rimIntensity ?? 0.8 },
    uLightDirection: { value: options?.lightDirection ?? [1.0, 1.0, 1.0] },
    uAmbientIntensity: { value: options?.ambientIntensity ?? 0.3 },
  };
}
