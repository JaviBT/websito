import * as THREE from 'three';

// ─── Backrooms env map ────────────────────────────────────────────────────────
// Equirectangular: Y=0 → ceiling, Y=H/2 → eye level, Y=H → floor

function createBackroomsEnvTexture(): THREE.CanvasTexture {
  const W = 2048;
  const H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── Base: warm cream walls everywhere
  ctx.fillStyle = '#d4b96a';
  ctx.fillRect(0, 0, W, H);

  // ── Vertical gradient: bright ceiling → warm walls → dark floor
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0.00, '#fffbe8');   // ceiling: near-white warm
  base.addColorStop(0.18, '#e8c96a');   // upper wall
  base.addColorStop(0.50, '#c8a84a');   // mid wall
  base.addColorStop(0.78, '#9c7e32');   // lower wall
  base.addColorStop(0.88, '#6b5520');   // floor transition
  base.addColorStop(1.00, '#3a2e10');   // floor: dark carpet
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // ── Fluorescent tube lights — bright white bars on ceiling
  const numTubes = 7;
  for (let i = 0; i < numTubes; i++) {
    const cx = ((i + 0.5) / numTubes) * W;
    const cy = H * 0.04;
    const tw = W / numTubes * 0.45;
    const th = H * 0.025;

    // Wide bloom under each tube
    const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, tw * 1.4);
    bloom.addColorStop(0.0,  'rgba(255,255,230,1.0)');
    bloom.addColorStop(0.15, 'rgba(255,250,200,0.85)');
    bloom.addColorStop(0.40, 'rgba(255,240,160,0.45)');
    bloom.addColorStop(0.70, 'rgba(255,220,100,0.18)');
    bloom.addColorStop(1.00, 'rgba(255,200,60,0.0)');
    ctx.fillStyle = bloom;
    // Tall rect so bloom extends down into wall area
    ctx.fillRect(cx - tw * 1.4, 0, tw * 2.8, H * 0.55);

    // Tube rectangle itself — pure white
    ctx.fillStyle = 'rgba(255,255,248,1.0)';
    ctx.fillRect(cx - tw / 2, cy - th / 2, tw, th);
  }

  // ── Secondary ambient warmth from wall reflections
  const wallBounce = ctx.createLinearGradient(0, H * 0.2, 0, H * 0.6);
  wallBounce.addColorStop(0, 'rgba(255,230,130,0.18)');
  wallBounce.addColorStop(1, 'rgba(255,180,60,0.0)');
  ctx.fillStyle = wallBounce;
  ctx.fillRect(0, 0, W, H);

  // ── Horizontal wall seam / skirting at floor line
  ctx.fillStyle = 'rgba(50,35,10,0.55)';
  ctx.fillRect(0, H * 0.83, W, H * 0.02);

  // ── Carpet — very dark warm brown at bottom
  ctx.fillStyle = 'rgba(30,22,8,0.75)';
  ctx.fillRect(0, H * 0.85, W, H * 0.15);

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── GLSL FBM noise injected into MeshPhysicalMaterial ───────────────────────

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
  float _fbm(vec3 p) {
    float v = 0.0, a = 0.5;
    p *= 0.85;
    for (int i = 0; i < 6; i++) {
      v += a * _sn(p);
      p = p * 2.01 + vec3(1.7, 9.2, 3.4);
      a *= 0.5;
    }
    return v;
  }
  float blobD(vec3 pos, float t) {
    vec3 p = pos + vec3(t*0.13, t*0.11, t*0.17);
    return (_fbm(p) - 0.5) * 2.0;
  }
`;

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initBlob(container: HTMLElement): () => void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const W = container.clientWidth;
  const H = container.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.6;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
  camera.position.set(0, 0, 4.8);

  // Backrooms env map
  const envTexture = createBackroomsEnvTexture();
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envMap = pmrem.fromEquirectangular(envTexture).texture;
  scene.environment = envMap;
  envTexture.dispose();
  pmrem.dispose();

  // High-res sphere — displacement on GPU
  const geometry = new THREE.SphereGeometry(1.5, 256, 256);

  let shaderRef: { uniforms: Record<string, { value: number }> } | null = null;

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xe8e8e8),
    metalness: 1.0,
    roughness: 0.05,
    envMapIntensity: 3.5,
    clearcoat: 0.8,
    clearcoatRoughness: 0.05,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0.0 };
    shader.vertexShader = `uniform float uTime;\n${VERT_NOISE_GLSL}\n` + shader.vertexShader;

    // Perturb normal using FBM gradient (computed before normal transform)
    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      /* glsl */ `
      vec3 objectNormal = vec3(normal);
      #ifdef USE_TANGENT
        vec3 objectTangent = vec3(tangent.xyz);
      #endif
      float _eps = 0.006;
      float _d0  = blobD(position, uTime);
      float _ddx = blobD(position + vec3(_eps, 0.0, 0.0), uTime) - _d0;
      float _ddy = blobD(position + vec3(0.0, _eps, 0.0), uTime) - _d0;
      float _ddz = blobD(position + vec3(0.0, 0.0, _eps), uTime) - _d0;
      objectNormal = normalize(normal - vec3(_ddx,_ddy,_ddz) * (0.28 / _eps));
      float _blobAmt = _d0 * 0.28;
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

  // Lighting: two warm overheads (fluorescent vibe) + cool rim
  scene.add(Object.assign(new THREE.AmbientLight(0xfff5d0, 0.6)));

  const light1 = new THREE.DirectionalLight(0xfff8e0, 4.0); // warm overhead key
  light1.position.set(-1, 3, 2.5);
  scene.add(light1);

  const light2 = new THREE.DirectionalLight(0xffe8b0, 2.5); // second overhead
  light2.position.set(2, 2, 1.5);
  scene.add(light2);

  const rimLight = new THREE.DirectionalLight(0xd0e8ff, 1.2); // cool blue rim
  rimLight.position.set(0, -2, -3);
  scene.add(rimLight);

  // Mouse parallax
  let mouseX = 0, mouseY = 0, smoothX = 0, smoothY = 0;

  function onMouseMove(e: MouseEvent) {
    const rect = container.getBoundingClientRect();
    mouseX = ((e.clientX - rect.left - W / 2) / (W / 2)) * 0.18;
    mouseY = ((e.clientY - rect.top  - H / 2) / (H / 2)) * 0.18;
  }
  window.addEventListener('mousemove', onMouseMove);

  function onResize() {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  let animId: number;
  const clock = new THREE.Clock();

  function animate() {
    animId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    if (shaderRef) shaderRef.uniforms.uTime.value = t;

    mesh.rotation.y = t * 0.06;
    mesh.rotation.x = t * 0.025;

    smoothX += (mouseY - smoothX) * 0.04;
    smoothY += (mouseX - smoothY) * 0.04;
    mesh.rotation.x += smoothX;
    mesh.rotation.y += smoothY;

    renderer.render(scene, camera);
  }

  animate();

  return () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('resize', onResize);
    renderer.dispose();
    geometry.dispose();
    material.dispose();
    envMap.dispose();
    container.removeChild(renderer.domElement);
  };
}
