import * as THREE from "three";

let renderer = null;
let scene = null;
let camera = null;
let sphere = null;
let videoTexture = null;
let isVRRunning = false;

/**
 * Initialize VR environment once video is ready
 */
export async function initVR(container, video) {
  if (isVRRunning || !container || !video) return;

  // Ensure mobile compatibility
  video.setAttribute("playsinline", "");
  video.setAttribute("muted", "");
  try {
    await video.play();
  } catch (err) {
    console.warn("Autoplay blocked:", err);
  }

  // Wait until video starts decoding
  video.onplaying = () => {
    console.log("Video started — initializing VR...");
    startVR(container, video);
  };
}

/**
 * Start VR rendering
 */
function startVR(container, video) {
  if (isVRRunning) return;
  isVRRunning = true;

  // Create VideoTexture
  videoTexture = new THREE.VideoTexture(video);
  videoTexture.colorSpace = THREE.SRGBColorSpace;
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  videoTexture.generateMipmaps = false;

  // Scene setup
  scene = new THREE.Scene();

  // Sphere geometry (inside-out)
  const geometry = new THREE.SphereGeometry(500, 60, 40);
  geometry.scale(-1, 1, 1);

  const material = new THREE.MeshBasicMaterial({ map: videoTexture });
  sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);

  // Camera setup
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    1100
  );

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Animation loop
  renderer.setAnimationLoop(() => {
    if (video.readyState >= 2) {
      videoTexture.needsUpdate = true;
    }
    renderer.render(scene, camera);
  });

  // Handle resize
  window.addEventListener("resize", handleResize);
}

/**
 * Resize handler
 */
function handleResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Dispose VR environment
 */
export function disposeVR() {
  if (!isVRRunning) return;

  renderer?.setAnimationLoop(null);
  if (renderer?.domElement?.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement);
  }

  sphere?.geometry?.dispose();
  sphere?.material?.dispose();
  videoTexture?.dispose();
  renderer?.dispose();

  window.removeEventListener("resize", handleResize);

  scene = null;
  camera = null;
  sphere = null;
  videoTexture = null;
  renderer = null;
  isVRRunning = false;

  console.log("VR mode disposed successfully.");
}
