import * as THREE from "three";

let renderer = null;
let scene = null;
let camera = null;
let sphere = null;
let videoTexture = null;
let isVRRunning = false;

/**
 * Wait for a real decoded video frame before starting Three.js
 * This is the core fix for the black screen issue.
 */
function waitForVideoReady(video) {
  return new Promise((resolve) => {
    function check() {
      // readyState >= 3 means actual frame data is available
      // videoWidth > 0 means a real frame (not a black 0x0 frame) is decoded
      if (video.readyState >= 3 && video.videoWidth > 0 && video.videoHeight > 0) {
        // If browser supports requestVideoFrameCallback, wait for confirmed GPU frame
        if ("requestVideoFrameCallback" in video) {
          video.requestVideoFrameCallback(() => resolve());
        } else {
          // Fallback: one extra rAF to let the GPU catch up
          requestAnimationFrame(() => resolve());
        }
      } else {
        // Not ready yet — check again next frame
        requestAnimationFrame(check);
      }
    }
    check();
  });
}

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

  // FIXED: Wait for a real decoded frame instead of relying on onplaying event.
  // The old code used video.onplaying which never fires if video is already playing,
  // causing a permanent black screen on every VR mode toggle after the first one.
  console.log("VR waiting for decoded video frame...");
  await waitForVideoReady(video);
  console.log("Video frame confirmed — initializing VR...");

  startVR(container, video);
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
  // FIXED: format set to RGBAFormat to avoid GPU format mismatch on mobile browsers
  videoTexture.format = THREE.RGBAFormat;

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
    container.clientWidth / container.clientHeight,
    1,
    1100
  );

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Animation loop
  renderer.setAnimationLoop(() => {
    // FIXED: readyState >= 3 (was >= 2) ensures actual frame data before texture upload
    // needsUpdate = true every frame is required for live WebRTC streams
    if (video.readyState >= 3) {
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
