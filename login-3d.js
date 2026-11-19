import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';

(() => {
  const host = document.getElementById('loginCharacter');
  if (!host) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0.05, 4.5);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-label', 'Animierter DACHWERK-Charakter');
  host.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x65736a, 2.0));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-2.5, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8edbb3, 1.15);
  rim.position.set(3, 1.5, -3);
  scene.add(rim);

  const loader = new GLTFLoader();
  let head = null;
  let baseHeadQuaternion = null;
  let model = null;
  let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
  const clock = new THREE.Clock();

  loader.load('./Rigged-rigged.glb', gltf => {
    model = gltf.scene;
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 2.8 / Math.max(size.y, 0.001);
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -center.y * scale - 0.02, -center.z * scale);
    scene.add(model);
    head = model.getObjectByName('mixamorig:Head');
    if (head) baseHeadQuaternion = head.quaternion.clone();
    const scaledBox = new THREE.Box3().setFromObject(model);
    const scaledSize = scaledBox.getSize(new THREE.Vector3());
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    camera.position.set(0, scaledCenter.y + scaledSize.y * 0.02, Math.max(3.7, scaledSize.y * 1.65));
    camera.lookAt(0, scaledCenter.y + scaledSize.y * 0.06, 0);
    resize();
    host.classList.add('is-ready');
  }, undefined, error => {
    console.error('DACHWERK 3D character could not be loaded:', error);
    host.classList.add('is-fallback');
  });

  function resize() {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  window.addEventListener('resize', resize, { passive: true });

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const idleY = reducedMotion ? 0 : Math.sin(t * 0.7) * 0.035;
    const idleX = reducedMotion ? 0 : Math.sin(t * 0.48) * 0.012;
    currentY += (targetY + idleY - currentY) * 0.055;
    currentX += (targetX + idleX - currentX) * 0.055;
    if (head && baseHeadQuaternion) {
      const offset = new THREE.Quaternion().setFromEuler(new THREE.Euler(currentX, currentY, 0, 'YXZ'));
      head.quaternion.copy(baseHeadQuaternion).multiply(offset);
    }
    renderer.render(scene, camera);
  }
  animate();

  host.addEventListener('pointermove', event => {
    if (reducedMotion || event.pointerType === 'touch') return;
    const r = host.getBoundingClientRect();
    const nx = ((event.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((event.clientY - r.top) / r.height) * 2 - 1;
    targetY = THREE.MathUtils.clamp(nx * 0.24, -0.24, 0.24);
    targetX = THREE.MathUtils.clamp(ny * 0.11, -0.11, 0.11);
  });
  host.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; });
})();
