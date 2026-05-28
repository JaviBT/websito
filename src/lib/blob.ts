import * as THREE from 'three';

// ─── Warsaw night sky env map ────────────────────────────────────────────────

function createWarsawEnvTexture(): THREE.CanvasTexture {
  const W = 2048;
  const H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Night sky
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.62);
  sky.addColorStop(0, '#03080f');
  sky.addColorStop(0.55, '#060d1a');
  sky.addColorStop(1, '#0c1e35');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Stars
  const seededRand = (() => {
    let s = 12345;
    return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  })();
  for (let i = 0; i < 320; i++) {
    const x = seededRand() * W;
    const y = seededRand() * H * 0.52;
    const r = seededRand() * 1.3 + 0.2;
    const a = seededRand() * 0.5 + 0.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(210,230,255,${a.toFixed(2)})`;
    ctx.fill();
  }

  // City warm glow at horizon
  const horizonY = H * 0.62;
  const glow = ctx.createRadialGradient(W * 0.5, horizonY, 0, W * 0.5, horizonY, W * 0.65);
  glow.addColorStop(0, 'rgba(255,170,50,0.55)');
  glow.addColorStop(0.25, 'rgba(220,120,30,0.30)');
  glow.addColorStop(0.6, 'rgba(150,70,15,0.10)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Secondary cool glow on left (reflected sky)
  const glow2 = ctx.createRadialGradient(W * 0.1, horizonY, 0, W * 0.1, horizonY, W * 0.35);
  glow2.addColorStop(0, 'rgba(56,189,248,0.12)');
  glow2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // Ground base
  const ground = ctx.createLinearGradient(0, horizonY, 0, H);
  ground.addColorStop(0, '#0e1520');
  ground.addColorStop(1, '#04070c');
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizonY, W, H - horizonY);

  // Buildings silhouettes
  const drawBuilding = (x: number, w: number, h: number) => {
    ctx.fillStyle = '#060b11';
    ctx.fillRect(x, horizonY - h, w, h);
    // Lit windows
    const cols = Math.max(1, Math.floor(w / 13));
    const rows = Math.max(1, Math.floor(h / 18));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (seededRand() > 0.58) {
          const wx = x + c * 13 + 3;
          const wy = horizonY - h + r * 18 + 4;
          const wa = seededRand() * 0.4 + 0.25;
          ctx.fillStyle = `rgba(255,215,120,${wa.toFixed(2)})`;
          ctx.fillRect(wx, wy, 7, 10);
        }
      }
    }
  };

  // Scattered buildings across horizon
  const buildingDefs = [
    [0, 80, 130], [70, 60, 95], [120, 100, 160], [210, 70, 115],
    [270, 50, 80], [310, 90, 140], [390, 60, 100], [440, 110, 170],
    [540, 70, 120], [600, 50, 85], [640, 80, 130], [710, 100, 155],
    [800, 60, 95], [850, 90, 140], [930, 70, 110], [990, 110, 175],
    [1090, 60, 100], [1140, 80, 125], [1210, 50, 80], [1250, 100, 160],
    [1340, 70, 115], [1400, 60, 90], [1450, 90, 145], [1530, 80, 130],
    [1600, 110, 170], [1700, 60, 100], [1750, 50, 80], [1790, 80, 130],
    [1860, 70, 110], [1920, 100, 160], [1970, 60, 95],
  ];
  for (const [x, w, h] of buildingDefs) {
    drawBuilding(x as number, w as number, h as number);
  }

  // Palace of Culture and Science — central landmark
  const cx = W * 0.5;
  ctx.fillStyle = '#050a10';
  ctx.fillRect(cx - 55, horizonY - 220, 110, 220); // base
  ctx.fillRect(cx - 32, horizonY - 340, 64, 120);  // mid tower
  ctx.fillRect(cx - 18, horizonY - 420, 36, 80);   // upper tower
  ctx.beginPath(); // spire
  ctx.moveTo(cx, horizonY - 490);
  ctx.lineTo(cx - 12, horizonY - 420);
  ctx.lineTo(cx + 12, horizonY - 420);
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ─── GLSL noise injected into MeshPhysicalMaterial vertex shader ─────────────

const VERT_NOISE_GLSL = /* glsl */ `
  float _hash(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float _sn(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(_hash(i),            _hash(i+vec3(1,0,0)), f.x),
          mix(_hash(i+vec3(0,1,0)),_hash(i+vec3(1,1,0)), f.x), f.y),
      mix(mix(_hash(i+vec3(0,0,1)),_hash(i+vec3(1,0,1)), f.x),
          mix(_hash(i+vec3(0,1,1)),_hash(i+vec3(1,1,1)), f.x), f.y),
      f.z
    );
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
    vec3 p = pos + vec3(t * 0.13, t * 0.11, t * 0.17);
    return (_fbm(p) - 0.5) * 2.0;
  }
`;

// ─── Main export ─────────────────────────────────────────────────────────────

export function initBlob(container: HTMLElement): () => void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const W = container.clientWidth;
  const H = container.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
  camera.position.set(0, 0, 4.8);

  // Warsaw env map for reflections
  const envTexture = createWarsawEnvTexture();
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envMap = pmrem.fromEquirectangular(envTexture).texture;
  scene.environment = envMap;
  envTexture.dispose();
  pmrem.dispose();

  // High-resolution sphere — displacement runs on GPU
  const geometry = new THREE.SphereGeometry(1.5, 256, 256);

  // Chrome material — onBeforeCompile injects displacement into vertex shader
  let shaderRef: { uniforms: Record<string, { value: number }> } | null = null;

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xd0d8e0),
    metalness: 1.0,
    roughness: 0.04,
    envMapIntensity: 2.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0.0 };

    // Prepend noise functions and uniform declaration
    shader.vertexShader = `uniform float uTime;\n${VERT_NOISE_GLSL}\n` + shader.vertexShader;

    // Replace normal calculation — compute perturbed normal from noise gradient
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
      objectNormal = normalize(normal - vec3(_ddx, _ddy, _ddz) * (0.3 / _eps));
      float _blobAmt = _d0 * 0.30;
      `,
    );

    // Replace vertex position — apply displacement along original normal
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      'vec3 transformed = position + normal * _blobAmt;',
    );

    shaderRef = shader as typeof shaderRef;
  };

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Lights: warm key + cool fill + rim — creates drama on the chrome
  scene.add(Object.assign(new THREE.AmbientLight(0xffffff, 0.15)));

  const keyLight = new THREE.DirectionalLight(0xffcc80, 3.5); // warm amber key
  keyLight.position.set(-2.5, 1.5, 3);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x38bdf8, 2.0); // accent blue fill
  fillLight.position.set(3, -0.5, 2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
  rimLight.position.set(0.5, 4, -3);
  scene.add(rimLight);

  // Mouse parallax
  let mouseX = 0;
  let mouseY = 0;
  let smoothX = 0;
  let smoothY = 0;

  function onMouseMove(e: MouseEvent) {
    const rect = container.getBoundingClientRect();
    mouseX = ((e.clientX - rect.left - W / 2) / (W / 2)) * 0.18;
    mouseY = ((e.clientY - rect.top - H / 2) / (H / 2)) * 0.18;
  }
  window.addEventListener('mousemove', onMouseMove);

  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
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

    // Update GPU noise time uniform
    if (shaderRef) shaderRef.uniforms.uTime.value = t;

    // Slow base rotation
    mesh.rotation.y = t * 0.06;
    mesh.rotation.x = t * 0.025;

    // Smooth mouse parallax
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
