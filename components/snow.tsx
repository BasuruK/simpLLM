"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "motion/react";
import { useMemo } from "react";
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
  sleighSize?: number;
  sleighArcMin?: number;
  sleighArcMax?: number;
  minDelayVal?: number;
  maxDelayVal?: number;
}

export function Snow({
  particleCount = 150,
  className = "",
  sleighEnabled = true,
  sleighSize = 200,
  sleighArcMin = 80,
  sleighArcMax = 220,
  minDelayVal = 4000,
  maxDelayVal = 12000,
}: SnowProps) {
  const currentMonth = new Date().getMonth();

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

  const initializeParticles = useCallback(() => {
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
  }, [particleCount]);

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

  const scheduleNextGust = useCallback(() => {
    if (gustTimeoutRef.current) {
      window.clearTimeout(gustTimeoutRef.current);
      gustTimeoutRef.current = null;
    }
    const delay = 5000 + Math.random() * 15000;

    gustTimeoutRef.current = window.setTimeout(() => {
      const isExtreme = Math.random() < 0.12;

      triggerGust(undefined, isExtreme ? "extreme" : "normal");
    }, delay);
  }, []);

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
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const cssWidth = canvas.width / dpr;
      const cssHeight = canvas.height / dpr;

      if (particle.x > cssWidth + 10) particle.x = -10;
      else if (particle.x < -10) particle.x = cssWidth + 10;
      if (particle.y > cssHeight + 10) {
        particle.y = -10;
        particle.x = Math.random() * cssWidth;
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

  const animate = useCallback(() => {
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
  }, []);

  const handleResize = useCallback(() => {
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
  }, [initializeParticles]);

  useEffect(() => {
    const bgCanvas = bgCanvasRef.current;
    const fgCanvas = fgCanvasRef.current;

    if (!bgCanvas || !fgCanvas) return;
    handleResize();
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
  }, [particleCount, handleResize, animate, scheduleNextGust]);

  if (currentMonth !== 11) return null;

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
          arcMax={sleighArcMax}
          arcMin={sleighArcMin}
          enabled={sleighEnabled}
          maxDelay={maxDelayVal}
          minDelay={minDelayVal}
          size={sleighSize}
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
  yOffsetPercent?: number;
}

function SantaSleigh({
  enabled = true,
  minDelay,
  maxDelay,
  size,
  arcMin,
  arcMax,
  yOffsetPercent = -0.4,
}: SantaProps) {
  const sleighSize = typeof size === "number" && size > 0 ? size : 200;
  const arcMinVal = typeof arcMin === "number" && arcMin > 0 ? arcMin : 80;
  const arcMaxVal =
    typeof arcMax === "number" && arcMax > arcMinVal ? arcMax : 220;
  const yOffset = typeof yOffsetPercent === "number" ? yOffsetPercent : 0.2;
  const minDelayVal = minDelay ?? 1000;
  const maxDelayVal = maxDelay ?? 2000;
  const animRef = useRef<LottieRefCurrentProps | null>(null);
  const [animationData, setAnimationData] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [windowWidth, setWindowWidth] = useState(1200);
  const [showSanta, setShowSanta] = useState(false);
  const santaTimeoutRef = useRef<number | null>(null);
  const [arcHeight, setArcHeight] = useState(
    arcMinVal + Math.random() * (arcMaxVal - arcMinVal),
  );

  const scheduleSanta = useCallback(() => {
    const delay = minDelayVal + Math.random() * (maxDelayVal - minDelayVal);

    santaTimeoutRef.current = window.setTimeout(() => {
      if (Math.random() < 0.1) {
        setArcHeight(arcMinVal + Math.random() * (arcMaxVal - arcMinVal));
        setShowSanta(true);
      } else {
        scheduleSanta();
      }
    }, delay);
  }, [minDelayVal, maxDelayVal, arcMinVal, arcMaxVal]);

  const arcParams = useMemo(() => {
    const sx = -sleighSize;
    const ex = windowWidth;
    const yOffsetPx =
      typeof window !== "undefined" ? window.innerHeight * yOffset : 0;
    const baseY =
      typeof window !== "undefined"
        ? Math.round(window.innerHeight * 0.6) -
          Math.round(sleighSize / 2) +
          yOffsetPx
        : 300 + yOffsetPx;
    const midX = Math.round(windowWidth / 2);
    const midY = baseY - arcHeight;

    const getBezierPoint = (t: number) => {
      const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * midX + t * t * ex;
      const y =
        (1 - t) * (1 - t) * baseY + 2 * (1 - t) * t * midY + t * t * baseY;

      return { x, y };
    };

    const getBezierAngle = (t: number) => {
      const dx = 2 * (1 - t) * (midX - sx) + 2 * t * (ex - midX);
      const dy = 2 * (1 - t) * (midY - baseY) + 2 * t * (baseY - midY);

      return Math.atan2(dy, dx) * (180 / Math.PI);
    };

    const getArcLength = (steps = 100) => {
      let length = 0;
      let prev = getBezierPoint(0);

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const curr = getBezierPoint(t);

        length += Math.hypot(curr.x - prev.x, curr.y - prev.y);
        prev = curr;
      }

      return length;
    };

    return {
      getBezierPoint,
      getBezierAngle,
      arcLength: getArcLength(),
    };
  }, [windowWidth, sleighSize, yOffset, arcHeight]);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    (async () => {
      try {
        const path = "/lottie/sleigh_ride.json";
        const res = await fetch(path, { signal: controller.signal });

        if (res.ok && mounted && !controller.signal.aborted) {
          const j = await res.json();

          setAnimationData(j);
        }
      } catch {
        // Ignore errors
      }
    })();

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    scheduleSanta();

    return () => {
      mounted = false;
      controller.abort();
      window.removeEventListener("resize", handleResize);
      if (santaTimeoutRef.current) {
        window.clearTimeout(santaTimeoutRef.current);
        santaTimeoutRef.current = null;
      }
    };
  }, [minDelayVal, maxDelayVal, arcMinVal, arcMaxVal, scheduleSanta]);

  useEffect(() => {
    if (!showSanta) return;
    let rafId: number;
    let start: number;
    const duration =
      (2200 + (windowWidth / 1200) * 1800 + Math.random() * 1000) * 1.45;
    const animateSanta = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const t = Math.min(1, elapsed / duration);

      setProgress(t);
      if (t < 1) {
        rafId = requestAnimationFrame(animateSanta);
      } else {
        setProgress(0);
        setShowSanta(false);
        if (santaTimeoutRef.current) {
          window.clearTimeout(santaTimeoutRef.current);
          santaTimeoutRef.current = null;
        }
        scheduleSanta();
      }
    };

    rafId = requestAnimationFrame(animateSanta);

    return () => cancelAnimationFrame(rafId);
  }, [
    windowWidth,
    sleighSize,
    showSanta,
    arcMinVal,
    arcMaxVal,
    minDelayVal,
    maxDelayVal,
    scheduleSanta,
  ]);

  if (!enabled || !showSanta) return null;

  const getArcDistance = (t: number, steps = 100) => {
    let length = 0;
    let prev = arcParams.getBezierPoint(0);

    for (let i = 1; i <= steps * t; i++) {
      const tt = i / steps;
      const curr = arcParams.getBezierPoint(tt);

      length += Math.hypot(curr.x - prev.x, curr.y - prev.y);
      prev = curr;
    }

    return length;
  };
  const { x, y } = arcParams.getBezierPoint(progress);
  const arcPos = getArcDistance(progress) / arcParams.arcLength;
  const baseAngle = arcParams.getBezierAngle(progress);
  const angle = baseAngle + arcPos * 30;

  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: "fixed",
        pointerEvents: "none",
        width: `${sleighSize}px`,
        height: `${sleighSize}px`,
        zIndex: 40,
        left: x,
        top: y,
        transform: `translateZ(0) rotate(${angle}deg)`,
        transformOrigin: "50% 50%",
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
