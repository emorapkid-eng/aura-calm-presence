import { useEffect, useRef } from "react";
import { RingEffects } from "@/components/RingEffects";

type AuraState = "idle" | "listening" | "processing" | "responding";

interface Props {
  state: AuraState;
}

/**
 * Premium organic ring rendered to canvas.
 * - Soft material strokes (multi-layer)
 * - Non-repeating noise distortion (smooth value-noise)
 * - Calm easing toward target energy with state-aware timing
 */
export function AuraRing({ state }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<AuraState>(state);
  const energyRef = useRef(0);

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

    // smooth pseudo-noise (no sharp repetition)
    const noise = (x: number, y: number) => {
      const s = Math.sin(x * 1.7 + y * 0.9) * 43758.5453;
      return s - Math.floor(s);
    };
    const smoothNoise = (a: number, t: number) => {
      const x = Math.cos(a) * 1.3 + t * 0.15;
      const y = Math.sin(a) * 1.3 - t * 0.12;
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      const xf = x - xi;
      const yf = y - yi;
      const u = xf * xf * (3 - 2 * xf);
      const v = yf * yf * (3 - 2 * yf);
      const n00 = noise(xi, yi);
      const n10 = noise(xi + 1, yi);
      const n01 = noise(xi, yi + 1);
      const n11 = noise(xi + 1, yi + 1);
      const nx0 = n00 * (1 - u) + n10 * u;
      const nx1 = n01 * (1 - u) + n11 * u;
      return (nx0 * (1 - v) + nx1 * v) * 2 - 1;
    };

    const draw = (tms: number) => {
      const time = tms / 1000;
      const cx = width / 2;
      const cy = height / 2;
      const baseR = Math.min(width, height) * 0.34;

      const isIdle = stateRef.current === "idle";
      const target = isIdle
        ? 0
        : stateRef.current === "listening"
          ? 0.45
          : stateRef.current === "processing"
            ? 0.6
            : 0.38;

      // slower, more deliberate easing — feels intelligent
      energyRef.current += (target - energyRef.current) * 0.022;
      const e = energyRef.current;

      // breathing scale (very gentle) — pure scale, no distortion in idle
      const breath = 1 + Math.sin(time * 0.5) * 0.012 + e * 0.028;
      // responding pulse — soft rhythmic
      const pulse =
        stateRef.current === "responding"
          ? 1 + Math.sin(time * 2.4) * 0.012
          : 1;

      ctx.clearRect(0, 0, width, height);

      // === ring path with variable thickness sampling ===
      const points = 320;
      const buildPath = (rOffset: number, distortMul: number) => {
        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const a = (i / points) * Math.PI * 2;

          // organic distortion: smooth-noise + low harmonics
          const harm =
            Math.sin(a * 3 + time * 0.32) * (0.4 + e * 0.9) +
            Math.sin(a * 5 - time * 0.48) * (0.2 + e * 0.7);
          const n = smoothNoise(a * 2.1, time * 0.55) * (1.4 + e * 3.8);

          const r =
            baseR * breath * pulse + rOffset + (harm + n) * (1 + e * 3.2) * distortMul;

          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      };

      // === LAYER 1: very soft outer diffusion (blurred halo behind) ===
      ctx.save();
      ctx.filter = "blur(6px)";
      buildPath(2, 1.05);
      ctx.lineWidth = 10;
      ctx.strokeStyle = `rgba(10,10,10,${0.06 + e * 0.04})`;
      ctx.stroke();
      ctx.restore();

      // === LAYER 2: soft shadow diffusion ===
      buildPath(0, 1);
      ctx.lineWidth = 9;
      ctx.strokeStyle = `rgba(10,10,10,${0.04 + e * 0.025})`;
      ctx.shadowColor = "rgba(10,10,10,0.22)";
      ctx.shadowOffsetY = 4;
      ctx.shadowBlur = 18 + e * 14;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // === LAYER 3: variable-thickness material body ===
      // draw segments with thickness modulated by noise for organic variation
      const segs = 80;
      for (let s = 0; s < segs; s++) {
        const a0 = (s / segs) * Math.PI * 2;
        const a1 = ((s + 1.02) / segs) * Math.PI * 2;
        const thick =
          4.2 + smoothNoise(a0 * 1.6 + 5, time * 0.4) * 1.6 + e * 1.2;

        ctx.beginPath();
        const sub = 6;
        for (let k = 0; k <= sub; k++) {
          const a = a0 + (a1 - a0) * (k / sub);
          const harm =
            Math.sin(a * 3 + time * 0.32) * (0.4 + e * 0.9) +
            Math.sin(a * 5 - time * 0.48) * (0.2 + e * 0.7);
          const n = smoothNoise(a * 2.1, time * 0.55) * (1.4 + e * 3.8);
          const r = baseR * breath * pulse + (harm + n) * (1 + e * 3.2);
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineCap = "round";
        ctx.lineWidth = thick;
        ctx.strokeStyle = `rgba(10,10,10,${0.55 + e * 0.18})`;
        ctx.stroke();
      }

      // === LAYER 4: crisp inner contour ===
      buildPath(0, 1);
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = `rgba(10,10,10,${0.42 + e * 0.18})`;
      ctx.stroke();

      // === LAYER 5: soft top highlight (3D feel) ===
      ctx.save();
      const grad = ctx.createLinearGradient(cx - baseR, cy - baseR, cx + baseR, cy + baseR);
      grad.addColorStop(0, "rgba(255,255,255,0.55)");
      grad.addColorStop(0.5, "rgba(255,255,255,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.10)");
      buildPath(0, 1);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = grad;
      ctx.globalCompositeOperation = "soft-light";
      ctx.stroke();
      ctx.restore();

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
      <RingEffects />
      <canvas ref={canvasRef} className="relative h-full w-full" aria-hidden="true" />
    </div>
  );
}

export type { AuraState };
