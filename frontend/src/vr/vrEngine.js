import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

let renderer;
let scene;
let camera;
let sphere;
let videoTexture;
let animationId;
let controls;

function waitForVideo(video) {

    return new Promise((resolve) => {

        const checkVideo = () => {

            if (
                video.readyState >= 2 &&
                video.videoWidth > 0 &&
                video.videoHeight > 0
            ) {

                console.log(
                    "✅ Video ready:",
                    video.videoWidth,
                    video.videoHeight
                );

                resolve();

            } else {

                requestAnimationFrame(checkVideo);
            }
        };

        checkVideo();
    });
}

export async function initVR(
    container,
    videoElement
) {

    try {

        if (!container || !videoElement) {

            console.log(
                "❌ VR init failed: missing container/video"
            );

            return;
        }

        await waitForVideo(videoElement);

        disposeVR();

        console.log("🚀 Initializing VR Engine");

        /* =====================================================
           SCENE
        ===================================================== */

        scene = new THREE.Scene();

        /* =====================================================
           CAMERA
        ===================================================== */

        camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth /
            container.clientHeight,
            0.1,
            2000
        );

        camera.position.set(0, 0, 0);

        /* =====================================================
           RENDERER
        ===================================================== */

        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });

        renderer.setPixelRatio(
            Math.min(window.devicePixelRatio, 2)
        );

        renderer.setSize(
            container.clientWidth,
            container.clientHeight
        );

        renderer.outputColorSpace =
            THREE.SRGBColorSpace;

        container.innerHTML = "";

        container.appendChild(
            renderer.domElement
        );

        /* =====================================================
           VIDEO TEXTURE
        ===================================================== */

        videoTexture =
            new THREE.VideoTexture(videoElement);

        videoTexture.minFilter =
            THREE.LinearFilter;

        videoTexture.magFilter =
            THREE.LinearFilter;

        videoTexture.generateMipmaps = false;

        videoTexture.colorSpace =
            THREE.SRGBColorSpace;

        /* =====================================================
           SPHERE
        ===================================================== */

        const geometry =
            new THREE.SphereGeometry(
                500,
                128,
                128
            );

        geometry.scale(-1, 1, 1);

        const material =
            new THREE.MeshBasicMaterial({
                map: videoTexture
            });

        sphere =
            new THREE.Mesh(
                geometry,
                material
            );

        scene.add(sphere);

        /* =====================================================
   ORBIT CONTROLS
===================================================== */

controls = new OrbitControls(
    camera,
    renderer.domElement
);

controls.enableZoom = false;

controls.enablePan = false;

controls.rotateSpeed = -0.35;

controls.enableDamping = true;

controls.dampingFactor = 0.05;

controls.minDistance = 0.1;

controls.maxDistance = 0.1;

        /* =====================================================
           RENDER LOOP
        ===================================================== */

        const animate = () => {

            animationId =
                requestAnimationFrame(animate);

            if (
                videoTexture &&
                videoElement.readyState >= 2
            ) {

                videoTexture.needsUpdate = true;
            }

            if (controls) {
                controls.update();
            }

            renderer.render(scene, camera);
        };

        animate();

        /* =====================================================
           RESIZE
        ===================================================== */

        const handleResize = () => {

            if (!renderer || !camera) return;

            const width =
                container.clientWidth;

            const height =
                container.clientHeight;

            camera.aspect =
                width / height;

            camera.updateProjectionMatrix();

            renderer.setSize(width, height);
        };

        window.addEventListener(
            "resize",
            handleResize
        );

        console.log("✅ VR initialized successfully");

    } catch (err) {

        console.error(
            "❌ VR initialization error:",
            err
        );
    }
}

export function disposeVR() {

    if (animationId) {

        cancelAnimationFrame(animationId);
    }

    if (sphere) {

        sphere.geometry.dispose();

        sphere.material.dispose();

        sphere = null;
    }

    if (videoTexture) {

        videoTexture.dispose();

        videoTexture = null;
    }

    if (controls) {

    controls.dispose();

    controls = null;
}

    if (renderer) {

        renderer.dispose();

        if (
            renderer.domElement &&
            renderer.domElement.parentNode
        ) {

            renderer.domElement.parentNode
                .removeChild(
                    renderer.domElement
                );
        }

        renderer = null;
    }

    scene = null;
    camera = null;
    animationId = null;
}