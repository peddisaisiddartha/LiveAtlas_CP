import * as THREE from "three";

let renderer;
let scene;
let camera;
let sphere;
let videoTexture;
let handleResize;
let isVRRunning = false;

export function initVR(container, videoElement) {

    if (isVRRunning) return;
    isVRRunning = true;

    if (renderer) {
        disposeVR();
    }

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );

    camera.position.set(0, 0, 0.1);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    container.appendChild(renderer.domElement);

   // 🎬 Curved Screen Setup

videoElement.muted = true;

if (videoElement.readyState >= 2) {
    videoElement.play().catch(() => {});
} else {
    videoElement.onloadeddata = () => {
        videoElement.play().catch(() => {});
    };
}

videoTexture = new THREE.VideoTexture(videoElement);
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;
videoTexture.colorSpace = THREE.SRGBColorSpace;

// Curved geometry
const geometry = new THREE.PlaneGeometry(16, 9, 32, 32);

const position = geometry.attributes.position;

for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = Math.sin((x / 16) * Math.PI) * -2;
    position.setZ(i, z);
}

geometry.computeVertexNormals();

// Material
const material = new THREE.MeshBasicMaterial({
    map: videoTexture
});

// Mesh
const screen = new THREE.Mesh(geometry, material);
scene.add(screen);

// Camera adjustment
camera.position.set(0, 0, 10);

// 🎯 VR Orientation Control
let lon = 0;
let lat = 0;

const handleOrientation = (event) => {
    const gamma = event.gamma || 0; // left-right
    const beta = event.beta || 0;   // up-down

    lon = gamma * 2;
    lat = beta * 2;
};

window.addEventListener("deviceorientation", handleOrientation);

 renderer.setAnimationLoop(() => {

    const phi = THREE.MathUtils.degToRad(90 - lat);
    const theta = THREE.MathUtils.degToRad(lon);

    const radius = 10;

    camera.position.x = radius * Math.sin(phi) * Math.cos(theta);
    camera.position.y = radius * Math.cos(phi);
    camera.position.z = radius * Math.sin(phi) * Math.sin(theta);

    camera.lookAt(0, 0, 0);

    if (videoTexture) {
        videoTexture.needsUpdate = true;
    }

    renderer.render(scene, camera);
});

   const handleResize = () => {

    if (!camera || !renderer) return; // 🔥 CRITICAL FIX

    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
};

window.addEventListener("resize", handleResize);

}

export function disposeVR(){

    if(!renderer) return;

    renderer.setAnimationLoop(null);

    if(renderer.domElement?.parentNode){
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    }

    if(videoTexture) videoTexture.dispose();

    window.removeEventListener("resize", handleResize); // ✅ ADD THIS

    if(sphere){
        sphere.geometry.dispose();
        sphere.material.dispose();
    }

    renderer.dispose();

    renderer = null;
    scene = null;
    camera = null;
    sphere = null;
    videoTexture = null;
    
    isVRRunning = false;

}
