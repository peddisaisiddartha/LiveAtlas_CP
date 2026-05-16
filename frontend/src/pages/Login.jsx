import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import './Login.css';

const Login = ({ setUserRole }) => {
  const navigate = useNavigate();

  const mountRef = useRef(null);
  const animationRef = useRef(null);

  const handleLogin = (role) => {
    setUserRole(role);

    if (role === 'guide') {
      navigate('/guide-dashboard');
    } else {
      navigate('/user-dashboard');
    }
  };

  useEffect(() => {
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      65,
      1,
      0.1,
      3000
    );

    camera.position.z = 12;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, 2)
    );

    const container = mountRef.current;

    if (container) {
      container.appendChild(renderer.domElement);
    }

    /* =====================================================
       LIGHTING SYSTEM
    ===================================================== */

    const ambientLight = new THREE.AmbientLight(
      0xffffff,
      0.7
    );

    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(
      0xffffff,
      2.6
    );

    directionalLight.position.set(8, 5, 10);

    scene.add(directionalLight);

    const hemiLight = new THREE.HemisphereLight(
      0x88bbff,
      0x080820,
      1.5
    );

    scene.add(hemiLight);

    /* =====================================================
       EARTH GLOBE
    ===================================================== */

    const textureLoader = new THREE.TextureLoader();

    const earthTexture = textureLoader.load('/earth.jpg');

    earthTexture.colorSpace = THREE.SRGBColorSpace;

    const globeGeometry = new THREE.SphereGeometry(
      4.8,
      128,
      128
    );

    const globeMaterial = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.85,
      metalness: 0.06,
    });

    const globe = new THREE.Mesh(
      globeGeometry,
      globeMaterial
    );

    scene.add(globe);

    /* =====================================================
       ATMOSPHERE
    ===================================================== */

    const atmosphereGeometry = new THREE.SphereGeometry(
      5.2,
      64,
      64
    );

    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x6dd5fa,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
    });

    const atmosphere = new THREE.Mesh(
      atmosphereGeometry,
      atmosphereMaterial
    );

    scene.add(atmosphere);

    /* =====================================================
       ORBIT RINGS
    ===================================================== */

    const orbitGroup = new THREE.Group();

    const orbitMaterial = new THREE.MeshBasicMaterial({
      color: 0x6dd5fa,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });

    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(7, 0.01, 16, 200),
      orbitMaterial
    );

    ring1.rotation.x = Math.PI / 2.3;

    orbitGroup.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(8.5, 0.01, 16, 200),
      orbitMaterial
    );

    ring2.rotation.y = Math.PI / 2;

    orbitGroup.add(ring2);

    scene.add(orbitGroup);

    /* =====================================================
       STARS
    ===================================================== */

    const starsGeometry = new THREE.BufferGeometry();

    const starsCount = 7000;

    const positions = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 2500;
      positions[i + 1] = (Math.random() - 0.5) * 2500;
      positions[i + 2] = (Math.random() - 0.5) * 2500;
    }

    starsGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );

    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.4,
      transparent: true,
      opacity: 0.9,
    });

    const starField = new THREE.Points(
      starsGeometry,
      starsMaterial
    );

    scene.add(starField);

    /* =====================================================
       FLOATING GLOW SPHERES
    ===================================================== */

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x6dd5fa,
      transparent: true,
      opacity: 0.05,
    });

    const glowSphere = new THREE.Mesh(
      new THREE.SphereGeometry(10, 64, 64),
      glowMaterial
    );

    scene.add(glowSphere);

    /* =====================================================
       MOUSE INTERACTION
    ===================================================== */

    const mouse = {
      x: 0,
      y: 0,
    };

    window.addEventListener('mousemove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    /* =====================================================
       ANIMATION LOOP
    ===================================================== */

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      const t = performance.now() * 0.001;

      /* Globe */
      globe.rotation.y += 0.0012;
      globe.rotation.x = Math.sin(t * 0.18) * 0.06;

      globe.position.y = Math.sin(t * 0.5) * 0.15;

      /* Atmosphere */
      atmosphere.rotation.y += 0.0005;

      atmosphereMaterial.opacity =
        0.06 + Math.sin(t * 1.2) * 0.02;

      /* Orbit Rings */
      orbitGroup.rotation.y += 0.002;
      orbitGroup.rotation.x = Math.sin(t * 0.3) * 0.08;

      /* Glow Sphere */
      glowSphere.rotation.y += 0.0008;

      glowMaterial.opacity =
        0.03 + Math.sin(t * 0.9) * 0.01;

      /* Stars */
      starField.rotation.y += 0.00008;

      /* Cinematic Camera */
      camera.position.x +=
        (mouse.x * 0.7 - camera.position.x) * 0.02;

      camera.position.y +=
        (mouse.y * 0.45 - camera.position.y) * 0.02;

      camera.position.z =
        12 + Math.sin(t * 0.25) * 0.3;

      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };

    animate();

    /* =====================================================
       RESIZE
    ===================================================== */

    const updateSize = () => {
      if (!container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width <= 0 || height <= 0) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    };

    setTimeout(updateSize, 100);

    const resizeObserver = new ResizeObserver(updateSize);

    if (container) {
      resizeObserver.observe(container);
    }

    window.addEventListener('resize', updateSize);

    /* =====================================================
       CLEANUP
    ===================================================== */

    return () => {
      cancelAnimationFrame(animationRef.current);

      resizeObserver.disconnect();

      window.removeEventListener('resize', updateSize);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      globeGeometry.dispose();
      globeMaterial.dispose();
      earthTexture.dispose();
      starsGeometry.dispose();
      starsMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="login-container">

      <div className="globe-container" ref={mountRef}></div>

      <div className="ambient-gradient ambient-gradient-1"></div>
      <div className="ambient-gradient ambient-gradient-2"></div>

      <div className="overlay">

        <div className="portal-panel">

          <div className="portal-topline">
            LIVE IMMERSIVE TOURISM PLATFORM
          </div>

          <h1 className="portal-title">
            Enter The
            <span>LiveAtlas Universe</span>
          </h1>

          <p className="portal-subtitle">
            Explore destinations, cultures, and humanity in real time through immersive live experiences powered by local guides worldwide.
          </p>

          <div className="buttons">

            <button
              className="role-button tourist"
              onClick={() => handleLogin('user')}
            >
              ENTER AS TOURIST
            </button>

            <button
              className="role-button guide"
              onClick={() => handleLogin('guide')}
            >
              ENTER AS GUIDE
            </button>

          </div>

          <div className="portal-footer">
            Spatial Tourism Interface • WebRTC Powered
          </div>

        </div>

      </div>

    </div>
  );
};

export default Login;
