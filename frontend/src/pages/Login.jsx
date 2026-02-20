import React, { useEffect, useRef } from 'react';
import{useNavigate} from 'react-router-dom';
import * as THREE from 'three';
import './Login.css';

const Login = ({setUserRole}) => {
  const navigate = useNavigate();

const handleLogin = (role) => {
  setUserRole(role);

  if (role === "guide") {
    navigate("/guide-dashboard");
  } else {
    navigate("/user-dashboard");
  }
};
  const mountRef = useRef(null);
  const animationRef = useRef(null);


  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const container = mountRef.current;
    if (container) container.appendChild(renderer.domElement);

    // === SUPER REALISTIC LIGHTING (this fixes black globe) ===
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5); // strong sun
    directionalLight.position.set(8, 5, 10);
    scene.add(directionalLight);

    const hemiLight = new THREE.HemisphereLight(0xb1e1ff, 0x334466, 1.1); // sky + ground
    scene.add(hemiLight);

    // Earth globe with perfect texture loading
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('/earth.jpg', (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace; // vibrant colors
      console.log('✅ Earth texture loaded successfully!');
    }, undefined, (err) => {
      console.error('❌ Texture failed to load - check public/earth.jpg', err);
    });

    const geometry = new THREE.SphereGeometry(5, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.9,
      metalness: 0.05,
    });

    const globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    // Starfield
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 5000;
    const positions = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 1800;
      positions[i + 1] = (Math.random() - 0.5) * 1800;
      positions[i + 2] = (Math.random() - 0.5) * 1800;
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.8,
      transparent: true,
      opacity: 0.85,
    });
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);

    camera.position.z = 13;

    // Animation
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
     globe.rotation.y += 0.0008;
     globe.rotation.x = Math.sin(Date.now() * 0.0002) * 0.05;
      renderer.render(scene, camera);
    };
    animate();

    // Resize handling
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
    if (container) resizeObserver.observe(container);
    window.addEventListener('resize', updateSize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
      if (container && renderer.domElement) container.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      earthTexture.dispose();
      starsGeometry.dispose();
      starsMaterial.dispose();
      renderer.dispose();
    };
  }, []);


  return (
  <div className="login-container">
    <div className="globe-container" ref={mountRef}></div>

    <div className="overlay">
      <div className="login-content">
        <div className="logo">LiveAtlas</div>
        <p className="tagline">
          Travel without moving.<br />
          Experience the world in real time.
        </p>

        <div className="buttons">
          <button
            className="role-button tourist"
            onClick={() => handleLogin("user")}
          >
            I AM A TOURIST
          </button>

          <button
            className="role-button guide"
            onClick={() => handleLogin("guide")}
          >
            I AM A GUIDE
          </button>
        </div>
      </div>
    </div>
  </div>
);
};

export default Login;
