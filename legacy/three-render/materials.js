// Shared materials. Everything is lit by one sun + hemisphere; a warm rim
// term is injected into the standard shaders so shapes read on pastel colours.
import * as THREE from 'three';

const RIM_COLOR = new THREE.Color('#fff1d6');

export function addRim(material, strength = 0.35, power = 3) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: RIM_COLOR };
    shader.uniforms.uRimStrength = { value: strength };
    shader.fragmentShader =
      'uniform vec3 uRimColor;\nuniform float uRimStrength;\n' +
      shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `float rimF = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
         outgoingLight += uRimColor * pow(rimF, ${power.toFixed(1)}) * uRimStrength;
         #include <opaque_fragment>`,
      );
  };
  material.customProgramCacheKey = () => `rim:${strength}:${power}`;
  return material;
}

/** Vertex-coloured Lambert for props, container and scenery. */
export function propMaterial({ flat = false, rim = 0.3 } = {}) {
  return addRim(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: flat }), rim);
}

/** Glossy ball material, one per tier colour. */
export function ballMaterial(color, { glow = false } = {}) {
  const c = new THREE.Color(color);
  const m = new THREE.MeshPhongMaterial({
    color: c,
    specular: new THREE.Color('#ffffff').multiplyScalar(0.5),
    shininess: 90,
    emissive: glow ? c.clone().multiplyScalar(1.6) : new THREE.Color(0x000000),
  });
  return addRim(m, glow ? 0.35 : 0.22, 3);
}
