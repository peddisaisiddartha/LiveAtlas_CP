import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaGlobeAmericas, FaUserCircle } from 'react-icons/fa';
import { supabase } from '../lib/supabase';

/* ══════════════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════════════ */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --c: #00ffe7;
  --c2: #ff2d78;
  --c3: #7b2fff;
  --c4: #ffe600;
  --bg: #02040f;
  --hud: rgba(0,255,231,0.07);
  --hud-border: rgba(0,255,231,0.18);
}

html, body { background: var(--bg); overflow-x: hidden; }

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: #02040f; }
::-webkit-scrollbar-thumb { background: var(--c); border-radius: 2px; }

/* ── Root wrapper ── */
.hud-root {
  position: relative;
  min-height: 100vh;
  font-family: 'Rajdhani', sans-serif;
  color: #c8fff8;
  overflow-x: hidden;
}

/* ══ CITY CANVAS ══ */
#city-canvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

/* ══ HUD SCANLINES ══ */
.hud-scanlines {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0,255,231,0.012) 2px,
    rgba(0,255,231,0.012) 4px
  );
}

/* ══ HUD CORNERS (screen dressing) ══ */
.hud-corner {
  position: fixed;
  width: 80px; height: 80px;
  z-index: 3;
  pointer-events: none;
}
.hud-corner svg { width: 100%; height: 100%; }
.hud-corner.tl { top: 12px; left: 12px; }
.hud-corner.tr { top: 12px; right: 12px; transform: scaleX(-1); }
.hud-corner.bl { bottom: 12px; left: 12px; transform: scaleY(-1); }
.hud-corner.br { bottom: 12px; right: 12px; transform: scale(-1); }

/* ══ HUD TICKER ══ */
.hud-ticker {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  z-index: 10;
  height: 30px;
  background: rgba(0,255,231,0.05);
  border-top: 1px solid var(--hud-border);
  display: flex;
  align-items: center;
  overflow: hidden;
}
.hud-ticker-inner {
  display: flex;
  gap: 80px;
  white-space: nowrap;
  animation: ticker 28s linear infinite;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(0,255,231,0.5);
}
@keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }

/* ══ CONTENT LAYER ══ */
.hud-content {
  position: relative;
  z-index: 2;
  min-height: 100vh;
}

/* ══ NAVBAR ══ */
.hud-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 0 clamp(16px, 4vw, 48px);  
  height: 64px;
  background: rgba(2,4,15,0.82);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--hud-border);
}

.hud-nav::before {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--c), transparent);
  opacity: 0.4;
}

.hud-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Orbitron', monospace;
  font-weight: 900;
  font-size: 20px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #fff;
  text-decoration: none;
}

.hud-logo-icon {
  color: var(--c);
  filter: drop-shadow(0 0 8px var(--c));
  animation: spin-slow 20s linear infinite;
}
@keyframes spin-slow { to { transform: rotate(360deg); } }

.hud-logo span { color: var(--c); text-shadow: 0 0 12px var(--c); }

.hud-nav-status {
  display: flex;
  align-items: center;
  gap: 24px;
}

.hud-nav-coord {
  font-size: 11px;
  letter-spacing: 1.5px;
  color: rgba(0,255,231,0.4);
  font-weight: 500;
  font-family: 'Orbitron', monospace;
}

.hud-logout {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: transparent;
  border: 1px solid rgba(255,45,120,0.4);
  color: var(--c2);
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
  transition: all 0.2s;
}
.hud-logout:hover {
  background: rgba(255,45,120,0.12);
  border-color: var(--c2);
  box-shadow: 0 0 20px rgba(255,45,120,0.25), inset 0 0 12px rgba(255,45,120,0.06);
  color: #fff;
}

/* ══ HERO / COMMANDER PANEL ══ */
.hud-hero {
  position: relative;
  min-height: 420px;
  padding: 80px 20px 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.hud-hero-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 50% 110%, rgba(0,255,231,0.08) 0%, transparent 70%),
    radial-gradient(ellipse 50% 40% at 20% 50%, rgba(123,47,255,0.1) 0%, transparent 60%),
    radial-gradient(ellipse 40% 30% at 80% 40%, rgba(255,45,120,0.07) 0%, transparent 60%);
}

.hud-hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0,255,231,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,255,231,0.04) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse 90% 100% at 50% 100%, black 30%, transparent 80%);
}

.hud-hero-center {
  position: relative;
  z-index: 2;
  text-align: center;
}

.hud-hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: 'Orbitron', monospace;
  font-size: 11px;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: var(--c);
  margin-bottom: 20px;
  opacity: 0;
  animation: fade-up 0.6s 0.2s forwards;
}

.hud-hero-eyebrow::before,
.hud-hero-eyebrow::after {
  content: '';
  width: 40px; height: 1px;
  background: linear-gradient(90deg, transparent, var(--c));
}
.hud-hero-eyebrow::after { transform: scaleX(-1); }

.hud-blink { animation: blink 1s step-end infinite; }
@keyframes blink { 50% { opacity: 0; } }

.hud-hero-h1 {
  font-family: 'Orbitron', monospace;
  font-weight: 900;
  font-size: clamp(28px, 5vw, 72px);
  line-height: 1;
  letter-spacing: -1px;
  color: #fff;
  text-transform: uppercase;
  text-shadow:
    0 0 40px rgba(0,255,231,0.3),
    0 0 80px rgba(0,255,231,0.1);
  opacity: 0;
  animation: fade-up 0.6s 0.4s forwards;
}

.hud-hero-h1 .accent { color: var(--c); text-shadow: 0 0 30px var(--c); }

.hud-hero-sub {
  font-size: 16px;
  color: rgba(200,255,248,0.5);
  letter-spacing: 1px;
  margin-top: 16px;
  font-weight: 400;
  opacity: 0;
  animation: fade-up 0.6s 0.6s forwards;
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ══ HUD DATA STRIP ══ */
.hud-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--hud-border);
  border-bottom: 1px solid var(--hud-border);
  background: rgba(0,255,231,0.02);
}

.hud-strip-cell {
  padding: 20px 32px;
  border-right: 1px solid var(--hud-border);
  position: relative;
}
.hud-strip-cell:last-child { border-right: none; }

.hud-strip-label {
  font-family: 'Orbitron', monospace;
  font-size: 9px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(0,255,231,0.35);
  margin-bottom: 6px;
}

.hud-strip-val {
  font-family: 'Orbitron', monospace;
  font-size: 26px;
  font-weight: 700;
  color: var(--c);
  text-shadow: 0 0 20px rgba(0,255,231,0.4);
  line-height: 1;
}

.hud-strip-sub {
  font-size: 11px;
  color: rgba(200,255,248,0.35);
  margin-top: 4px;
  letter-spacing: 1px;
}

.hud-strip-bar {
  position: absolute;
  bottom: 0; left: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--c), transparent);
  animation: bar-load 2s ease-out forwards;
}
@keyframes bar-load { from { width: 0; } to { width: 60%; } }

/* ══ SECTION ══ */
.hud-section {
  padding:
  52px clamp(16px, 4vw, 48px) 100px;
  max-width: 1400px;
  margin: 0 auto;
}

/* ══ SECTION HEADER ══ */
.hud-sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 44px;
  flex-wrap: wrap;
  gap: 20px;
}

.hud-sec-title-wrap {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hud-sec-line {
  width: 4px;
  height: 40px;
  background: linear-gradient(180deg, var(--c), transparent);
}

.hud-sec-title {
  font-family: 'Orbitron', monospace;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.hud-sec-count {
  font-family: 'Orbitron', monospace;
  font-size: 11px;
  color: var(--c);
  letter-spacing: 2px;
  margin-top: 4px;
  opacity: 0.6;
}

/* ══ INTENT SELECTOR ══ */
.hud-intent-wrap {
  display: flex;
  gap: 0;
  border: 1px solid var(--hud-border);
  clip-path: polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%);
  overflow: hidden;
}

.hud-intent-btn {
  padding: 10px 22px;
  font-family: 'Orbitron', monospace;
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  border: none;
  background: transparent;
  color: rgba(200,255,248,0.35);
  cursor: pointer;
  transition: all 0.2s;
  border-right: 1px solid var(--hud-border);
  position: relative;
}
.hud-intent-btn:last-child { border-right: none; }

.hud-intent-btn:hover {
  background: rgba(0,255,231,0.06);
  color: var(--c);
}

.hud-intent-btn.active {
  background: rgba(0,255,231,0.1);
  color: var(--c);
  text-shadow: 0 0 10px var(--c);
}

.hud-intent-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 2px;
  background: var(--c);
  box-shadow: 0 0 8px var(--c);
}

.la-select-hidden {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0; height: 0;
}

/* ══ POLAROID GRID ══ */
.hud-grid {
  display: grid;
  grid-template-columns:
  repeat(auto-fit, minmax(280px, 1fr));
  gap: 40px 32px;
  padding: 20px 8px 8px;
}

/* ══ POLAROID CARD ══ */
.hud-card-outer {
  perspective: 1000px;
  cursor: pointer;
}

.hud-card {
  position: relative;
  background: linear-gradient(160deg, #0d1a2e 0%, #060c1a 100%);
  border: 1px solid rgba(0,255,231,0.15);
  border-radius: 4px;
  padding: 10px 10px 52px;
  box-shadow:
    0 0 0 1px rgba(0,255,231,0.04),
    8px 16px 40px rgba(0,0,0,0.7),
    0 0 60px rgba(0,255,231,0.03);
  transition: transform 0.4s cubic-bezier(0.23,1,0.32,1), box-shadow 0.4s;
  transform-style: preserve-3d;
  will-change: transform;
  animation: card-in 0.6s cubic-bezier(0.23,1,0.32,1) both;
}

@keyframes card-in {
  from { opacity: 0; transform: translateY(40px) rotate(var(--tilt)) scale(0.92); }
  to   { opacity: 1; transform: translateY(0)  rotate(var(--tilt)) scale(1); }
}

/* polaroid tilt — every card gets its own angle */
.hud-card:nth-child(3n+1) { --tilt: -2.2deg; }
.hud-card:nth-child(3n+2) { --tilt: 1.5deg; }
.hud-card:nth-child(3n)   { --tilt: -0.8deg; }

.hud-card:hover {
  box-shadow:
    0 0 0 1px rgba(0,255,231,0.35),
    12px 28px 60px rgba(0,0,0,0.85),
    0 0 80px rgba(0,255,231,0.08),
    0 0 120px rgba(0,255,231,0.04);
}

/* Scan line on card */
.hud-card::after {
  content: '';
  position: absolute;
  left: 10px; right: 10px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(0,255,231,0.4), transparent);
  top: 0;
  animation: card-scan 3s linear infinite;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}
.hud-card:hover::after { opacity: 1; }
@keyframes card-scan {
  from { top: 10px; }
  to   { top: calc(100% - 10px); }
}

/* Corner deco */
.hud-card-corner {
  position: absolute;
  width: 12px; height: 12px;
  border-color: var(--c);
  border-style: solid;
  opacity: 0.4;
  transition: opacity 0.3s;
  pointer-events: none;
}
.hud-card:hover .hud-card-corner { opacity: 1; }
.hud-card-corner.tl { top: 6px; left: 6px; border-width: 1px 0 0 1px; }
.hud-card-corner.tr { top: 6px; right: 6px; border-width: 1px 1px 0 0; }
.hud-card-corner.bl { bottom: 6px; left: 6px; border-width: 0 0 1px 1px; }
.hud-card-corner.br { bottom: 6px; right: 6px; border-width: 0 1px 1px 0; }

/* Image */
.hud-card-img {
  width: 100%;
  height: 200px;
  background-size: cover;
  background-position: center;
  position: relative;
  overflow: hidden;
}

.hud-card-img::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 50%, rgba(6,12,26,0.95) 100%);
  z-index: 1;
}

/* overlay grid on image */
.hud-card-img::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0,255,231,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,255,231,0.04) 1px, transparent 1px);
  background-size: 20px 20px;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.3s;
}
.hud-card:hover .hud-card-img::after { opacity: 1; }

/* LIVE badge */
.hud-live {
  position: absolute;
  top: 10px; right: 10px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(255,45,120,0.12);
  border: 1px solid rgba(255,45,120,0.5);
  clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
  font-family: 'Orbitron', monospace;
  font-size: 9px;
  letter-spacing: 2px;
  color: var(--c2);
  text-shadow: 0 0 8px var(--c2);
  font-weight: 700;
}

.hud-live-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--c2);
  box-shadow: 0 0 8px var(--c2);
  animation: blink 0.8s step-end infinite;
}

/* Polaroid bottom caption area */
.hud-card-caption {
  padding: 16px 8px 0;
  position: relative;
}

.hud-card-row1 {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  gap: 8px;
}

.hud-card-title {
  font-family: 'Orbitron', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5px;
  line-height: 1.3;
  text-transform: uppercase;
}

.hud-card-price {
  font-family: 'Orbitron', monospace;
  font-size: 15px;
  font-weight: 900;
  color: var(--c);
  text-shadow: 0 0 15px var(--c);
  white-space: nowrap;
}

.hud-card-desc {
  font-size: 12px;
  color: rgba(200,255,248,0.4);
  line-height: 1.6;
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  letter-spacing: 0.3px;
}

.hud-card-guide {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: rgba(200,255,248,0.35);
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 16px;
}

/* ══ JOIN BUTTON ══ */
.hud-join-wrap {
  position: absolute;
  bottom: -1px; left: -1px; right: -1px;
}

.hud-join-btn {
  width: 100%;
  padding: 14px 20px;
  border: none;
  background: linear-gradient(90deg, rgba(0,255,231,0.12) 0%, rgba(123,47,255,0.15) 50%, rgba(0,255,231,0.12) 100%);
  border-top: 1px solid rgba(0,255,231,0.25);
  border-radius: 0 0 4px 4px;
  color: var(--c);
  font-family: 'Orbitron', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.25s;
}

.hud-join-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(0,255,231,0.12), transparent);
  transform: translateX(-100%);
  transition: transform 0.4s;
}

.hud-join-btn:hover {
  background: linear-gradient(90deg, rgba(0,255,231,0.18) 0%, rgba(123,47,255,0.22) 50%, rgba(0,255,231,0.18) 100%);
  color: #fff;
  text-shadow: 0 0 12px var(--c);
  box-shadow: 0 0 30px rgba(0,255,231,0.15);
}

.hud-join-btn:hover::before { transform: translateX(100%); }

.hud-join-btn:active { transform: scale(0.99); }

/* ══ EMPTY STATE ══ */
.hud-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 80px 40px;
  background: rgba(0,255,231,0.02);
  border: 1px dashed rgba(0,255,231,0.15);
  clip-path: polygon(20px 0%, 100% 0%, calc(100% - 20px) 100%, 0% 100%);
}

.hud-empty-code {
  font-family: 'Orbitron', monospace;
  font-size: 10px;
  letter-spacing: 3px;
  color: rgba(0,255,231,0.25);
  margin-bottom: 12px;
  text-transform: uppercase;
}

.hud-empty h3 {
  font-family: 'Orbitron', monospace;
  font-size: 18px;
  color: rgba(200,255,248,0.4);
  margin-bottom: 8px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.hud-empty p {
  font-size: 13px;
  color: rgba(200,255,248,0.2);
  letter-spacing: 1px;
}

/* ══ MISC ══ */
@keyframes card-in {
  from { opacity: 0; transform: translateY(40px) rotate(var(--tilt,0deg)) scale(0.92); }
  to   { opacity: 1; transform: translateY(0)  rotate(var(--tilt,0deg)) scale(1); }
}
`;

/* ══════════════════════════════════════════════════════════
   3D CITY CANVAS
══════════════════════════════════════════════════════════ */
const CityCanvas = () => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let W, H, raf;
    let mouse = { x: 0, y: 0 };
    let t = 0;

    const handleMouseMove = (e) => {
  mouse.x = e.clientX / window.innerWidth - 0.5;
  mouse.y = e.clientY / window.innerHeight - 0.5;
};

window.addEventListener('mousemove', handleMouseMove);

    const resize = () => {

  W = window.innerWidth;
  H = window.innerHeight;

  const dpr = Math.min(
    window.devicePixelRatio || 1,
    1.5
  );

  canvas.width = W * dpr;
  canvas.height = H * dpr;

  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.scale(dpr, dpr);
};
    resize();
    window.addEventListener('resize', resize);

    // Building definitions
    const BUILDINGS = [];
    const COLS = ['rgba(0,255,231,', 'rgba(123,47,255,', 'rgba(255,45,120,', 'rgba(255,230,0,'];

    const genCity = () => {
      BUILDINGS.length = 0;
      const layers = [
        { count: 18, zBase: 0.85, wRange: [18, 38], hRange: [60, 180], yBase: 0.72 },
        { count: 22, zBase: 0.65, wRange: [22, 50], hRange: [90, 280], yBase: 0.76 },
        { count: 16, zBase: 0.45, wRange: [28, 60], hRange: [140, 380], yBase: 0.80 },
        { count: 10, zBase: 0.25, wRange: [35, 70], hRange: [200, 480], yBase: 0.85 },
      ];
      layers.forEach(layer => {
        for (let i = 0; i < layer.count; i++) {
          const w = layer.wRange[0] + Math.random() * (layer.wRange[1] - layer.wRange[0]);
          const h = layer.hRange[0] + Math.random() * (layer.hRange[1] - layer.hRange[0]);
          const x = Math.random();
          const col = COLS[Math.floor(Math.random() * COLS.length)];
          // Windows pattern
          const winRows = Math.floor(h / 18);
          const winCols = Math.floor(w / 10);
          const windows = [];
          for (let r = 0; r < winRows; r++) {
            for (let c = 0; c < winCols; c++) {
              if (Math.random() > 0.45) {
                windows.push({
                  rx: c / winCols,
                  ry: r / winRows,
                  on: Math.random() > 0.3,
                  blink: Math.random() > 0.92,
                  blinkSpeed: 0.5 + Math.random() * 2,
                  col: COLS[Math.floor(Math.random() * COLS.length)]
                });
              }
            }
          }
          BUILDINGS.push({ x, w, h, col, z: layer.zBase + (Math.random() - 0.5) * 0.08, yBase: layer.yBase, windows, antenna: Math.random() > 0.6, antennaH: 10 + Math.random() * 30 });
        }
      });
      BUILDINGS.sort((a, b) => b.z - a.z);
    };

    genCity();

    let isTabVisible = true;

      document.addEventListener("visibilitychange", () => {
      isTabVisible = document.visibilityState === "visible";
    });

    const draw = () => {
      if (!isTabVisible) {
        raf = requestAnimationFrame(draw);
        return;
      }

t += 0.012;
      ctx.clearRect(0, 0, W, H);

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#02040f');
      sky.addColorStop(0.4, '#03091a');
      sky.addColorStop(0.7, '#060e24');
      sky.addColorStop(1, '#020610');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Horizon glow
      const hg = ctx.createRadialGradient(W / 2, H * 0.78, 0, W / 2, H * 0.78, W * 0.7);
      hg.addColorStop(0, 'rgba(0,255,231,0.07)');
      hg.addColorStop(0.4, 'rgba(123,47,255,0.04)');
      hg.addColorStop(1, 'transparent');
      ctx.fillStyle = hg;
      ctx.fillRect(0, 0, W, H);

      // Stars
      ctx.save();
      for (let i = 0; i < 120; i++) {
        const sx = ((i * 137.5 + mouse.x * 20) % W + W) % W;
        const sy = ((i * 89.3 - mouse.y * 10) % (H * 0.65) + H * 0.65) % (H * 0.65);
        const sr = 0.3 + (Math.sin(t + i) * 0.5 + 0.5) * 0.8;
        const so = 0.2 + (Math.sin(t * 0.7 + i * 0.3) * 0.5 + 0.5) * 0.5;
        ctx.globalAlpha = so;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fillStyle = i % 7 === 0 ? '#00ffe7' : i % 5 === 0 ? '#a78bfa' : '#fff';
        ctx.fill();
      }
      ctx.restore();

      // Perspective grid (ground)
      const horizon = H * 0.78;
      ctx.save();
      ctx.globalAlpha = 0.12;
      const vp = { x: W / 2 + mouse.x * 40, y: horizon };
      const gridLines = 12;
      for (let i = 0; i <= gridLines; i++) {
        const px = (i / gridLines) * W * 1.6 - W * 0.3;
        ctx.beginPath();
        ctx.moveTo(vp.x, vp.y);
        ctx.lineTo(px, H + 10);
        ctx.strokeStyle = `rgba(0,255,231,${0.05 + (i % 3 === 0 ? 0.08 : 0)})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      for (let j = 1; j <= 10; j++) {
        const frac = j / 10;
        const y = horizon + (H - horizon) * (frac * frac);
        const xLeft = vp.x + ((-W * 0.3) - vp.x) * frac * 1.5;
        const xRight = vp.x + ((W * 1.3) - vp.x) * frac * 1.5;
        ctx.beginPath();
        ctx.moveTo(xLeft, y);
        ctx.lineTo(xRight, y);
        ctx.strokeStyle = `rgba(0,255,231,0.06)`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
      ctx.restore();

      // BUILDINGS
      BUILDINGS.forEach(b => {
        const parallax = (1 - b.z) * mouse.x * 40;
        const bx = (b.x * W * 1.3 - W * 0.15 + parallax);
        const by = b.yBase * H;
        const bw = b.w * (1 - b.z * 0.3) * (W / 900);
        const bh = b.h * (1 - b.z * 0.2) * (H / 900);
        const alpha = 0.3 + (1 - b.z) * 0.7;

        ctx.globalAlpha = alpha;

        // Building body
        const bg = ctx.createLinearGradient(bx, by - bh, bx + bw, by);
        bg.addColorStop(0, b.col + '0.15)');
        bg.addColorStop(1, b.col + '0.05)');
        ctx.fillStyle = bg;
        ctx.fillRect(bx, by - bh, bw, bh);

        // Edge glow
        ctx.strokeStyle = b.col + `${0.15 + (1 - b.z) * 0.2})`;
        ctx.lineWidth = 0.8;
        ctx.strokeRect(bx, by - bh, bw, bh);

        // Windows
        b.windows.forEach(w => {
          if (!w.on) return;
          const lit = w.blink ? (Math.sin(t * w.blinkSpeed + b.x * 10) > 0) : true;
          if (!lit) return;
          const wx = bx + w.rx * bw + 2;
          const wy = (by - bh) + w.ry * bh + 2;
          const ww = Math.max(2, bw / (Math.floor(bw / 10) + 1) - 3);
          const wh = Math.max(2, bh / (Math.floor(bh / 18) + 1) - 4);
          ctx.globalAlpha = alpha * (0.3 + Math.random() * 0.0);
          ctx.fillStyle = w.col + '0.7)';
          ctx.fillRect(wx, wy, ww, wh);
        });

        // Antenna
        if (b.antenna) {
          ctx.globalAlpha = alpha * 0.8;
          ctx.strokeStyle = b.col + '0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(bx + bw / 2, by - bh);
          ctx.lineTo(bx + bw / 2, by - bh - b.antennaH);
          ctx.stroke();
          // Blink light
          const bOn = Math.sin(t * 2 + b.x * 5) > 0;
          if (bOn) {
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(bx + bw / 2, by - bh - b.antennaH, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#ff2d78';
            ctx.fill();
          }
        }

        ctx.globalAlpha = 1;
      });

      // Ground glow / reflection
      const rg = ctx.createLinearGradient(0, H * 0.78, 0, H);
      rg.addColorStop(0, 'rgba(0,255,231,0.04)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, H * 0.78, W, H * 0.22);

      setTimeout(() => {
        raf = requestAnimationFrame(draw);
      }, 1000 / 45);
    };

    draw();

return () => {
  cancelAnimationFrame(raf);

  window.removeEventListener('resize', resize);

  window.removeEventListener(
    'mousemove',
    handleMouseMove
  );
};
  }, []);

  return <canvas ref={ref} id="city-canvas" />;
};  

/* ══════════════════════════════════════════════════════════
   TILT POLAROID WRAPPER
══════════════════════════════════════════════════════════ */
const PolaroidCard = ({ children, delay }) => {
  const ref = useRef(null);

  const onMove = e => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
    const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    el.style.transform = `perspective(900px) rotateY(${dx * 10}deg) rotateX(${-dy * 7}deg) translateY(-12px) scale(1.03)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = '';
  };

  return (
    <div className="hud-card-outer">
      <div
        ref={ref}
        className="hud-card"
        style={{ animationDelay: delay, transition: 'transform 0.45s cubic-bezier(0.23,1,0.32,1), box-shadow 0.4s' }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        <div className="hud-card-corner tl" /><div className="hud-card-corner tr" />
        <div className="hud-card-corner bl" /><div className="hud-card-corner br" />
        {children}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   LIVE CLOCK
══════════════════════════════════════════════════════════ */
const HudClock = () => {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toISOString().slice(11, 19));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="hud-nav-coord">{time} UTC</span>;
};

/* ══════════════════════════════════════════════════════════
   TICKER CONTENT
══════════════════════════════════════════════════════════ */
const TICKER_ITEMS = ['LIVEATLAS NETWORK ACTIVE', 'REAL-TIME GUIDED TOURS', 'GUIDES ONLINE', 'STREAM QUALITY: OPTIMAL', 'GLOBAL REACH: 4 ZONES', '₹400 PER SESSION TO GUIDE', 'NEXT BROADCAST: IMMINENT'];
const TickerBar = () => {
  const content = [...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => <span key={i}>◈ {t}</span>);
  return (
    <div className="hud-ticker">
      <div className="hud-ticker-inner">{content}</div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   HUD CORNER SVG
══════════════════════════════════════════════════════════ */
const CornerSVG = () => (
  <svg viewBox="0 0 80 80" fill="none">
    <path d="M4 40 L4 4 L40 4" stroke="rgba(0,255,231,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M4 4 L14 4" stroke="rgba(0,255,231,0.8)" strokeWidth="1.5"/>
    <path d="M4 4 L4 14" stroke="rgba(0,255,231,0.8)" strokeWidth="1.5"/>
    <circle cx="4" cy="4" r="2" fill="rgba(0,255,231,0.6)"/>
    <circle cx="40" cy="4" r="1.5" fill="rgba(0,255,231,0.3)"/>
    <circle cx="4" cy="40" r="1.5" fill="rgba(0,255,231,0.3)"/>
  </svg>
);

/* ══════════════════════════════════════════════════════════
   MAIN — ALL ORIGINAL LOGIC PRESERVED
══════════════════════════════════════════════════════════ */
const UserDashboard = () => {
  // ── ORIGINAL STATE ──────────────────────────────────────
  const [tours, setTours] = useState([]);
  const [intent, setIntent] = useState("Explore");

  // ── ORIGINAL EFFECT ─────────────────────────────────────
  useEffect(() => {
    fetch('https://liveatlas-cp.onrender.com/api/tours/')
      .then(res => res.json())
      .then(data => setTours(data))
      .catch(err => console.error("Failed to load tours", err));
  }, []);
  // ────────────────────────────────────────────────────────

  const INTENTS = ["Explore", "Talk", "Learn", "Experience"];

  return (
    <>
      <style>{STYLES}</style>
      <CityCanvas />
      <div className="hud-scanlines" />

      {/* HUD corners */}
      {['tl','tr','bl','br'].map(p => (
        <div key={p} className={`hud-corner ${p}`}><CornerSVG /></div>
      ))}

      <TickerBar />

      <div className="hud-content">

        {/* ── NAVBAR ────────────────────────────────────────── */}
        <nav className="hud-nav">
          <div className="hud-logo">
            <FaGlobeAmericas className="hud-logo-icon" size={20} />
            Live<span>Atlas</span>
          </div>
          <div className="hud-nav-status">
            <HudClock />
            {/* ORIGINAL: Link to="/" logout */}
            <Link to="/" className="hud-logout">
              ⏻ Logout
            </Link>
          </div>
        </nav>

        {/* ── HERO ──────────────────────────────────────────── */}
        <section className="hud-hero">
          <div className="hud-hero-bg" />
          <div className="hud-hero-grid" />
          <div className="hud-hero-center">
            <div className="hud-hero-eyebrow">
              <span className="hud-blink">▮</span>
              LIVE STREAM NETWORK
              <span className="hud-blink">▮</span>
            </div>
            <h1 className="hud-hero-h1">
              Explore the<br /><span className="accent">World Live</span>
            </h1>
            <p className="hud-hero-sub">
              Connect with local guides in real-time · Experience destinations from home
            </p>
          </div>
        </section>

        {/* ── DATA STRIP ────────────────────────────────────── */}
        <div className="hud-strip">
          {[
            { label: 'Active Broadcasts', val: tours.length || '—', sub: 'Live now' },
            { label: 'Guide Earnings', val: '₹400', sub: 'Per session' },
            { label: 'Network Zones', val: '04', sub: 'Global' },
            { label: 'System Status', val: 'LIVE', sub: 'All systems go' },
          ].map((s, i) => (
            <div className="hud-strip-cell" key={i}>
              <div className="hud-strip-bar" style={{ animationDelay: `${i * 0.2}s` }} />
              <div className="hud-strip-label">{s.label}</div>
              <div className="hud-strip-val">{s.val}</div>
              <div className="hud-strip-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── GRID SECTION ──────────────────────────────────── */}
        <div className="hud-section">
          <div className="hud-sec-head">
            <div className="hud-sec-title-wrap">
              <div className="hud-sec-line" />
              <div>
                <div className="hud-sec-title">Active Broadcasts</div>
                <div className="hud-sec-count">// {tours.length} FEEDS DETECTED</div>
              </div>
            </div>

            {/* INTENT — visual buttons synced to original select */}
            <div className="hud-intent-wrap">
              {INTENTS.map(i => (
                <button
                  key={i}
                  className={`hud-intent-btn${intent === i ? ' active' : ''}`}
                  onClick={() => setIntent(i)}
                >{i}</button>
              ))}
            </div>
          </div>

          {/* ORIGINAL hidden select — logic fully intact */}
          <select
            className="la-select-hidden"
            value={intent}
            onChange={e => setIntent(e.target.value)}
            aria-hidden="true"
            tabIndex={-1}
          >
            <option value="Explore">Explore</option>
            <option value="Talk">Talk</option>
            <option value="Learn">Learn</option>
            <option value="Experience">Experience</option>
          </select>

          {/* ── TOUR GRID ─────────────────────────────────── */}
          <div className="hud-grid">
            {tours.length === 0 ? (
              <div className="hud-empty">
                <div className="hud-empty-code">// NO FEED DETECTED — STANDING BY</div>
                <h3>No Active Tours</h3>
                <p>Please check back when a guide goes live</p>
              </div>
            ) : (
              tours.map((tour, idx) => {
                // ORIGINAL image logic
                const imageUrl = tour.thumbnail
                  ? tour.thumbnail
                  : "https://via.placeholder.com/400x300";

                return (
                  <PolaroidCard key={tour.id} delay={`${idx * 0.07}s`}>

                    {/* Image */}
                    <div
                      className="hud-card-img"
                      style={{ backgroundImage: `url('${imageUrl}')` }}
                    >
                      <div className="hud-live">
                        <span className="hud-live-dot" />
                        LIVE
                      </div>
                    </div>

                    {/* Caption */}
                    <div className="hud-card-caption">
                      <div className="hud-card-row1">
                        <div className="hud-card-title">{tour.title}</div>
                        {/* ORIGINAL price logic */}
                        <div className="hud-card-price">₹{tour.price > 0 ? tour.price : '1000'}</div>
                      </div>
                      <div className="hud-card-desc">{tour.description}</div>
                      <div className="hud-card-guide">
                        <FaUserCircle size={13} />
                        Guide: {tour.guide__username}
                      </div>
                    </div>

                    {/* ORIGINAL onClick — zero changes */}
                    <div className="hud-join-wrap">
                      <button
                        className="hud-join-btn"
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from("session_intents")
                              .insert([{ room_id: `tour-${tour.id}`, intent: intent }]);
                            if (error) throw error;
                            console.log("Intent Saved:", intent);
                            window.location.href = `/room/tour-${tour.id}`;
                          } catch (err) {
                            console.error("Join failed:", err);
                            alert("Something went wrong. Try again.");
                          }
                        }}
                      >
                        ⟶ Join Broadcast
                      </button>
                    </div>

                  </PolaroidCard>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UserDashboard;