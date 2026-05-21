import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaGlobeAmericas, FaPlus, FaImage } from 'react-icons/fa';

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{--gold:#f5c842;--gold2:#ff9d3d;--teal:#00ffe7;--purple:#7b2fff;--bg:#020510;--card:rgba(8,16,40,0.85);--border:rgba(245,200,66,0.18);}
html,body{background:var(--bg);overflow-x:hidden;}
::-webkit-scrollbar{width:3px;}
::-webkit-scrollbar-track{background:var(--bg);}
::-webkit-scrollbar-thumb{background:var(--gold);border-radius:2px;}
.gd-root{position:relative;min-height:100vh;font-family:'Rajdhani',sans-serif;color:#f0e6c8;overflow-x:hidden;}
#gd-canvas{position:fixed;inset:0;z-index:0;pointer-events:none;}
.gd-scan{position:fixed;inset:0;z-index:1;pointer-events:none;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(245,200,66,0.008) 3px,rgba(245,200,66,0.008) 4px);}
.gd-corner{position:fixed;width:64px;height:64px;z-index:3;pointer-events:none;opacity:0.55;}
.gd-corner svg{width:100%;height:100%;}
.gd-corner.tl{top:10px;left:10px;}
.gd-corner.tr{top:10px;right:10px;transform:scaleX(-1);}
.gd-corner.bl{bottom:10px;left:10px;transform:scaleY(-1);}
.gd-corner.br{bottom:10px;right:10px;transform:scale(-1);}
.gd-ticker{position:fixed;bottom:0;left:0;right:0;z-index:10;height:28px;background:rgba(245,200,66,0.04);border-top:1px solid rgba(245,200,66,0.12);display:flex;align-items:center;overflow:hidden;}
.gd-ticker-inner{display:flex;gap:60px;white-space:nowrap;animation:ticker 32s linear infinite;font-size:10px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:rgba(245,200,66,0.4);font-family:'Orbitron',monospace;}
@keyframes ticker{from{transform:translateX(0);}to{transform:translateX(-50%);}}
.gd-content{position:relative;z-index:2;min-height:100vh;padding-bottom:48px;}
.gd-nav{position:sticky;top:0;z-index:50;display:flex;justify-content:space-between;align-items:center;padding:0 48px;height:66px;background:rgba(2,5,16,0.88);backdrop-filter:blur(22px);border-bottom:1px solid rgba(245,200,66,0.1);}
.gd-nav::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(245,200,66,0.5),transparent);}
.gd-logo{display:flex;align-items:center;gap:12px;font-family:'Orbitron',monospace;font-weight:900;font-size:18px;letter-spacing:3px;color:#fff;text-decoration:none;}
.gd-logo-icon{color:var(--gold);filter:drop-shadow(0 0 8px rgba(245,200,66,0.7));animation:spin-slow 20s linear infinite;}
@keyframes spin-slow{to{transform:rotate(360deg);}}
.gd-logo span{color:var(--gold);text-shadow:0 0 14px rgba(245,200,66,0.6);}
.gd-nav-right{display:flex;align-items:center;gap:20px;}
.gd-nav-badge{display:flex;align-items:center;gap:7px;padding:6px 16px;border:1px solid rgba(245,200,66,0.25);border-radius:100px;background:rgba(245,200,66,0.06);font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;color:rgba(245,200,66,0.7);text-transform:uppercase;}
.gd-nav-dot{width:6px;height:6px;border-radius:50%;background:#4ade80;box-shadow:0 0 8px #4ade80;animation:blink 1.2s step-end infinite;}
@keyframes blink{50%{opacity:0.1;}}
.gd-logout{display:flex;align-items:center;gap:8px;padding:8px 20px;clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);background:transparent;border:1px solid rgba(255,80,80,0.35);color:rgba(255,130,130,0.85);font-family:'Rajdhani',sans-serif;font-weight:600;font-size:13px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:all 0.22s;}
.gd-logout:hover{background:rgba(255,80,80,0.1);border-color:rgba(255,80,80,0.7);color:#fff;box-shadow:0 0 20px rgba(255,80,80,0.2);}
.gd-hero{position:relative;text-align:center;padding:56px 24px 40px;overflow:hidden;}
.gd-hero-orb{position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none;animation:orb-pulse 7s ease-in-out infinite;}
@keyframes orb-pulse{0%,100%{opacity:0.3;transform:scale(1);}50%{opacity:0.55;transform:scale(1.12);}}
.gd-hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(245,200,66,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(245,200,66,0.035) 1px,transparent 1px);background-size:50px 50px;mask-image:radial-gradient(ellipse 80% 100% at 50% 50%,black 40%,transparent 80%);}
.gd-hero-eyebrow{display:inline-flex;align-items:center;gap:12px;font-family:'Orbitron',monospace;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--gold);margin-bottom:16px;opacity:0;animation:fade-up 0.7s 0.1s forwards;}
.gd-hero-eyebrow::before,.gd-hero-eyebrow::after{content:'';width:36px;height:1px;background:linear-gradient(90deg,transparent,var(--gold));}
.gd-hero-eyebrow::after{transform:scaleX(-1);}
.gd-hero-title{font-family:'Orbitron',monospace;font-weight:900;font-size:clamp(28px,5vw,58px);line-height:1.05;letter-spacing:-1px;text-transform:uppercase;color:#fff;text-shadow:0 0 50px rgba(245,200,66,0.2);opacity:0;animation:fade-up 0.7s 0.25s forwards;}
.gd-hero-title .acc{color:var(--gold);text-shadow:0 0 24px rgba(245,200,66,0.6);}
.gd-hero-sub{font-size:15px;color:rgba(240,230,200,0.5);letter-spacing:1px;margin-top:12px;font-weight:400;opacity:0;animation:fade-up 0.7s 0.4s forwards;}
@keyframes fade-up{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
.gd-card-wrap{max-width:620px;margin:0 auto;padding:0 24px 80px;}
.gd-card{position:relative;background:var(--card);border:1px solid var(--border);border-radius:4px;backdrop-filter:blur(20px);overflow:hidden;box-shadow:0 0 0 1px rgba(245,200,66,0.04),0 30px 80px rgba(0,0,0,0.7),0 0 80px rgba(245,200,66,0.04);animation:card-in 0.8s cubic-bezier(0.23,1,0.32,1) 0.5s both;}
@keyframes card-in{from{opacity:0;transform:translateY(40px) scale(0.96);}to{opacity:1;transform:translateY(0) scale(1);}}
.gd-card-bar{height:3px;background:linear-gradient(90deg,var(--gold),var(--gold2),var(--purple),var(--teal),var(--gold));background-size:300% 100%;animation:bar-shift 4s linear infinite;}
@keyframes bar-shift{to{background-position:300% 0;}}
.gd-card-header{padding:28px 32px 0;display:flex;align-items:center;gap:14px;margin-bottom:28px;}
.gd-card-header-icon{width:44px;height:44px;border-radius:50%;background:rgba(245,200,66,0.08);border:1px solid rgba(245,200,66,0.25);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
.gd-card-title{font-family:'Orbitron',monospace;font-size:15px;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase;}
.gd-card-subtitle{font-size:11px;color:rgba(245,200,66,0.4);letter-spacing:1.5px;margin-top:3px;font-family:'Orbitron',monospace;}
.gd-card-corner{position:absolute;width:14px;height:14px;border-color:var(--gold);border-style:solid;opacity:0.4;}
.gd-card-corner.tl{top:8px;left:8px;border-width:1px 0 0 1px;}
.gd-card-corner.tr{top:8px;right:8px;border-width:1px 1px 0 0;}
.gd-card-corner.bl{bottom:8px;left:8px;border-width:0 0 1px 1px;}
.gd-card-corner.br{bottom:8px;right:8px;border-width:0 1px 1px 0;}
.gd-card-body{padding:0 32px 32px;display:flex;flex-direction:column;gap:22px;}
.gd-label{display:flex;align-items:center;gap:8px;font-family:'Orbitron',monospace;font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(245,200,66,0.6);margin-bottom:10px;}
.gd-label::before{content:'';width:16px;height:1px;background:var(--gold);opacity:0.5;}
.gd-input{width:100%;padding:14px 18px;background:rgba(245,200,66,0.03);border:1px solid rgba(245,200,66,0.15);border-radius:2px;color:#f0e6c8;font-family:'Rajdhani',sans-serif;font-size:15px;font-weight:500;letter-spacing:0.5px;outline:none;transition:all 0.25s;clip-path:polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%);}
.gd-input::placeholder{color:rgba(240,230,200,0.2);}
.gd-input:focus{border-color:rgba(245,200,66,0.5);background:rgba(245,200,66,0.06);box-shadow:0 0 0 1px rgba(245,200,66,0.15),0 0 24px rgba(245,200,66,0.06);}
.gd-textarea{width:100%;padding:14px 18px;background:rgba(245,200,66,0.03);border:1px solid rgba(245,200,66,0.15);border-radius:2px;color:#f0e6c8;font-family:'Rajdhani',sans-serif;font-size:15px;font-weight:500;letter-spacing:0.5px;outline:none;resize:vertical;min-height:110px;transition:all 0.25s;clip-path:polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%);}
.gd-textarea::placeholder{color:rgba(240,230,200,0.2);}
.gd-textarea:focus{border-color:rgba(245,200,66,0.5);background:rgba(245,200,66,0.06);box-shadow:0 0 0 1px rgba(245,200,66,0.15),0 0 24px rgba(245,200,66,0.06);}
.gd-upload-zone{position:relative;border:1px dashed rgba(245,200,66,0.25);border-radius:2px;padding:28px 20px;text-align:center;background:rgba(245,200,66,0.02);cursor:pointer;transition:all 0.25s;overflow:hidden;clip-path:polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%);}
.gd-upload-zone:hover{border-color:rgba(245,200,66,0.5);background:rgba(245,200,66,0.05);}
.gd-upload-zone.has-file{border-color:rgba(74,222,128,0.4);background:rgba(74,222,128,0.04);}
.gd-upload-icon{font-size:26px;color:rgba(245,200,66,0.4);margin-bottom:10px;display:block;}
.gd-upload-zone.has-file .gd-upload-icon{color:#4ade80;}
.gd-upload-label{display:block;font-size:13px;font-weight:600;color:rgba(240,230,200,0.5);letter-spacing:0.5px;}
.gd-upload-zone.has-file .gd-upload-label{color:#4ade80;}
.gd-upload-hint{display:block;font-size:11px;color:rgba(240,230,200,0.25);margin-top:4px;letter-spacing:0.5px;}
.gd-upload-zone::after{content:'';position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(245,200,66,0.5),transparent);top:0;opacity:0;transition:opacity 0.3s;animation:zone-scan 2s linear infinite;}
.gd-upload-zone:hover::after{opacity:1;}
@keyframes zone-scan{from{top:0;}to{top:100%;}}
.gd-btn{width:100%;padding:18px 24px;border:none;cursor:pointer;font-family:'Orbitron',monospace;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#020510;background:linear-gradient(90deg,var(--gold) 0%,var(--gold2) 50%,var(--gold) 100%);background-size:200% 100%;clip-path:polygon(14px 0%,100% 0%,calc(100% - 14px) 100%,0% 100%);position:relative;overflow:hidden;transition:all 0.3s;display:flex;align-items:center;justify-content:center;gap:12px;}
.gd-btn:not(:disabled):hover{background-position:100% 0;box-shadow:0 0 40px rgba(245,200,66,0.4),0 0 80px rgba(245,200,66,0.15);letter-spacing:4px;}
.gd-btn:disabled{opacity:0.5;cursor:not-allowed;filter:grayscale(0.4);}
.gd-btn::before{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent);animation:btn-shimmer 2.5s ease infinite;}
@keyframes btn-shimmer{0%{left:-100%;}60%,100%{left:140%;}}
.gd-btn-creating{animation:creating-pulse 1s ease-in-out infinite;}
@keyframes creating-pulse{0%,100%{box-shadow:0 0 20px rgba(245,200,66,0.3);}50%{box-shadow:0 0 50px rgba(245,200,66,0.6);}}
.gd-card-stats{display:flex;border-top:1px solid rgba(245,200,66,0.08);}
.gd-stat{flex:1;padding:16px 20px;border-right:1px solid rgba(245,200,66,0.06);text-align:center;}
.gd-stat:last-child{border-right:none;}
.gd-stat-val{font-family:'Orbitron',monospace;font-size:18px;font-weight:700;color:var(--gold);text-shadow:0 0 14px rgba(245,200,66,0.4);display:block;margin-bottom:3px;}
.gd-stat-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(240,230,200,0.3);font-family:'Orbitron',monospace;}
`;

/* ── BG CANVAS ── */
const BgCanvas = () => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let W, H, raf, t = 0;
    let mouse = { x: 0.5, y: 0.5 };
    const particles = [];
    const COLORS = ['rgba(245,200,66,','rgba(255,157,61,','rgba(123,47,255,','rgba(0,255,231,'];

    window.addEventListener('mousemove', e => { mouse.x = e.clientX / window.innerWidth; mouse.y = e.clientY / window.innerHeight; });
    window.addEventListener('touchmove', e => { mouse.x = e.touches[0].clientX / window.innerWidth; mouse.y = e.touches[0].clientY / window.innerHeight; }, { passive: true });

    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };

    const initP = () => {
      particles.length = 0;
      const count = Math.min(160, Math.floor(W * H / 8000));
      for (let i = 0; i < count; i++) {
        particles.push({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.6+0.3, vx:(Math.random()-0.5)*0.25, vy:(Math.random()-0.5)*0.18, col:COLORS[Math.floor(Math.random()*COLORS.length)], o:Math.random()*0.55+0.1, pulse:Math.random()*Math.PI*2, ps:0.012+Math.random()*0.018 });
      }
    };

    resize(); initP();
    window.addEventListener('resize', () => { resize(); initP(); });

    const draw = () => {
      t += 0.007;
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,'#020510'); bg.addColorStop(0.5,'#04091e'); bg.addColorStop(1,'#020510');
      ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

      [
        {cx:0.25+Math.sin(t*0.4)*0.12, cy:0.3+Math.cos(t*0.3)*0.08, r:0.55, col:'rgba(245,200,66,0.055)'},
        {cx:0.75+Math.cos(t*0.35)*0.1, cy:0.65+Math.sin(t*0.28)*0.1, r:0.5,  col:'rgba(123,47,255,0.07)'},
        {cx:0.5+Math.sin(t*0.5)*0.15,  cy:0.5+Math.cos(t*0.42)*0.12, r:0.4,  col:'rgba(255,157,61,0.04)'},
        {cx:mouse.x, cy:mouse.y, r:0.28, col:'rgba(245,200,66,0.04)'},
      ].forEach(a => {
        const g = ctx.createRadialGradient(a.cx*W,a.cy*H,0,a.cx*W,a.cy*H,a.r*W);
        g.addColorStop(0,a.col); g.addColorStop(1,'transparent');
        ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      });

      const horizon = H * 0.72;
      const vp = { x: W*0.5 + mouse.x*30 - 15, y: horizon };
      ctx.save(); ctx.globalAlpha = 0.09;
      for (let i=0; i<=14; i++) {
        const px = (i/14)*W*1.6 - W*0.3;
        ctx.beginPath(); ctx.moveTo(vp.x,vp.y); ctx.lineTo(px,H+10);
        ctx.strokeStyle = i%4===0 ? 'rgba(245,200,66,0.7)' : 'rgba(245,200,66,0.3)';
        ctx.lineWidth = 0.7; ctx.stroke();
      }
      for (let j=1; j<=12; j++) {
        const frac = j/12;
        const y = horizon + (H-horizon)*(frac*frac);
        const xl = vp.x + ((-W*0.3)-vp.x)*frac*1.6;
        const xr = vp.x + ((W*1.3)-vp.x)*frac*1.6;
        ctx.beginPath(); ctx.moveTo(xl,y); ctx.lineTo(xr,y);
        ctx.strokeStyle = 'rgba(245,200,66,0.2)'; ctx.lineWidth=0.5; ctx.stroke();
      }
      ctx.restore();

      particles.forEach(p => {
        p.pulse += p.ps;
        const op = p.o*(0.5+0.5*Math.sin(p.pulse));
        const pg = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*6);
        pg.addColorStop(0,p.col+'0.5)'); pg.addColorStop(1,'transparent');
        ctx.globalAlpha = op*0.4;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r*6,0,Math.PI*2); ctx.fillStyle=pg; ctx.fill();
        ctx.globalAlpha = op;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=p.col+'1)'; ctx.fill();
        ctx.globalAlpha = 1;

        const mx=mouse.x*W, my=mouse.y*H;
        const dx=mx-p.x, dy=my-p.y, dist=Math.sqrt(dx*dx+dy*dy);
        if (dist<160) { p.vx+=(dx/dist)*0.018; p.vy+=(dy/dist)*0.018; }
        p.x+=p.vx; p.y+=p.vy; p.vx*=0.98; p.vy*=0.98;
        if(p.x<-5)p.x=W+5; if(p.x>W+5)p.x=-5;
        if(p.y<-5)p.y=H+5; if(p.y>H+5)p.y=-5;
      });

      const hgl = ctx.createLinearGradient(0,horizon-2,0,horizon+40);
      hgl.addColorStop(0,'rgba(245,200,66,0.1)'); hgl.addColorStop(1,'transparent');
      ctx.fillStyle=hgl; ctx.fillRect(0,horizon-2,W,42);

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} id="gd-canvas" />;
};

const Corner = () => (
  <svg viewBox="0 0 64 64" fill="none">
    <path d="M4 32 L4 4 L32 4" stroke="rgba(245,200,66,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M4 4 L12 4" stroke="rgba(245,200,66,0.9)" strokeWidth="1.5"/>
    <path d="M4 4 L4 12" stroke="rgba(245,200,66,0.9)" strokeWidth="1.5"/>
    <circle cx="4" cy="4" r="2" fill="rgba(245,200,66,0.7)"/>
  </svg>
);

const TICKS = ['LIVEATLAS CREATOR STUDIO','BROADCAST ENGINE READY','PREMIUM GUIDE NETWORK','EARNINGS ₹400 PER SESSION','STREAM QUALITY: ULTRA HD','GLOBAL AUDIENCE CONNECTED'];
const Ticker = () => {
  const items = [...TICKS,...TICKS].map((t,i)=><span key={i}>◈ {t}</span>);
  return <div className="gd-ticker"><div className="gd-ticker-inner">{items}</div></div>;
};

const Clock = () => {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toISOString().slice(11,19));
    tick();
    const id = setInterval(tick,1000);
    return () => clearInterval(id);
  },[]);
  return <span style={{fontFamily:'Orbitron,monospace',fontSize:'10px',letterSpacing:'2px',color:'rgba(245,200,66,0.35)'}}>{time} UTC</span>;
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT — ALL ORIGINAL LOGIC 100% PRESERVED
═══════════════════════════════════════════════════════════ */
const GuideDashboard = () => {

  /* ── ORIGINAL STATE ── */
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [image, setImage] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  /* ── ORIGINAL HOOK ── */
  const navigate = useNavigate();

  /* ── ORIGINAL handleImageChange ── */
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  /* ── ORIGINAL createTour ── */
  const createTour = async () => {
    if (isCreating) { return; }
    if (!title) { alert("Please enter a title!"); return; }
    setIsCreating(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', desc);
    formData.append('price', 20);
    if (image) { formData.append('thumbnail', image); }

    try {
      const response = await fetch(
        "https://liveatlas-cp.onrender.com/api/create-tour/",
        { method: 'POST', body: formData }
      );
      const text = await response.text();
      console.log("RAW SERVER RESPONSE:", text);

      let data = {};
      try { data = JSON.parse(text); }
      catch (err) { console.error("Response is not JSON:", text); }

      if (!response.ok) {
        console.error("Server error:", data);
        if (data.error) alert(data.error);
        else alert("Server returned an error.");
        return;
      }

      if (data.status === 'success') {
        console.log("Tour created successfully:", data);
        navigate(`/room/tour_${data.tour_id}`);
      } else {
        console.error("Create tour failed:", data);
        if (data.error) alert(data.error);
        else alert("Failed to create tour.");
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("Network issue. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <style>{STYLES}</style>
      <BgCanvas />
      <div className="gd-scan" />

      {['tl','tr','bl','br'].map(p => (
        <div key={p} className={`gd-corner ${p}`}><Corner /></div>
      ))}

      <Ticker />

      <div className="gd-content">

        {/* ── NAVBAR ── */}
        <nav className="gd-nav">
          <div className="gd-logo">
            <FaGlobeAmericas className="gd-logo-icon" size={20} />
            Live<span>Atlas</span>
            <span style={{fontFamily:'Orbitron,monospace',fontSize:'9px',letterSpacing:'2px',color:'rgba(245,200,66,0.4)',fontWeight:400,marginLeft:4}}>CREATOR</span>
          </div>
          <div className="gd-nav-right">
            <Clock />
            <div className="gd-nav-badge">
              <span className="gd-nav-dot" />
              Studio Online
            </div>
            {/* ORIGINAL Link to="/" */}
            <Link to="/" className="gd-logout">⏻ Logout</Link>
          </div>
        </nav>

        {/* ── HERO ── */}
        <div className="gd-hero">
          <div className="gd-hero-grid" />
          <div className="gd-hero-orb" style={{width:480,height:480,top:-160,left:'10%',background:'radial-gradient(circle,rgba(245,200,66,0.12) 0%,transparent 70%)'}} />
          <div className="gd-hero-orb" style={{width:360,height:360,bottom:-100,right:'8%',background:'radial-gradient(circle,rgba(123,47,255,0.12) 0%,transparent 70%)',animationDelay:'-3s'}} />
          <div className="gd-hero-eyebrow">
            <span style={{animation:'blink 1s step-end infinite'}}>▮</span>
            Creator Studio
            <span style={{animation:'blink 1s step-end infinite'}}>▮</span>
          </div>
          <h1 className="gd-hero-title">
            Launch Your<br /><span className="acc">Live Broadcast</span>
          </h1>
          <p className="gd-hero-sub">Set up your tour · Connect your audience · Earn ₹400 per session</p>
        </div>

        {/* ── CARD ── */}
        <div className="gd-card-wrap">
          <div className="gd-card">
            <div className="gd-card-bar" />
            <div className="gd-card-corner tl" /><div className="gd-card-corner tr" />
            <div className="gd-card-corner bl" /><div className="gd-card-corner br" />

            <div className="gd-card-header">
              <div className="gd-card-header-icon">
                <FaGlobeAmericas color="#f5c842" />
              </div>
              <div>
                <div className="gd-card-title">Create a Broadcast</div>
                <div className="gd-card-subtitle">// MISSION CONFIGURATION</div>
              </div>
            </div>

            <div className="gd-card-body">

              {/* Tour Title — ORIGINAL state */}
              <div>
                <div className="gd-label">Tour Title</div>
                <input
                  type="text"
                  className="gd-input"
                  placeholder="e.g. Walking tour of Old City"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Cover Image — ORIGINAL file input */}
              <div>
                <div className="gd-label">Cover Image</div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{display:'none'}}
                  id="file-upload"
                />
                <label htmlFor="file-upload" style={{cursor:'pointer',display:'block'}}>
                  <div className={`gd-upload-zone${image?' has-file':''}`}>
                    <FaImage className="gd-upload-icon" />
                    <span className="gd-upload-label">
                      {image ? `✓  ${image.name}` : 'Click to upload a cover photo'}
                    </span>
                    <span className="gd-upload-hint">
                      {image ? 'File ready — broadcast thumbnail set' : 'PNG · JPG · WEBP — Max 10MB'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Description — ORIGINAL state */}
              <div>
                <div className="gd-label">Mission Description</div>
                <textarea
                  className="gd-textarea"
                  placeholder="What will viewers see on this tour?"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>

              {/* START BROADCAST — ORIGINAL onClick + disabled */}
              <button
                className={`gd-btn${isCreating?' gd-btn-creating':''}`}
                onClick={createTour}
                disabled={isCreating}
              >
                <FaPlus style={{marginRight:'4px',flexShrink:0}} />
                {isCreating ? '⟳  Initializing Broadcast...' : '⟶  Start Broadcast'}
              </button>

            </div>

            {/* Stats strip */}
            <div className="gd-card-stats">
              {[{val:'₹400',label:'Your Earnings'},{val:'HD',label:'Stream Quality'},{val:'LIVE',label:'Mode'}].map(s=>(
                <div className="gd-stat" key={s.label}>
                  <span className="gd-stat-val">{s.val}</span>
                  <span className="gd-stat-label">{s.label}</span>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
    </>
  );
};

export default GuideDashboard;
