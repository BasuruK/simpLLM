"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
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
        size:
          layer === "foreground"
            ? Math.random() * 1.5 + 0.8
            : Math.random() * 0.9 + 0.4,
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
      const t = Math.min(
        1,
        elapsed / Math.max(0.001, gustRef.current.duration),
      );
      const envelope = Math.sin(t * Math.PI);
      const gustEffect =
        gustRef.current.strength * envelope * gustRef.current.direction;

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

  const triggerGust = (
    strengthOverride?: number,
    mode: "normal" | "extreme" = "normal",
  ) => {
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

  const updateParticles = (
    particles: SnowParticle[],
    canvas: HTMLCanvasElement,
  ) => {
    particles.forEach((particle) => {
      const windInfluence =
        Math.sin(windRef.current.time + particle.windOffset) * 0.5 + 0.5;
      const windX =
        windRef.current.x *
        windInfluence *
        (particle.layer === "foreground" ? 1.2 : 0.8);
      const windY =
        windRef.current.y *
        windInfluence *
        (particle.layer === "foreground" ? 1.1 : 0.9);

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

  const renderToContext = (
    particles: SnowParticle[],
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
  ) => {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssWidth = canvas.width / dpr;
    const cssHeight = canvas.height / dpr;

    ctx.clearRect(0, 0, cssWidth, cssHeight);
    particles.forEach((particle) => {
      ctx.save();
      const alpha =
        particle.layer === "foreground"
          ? particle.opacity
          : particle.opacity * 0.6;

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
    const bgParticles = particlesRef.current.filter(
      (p) => p.layer === "background",
    );
    const fgParticles = particlesRef.current.filter(
      (p) => p.layer === "foreground",
    );

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
      <canvas
        ref={bgCanvasRef}
        className={`fixed inset-0 pointer-events-none z-0 ${className}`}
        style={{
          background: "transparent",
          width: "100vw",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
        }}
      />
      <canvas
        ref={fgCanvasRef}
        className={`fixed inset-0 pointer-events-none z-20`}
        style={{
          background: "transparent",
          width: "100vw",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
        }}
      />
      {sleighEnabled ? (
        <SantaSleigh
          arcMax={sleighDemo ? Math.min(180, sleighArcMax) : sleighArcMax}
          arcMin={sleighDemo ? Math.max(40, sleighArcMin) : sleighArcMin}
          demo={sleighDemo}
          enabled={sleighEnabled}
          maxDelay={sleighDemo ? 1600 : sleighMaxDelay}
          minDelay={sleighDemo ? 800 : sleighMinDelay}
          size={sleighDemo ? Math.max(300, sleighSize) : sleighSize}
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

export function SantaSleigh({ enabled = true, size = 200 }: SantaProps) {
  const animRef = useRef<LottieRefCurrentProps | null>(null);
  const [animationData, setAnimationData] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );

  useEffect(() => {
    // Fetch Lottie animation
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
    // Window resize handler
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [size]);

  // Framer Motion animation loop for arc path
  useEffect(() => {
    let rafId: number;
    let start: number;
    const duration = 2200 + (windowWidth / 1200) * 1800 + Math.random() * 1000;
    const animateSanta = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const t = Math.min(1, elapsed / duration);

      setProgress(t);
      if (t < 1) {
        rafId = requestAnimationFrame(animateSanta);
      } else {
        setProgress(0);
        start = undefined as any;
        rafId = requestAnimationFrame(animateSanta);
      }
    };

    rafId = requestAnimationFrame(animateSanta);

    return () => cancelAnimationFrame(rafId);
  }, [windowWidth, size]);

  if (!enabled) return null;

  // Arc path calculation (quadratic Bezier)
  const sx = -size;
  const ex = windowWidth;
  const baseY =
    typeof window !== "undefined"
      ? Math.round(window.innerHeight * 0.6) - Math.round(size / 2)
      : 300;
  const arcHeight = 180; // You can make this a prop if you want
  const midX = Math.round(windowWidth / 2);
  const midY = baseY - arcHeight;
  // Quadratic Bezier formula
  const getArcPosition = (t: number) => {
    const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * midX + t * t * ex;
    const y =
      (1 - t) * (1 - t) * baseY + 2 * (1 - t) * t * midY + t * t * baseY;

    return { x, y };
  };
  const { x, y } = getArcPosition(progress);

  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: "fixed",
        pointerEvents: "none",
        width: `${size}px`,
        height: `${size}px`,
        zIndex: 40,
        left: x,
        top: y,
      }}
    >
      {animationData ? (
        <Lottie
          animationData={animationData}
          autoplay={true}
          loop={true}
          lottieRef={animRef}
          style={{ width: "100%", height: "100%" }}
        />
      ) : null}
    </motion.div>
  );
}
