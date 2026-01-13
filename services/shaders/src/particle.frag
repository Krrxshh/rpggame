// Particle Fragment Shader
// Soft particle rendering with glow

precision highp float;

uniform vec3 uGlowColor;
uniform float uGlowIntensity;

varying vec3 vColor;
varying float vAlpha;
varying float vProgress;

void main() {
  // Calculate distance from center for soft circular particles
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  
  // Soft edge falloff
  float falloff = 1.0 - smoothstep(0.3, 0.5, dist);
  
  // Core and glow
  float core = 1.0 - smoothstep(0.0, 0.3, dist);
  vec3 coreColor = vColor * core;
  
  // Glow ring
  float glowRing = smoothstep(0.2, 0.35, dist) * (1.0 - smoothstep(0.35, 0.5, dist));
  vec3 glow = uGlowColor * glowRing * uGlowIntensity;
  
  // Final color
  vec3 finalColor = coreColor + glow;
  float finalAlpha = falloff * vAlpha;
  
  // Discard fully transparent pixels
  if (finalAlpha < 0.01) discard;
  
  gl_FragColor = vec4(finalColor, finalAlpha);
}
