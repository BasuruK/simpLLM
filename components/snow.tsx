"use client";

import { useEffect, useRef, useState } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";

interface SnowParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  layer: "background" | "foreground";
  windOffset: number;
}

interface SnowProps {
  particleCount?: number;
  className?: string;
  sleighEnabled?: boolean;
  sleighMinDelay?: number;
  sleighMaxDelay?: number;
  sleighSize?: number;
  sleighArcMin?: number;
  sleighArcMax?: number;
  sleighDemo?: boolean;
}

export function Snow({
  particleCount = 150,
  className = "",
  sleighEnabled = true,
  sleighMinDelay = 8000,
  sleighMaxDelay = 38000,
  sleighSize = 200,
  sleighArcMin = 80,
  sleighArcMax = 220,
  sleighDemo = false,
}: SnowProps) {
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<SnowParticle[]>([]);
  const windRef = useRef({ x: 0, y: 0, time: 0 });
  const gustRef = useRef({
    active: false,
    strength: 0,
    direction: 1,
    startedAt: 0,
    duration: 0,
    mode: "normal" as "normal" | "extreme",
  });
  const gustTimeoutRef = useRef<number | null>(null);

  const initializeParticles = () => {
    const particles: SnowParticle[] = [];
    const total = Math.ceil(particleCount * 1.1);
    const cssWidth = Math.max(1, window.innerWidth);
    const cssHeight = Math.max(1, window.innerHeight);
    for (let i = 0; i < total; i++) {
      const layer = Math.random() < 0.7 ? "background" : "foreground";
      particles.push({
        x: Math.random() * cssWidth,
        y: Math.random() * cssHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: Math.random() * 1 + 0.5,
        size: layer === "foreground" ? Math.random() * 1.5 + 0.8 : Math.random() * 0.9 + 0.4,
        opacity: Math.random() * 0.8 + 0.2,
        layer,
        windOffset: Math.random() * Math.PI * 2,
      });
    }
    return particles;
  };

  const updateWind = () => {
    const time = Date.now() * 0.001;
    windRef.current.time = time;
    let baseX = Math.sin(time * 0.3) * 0.3 + Math.sin(time * 0.7) * 0.2;
    let baseY = Math.cos(time * 0.2) * 0.1;
    if (gustRef.current.active) {
      const elapsed = (Date.now() - gustRef.current.startedAt) / 1000;
      const t = Math.min(1, elapsed / Math.max(0.001, gustRef.current.duration));
      const envelope = Math.sin(t * Math.PI);
      const gustEffect = gustRef.current.strength * envelope * gustRef.current.direction;
      baseX += gustEffect;
      baseY += gustEffect * 0.2;
      if (t >= 1) {
        gustRef.current.active = false;
        scheduleNextGust();
      }
    }
    windRef.current.x = baseX;
    windRef.current.y = baseY;
  };

  const scheduleNextGust = () => {
    if (gustTimeoutRef.current) {
      window.clearTimeout(gustTimeoutRef.current);
      gustTimeoutRef.current = null;
    }
    const delay = 5000 + Math.random() * 15000;
    gustTimeoutRef.current = window.setTimeout(() => {
      const isExtreme = Math.random() < 0.12;
      triggerGust(undefined, isExtreme ? "extreme" : "normal");
    }, delay);
  };

  const triggerGust = (strengthOverride?: number, mode: "normal" | "extreme" = "normal") => {
    gustRef.current.active = true;
    gustRef.current.mode = mode;
    if (mode === "extreme") {
      gustRef.current.strength = strengthOverride ?? 1.6 + Math.random() * 2.4;
      gustRef.current.duration = 0.8 + Math.random() * 1.8;
    } else {
      gustRef.current.strength = strengthOverride ?? 0.8 + Math.random() * 1.6;
      gustRef.current.duration = 0.6 + Math.random() * 1.2;
    }
    gustRef.current.direction = Math.random() < 0.5 ? -1 : 1;
    gustRef.current.startedAt = Date.now();
  };

  const updateParticles = (particles: SnowParticle[], canvas: HTMLCanvasElement) => {
    particles.forEach((particle) => {
      const windInfluence = Math.sin(windRef.current.time + particle.windOffset) * 0.5 + 0.5;
      const windX = windRef.current.x * windInfluence * (particle.layer === "foreground" ? 1.2 : 0.8);
      const windY = windRef.current.y * windInfluence * (particle.layer === "foreground" ? 1.1 : 0.9);
      if (gustRef.current.active && gustRef.current.mode === "extreme") {
        particle.vx += windX * 0.08 + (Math.random() - 0.5) * 0.4;
        particle.vy += windY * 0.02 + Math.random() * 0.4;
      } else {
        particle.vx += windX * 0.01;
        particle.vy += windY * 0.005 + 0.01;
      }
      particle.vx *= 0.995;
      particle.vy *= 0.998;
      particle.x += particle.vx;
      particle.y += particle.vy;
      if (particle.x > canvas.width + 10) particle.x = -10;
      else if (particle.x < -10) particle.x = canvas.width + 10;
      if (particle.y > canvas.height + 10) {
        particle.y = -10;
        particle.x = Math.random() * canvas.width;
        particle.vy = Math.random() * 1 + 0.5;
      }
    });
  };

  const renderToContext = (particles: SnowParticle[], canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssWidth = canvas.width / dpr;
    const cssHeight = canvas.height / dpr;
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    particles.forEach((particle) => {
      ctx.save();
      const alpha = particle.layer === "foreground" ? particle.opacity : particle.opacity * 0.6;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = particle.layer === "foreground" ? 2 : 1;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      if (particle.layer === "foreground" && Math.random() < 0.1) {
        ctx.shadowBlur = 4;
        ctx.globalAlpha = alpha * 0.8;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  };

  const animate = () => {
    const bgCanvas = bgCanvasRef.current;
    const fgCanvas = fgCanvasRef.current;
    const bgCtx = bgCanvas?.getContext("2d");
    const fgCtx = fgCanvas?.getContext("2d");
    if (!bgCanvas || !fgCanvas || !bgCtx || !fgCtx) return;
    updateWind();
    updateParticles(particlesRef.current, bgCanvas);
    const bgParticles = particlesRef.current.filter((p) => p.layer === "background");
    const fgParticles = particlesRef.current.filter((p) => p.layer === "foreground");
    renderToContext(bgParticles, bgCanvas, bgCtx);
    renderToContext(fgParticles, fgCanvas, fgCtx);
    animationRef.current = requestAnimationFrame(animate);
  };

  const handleResize = () => {
    const bgCanvas = bgCanvasRef.current;
    const fgCanvas = fgCanvasRef.current;
    if (!bgCanvas || !fgCanvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssWidth = Math.max(1, window.innerWidth);
    const cssHeight = Math.max(1, window.innerHeight);
    [bgCanvas, fgCanvas].forEach((canvas) => {
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    particlesRef.current = initializeParticles();
  };

  useEffect(() => {
    const bgCanvas = bgCanvasRef.current;
    const fgCanvas = fgCanvasRef.current;
    if (!bgCanvas || !fgCanvas) return;
    handleResize();
    particlesRef.current = initializeParticles();
    animate();
    window.addEventListener("resize", handleResize);
    scheduleNextGust();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
      if (gustTimeoutRef.current) {
        window.clearTimeout(gustTimeoutRef.current);
        gustTimeoutRef.current = null;
      }
    };
  }, [particleCount]);

  return (
    <>
      <canvas ref={bgCanvasRef} className={`fixed inset-0 pointer-events-none z-0 ${className}`} style={{ background: "transparent", width: "100vw", height: "100vh", position: "fixed", top: 0, left: 0 }} />
      <canvas ref={fgCanvasRef} className={`fixed inset-0 pointer-events-none z-20`} style={{ background: "transparent", width: "100vw", height: "100vh", position: "fixed", top: 0, left: 0 }} />
      {sleighEnabled ? (
        <SantaSleigh
          enabled={sleighEnabled}
          minDelay={sleighDemo ? 800 : sleighMinDelay}
          maxDelay={sleighDemo ? 1600 : sleighMaxDelay}
          size={sleighDemo ? Math.max(300, sleighSize) : sleighSize}
          demo={sleighDemo}
          arcMin={sleighDemo ? Math.max(40, sleighArcMin) : sleighArcMin}
          arcMax={sleighDemo ? Math.min(180, sleighArcMax) : sleighArcMax}
        />
      ) : null}
    </>
  );
}

interface SantaProps {
  enabled?: boolean;
  minDelay?: number;
  maxDelay?: number;
  size?: number;
  arcMin?: number;
  arcMax?: number;
  demo?: boolean;
}

export function SantaSleigh({
  enabled = true,
  minDelay = 8000,
  maxDelay = 38000,
  size = 200,
  arcMin = 80,
  arcMax = 220,
  demo = false
}: SantaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<LottieRefCurrentProps | null>(null);
  const flightTimeoutRef = useRef<number | null>(null);
  const [animationData, setAnimationData] = useState<any>(null);
  const isFlyingRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.position = "fixed";
    el.style.pointerEvents = "none";
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.zIndex = "40";

    const candidates = ["sleigh_ride.json"];
    (async () => {
      for (const name of candidates) {
        try {
          const path = "/lottie/" + encodeURIComponent(name);
          const res = await fetch(path);
          if (!res.ok) continue;
          const j = await res.json();
          setAnimationData(j);
          break;
        } catch {
          // next
        }
      }
    })();

    const attemptPlay = (attempts = 10, delay = 100) => {
      if (animRef.current?.goToAndPlay) {
        try {
          animRef.current.goToAndPlay(0, true);
        } catch {}
        return true;
      }
      if (attempts <= 0) return false;
      setTimeout(() => attemptPlay(attempts - 1, delay), delay);
      return false;
    };

    const scheduleNextFlight = () => {
      const delay = minDelay + Math.random() * (maxDelay - minDelay);
      flightTimeoutRef.current = window.setTimeout(() => {
        flyOnce();
        scheduleNextFlight();
      }, delay);
    };

    const flyOnce = () => {
      if (!containerRef.current) return;
      const el = containerRef.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const sx = -size;
      const ex = vw;
      const baseY = Math.round(vh * 0.6) - Math.round(size / 2);
      const sy = baseY;
      const ey = baseY;
      const midX = Math.round(vw / 2);
      const arcHeight = arcMin + Math.random() * (arcMax - arcMin);
      const midY = Math.round(vh * 0.5) - arcHeight;
      el.style.left = `${sx}px`;
      el.style.top = `${sy}px`;
      isFlyingRef.current = true;
      attemptPlay(20, 100);
      const baseDuration = 2200;
      const duration = baseDuration + (vw / 1200) * 1800 + Math.random() * 1000;
      const startTime = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / duration);
        const ix = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * midX + t * t * ex;
        const iy = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * midY + t * t * ey;
        el.style.left = `${Math.round(ix)}px`;
        el.style.top = `${Math.round(iy)}px`;
        const angle = (Math.atan2(ey - sy, ex - sx) * 180) / Math.PI;
        el.style.transform = `translateZ(0) rotate(${angle * 0.6}deg)`;
        if (t < 1) requestAnimationFrame(step);
        else {
          try {
            animRef.current?.stop?.();
          } catch {}
          isFlyingRef.current = false;
          el.style.transform = "translateZ(0)";
        }
      };
      requestAnimationFrame(step);
    };

    scheduleNextFlight();
    const initialTimeout = window.setTimeout(() => flyOnce(), 500);

    return () => {
      if (flightTimeoutRef.current) {
        window.clearTimeout(flightTimeoutRef.current);
        flightTimeoutRef.current = null;
      }
      window.clearTimeout(initialTimeout);
      if (animRef.current) {
        animRef.current?.destroy?.();
        animRef.current = null;
      }
    };
  }, [minDelay, maxDelay, size, arcMin, arcMax]);

  if (!enabled) return null;

  return (
    <div ref={containerRef} aria-hidden="true">
      {animationData ? (
        <Lottie animationData={animationData} autoplay={false} loop={false} lottieRef={animRef} style={{ width: "100%", height: "100%" }} />
      ) : null}
    </div>
  );
}
