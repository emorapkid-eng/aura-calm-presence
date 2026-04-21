import { useEffect, useRef } from "react";

type AuraState = "idle" | "listening" | "processing" | "responding";

interface Props {
  state: AuraState;
}

/**
 * Animated organic waveform ring rendered to a canvas.
 * Uses layered sinusoidal harmonics so the ring breathes/distorts
 * based on the active state — never a perfect circle.
 */
export function AuraRing({ state }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<AuraState>(state);
  const energyRef = useRef(0); // 0..1 smoothed energy

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (t: number) => {
      const time = t / 1000;
      const cx = width / 2;
      const cy = height / 2;
      const baseR = Math.min(width, height) * 0.36;

      // target energy by state
      const target =
        stateRef.current === "idle"
          ? 0.08
          : stateRef.current === "listening"
            ? 0.55
            : stateRef.current === "processing"
              ? 0.75
              : 0.45; // responding

      // smooth approach (organic delay)
      energyRef.current += (target - energyRef.current) * 0.04;
      const e = energyRef.current;

      // breathing scale
      const breath = 1 + Math.sin(time * 0.9) * 0.015 + e * 0.04;

      ctx.clearRect(0, 0, width, height);

      // soft inner halo painted under the line
      const halo = ctx.createRadialGradient(cx, cy, baseR * 0.2, cx, cy, baseR * 1.6);
      halo.addColorStop(0, `rgba(255,255,255,${0.05 + e * 0.06})`);
      halo.addColorStop(0.5, "rgba(255,255,255,0.02)");
      halo.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, width, height);

      // === waveform ring ===
      const points = 240;
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const a = (i / points) * Math.PI * 2;

        // multi-harmonic distortion — keeps shape organic, never a clean circle
        const n =
          Math.sin(a * 3 + time * 0.6) * (0.6 + e * 1.4) +
          Math.sin(a * 5 - time * 0.9) * (0.35 + e * 1.1) +
          Math.sin(a * 9 + time * 1.7) * (0.15 + e * 0.9) +
          Math.sin(a * 13 - time * 2.3) * e * 0.6;

        const r = baseR * breath + n * (1.2 + e * 6);

        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // outer subtle glow stroke (wide, low alpha)
      ctx.lineWidth = 8;
      ctx.strokeStyle = `rgba(255,255,255,${0.05 + e * 0.05})`;
      ctx.shadowColor = "rgba(255,255,255,0.35)";
      ctx.shadowBlur = 28 + e * 24;
      ctx.stroke();

      // crisp thin line
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(255,255,255,${0.55 + e * 0.35})`;
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="aura-ring-wrap">
      <div className="aura-glow-outer" />
      <div className="aura-glow" />
      <canvas ref={canvasRef} className="relative h-full w-full" aria-hidden="true" />
    </div>
  );
}

export type { AuraState };
