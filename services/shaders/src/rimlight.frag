// Rim Light Fragment Shader
// Fresnel-based rim lighting with configurable color

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
  // Normalize vectors
  vec3 normal = normalize(vNormal);
  vec3 viewDirection = normalize(cameraPosition - vPosition);
  vec3 lightDir = normalize(uLightDirection);
  
  // Basic diffuse lighting
  float diffuse = max(dot(normal, lightDir), 0.0);
  
  // Fresnel rim effect
  float rimFactor = 1.0 - max(dot(viewDirection, normal), 0.0);
  rimFactor = pow(rimFactor, uRimPower) * uRimIntensity;
  
  // Combine lighting
  vec3 ambient = uColor * uAmbientIntensity;
  vec3 diffuseColor = uColor * diffuse;
  vec3 rimColor = uRimColor * rimFactor;
  
  vec3 finalColor = ambient + diffuseColor + rimColor;
  
  // Tone mapping
  finalColor = finalColor / (finalColor + vec3(1.0));
  
  // Gamma correction
  finalColor = pow(finalColor, vec3(1.0 / 2.2));
  
  gl_FragColor = vec4(finalColor, 1.0);
}
