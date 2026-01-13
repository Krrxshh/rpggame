// PBR Fragment Shader Enhancement
// Adds wetness modulation and normal perturbation
// NEW SHADER FILE

precision highp float;

uniform sampler2D map;
uniform sampler2D normalMap;
uniform float roughness;
uniform float metalness;
uniform float wetness;
uniform float time;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

// Simple hash for noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec4 texColor = texture2D(map, vUv);
  vec3 normal = normalize(vNormal);
  
  // Sample normal map if available
  #ifdef USE_NORMALMAP
    vec3 normalTex = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
    normal = normalize(normal + normalTex * 0.5);
  #endif
  
  // Apply wetness: reduce roughness, increase metalness slightly
  float wetRoughness = roughness * (1.0 - wetness * 0.6);
  float wetMetalness = metalness + wetness * 0.2;
  
  // Add subtle rain-driven normal perturbation when wet
  if (wetness > 0.1) {
    float rainNoise = noise(vUv * 20.0 + time * 2.0);
    normal.xy += (rainNoise - 0.5) * wetness * 0.1;
    normal = normalize(normal);
  }
  
  // Basic Blinn-Phong approximation for demo
  vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
  float NdotL = max(dot(normal, lightDir), 0.0);
  
  vec3 viewDir = normalize(-vViewPosition);
  vec3 halfDir = normalize(lightDir + viewDir);
  float NdotH = max(dot(normal, halfDir), 0.0);
  
  float specPower = mix(4.0, 64.0, 1.0 - wetRoughness);
  float spec = pow(NdotH, specPower) * wetMetalness;
  
  vec3 color = texColor.rgb * (0.3 + NdotL * 0.7) + vec3(spec);
  
  gl_FragColor = vec4(color, texColor.a);
}
