import * as THREE from 'three';

// ─── Warsaw golden-hour skyline env map ──────────────────────────────────────
// Equirectangular: Y=0 → looking up, Y=H/2 → horizon, Y=H → looking down
// The chrome blob will reflect Warsaw's distinctive skyline — PKiN tower center,
// modern glass towers, Vistula glow, dramatic sky.

function createWarsawEnvTexture(): THREE.CanvasTexture {
  const W = 2048, H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── Sky: deep blue zenith → warm golden horizon (Warsaw golden hour)
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.60);
  sky.addColorStop(0.00, '#0a0e1f');
  sky.addColorStop(0.30, '#1a2b5e');
  sky.addColorStop(0.65, '#3d5a9e');
  sky.addColorStop(0.85, '#c47a35');
  sky.addColorStop(1.00, '#e8903a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H * 0.60);

  // ── Sun glow on horizon (right of center — east side of Warsaw)
  const sunX = W * 0.62, sunY = H * 0.575;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, W * 0.22);
  sunGlow.addColorStop(0.00, 'rgba(255,240,160,0.95)');
  sunGlow.addColorStop(0.08, 'rgba(255,210,80,0.80)');
  sunGlow.addColorStop(0.20, 'rgba(255,170,50,0.45)');
  sunGlow.addColorStop(0.50, 'rgba(220,100,20,0.18)');
  sunGlow.addColorStop(1.00, 'rgba(0,0,0,0)');
  ctx.fillStyle = sunGlow; ctx.fillRect(0, 0, W, H);

  // ── Horizon band — warm amber strip
  const horiz = ctx.createLinearGradient(0, H * 0.56, 0, H * 0.62);
  horiz.addColorStop(0, 'rgba(255,180,60,0)');
  horiz.addColorStop(0.5, 'rgba(255,200,80,0.55)');
  horiz.addColorStop(1, 'rgba(255,180,60,0)');
  ctx.fillStyle = horiz; ctx.fillRect(0, H * 0.50, W, H * 0.15);

  const skylineY = H * 0.60; // where ground meets sky

  // ── City base: dark ground
  const ground = ctx.createLinearGradient(0, skylineY, 0, H);
  ground.addColorStop(0, '#1a1008');
  ground.addColorStop(0.3, '#0e0b05');
  ground.addColorStop(1, '#050402');
  ctx.fillStyle = ground; ctx.fillRect(0, skylineY, W, H - skylineY);

  // ── Helper: draw a building with optional lit windows
  const seeded = (() => { let s = 98765; return () => { s=(s*1664525+1013904223)&0xffffffff; return (s>>>0)/0xffffffff; }; })();

  function building(x: number, w: number, h: number, alpha = 0.88, windows = true) {
    ctx.fillStyle = `rgba(14,10,6,${alpha})`;
    ctx.fillRect(x, skylineY - h, w, h);
    if (!windows) return;
    const cols = Math.max(1, Math.floor(w / 11));
    const rows = Math.max(1, Math.floor(h / 16));
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      if (seeded() > 0.45) {
        const a = seeded() * 0.5 + 0.3;
        ctx.fillStyle = `rgba(255,220,130,${a.toFixed(2)})`;
        ctx.fillRect(x + c * 11 + 2, skylineY - h + r * 16 + 3, 6, 9);
      }
    }
  }

  // ── Warsaw skyline — spread across the panorama
  // Intentionally repeat the skyline twice so it wraps the full 360°

  function skylineSegment(offsetX: number) {
    // Low-rise background fill
    for (let i = 0; i < 18; i++) {
      const bx = offsetX + (i / 18) * W * 0.5 - 20;
      building(bx, 60 + seeded() * 80, 60 + seeded() * 100, 0.7, false);
    }

    // Modern towers — west Warsaw (Wola district glass towers)
    building(offsetX + W * 0.04, 55, 310);   // Varso Tower silhouette
    building(offsetX + W * 0.08, 45, 260);
    building(offsetX + W * 0.12, 65, 220);
    building(offsetX + W * 0.16, 40, 190);
    building(offsetX + W * 0.19, 70, 170);
    building(offsetX + W * 0.24, 50, 200);

    // ── Palace of Culture and Science (PKiN) — unmistakable, dead center
    const pkx = offsetX + W * 0.305;
    // Base block
    ctx.fillStyle = 'rgba(10,7,4,0.95)';
    ctx.fillRect(pkx - 55, skylineY - 230, 110, 230);
    // Stepped setbacks (classic Stalin baroque look)
    ctx.fillRect(pkx - 40, skylineY - 295, 80, 65);
    ctx.fillRect(pkx - 28, skylineY - 350, 56, 55);
    ctx.fillRect(pkx - 18, skylineY - 400, 36, 50);
    ctx.fillRect(pkx - 10, skylineY - 438, 20, 38);
    // Spire
    ctx.beginPath();
    ctx.moveTo(pkx, skylineY - 490);
    ctx.lineTo(pkx - 7, skylineY - 438);
    ctx.lineTo(pkx + 7, skylineY - 438);
    ctx.closePath(); ctx.fill();
    // Corner towers (PKiN's four corner spires)
    [[pkx-45, 155],[pkx+45, 155],[pkx-32, 195],[pkx+32, 195]].forEach(([tx, th]) => {
      ctx.beginPath();
      ctx.moveTo(tx as number, skylineY - (th as number));
      ctx.lineTo((tx as number) - 6, skylineY - (th as number) + 22);
      ctx.lineTo((tx as number) + 6, skylineY - (th as number) + 22);
      ctx.closePath(); ctx.fill();
    });
    // PKiN windows (illuminated)
    ctx.fillStyle = 'rgba(255,230,150,0.5)';
    for (let r = 0; r < 12; r++) for (let c = 0; c < 8; c++) {
      if (seeded() > 0.35) ctx.fillRect(pkx - 48 + c * 13, skylineY - 220 + r * 17, 8, 11);
    }

    // East side — more modern towers
    building(offsetX + W * 0.36, 50, 280);   // Złota 44
    building(offsetX + W * 0.40, 60, 240);
    building(offsetX + W * 0.43, 45, 195);
    building(offsetX + W * 0.47, 70, 215);
    building(offsetX + W * 0.50, 40, 165);
  }

  // Draw skyline twice to fill 360°
  skylineSegment(0);
  skylineSegment(W * 0.50);

  // ── Vistula river reflection — warm strip in the lower ground
  const vistula = ctx.createLinearGradient(0, skylineY + H * 0.08, 0, skylineY + H * 0.14);
  vistula.addColorStop(0, 'rgba(200,140,40,0)');
  vistula.addColorStop(0.5, 'rgba(220,160,50,0.25)');
  vistula.addColorStop(1, 'rgba(200,130,30,0)');
  ctx.fillStyle = vistula; ctx.fillRect(0, skylineY, W, H * 0.15);

  // ── City-glow light pollution on horizon
  const pollution = ctx.createLinearGradient(0, H * 0.52, 0, H * 0.62);
  pollution.addColorStop(0, 'rgba(255,160,40,0)');
  pollution.addColorStop(0.5, 'rgba(255,170,50,0.30)');
  pollution.addColorStop(1, 'rgba(255,150,30,0)');
  ctx.fillStyle = pollution; ctx.fillRect(0, 0, W, H);

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── GLSL: low-frequency FBM — large smooth organic lobes ────────────────────

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
    // Low frequency (p*0.30) = 2-3 large smooth lobes across the sphere
    vec3 p = pos * 0.30 + vec3(t*0.22, t*0.17, t*0.26);
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
  renderer.toneMappingExposure = 1.5;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
  camera.position.set(0, 0, 4.8);

  // Warsaw skyline env map
  const envTexture = createWarsawEnvTexture();
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
    envMapIntensity: 3.2,
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
      objectNormal = normalize(normal - vec3(_ddx,_ddy,_ddz)*(0.55/_e));
      float _blobAmt = _d0 * 0.55;
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

  // Warm golden key light (matches Warsaw sunset env map)
  const key = new THREE.DirectionalLight(0xffd080, 2.2);
  key.position.set(2, 2, 3);
  scene.add(key);

  // Cool blue fill from opposite side
  const fill = new THREE.DirectionalLight(0x8090d0, 1.0);
  fill.position.set(-3, 0, -1);
  scene.add(fill);

  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

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
    mesh.rotation.y = t * 0.05;
    mesh.rotation.x = t * 0.02;
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
