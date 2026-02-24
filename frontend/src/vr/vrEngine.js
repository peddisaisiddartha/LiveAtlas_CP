import * as THREE from "three";
import { DeviceOrientationControls } from "three/examples/jsm/controls/DeviceOrientationControls.js";

let renderer = null;
let scene = null;
let camera = null;
let sphere = null;
let videoTexture = null;
let animationId = null;
let xrSession = null;
let controls = null;

export function initVR(container, videoElement) {
    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 0.1);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.xr.enabled = true; // Enable WebXR


    container.appendChild(renderer.domElement);


    // Create sphere
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1); // Invert sphere

    videoTexture = new THREE.VideoTexture(videoElement);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;

    const material = new THREE.MeshBasicMaterial({
        map: videoTexture
    });

    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    if (!navigator.xr) {
    controls = new DeviceOrientationControls(camera);
}

    window.addEventListener("resize", () => {
    if (!camera || !renderer) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

renderer.setAnimationLoop(() => {
        if (controls) controls.update();
        renderer.render(scene, camera);
});
}


export function disposeVR() {
    if (!renderer) return;

    renderer.setAnimationLoop(null);

    if (xrSession) {
        xrSession.end();
        xrSession = null;
    }

    if (renderer.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    }

    if (videoTexture) videoTexture.dispose();
    if (sphere) sphere.geometry.dispose();

    renderer.dispose();

    scene = null;
    camera = null;
    sphere = null;
    videoTexture = null;
    renderer = null;
}

