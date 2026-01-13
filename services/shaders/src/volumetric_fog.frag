// Volumetric Fog Shader
// Layered depth-based fog approximation
// NEW SHADER FILE

precision highp float;

uniform sampler2D tDepth;
uniform sampler2D tDiffuse;
uniform vec3 fogColor;
uniform float fogDensity;
uniform float fogHeight;
uniform float time;

varying vec2 vUv;

float hash(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

float noise3D(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  
  float n = i.x + i.y * 157.0 + 113.0 * i.z;
  return mix(mix(mix(hash(vec3(n + 0.0, 0.0, 0.0)), hash(vec3(n + 1.0, 0.0, 0.0)), f.x),
                 mix(hash(vec3(n + 157.0, 0.0, 0.0)), hash(vec3(n + 158.0, 0.0, 0.0)), f.x), f.y),
             mix(mix(hash(vec3(n + 113.0, 0.0, 0.0)), hash(vec3(n + 114.0, 0.0, 0.0)), f.x),
                 mix(hash(vec3(n + 270.0, 0.0, 0.0)), hash(vec3(n + 271.0, 0.0, 0.0)), f.x), f.y), f.z);
}

float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise3D(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  float depth = texture2D(tDepth, vUv).r;
  
  // Linearize depth (approximate)
  float linearDepth = 1.0 / (1.0 - depth);
  linearDepth = clamp(linearDepth, 0.0, 100.0);
  
  // Calculate fog amount based on depth
  float fogAmount = 1.0 - exp(-linearDepth * fogDensity);
  
  // Add animated noise for volumetric effect
  vec3 noiseCoord = vec3(vUv * 10.0, time * 0.1);
  float noiseValue = fbm(noiseCoord);
  fogAmount *= 0.8 + noiseValue * 0.4;
  
  // Height-based fog falloff
  float heightFade = smoothstep(fogHeight, 0.0, linearDepth * 0.1);
  fogAmount *= heightFade;
  
  fogAmount = clamp(fogAmount, 0.0, 0.9);
  
  vec3 finalColor = mix(color.rgb, fogColor, fogAmount);
  
  gl_FragColor = vec4(finalColor, color.a);
}
