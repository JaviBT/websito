import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// Simplex-like noise via layered sin/cos (no external dep needed)
function noise(x: number, y: number, z: number, t: number): number {
  const s = Math.sin(x * 1.2 + t * 0.7) * Math.cos(y * 0.9 + t * 0.5) * Math.sin(z * 1.1 + t * 0.6);
  const s2 = Math.sin(x * 2.3 + t * 0.4) * Math.cos(y * 1.7 + t * 0.8) * Math.sin(z * 2.1 + t * 0.3);
  const s3 = Math.cos(x * 3.1 + t * 0.2) * Math.sin(y * 2.9 + t * 0.6) * Math.cos(z * 3.3 + t * 0.4);
  return s * 0.5 + s2 * 0.3 + s3 * 0.2;
}

export function initBlob(container: HTMLElement): () => void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const W = container.clientWidth;
  const H = container.clientHeight;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  // Scene
  const scene = new THREE.Scene();

  // Camera
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
  camera.position.set(0, 0, 4.5);

  // Environment map for reflections
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const envScene = new RoomEnvironment();
  const envTexture = pmremGenerator.fromScene(envScene, 0.04).texture;
  scene.environment = envTexture;
  pmremGenerator.dispose();
  envScene.dispose();

  // Geometry — high-res sphere for smooth displacement
  const geometry = new THREE.SphereGeometry(1.5, 128, 128);
  const positionAttr = geometry.attributes.position as THREE.BufferAttribute;
  const originalPositions = new Float32Array(positionAttr.array.length);
  originalPositions.set(positionAttr.array);

  // Material — liquid chrome
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xcccccc),
    metalness: 1.0,
    roughness: 0.05,
    envMapIntensity: 1.8,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Lights — accent green + cool blue for chrome reflections
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambientLight);

  const light1 = new THREE.DirectionalLight(0x4ade80, 2.5);
  light1.position.set(-3, 2, 3);
  scene.add(light1);

  const light2 = new THREE.DirectionalLight(0x60a5fa, 1.5);
  light2.position.set(3, -1, 2);
  scene.add(light2);

  const light3 = new THREE.DirectionalLight(0xffffff, 0.8);
  light3.position.set(0, 4, -2);
  scene.add(light3);

  // Mouse tracking for parallax tilt
  let mouseX = 0;
  let mouseY = 0;
  let targetRotX = 0;
  let targetRotY = 0;

  function onMouseMove(e: MouseEvent) {
    const rect = container.getBoundingClientRect();
    mouseX = ((e.clientX - rect.left - W / 2) / (W / 2)) * 0.15;
    mouseY = ((e.clientY - rect.top - H / 2) / (H / 2)) * 0.15;
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

  // Animation loop
  let animId: number;
  const clock = new THREE.Clock();
  const tempVec = new THREE.Vector3();

  function animate() {
    animId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Organic vertex displacement
    for (let i = 0; i < positionAttr.count; i++) {
      const ox = originalPositions[i * 3];
      const oy = originalPositions[i * 3 + 1];
      const oz = originalPositions[i * 3 + 2];

      tempVec.set(ox, oy, oz).normalize();

      const displacement = noise(ox, oy, oz, t * 0.4) * 0.22;
      const scale = 1 + displacement;

      positionAttr.setXYZ(
        i,
        tempVec.x * 1.5 * scale,
        tempVec.y * 1.5 * scale,
        tempVec.z * 1.5 * scale,
      );
    }

    positionAttr.needsUpdate = true;
    geometry.computeVertexNormals();

    // Slow base rotation
    mesh.rotation.y = t * 0.08;
    mesh.rotation.x = t * 0.03;

    // Mouse parallax — smooth lerp
    targetRotX += (mouseY - targetRotX) * 0.05;
    targetRotY += (mouseX - targetRotY) * 0.05;
    mesh.rotation.x += targetRotX;
    mesh.rotation.y += targetRotY;

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
    envTexture.dispose();
    container.removeChild(renderer.domElement);
  };
}
