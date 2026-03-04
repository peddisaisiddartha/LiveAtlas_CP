import * as THREE from "three";


let renderer = null;
let scene = null;
let camera = null;
let sphere = null;
let videoTexture = null;
let animationId = null;
let xrSession = null;
let controls = null;
let vrVideo = null;

export function initVR(container, videoElement) {

    vrVideo = document.createElement("video");
    vrVideo.srcObject = videoElement.srcObject;
    vrVideo.muted = true;
    vrVideo.playsInline = true;
    vrVideo.autoplay = true;
    vrVideo.play().catch(() => {});

    vrVideo.style.display = "none";
    document.body.appendChild(vrVideo);


    // Scene
    scene = new THREE.Scene();

    // Camera

    camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0,0,0);
    camera.lookAt(0, 0, -1);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });

    const width = container.clientWidth;
    const height = container.clientHeight;

    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);



    container.appendChild(renderer.domElement);


    // Create sphere
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1); // Invert sphere

    if (vrVideo.readyState < 2) {
    vrVideo.play().catch(() => {});
}

   const createSphere = () => {
    videoTexture = new THREE.VideoTexture(vrVideo);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexture.generateMipmaps = false;
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.needsUpdate = true;

    const material = new THREE.MeshBasicMaterial({
        map: videoTexture
    });

    sphere = new THREE.Mesh(geometry, material);
    sphere.rotation.y = Math.PI; // Rotate to correct orientation
    scene.add(sphere);
};

vrVideo.addEventListener("playing", () => {
    if (!sphere) {
        createSphere();
    }
});

    if (vrVideo.readyState >= 3 && !sphere) {
        createSphere();
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
        if (videoTexture) {
        videoTexture.needsUpdate = true;
    }
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

    if (vrVideo) {
    vrVideo.pause();
    vrVideo.srcObject = null;
    vrVideo.remove();
    vrVideo = null;
}

    if (videoTexture) videoTexture.dispose();
   if (sphere) {
        sphere.geometry.dispose();
        if (sphere.material) sphere.material.dispose();
  }
    renderer.dispose();

    scene = null;
    camera = null;
    sphere = null;
    videoTexture = null;
    renderer = null;
}

