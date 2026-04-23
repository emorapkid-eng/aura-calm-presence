import { useEffect, useRef } from "react";
import { RingEffects } from "@/components/RingEffects";

type AuraState = "idle" | "listening" | "thinking" | "processing" | "responding";

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
  const introStartRef = useRef<number | null>(null);
  const INTRO_MS = 1300;

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

      const s = stateRef.current;
      const isIdle = s === "idle";
      const target =
        s === "listening"
          ? 0.5
          : s === "thinking" || s === "processing"
            ? 0.65
            : s === "responding"
              ? 0.42
              : 0.08; // idle keeps a tiny ambient energy for the rotating segments

      energyRef.current += (target - energyRef.current) * 0.022;
      const e = energyRef.current;

      // breathing — always present, very gentle
      const breath = 1 + Math.sin(time * 0.5) * 0.012 + e * 0.022;
      const pulse =
        s === "responding"
          ? 1 + Math.sin(time * 2.4) * 0.014
          : s === "listening"
            ? 1 + Math.sin(time * 1.4) * 0.008
            : 1;

      ctx.clearRect(0, 0, width, height);

      // === INTRO DRAW-IN PROGRESS (clockwise reveal) ===
      if (introStartRef.current === null) introStartRef.current = tms;
      const introT = Math.min(1, (tms - introStartRef.current) / INTRO_MS);
      // ease-in-out cubic
      const introEase =
        introT < 0.5 ? 4 * introT * introT * introT : 1 - Math.pow(-2 * introT + 2, 3) / 2;
      const introActive = introT < 1;
      // clockwise from top (-90deg)
      const introStart = -Math.PI / 2;
      const introEnd = introStart + Math.PI * 2 * introEase;

      const applyIntroClip = () => {
        if (!introActive) return;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        // wedge that reveals from top, clockwise — slightly larger than ring
        ctx.arc(cx, cy, baseR * 2, introStart, introEnd, false);
        ctx.closePath();
        ctx.clip();
      };

      // distortion ONLY in thinking/processing — keeps circle perfect otherwise
      const distort =
        s === "thinking" || s === "processing" ? Math.max(0, e - 0.05) * 0.6 : 0;

      const buildPath = (rOffset: number, distortMul: number) => {
        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const a = (i / points) * Math.PI * 2;
          const harm =
            Math.sin(a * 3 + time * 0.32) * (0.9 * distort) +
            Math.sin(a * 5 - time * 0.48) * (0.7 * distort);
          const n = smoothNoise(a * 2.1, time * 0.55) * (3.4 * distort);
          const r =
            baseR * breath * pulse + rOffset + (harm + n) * (1 + distort * 2.4) * distortMul;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      };
      const points = 320;

      // === LAYER 1: blurred halo ===
      ctx.save();
      ctx.filter = "blur(6px)";
      buildPath(2, 1.05);
      ctx.lineWidth = 10;
      ctx.strokeStyle = `rgba(10,10,10,${0.06 + e * 0.05})`;
      ctx.stroke();
      ctx.restore();

      // === LAYER 2: soft shadow diffusion ===
      buildPath(0, 1);
      ctx.lineWidth = 9;
      ctx.strokeStyle = `rgba(10,10,10,${0.04 + e * 0.03})`;
      ctx.shadowColor = "rgba(10,10,10,0.22)";
      ctx.shadowOffsetY = 4;
      ctx.shadowBlur = 18 + e * 14;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // === LAYER 3: variable-thickness material body ===
      const segs = 80;
      for (let seg = 0; seg < segs; seg++) {
        const a0 = (seg / segs) * Math.PI * 2;
        const a1 = ((seg + 1.02) / segs) * Math.PI * 2;
        const thick =
          4.2 + smoothNoise(a0 * 1.6 + 5, time * 0.4) * 1.6 + e * 1.0;

        ctx.beginPath();
        const sub = 6;
        for (let k = 0; k <= sub; k++) {
          const a = a0 + (a1 - a0) * (k / sub);
          const harm =
            Math.sin(a * 3 + time * 0.32) * (0.9 * distort) +
            Math.sin(a * 5 - time * 0.48) * (0.7 * distort);
          const n = smoothNoise(a * 2.1, time * 0.55) * (3.4 * distort);
          const r = baseR * breath * pulse + (harm + n) * (1 + distort * 2.4);
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineCap = "round";
        ctx.lineWidth = thick;
        ctx.strokeStyle = `rgba(10,10,10,${0.55 + e * 0.16})`;
        ctx.stroke();
      }

      // === LAYER 4: crisp inner contour ===
      buildPath(0, 1);
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = `rgba(10,10,10,${0.42 + e * 0.18})`;
      ctx.stroke();

      // === LAYER 5: rotating light arc(s) — STATE-DRIVEN ALIVENESS ===
      // Always present (even idle) — keeps ring "alive" without deforming it.
      // Speed and intensity scale with state.
      const arcSpeed =
        s === "thinking" || s === "processing"
          ? 1.6
          : s === "listening"
            ? 0.7
            : s === "responding"
              ? 0.9
              : 0.25; // idle: slow drift
      const arcCount =
        s === "thinking" || s === "processing" ? 3 : s === "responding" ? 2 : 1;
      const arcLen =
        s === "thinking" || s === "processing"
          ? Math.PI * 0.28
          : s === "listening"
            ? Math.PI * 0.45
            : s === "responding"
              ? Math.PI * 0.22
              : Math.PI * 0.55; // idle: long, soft sweep
      const arcAlpha = isIdle ? 0.22 : 0.55;

      ctx.save();
      ctx.lineCap = "round";
      for (let ai = 0; ai < arcCount; ai++) {
        const phase = (ai / arcCount) * Math.PI * 2;
        const head = time * arcSpeed + phase;
        // gradient along the arc (white → transparent) for a "light streak"
        const ax = cx + Math.cos(head) * baseR * breath;
        const ay = cy + Math.sin(head) * baseR * breath;
        const tx = cx + Math.cos(head - arcLen) * baseR * breath;
        const ty = cy + Math.sin(head - arcLen) * baseR * breath;
        const lg = ctx.createLinearGradient(tx, ty, ax, ay);
        lg.addColorStop(0, "rgba(255,255,255,0)");
        lg.addColorStop(1, `rgba(255,255,255,${arcAlpha})`);

        ctx.beginPath();
        const arcSub = 40;
        for (let k = 0; k <= arcSub; k++) {
          const a = head - arcLen + (arcLen * k) / arcSub;
          const r = baseR * breath * pulse;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = lg;
        ctx.lineWidth = 4 + e * 2;
        ctx.globalCompositeOperation = "screen";
        ctx.stroke();

        // soft glow under the arc head
        const glow = ctx.createRadialGradient(ax, ay, 0, ax, ay, 28 + e * 18);
        glow.addColorStop(0, `rgba(255,255,255,${arcAlpha * 0.7})`);
        glow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ax, ay, 28 + e * 18, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // === LAYER 6: soft top highlight (3D feel) ===
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
