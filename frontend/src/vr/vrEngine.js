import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

let renderer = null;
let scene = null;
let camera = null;
let sphere = null;
let videoTexture = null;
let animationId = null;

export function initVR(videoElement, container) {
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

    animate();
}

function animate() {
    animationId = requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

export function disposeVR() {
    if (animationId) cancelAnimationFrame(animationId);

    if (renderer) {
        renderer.dispose();
        if (renderer.domElement?.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
    }

    scene = null;
    camera = null;
    sphere = null;
    videoTexture = null;
    renderer = null;
}
