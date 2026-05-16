import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import "./Login.css";

const Login = ({ setUserRole }) => {

  const navigate = useNavigate();

  const mountRef = useRef(null);

  const animationRef = useRef(null);

  const handleLogin = (role) => {

    setUserRole(role);

    if (role === "guide") {
      navigate("/guide-dashboard");
    } else {
      navigate("/user-dashboard");
    }
  };

  useEffect(() => {

    /* =====================================================
       SCENE SETUP
    ===================================================== */

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      3000
    );

    camera.position.z = 14;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, 2)
    );

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );

    const container = mountRef.current;

    container.appendChild(renderer.domElement);

    /* =====================================================
       LIGHTING
    ===================================================== */

    const ambientLight = new THREE.AmbientLight(
      0xffffff,
      0.8
    );

    scene.add(ambientLight);

    const directionalLight =
      new THREE.DirectionalLight(
        0xffffff,
        2.5
      );

    directionalLight.position.set(8, 5, 10);

    scene.add(directionalLight);

    const hemiLight =
      new THREE.HemisphereLight(
        0x88bbff,
        0x050816,
        1.5
      );

    scene.add(hemiLight);

    /* =====================================================
       EARTH
    ===================================================== */

    const textureLoader =
      new THREE.TextureLoader();

    const earthTexture =
      textureLoader.load("/earth.jpg");

    earthTexture.colorSpace =
      THREE.SRGBColorSpace;

    const globeGeometry =
      new THREE.SphereGeometry(
        5,
        128,
        128
      );

    const globeMaterial =
      new THREE.MeshStandardMaterial({
        map: earthTexture,
        roughness: 0.85,
        metalness: 0.08,
      });

    const globe =
      new THREE.Mesh(
        globeGeometry,
        globeMaterial
      );

    scene.add(globe);

    /* =====================================================
       ATMOSPHERE
    ===================================================== */

    const atmosphereGeometry =
      new THREE.SphereGeometry(
        5.3,
        64,
        64
      );

    const atmosphereMaterial =
      new THREE.MeshBasicMaterial({
        color: 0x6dd5fa,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
      });

    const atmosphere =
      new THREE.Mesh(
        atmosphereGeometry,
        atmosphereMaterial
      );

    scene.add(atmosphere);

    /* =====================================================
       ORBIT RINGS
    ===================================================== */

    const ringMaterial =
      new THREE.MeshBasicMaterial({
        color: 0x6dd5fa,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
      });

    const ring1 =
      new THREE.Mesh(
        new THREE.TorusGeometry(
          7,
          0.01,
          16,
          200
        ),
        ringMaterial
      );

    ring1.rotation.x =
      Math.PI / 2.2;

    scene.add(ring1);

    const ring2 =
      new THREE.Mesh(
        new THREE.TorusGeometry(
          9,
          0.01,
          16,
          200
        ),
        ringMaterial
      );

    ring2.rotation.y =
      Math.PI / 2;

    scene.add(ring2);

    /* =====================================================
       STARS
    ===================================================== */

    const starsGeometry =
      new THREE.BufferGeometry();

    const starsCount = 8000;

    const positions =
      new Float32Array(
        starsCount * 3
      );

    for (
      let i = 0;
      i < starsCount * 3;
      i += 3
    ) {

      positions[i] =
        (Math.random() - 0.5) * 2500;

      positions[i + 1] =
        (Math.random() - 0.5) * 2500;

      positions[i + 2] =
        (Math.random() - 0.5) * 2500;
    }

    starsGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        positions,
        3
      )
    );

    const starsMaterial =
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.3,
        transparent: true,
        opacity: 0.9,
      });

    const stars =
      new THREE.Points(
        starsGeometry,
        starsMaterial
      );

    scene.add(stars);

    /* =====================================================
       MOUSE INTERACTION
    ===================================================== */

    const mouse = {
      x: 0,
      y: 0,
    };

    window.addEventListener(
      "mousemove",
      (e) => {

        mouse.x =
          (e.clientX / window.innerWidth) * 2 - 1;

        mouse.y =
          -(e.clientY / window.innerHeight) * 2 + 1;
      }
    );

    /* =====================================================
       ANIMATION
    ===================================================== */

    const animate = () => {

      animationRef.current =
        requestAnimationFrame(animate);

      const t =
        performance.now() * 0.001;

      /* Globe */
      globe.rotation.y += 0.001;

      globe.rotation.x =
        Math.sin(t * 0.2) * 0.05;

      globe.position.y =
        Math.sin(t * 0.4) * 0.15;

      /* Atmosphere */
      atmosphere.rotation.y += 0.0005;

      atmosphereMaterial.opacity =
        0.06 +
        Math.sin(t * 0.8) * 0.02;

      /* Rings */
      ring1.rotation.z += 0.0012;
      ring2.rotation.x += 0.0008;

      /* Stars */
      stars.rotation.y += 0.00008;

      /* Camera Drift */
      camera.position.x +=
        (mouse.x * 0.8 - camera.position.x)
        * 0.02;

      camera.position.y +=
        (mouse.y * 0.5 - camera.position.y)
        * 0.02;

      camera.lookAt(scene.position);

      renderer.render(
        scene,
        camera
      );
    };

    animate();

    /* =====================================================
       RESIZE
    ===================================================== */

    const resizeHandler = () => {

      camera.aspect =
        window.innerWidth /
        window.innerHeight;

      camera.updateProjectionMatrix();

      renderer.setSize(
        window.innerWidth,
        window.innerHeight
      );
    };

    window.addEventListener(
      "resize",
      resizeHandler
    );

    /* =====================================================
       CLEANUP
    ===================================================== */

    return () => {

      cancelAnimationFrame(
        animationRef.current
      );

      window.removeEventListener(
        "resize",
        resizeHandler
      );

      renderer.dispose();

      globeGeometry.dispose();
      globeMaterial.dispose();

      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();

      starsGeometry.dispose();
      starsMaterial.dispose();

      if (
        container &&
        renderer.domElement
      ) {
        container.removeChild(
          renderer.domElement
        );
      }
    };

  }, []);

  return (

    <div className="login-world">

      <div
        className="three-world"
        ref={mountRef}
      ></div>

      {/* Ambient Glows */}
      <div className="ambient ambient-1"></div>
      <div className="ambient ambient-2"></div>

      {/* Left Cinematic Text */}
      <div className="hero-left">

        <div className="topline">
          LIVE IMMERSIVE TOURISM
        </div>

        <h1 className="hero-title">

          ENTER THE

          <span>
            LIVEATLAS
          </span>

          UNIVERSE

        </h1>

        <p className="hero-sub">

          Explore destinations,
          cultures and humanity
          through real-time
          immersive experiences
          powered by local guides.

        </p>

      </div>

      {/* Right Spatial Controls */}
      <div className="hero-right">

        <div
          className="portal-node tourist-node"
          onClick={() => handleLogin("user")}
        >

          <div className="node-glow"></div>

          <div className="node-label">
            TOURIST
          </div>

        </div>

        <div
          className="portal-node guide-node"
          onClick={() => handleLogin("guide")}
        >

          <div className="node-glow"></div>

          <div className="node-label">
            GUIDE
          </div>

        </div>

      </div>

      {/* Bottom Info */}
      <div className="bottom-system">

        SPATIAL TOURISM INTERFACE • WEBRTC POWERED

      </div>

    </div>
  );
};

export default Login;