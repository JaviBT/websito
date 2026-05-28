import * as THREE from 'three';

// ─── GLSL: low-frequency FBM — large, aggressive organic lobes ───────────────

const VERT_NOISE_GLSL = /* glsl */ `
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

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initBlob(container: HTMLElement): Promise<() => void> {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const W = container.clientWidth;
  const H = container.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
  camera.position.set(0, 0, 4.8);

  // ── Load Warsaw photo as equirectangular env map
  const envTexture = await new Promise<THREE.Texture>((resolve, reject) => {
    new THREE.TextureLoader().load('/warsaw.jpg', resolve, undefined, reject);
  });
  envTexture.mapping = THREE.EquirectangularReflectionMapping;
  envTexture.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envMap = pmrem.fromEquirectangular(envTexture).texture;
  scene.environment = envMap;
  envTexture.dispose();
  pmrem.dispose();

  // 256×256 sphere — all displacement on GPU
  const geometry = new THREE.SphereGeometry(1.5, 256, 256);

  let shaderRef: { uniforms: Record<string, { value: number }> } | null = null;

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xffffff),
    metalness: 1.0,
    roughness: 0.04,
    envMapIntensity: 3.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0.0 };
    shader.vertexShader = `uniform float uTime;\n${VERT_NOISE_GLSL}\n` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      /* glsl */ `
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
      `,
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      'vec3 transformed = position + normal * _blobAmt;',
    );

    shaderRef = shader as typeof shaderRef;
  };

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Soft ambient
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  // Key: warm sun from upper-right (matches Warsaw blue-sky photo)
  const sun = new THREE.DirectionalLight(0xfff5e0, 2.2);
  sun.position.set(3, 3, 2.5);
  scene.add(sun);

  // Fill: cool sky light from the left
  const skyFill = new THREE.DirectionalLight(0x90b8e8, 0.9);
  skyFill.position.set(-3, 1, 1);
  scene.add(skyFill);

  // Rim: strong light from BEHIND the blob — creates bright silhouette edges
  // Position is behind (negative Z from camera's perspective)
  const rim = new THREE.DirectionalLight(0xffffff, 3.5);
  rim.position.set(0.5, 1.5, -4);
  scene.add(rim);

  // Mouse parallax
  let mouseX = 0, mouseY = 0, smoothX = 0, smoothY = 0;
  function onMouseMove(e: MouseEvent) {
    const rect = container.getBoundingClientRect();
    mouseX = ((e.clientX - rect.left - W / 2) / (W / 2)) * 0.15;
    mouseY = ((e.clientY - rect.top  - H / 2) / (H / 2)) * 0.15;
  }
  window.addEventListener('mousemove', onMouseMove);

  function onResize() {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  let animId: number;
  const clock = new THREE.Clock();

  function animate() {
    animId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    if (shaderRef) shaderRef.uniforms.uTime.value = t;

    // Y: continuous slow orbit — shows all sides
    mesh.rotation.y = t * 0.18;
    // X: oscillating tilt — constantly reveals top/bottom, proves 3D shape
    mesh.rotation.x = Math.sin(t * 0.30) * 0.28;
    // Z: slight roll oscillation for organic life
    mesh.rotation.z = Math.sin(t * 0.19) * 0.08;

    // Mouse parallax on top
    smoothX += (mouseY - smoothX) * 0.035;
    smoothY += (mouseX - smoothY) * 0.035;
    mesh.rotation.x += smoothX;
    mesh.rotation.y += smoothY;

    renderer.render(scene, camera);
  }

  animate();

  return () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('resize', onResize);
    renderer.dispose(); geometry.dispose(); material.dispose(); envMap.dispose();
    if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
  };
}
