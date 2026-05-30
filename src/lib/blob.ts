import * as THREE from 'three';

// ─── Vertex shader: 4-octave FBM noise for organic blob displacement ─────────
// Low base frequency (pos * 0.30) produces 2-3 large smooth lobes across the
// sphere. Gradient finite-differences keep normals correct for PBR lighting.

const VERT_NOISE = /* glsl */ `
  float _h(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  float _sn(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(_h(i),             _h(i+vec3(1,0,0)), f.x),
          mix(_h(i+vec3(0,1,0)), _h(i+vec3(1,1,0)), f.x), f.y),
      mix(mix(_h(i+vec3(0,0,1)), _h(i+vec3(1,0,1)), f.x),
          mix(_h(i+vec3(0,1,1)), _h(i+vec3(1,1,1)), f.x), f.y), f.z);
  }
  float blobD(vec3 pos, float t) {
    vec3 p = pos * 0.30 + vec3(t*0.32, t*0.25, t*0.38);
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * _sn(p);
      p = p * 2.0 + vec3(1.7, 9.2, 3.4);
      a *= 0.42;
    }
    return (v - 0.5) * 2.0;
  }
`;

// Injected into MeshPhysicalMaterial's vertex shader via onBeforeCompile.
// Replaces the normal and position chunks so PBR lighting stays accurate.
const NORMAL_CHUNK = /* glsl */ `
  vec3 objectNormal = vec3(normal);
  #ifdef USE_TANGENT
    vec3 objectTangent = vec3(tangent.xyz);
  #endif
  float _e   = 0.005;
  float _d0  = blobD(position, uTime);
  float _ddx = blobD(position + vec3(_e,0.0,0.0), uTime) - _d0;
  float _ddy = blobD(position + vec3(0.0,_e,0.0), uTime) - _d0;
  float _ddz = blobD(position + vec3(0.0,0.0,_e), uTime) - _d0;
  objectNormal = normalize(normal - vec3(_ddx,_ddy,_ddz)*(0.65/_e));
  float _blobAmt = _d0 * 0.65;
`;
const POSITION_CHUNK = 'vec3 transformed = position + normal * _blobAmt;';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Mounts a Three.js chrome blob into `container` and returns a cleanup function.
 * The canvas uses alpha: true so it floats transparently over the page background.
 * Respects prefers-reduced-motion.
 */
export async function initBlob(container: HTMLElement): Promise<() => void> {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const W = container.clientWidth;
  const H = container.clientHeight;

  // ── Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  container.appendChild(renderer.domElement);

  // ── Scene / camera
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
  camera.position.set(0, 0, 4.8);

  // ── Environment map: Warsaw photo as equirectangular reflection
  const envTex = await new Promise<THREE.Texture>((resolve, reject) => {
    new THREE.TextureLoader().load('/warsaw.jpg', resolve, undefined, reject);
  });
  envTex.mapping   = THREE.EquirectangularReflectionMapping;
  envTex.colorSpace = THREE.SRGBColorSpace;
  const pmrem  = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envMap = pmrem.fromEquirectangular(envTex).texture;
  scene.environment = envMap;
  envTex.dispose();
  pmrem.dispose();

  // ── Geometry & material
  const geometry = new THREE.SphereGeometry(1.5, 256, 256);

  // We only keep a reference to the uTime uniform — nothing else from the shader
  let timeUniform: { value: number } | null = null;

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xffffff),
    metalness:           1.0,
    roughness:           0.02,
    envMapIntensity:     3.2,
    clearcoat:           1.0,
    clearcoatRoughness:  0.02,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0.0 };
    timeUniform = shader.uniforms.uTime as { value: number };
    shader.vertexShader = `uniform float uTime;\n${VERT_NOISE}\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader
      .replace('#include <beginnormal_vertex>', NORMAL_CHUNK)
      .replace('#include <begin_vertex>',      POSITION_CHUNK);
  };

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // ── Lights: warm key + cool fill + strong rim for silhouette pop
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const sun = new THREE.DirectionalLight(0xfff5e0, 2.2);
  sun.position.set(3, 3, 2.5);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x90b8e8, 0.9);
  fill.position.set(-3, 1, 1);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 3.5);
  rim.position.set(0.5, 1.5, -4);
  scene.add(rim);

  // ── Mouse parallax
  let mouseX = 0, mouseY = 0, smoothX = 0, smoothY = 0;
  const onMouseMove = (e: MouseEvent) => {
    const r = container.getBoundingClientRect();
    mouseX = ((e.clientX - r.left  - W / 2) / (W / 2)) * 0.15;
    mouseY = ((e.clientY - r.top   - H / 2) / (H / 2)) * 0.15;
  };
  window.addEventListener('mousemove', onMouseMove);

  const onResize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  // ── Animation loop
  let animId: number;
  const clock = new THREE.Clock();

  const animate = () => {
    animId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    if (timeUniform) timeUniform.value = t;

    mesh.rotation.y = t * 0.18;
    mesh.rotation.x = Math.sin(t * 0.30) * 0.28;
    mesh.rotation.z = Math.sin(t * 0.19) * 0.08;

    smoothX += (mouseY - smoothX) * 0.035;
    smoothY += (mouseX - smoothY) * 0.035;
    mesh.rotation.x += smoothX;
    mesh.rotation.y += smoothY;

    renderer.render(scene, camera);
  };
  animate();

  // ── Cleanup
  return () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('resize',    onResize);
    renderer.dispose();
    geometry.dispose();
    material.dispose();
    envMap.dispose();
    if (container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement);
    }
  };
}
