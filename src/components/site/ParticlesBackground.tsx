import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  gold: boolean;
}

const GOLD = { r: 232, g: 185, b: 73 };
const BLUE = { r: 110, g: 150, b: 255 };
const LINK_DISTANCE = 110;
const MOUSE_RADIUS = 130;

/**
 * Fondo de partículas en movimiento estilo particles.js:
 * puntos dorados/azules flotando con líneas de conexión y repulsión al cursor.
 * Solo corre en el cliente (canvas) y respeta prefers-reduced-motion.
 */
export function ParticlesBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999 };
    let particles: Particle[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;

    const spawn = (): Particle => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 1.8 + 0.6,
      gold: Math.random() < 0.72,
    });

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      w = Math.max(1, rect?.width ?? window.innerWidth);
      h = Math.max(1, rect?.height ?? window.innerHeight);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.min(150, Math.max(40, Math.floor((w * h) / 14000)));
      particles = Array.from({ length: target }, spawn);
    };

    const drawFrame = () => {
      ctx.clearRect(0, 0, w, h);

      // Líneas de conexión entre partículas cercanas
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]!;
          const b = particles[j]!;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK_DISTANCE) {
            const alpha = (1 - dist / LINK_DISTANCE) * 0.22;
            ctx.strokeStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Puntos
      for (const p of particles) {
        const c = p.gold ? GOLD : BLUE;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${p.gold ? 0.85 : 0.55})`;
        ctx.fill();
      }
    };

    const tick = () => {
      for (const p of particles) {
        // Repulsión suave cerca del cursor
        const dxm = p.x - mouse.x;
        const dym = p.y - mouse.y;
        const dm = Math.hypot(dxm, dym);
        if (dm < MOUSE_RADIUS && dm > 0.01) {
          const force = ((MOUSE_RADIUS - dm) / MOUSE_RADIUS) * 0.05;
          p.vx += (dxm / dm) * force;
          p.vy += (dym / dm) * force;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Velocidad acotada para un flote constante
        const speed = Math.hypot(p.vx, p.vy);
        if (speed > 0.9) {
          p.vx = (p.vx / speed) * 0.9;
          p.vy = (p.vy / speed) * 0.9;
        } else if (speed < 0.18 && speed > 0.001) {
          p.vx = (p.vx / speed) * 0.18;
          p.vy = (p.vy / speed) * 0.18;
        }

        // Reaparece al cruzar los bordes
        if (p.x < -20) p.x = w + 20;
        else if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        else if (p.y > h + 20) p.y = -20;
      }

      drawFrame();
      raf = requestAnimationFrame(tick);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onPointerLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    resize();

    if (reduceMotion) {
      drawFrame(); // un solo frame estático
    } else {
      raf = requestAnimationFrame(tick);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerleave", onPointerLeave);
    }
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
