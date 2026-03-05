import * as THREE from "three";

let renderer = null;
let scene = null;
let camera = null;
let sphere = null;
let videoTexture = null;
let vrVideo = null;

let videoCanvas = null;
let videoCtx = null;

export function initVR(container, videoElement) {

    // clone the stream into a hidden video
    vrVideo = document.createElement("video");
    vrVideo.srcObject = videoElement.srcObject;
    vrVideo.muted = true;
    vrVideo.playsInline = true;
    vrVideo.autoplay = true;
    vrVideo.style.display = "none";
    document.body.appendChild(vrVideo);

    vrVideo.play().catch(() => {});

    // canvas used to copy video frames
    videoCanvas = document.createElement("canvas");
    videoCtx = videoCanvas.getContext("2d");

    // THREE scene
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );

    camera.position.set(0,0,0.1);

    renderer = new THREE.WebGLRenderer({ antialias:true });

    renderer.setSize(
        container.clientWidth,
        container.clientHeight
    );

    renderer.setPixelRatio(window.devicePixelRatio);

    container.appendChild(renderer.domElement);

    // sphere
    const geometry = new THREE.SphereGeometry(500,60,40);
    geometry.scale(-1,1,1);

    videoTexture = new THREE.CanvasTexture(videoCanvas);

    const material = new THREE.MeshBasicMaterial({
        map: videoTexture,
        side: THREE.BackSide
    });

    sphere = new THREE.Mesh(geometry,material);
    scene.add(sphere);

    // resize handling
    window.addEventListener("resize",()=>{

        if(!renderer || !camera) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width,height);

    });

    // render loop
    renderer.setAnimationLoop(()=>{

        if(vrVideo && vrVideo.readyState >= 2){

            videoCanvas.width = vrVideo.videoWidth;
            videoCanvas.height = vrVideo.videoHeight;

            videoCtx.drawImage(
                vrVideo,
                0,
                0,
                videoCanvas.width,
                videoCanvas.height
            );

            if(videoTexture){
                videoTexture.needsUpdate = true;
            }

        }

        renderer.render(scene,camera);

    });

}

export function disposeVR(){

    if(!renderer) return;

    renderer.setAnimationLoop(null);

    if(renderer.domElement?.parentNode){
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    }

    if(vrVideo){
        vrVideo.pause();
        vrVideo.srcObject = null;
        vrVideo.remove();
        vrVideo = null;
    }

    if(videoTexture) videoTexture.dispose();

    if(sphere){
        sphere.geometry.dispose();
        sphere.material.dispose();
    }

    renderer.dispose();

    scene = null;
    camera = null;
    sphere = null;
    renderer = null;
    videoTexture = null;

}
