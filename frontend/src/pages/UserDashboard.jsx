import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaGlobeAmericas, FaUserCircle } from 'react-icons/fa';
import { supabase } from '../lib/supabase';

/* ─────────────────────────────────────────────
   INJECTED STYLES  (scoped, no class collisions)
───────────────────────────────────────────────*/
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Space+Grotesk:wght@300;400;500;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --sky: #0a0e1a;
    --deep: #060810;
    --glow-c: #00d4ff;
    --glow-p: #7c3aed;
    --glow-g: #10b981;
    --card-bg: rgba(8, 14, 35, 0.72);
    --card-border: rgba(0, 212, 255, 0.13);
    --card-border-hover: rgba(0, 212, 255, 0.45);
  }

  body { background: var(--deep); }

  /* ── Canvas BG ── */
  .la-canvas {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }

  /* ── Noise overlay ── */
  .la-noise {
    position: fixed;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    opacity: 0.35;
  }

  /* ── Wrapper ── */
  .la-wrap {
    position: relative;
    z-index: 2;
    min-height: 100vh;
    font-family: 'Space Grotesk', sans-serif;
    color: #e0eaff;
  }

  /* ── Navbar ── */
  .la-nav {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 48px;
    background: rgba(6,8,16,0.75);
    backdrop-filter: blur(24px);
    border-bottom: 1px solid rgba(0,212,255,0.08);
  }

  .la-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 22px;
    letter-spacing: -0.5px;
    color: #e0eaff;
    text-decoration: none;
  }

  .la-logo-icon {
    animation: spin-slow 18s linear infinite;
    color: var(--glow-c);
    filter: drop-shadow(0 0 8px rgba(0,212,255,0.7));
  }

  @keyframes spin-slow { to { transform: rotate(360deg); } }

  .la-logo span { color: var(--glow-c); }

  .la-nav-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 22px;
    border-radius: 100px;
    border: 1px solid rgba(0,212,255,0.2);
    background: rgba(0,212,255,0.05);
    color: rgba(224,234,255,0.75);
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.25s;
    letter-spacing: 0.3px;
  }
  .la-nav-pill:hover {
    background: rgba(0,212,255,0.12);
    border-color: rgba(0,212,255,0.5);
    color: #fff;
    transform: translateY(-1px);
    box-shadow: 0 0 20px rgba(0,212,255,0.15);
  }

  /* ── Hero ── */
  .la-hero {
    position: relative;
    height: 480px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    overflow: hidden;
    padding: 0 24px;
  }

  .la-hero-bg {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(180deg, rgba(6,8,16,0) 0%, rgba(6,8,16,0.5) 60%, rgba(6,8,16,1) 100%),
      linear-gradient(rgba(6,8,16,0.55), rgba(6,8,16,0.72)),
      url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=2021&q=80');
    background-size: cover;
    background-position: center;
    transform-origin: center;
    animation: hero-drift 20s ease-in-out infinite alternate;
  }

  @keyframes hero-drift {
    from { transform: scale(1.08) translateX(-1%) translateY(-1%); }
    to   { transform: scale(1.15) translateX(1%) translateY(1%); }
  }

  .la-hero-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    pointer-events: none;
    animation: pulse-orb 6s ease-in-out infinite;
  }

  @keyframes pulse-orb {
    0%,100% { opacity: 0.35; transform: scale(1); }
    50%      { opacity: 0.6;  transform: scale(1.12); }
  }

  .la-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 18px;
    border-radius: 100px;
    background: rgba(0,212,255,0.1);
    border: 1px solid rgba(0,212,255,0.3);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--glow-c);
    margin-bottom: 24px;
    position: relative;
    z-index: 2;
  }

  .la-hero-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--glow-c);
    animation: blink 1.2s ease-in-out infinite;
    box-shadow: 0 0 6px var(--glow-c);
  }

  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

  .la-hero-h1 {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: clamp(40px, 6vw, 76px);
    line-height: 1.05;
    letter-spacing: -2px;
    color: #fff;
    position: relative;
    z-index: 2;
    margin-bottom: 18px;
    text-shadow: 0 0 60px rgba(0,212,255,0.2);
  }

  .la-hero-h1 em {
    font-style: normal;
    background: linear-gradient(90deg, var(--glow-c) 0%, #a78bfa 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .la-hero-sub {
    font-size: 18px;
    color: rgba(224,234,255,0.65);
    max-width: 620px;
    line-height: 1.7;
    position: relative;
    z-index: 2;
    font-weight: 300;
  }

  /* ── Grid section ── */
  .la-section {
    padding: 0 48px 80px;
    max-width: 1280px;
    margin: 0 auto;
  }

  .la-section-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 36px;
    flex-wrap: wrap;
    gap: 20px;
  }

  .la-section-title {
    font-family: 'Syne', sans-serif;
    font-size: 36px;
    font-weight: 800;
    color: #fff;
    letter-spacing: -1px;
  }

  .la-section-title span {
    color: var(--glow-c);
  }

  /* ── Intent selector ── */
  .la-intent-wrap {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .la-intent-btn {
    padding: 8px 20px;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid rgba(0,212,255,0.2);
    background: transparent;
    color: rgba(224,234,255,0.55);
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.4px;
    font-family: 'Space Grotesk', sans-serif;
  }

  .la-intent-btn:hover {
    background: rgba(0,212,255,0.08);
    color: var(--glow-c);
    border-color: rgba(0,212,255,0.4);
  }

  .la-intent-btn.active {
    background: rgba(0,212,255,0.15);
    color: var(--glow-c);
    border-color: var(--glow-c);
    box-shadow: 0 0 16px rgba(0,212,255,0.2), inset 0 0 12px rgba(0,212,255,0.05);
  }

  /* ── Hidden native select (logic intact) ── */
  .la-select-hidden {
    position: absolute;
    opacity: 0;
    pointer-events: none;
    width: 0; height: 0;
  }

  /* ── Tour Grid ── */
  .la-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 28px;
  }

  /* ── Tour Card ── */
  .la-card {
    position: relative;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: transform 0.35s cubic-bezier(0.23,1,0.32,1),
                box-shadow 0.35s cubic-bezier(0.23,1,0.32,1),
                border-color 0.35s;
    cursor: default;
    backdrop-filter: blur(16px);
    transform-style: preserve-3d;
    will-change: transform;
  }

  .la-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 20px;
    background: linear-gradient(135deg, rgba(0,212,255,0.04) 0%, rgba(124,58,237,0.04) 100%);
    opacity: 0;
    transition: opacity 0.35s;
    z-index: 1;
    pointer-events: none;
  }

  .la-card:hover {
    transform: translateY(-10px) rotateX(2deg);
    box-shadow:
      0 30px 70px rgba(0,0,0,0.6),
      0 0 0 1px rgba(0,212,255,0.35),
      0 0 40px rgba(0,212,255,0.08);
    border-color: var(--card-border-hover);
  }

  .la-card:hover::before { opacity: 1; }

  /* Image */
  .la-card-img {
    height: 210px;
    background-size: cover;
    background-position: center;
    position: relative;
    overflow: hidden;
  }

  .la-card-img::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 40%, rgba(6,8,16,0.9) 100%);
  }

  /* LIVE badge */
  .la-live-badge {
    position: absolute;
    top: 14px;
    right: 14px;
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 13px;
    border-radius: 100px;
    background: rgba(239,68,68,0.15);
    border: 1px solid rgba(239,68,68,0.5);
    font-size: 11px;
    font-weight: 700;
    color: #f87171;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    backdrop-filter: blur(8px);
  }

  .la-live-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #ef4444;
    box-shadow: 0 0 8px #ef4444;
    animation: blink 1s ease-in-out infinite;
  }

  /* Card body */
  .la-card-body {
    padding: 22px 24px 26px;
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 2;
  }

  .la-card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
    gap: 10px;
  }

  .la-card-title {
    font-family: 'Syne', sans-serif;
    font-size: 19px;
    font-weight: 700;
    color: #fff;
    line-height: 1.2;
    letter-spacing: -0.3px;
  }

  .la-card-price {
    font-family: 'Syne', sans-serif;
    font-size: 18px;
    font-weight: 800;
    color: var(--glow-c);
    white-space: nowrap;
    text-shadow: 0 0 20px rgba(0,212,255,0.4);
  }

  .la-card-desc {
    font-size: 13.5px;
    color: rgba(160,180,220,0.75);
    line-height: 1.65;
    margin-bottom: 18px;
    flex: 1;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .la-card-guide {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: rgba(160,180,220,0.6);
    margin-bottom: 20px;
    font-weight: 400;
  }

  .la-card-guide svg, .la-card-guide .la-guide-icon {
    color: var(--glow-p);
    opacity: 0.8;
  }

  /* Join button */
  .la-join-btn {
    display: block;
    width: 82%;
    margin: 0 auto;
    text-align: center;
    padding: 13px 24px;
    border-radius: 100px;
    border: none;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 600;
    font-size: 14px;
    letter-spacing: 0.5px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
    background: linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%);
    color: #fff;
    box-shadow: 0 0 30px rgba(6,182,212,0.3), 0 0 60px rgba(124,58,237,0.15);
  }

  .la-join-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .la-join-btn:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 0 50px rgba(6,182,212,0.45), 0 0 80px rgba(124,58,237,0.25);
  }

  .la-join-btn:hover::before { opacity: 1; }
  .la-join-btn:active { transform: scale(0.98); }

  /* ── Empty state ── */
  .la-empty {
    grid-column: 1 / -1;
    text-align: center;
    padding: 80px 40px;
    background: rgba(8,14,35,0.6);
    border-radius: 20px;
    border: 1px solid rgba(0,212,255,0.08);
  }

  .la-empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .la-empty h3 {
    font-family: 'Syne', sans-serif;
    font-size: 22px;
    color: rgba(224,234,255,0.6);
    margin-bottom: 8px;
  }

  .la-empty p {
    font-size: 14px;
    color: rgba(160,180,220,0.45);
  }

  /* ── Stats bar ── */
  .la-stats {
    display: flex;
    gap: 1px;
    background: rgba(0,212,255,0.06);
    border-top: 1px solid rgba(0,212,255,0.07);
    border-bottom: 1px solid rgba(0,212,255,0.07);
    margin-bottom: 56px;
  }

  .la-stat {
    flex: 1;
    padding: 22px 32px;
    text-align: center;
    border-right: 1px solid rgba(0,212,255,0.06);
  }
  .la-stat:last-child { border-right: none; }

  .la-stat-val {
    font-family: 'Syne', sans-serif;
    font-size: 28px;
    font-weight: 800;
    color: var(--glow-c);
    text-shadow: 0 0 20px rgba(0,212,255,0.3);
    display: block;
    margin-bottom: 4px;
  }

  .la-stat-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: rgba(160,180,220,0.45);
    font-weight: 500;
  }

  /* ── Scroll reveal ── */
  @keyframes card-in {
    from { opacity: 0; transform: translateY(30px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .la-card-anim {
    animation: card-in 0.55s cubic-bezier(0.23,1,0.32,1) both;
  }
`;

/* ─────────────────────────────────────────────
   WEBGL STARFIELD CANVAS
───────────────────────────────────────────────*/
const StarCanvas = () => {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let W, H, stars = [], animId;
    const STAR_COUNT = 260;

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };

    const init = () => {
      stars = Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.4 + 0.2,
        vx: (Math.random() - 0.5) * 0.08,
        vy: Math.random() * 0.06 + 0.02,
        o: Math.random() * 0.7 + 0.1,
        pulse: Math.random() * Math.PI * 2,
        col: Math.random() > 0.85 ? '#00d4ff' : Math.random() > 0.7 ? '#a78bfa' : '#fff'
      }));
    };

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      t += 0.008;

      // ambient gradient
      const g = ctx.createRadialGradient(W * 0.5, H * 0.3, 0, W * 0.5, H * 0.3, W * 0.65);
      g.addColorStop(0, 'rgba(0,50,120,0.12)');
      g.addColorStop(1, 'rgba(6,8,16,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // secondary orb
      const g2 = ctx.createRadialGradient(W * 0.8, H * 0.7, 0, W * 0.8, H * 0.7, W * 0.4);
      g2.addColorStop(0, 'rgba(124,58,237,0.07)');
      g2.addColorStop(1, 'rgba(6,8,16,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);

      stars.forEach(s => {
        s.pulse += 0.018;
        const op = s.o * (0.6 + 0.4 * Math.sin(s.pulse));
        ctx.globalAlpha = op;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.col;
        ctx.fill();

        // glow for colored stars
        if (s.col !== '#fff') {
          ctx.globalAlpha = op * 0.25;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
          const gstar = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
          gstar.addColorStop(0, s.col);
          gstar.addColorStop(1, 'transparent');
          ctx.fillStyle = gstar;
          ctx.fill();
        }

        ctx.globalAlpha = 1;
        s.x += s.vx; s.y += s.vy;
        if (s.y > H + 2) { s.y = -2; s.x = Math.random() * W; }
        if (s.x < 0) s.x = W;
        if (s.x > W) s.x = 0;
      });

      // horizontal scan line
      const scanY = ((t * 0.3) % 1) * H;
      const sg = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      sg.addColorStop(0, 'rgba(0,212,255,0)');
      sg.addColorStop(0.5, 'rgba(0,212,255,0.03)');
      sg.addColorStop(1, 'rgba(0,212,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, scanY - 30, W, 60);

      animId = requestAnimationFrame(draw);
    };

    resize();
    init();
    draw();
    window.addEventListener('resize', () => { resize(); init(); });
    return () => { cancelAnimationFrame(animId); };
  }, []);

  return <canvas ref={ref} className="la-canvas" />;
};

/* ─────────────────────────────────────────────
   MOUSE-TILT on cards
───────────────────────────────────────────────*/
const TiltCard = ({ children, animDelay }) => {
  const ref = useRef(null);

  const onMove = (e) => {
    const card = ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    card.style.transform = `perspective(800px) rotateY(${dx * 7}deg) rotateX(${-dy * 5}deg) translateY(-8px)`;
  };

  const onLeave = () => {
    const card = ref.current;
    if (!card) return;
    card.style.transform = '';
  };

  return (
    <div
      ref={ref}
      className="la-card la-card-anim"
      style={{ animationDelay: animDelay }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </div>
  );
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT  — all original logic intact
───────────────────────────────────────────────*/
const UserDashboard = () => {
  // ── ORIGINAL STATE ──────────────────────────
  const [tours, setTours] = useState([]);
  const [intent, setIntent] = useState("Explore");

  // ── ORIGINAL EFFECT ─────────────────────────
  useEffect(() => {
    fetch('https://liveatlas-cp.onrender.com/api/tours/')
      .then(res => res.json())
      .then(data => setTours(data))
      .catch(err => console.error("Failed to load tours", err));
  }, []);
  // ────────────────────────────────────────────

  const INTENTS = ["Explore", "Talk", "Learn", "Experience"];

  return (
    <>
      <style>{STYLES}</style>
      <StarCanvas />
      <div className="la-noise" />

      <div className="la-wrap">

        {/* ── NAVBAR ─────────────────────────────── */}
        <nav className="la-nav">
          <div className="la-logo">
            <FaGlobeAmericas className="la-logo-icon" size={22} />
            Live<span>Atlas</span>
          </div>

          {/* ORIGINAL: Link to="/" for logout */}
          <Link to="/" className="la-nav-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </Link>
        </nav>

        {/* ── HERO ───────────────────────────────── */}
        <section className="la-hero">
          <div className="la-hero-bg" />

          {/* Orbs */}
          <div className="la-hero-orb" style={{ width: 500, height: 500, top: -120, left: '10%', background: 'radial-gradient(circle, rgba(0,212,255,0.18) 0%, transparent 70%)' }} />
          <div className="la-hero-orb" style={{ width: 400, height: 400, bottom: -80, right: '8%', background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)', animationDelay: '-3s' }} />

          <div className="la-hero-badge">
            <span className="la-hero-dot" />
            Live Streaming Now
          </div>

          <h1 className="la-hero-h1">
            Explore the<br /><em>World Live</em>
          </h1>
          <p className="la-hero-sub">
            Connect with local guides in real-time and experience destinations from your home.
          </p>
        </section>

        {/* ── STATS BAR ──────────────────────────── */}
        <div className="la-stats">
          {[
            { val: tours.length || '—', label: 'Active Broadcasts' },
            { val: '₹400', label: 'Goes to guide' },
            { val: '4', label: 'Destinations' },
            { val: '∞', label: 'Possibilities' },
          ].map(s => (
            <div className="la-stat" key={s.label}>
              <span className="la-stat-val">{s.val}</span>
              <span className="la-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── TOUR GRID ──────────────────────────── */}
        <div className="la-section">
          <div className="la-section-head">
            <h2 className="la-section-title">Active <span>Broadcasts</span></h2>

            {/* ── INTENT UI: visual pills ─── */}
            <div className="la-intent-wrap">
              {INTENTS.map(i => (
                <button
                  key={i}
                  className={`la-intent-btn${intent === i ? ' active' : ''}`}
                  onClick={() => setIntent(i)}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* ORIGINAL hidden select — logic preserved exactly */}
          <select
            className="la-select-hidden"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            aria-hidden="true"
            tabIndex={-1}
          >
            <option value="Explore">Explore</option>
            <option value="Talk">Talk</option>
            <option value="Learn">Learn</option>
            <option value="Experience">Experience</option>
          </select>

          <div className="la-grid">
            {tours.length === 0 ? (
              <div className="la-empty">
                <div className="la-empty-icon">🌍</div>
                <h3>No active tours right now</h3>
                <p>Please check back later when a guide goes live.</p>
              </div>
            ) : (
              tours.map((tour, idx) => {
                // ORIGINAL image logic
                const imageUrl = tour.thumbnail
                  ? tour.thumbnail
                  : "https://via.placeholder.com/400x300";

                return (
                  <TiltCard key={tour.id} animDelay={`${idx * 0.08}s`}>

                    {/* Image */}
                    <div
                      className="la-card-img"
                      style={{ backgroundImage: `url('${imageUrl}')` }}
                    >
                      <div className="la-live-badge">
                        <span className="la-live-dot" />
                        LIVE
                      </div>
                    </div>

                    {/* Body */}
                    <div className="la-card-body">
                      <div className="la-card-top">
                        <h3 className="la-card-title">{tour.title}</h3>
                        {/* ORIGINAL price logic */}
                        <span className="la-card-price">
                          ₹{tour.price > 0 ? tour.price : '1000'}
                        </span>
                      </div>

                      <p className="la-card-desc">{tour.description}</p>

                      <div className="la-card-guide">
                        <FaUserCircle size={15} className="la-guide-icon" />
                        <span>Guide: {tour.guide__username}</span>
                      </div>

                      {/* ORIGINAL onClick — zero changes */}
                      <button
                        className="la-join-btn"
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from("session_intents")
                              .insert([
                                {
                                  room_id: `tour-${tour.id}`,
                                  intent: intent,
                                },
                              ]);

                            if (error) throw error;

                            console.log("Intent Saved:", intent);

                            window.location.href = `/room/tour-${tour.id}`;

                          } catch (err) {
                            console.error("Join failed:", err);
                            alert("Something went wrong. Try again.");
                          }
                        }}
                      >
                        Join Broadcast
                      </button>
                    </div>
                  </TiltCard>
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
