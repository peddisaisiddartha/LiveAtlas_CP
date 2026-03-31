import * as THREE from "three";

let renderer;
let scene;
let camera;
let sphere;
let videoTexture;

export function initVR(container, videoElement) {

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

    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    videoElement.muted = true;
    videoElement.play().catch(() => {});

    videoTexture = new THREE.VideoTexture(videoElement);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshBasicMaterial({
        map: videoTexture,
        side: THREE.BackSide
    });

    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

   renderer.setAnimationLoop(() => {

    if (videoTexture) {
        videoTexture.needsUpdate = true;
    }

    renderer.render(scene, camera);
    });

    window.addEventListener("resize", () => {

        const width = container.clientWidth;
        const height = container.clientHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);

    });

}

export function disposeVR(){

    if(!renderer) return;

    renderer.setAnimationLoop(null);

    if(renderer.domElement?.parentNode){
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    }

    if(videoTexture) videoTexture.dispose();

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

}
