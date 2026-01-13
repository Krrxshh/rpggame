// Particle Vertex Shader
// For instanced particle rendering

precision highp float;

uniform float uTime;
uniform float uParticleSize;
uniform float uSizeVariation;

attribute vec3 instancePosition;
attribute vec3 instanceVelocity;
attribute float instanceStartTime;
attribute float instanceLifetime;
attribute vec3 instanceColor;
attribute float instanceSize;

varying vec3 vColor;
varying float vAlpha;
varying float vProgress;

void main() {
  // Calculate particle progress (0 to 1)
  float age = uTime - instanceStartTime;
  float progress = clamp(age / instanceLifetime, 0.0, 1.0);
  vProgress = progress;
  
  // Fade in and out
  float fadeIn = smoothstep(0.0, 0.1, progress);
  float fadeOut = 1.0 - smoothstep(0.7, 1.0, progress);
  vAlpha = fadeIn * fadeOut;
  
  // Calculate current position with velocity and gravity
  vec3 gravity = vec3(0.0, -0.5, 0.0);
  vec3 currentPos = instancePosition + instanceVelocity * age + 0.5 * gravity * age * age;
  
  // Apply some wobble
  currentPos.x += sin(age * 5.0 + instancePosition.x) * 0.1;
  currentPos.z += cos(age * 5.0 + instancePosition.z) * 0.1;
  
  // Pass color
  vColor = instanceColor;
  
  // Calculate size with variation over lifetime
  float sizeMultiplier = instanceSize * (1.0 - progress * 0.5);
  float size = uParticleSize * sizeMultiplier;
  
  // Billboard positioning
  vec4 mvPosition = modelViewMatrix * vec4(currentPos + position * size, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
