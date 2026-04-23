import { useEffect, useRef, useState } from "react";

interface Props {
  side: "left" | "right";
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}

/**
 * Hidden semi-circular dial that fades in when the cursor approaches the edge.
 * Mouse-wheel (middle scroll) cycles through options with snap + debounce.
 */
export function SideDial({ side, label, options, value, onChange }: Props) {
  const [visible, setVisible] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);

  const edgeRef = useRef<HTMLDivElement | null>(null);
  const dialRef = useRef<HTMLDivElement | null>(null);

  // refs to keep wheel handler stable but always fresh
  const optionsRef = useRef(options);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  optionsRef.current = options;
  valueRef.current = value;
  onChangeRef.current = onChange;

  // arc geometry
  const count = options.length;
  const arcSpan = 70;
  const start = -arcSpan / 2;
  const step = count > 1 ? arcSpan / (count - 1) : 0;
  const radius = 130;

  const selectOffset = (direction: number) => {
    const opts = optionsRef.current;
    const current = opts.indexOf(valueRef.current);
    const next = (current + direction + opts.length) % opts.length;
    onChangeRef.current(opts[next]);
  };

  // Native non-passive wheel listener — required to preventDefault and to
  // catch wheel events on the edge hot-zone (not just the dial itself).
  useEffect(() => {
    let lastTick = 0;
    let accum = 0;
    const COOLDOWN = 110; // ms between snaps
    const THRESHOLD = 18; // accumulated delta to trigger one step

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = performance.now();
      accum += e.deltaY;
      if (now - lastTick < COOLDOWN) return;
      if (Math.abs(accum) < THRESHOLD) return;
      selectOffset(accum > 0 ? 1 : -1);
      accum = 0;
      lastTick = now;
    };

    const edge = edgeRef.current;
    const dial = dialRef.current;
    edge?.addEventListener("wheel", onWheel, { passive: false });
    dial?.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      edge?.removeEventListener("wheel", onWheel);
      dial?.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <>
      {/* invisible hover hot-zone at the screen edge — also catches scroll */}
      <div
        ref={edgeRef}
        data-cycle
        className={`aura-edge-zone aura-edge-${side}`}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      />
      <div
        ref={dialRef}
        data-cycle
        className={`aura-dial aura-dial-${side} ${visible ? "is-visible" : ""}`}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragStart(e.clientY);
        }}
        onPointerMove={(e) => {
          if (dragStart === null || Math.abs(e.clientY - dragStart) < 28) return;
          selectOffset(e.clientY > dragStart ? 1 : -1);
          setDragStart(e.clientY);
        }}
        onPointerUp={() => setDragStart(null)}
        aria-label={label}
      >
        <div className="aura-dial-label">{label}</div>
        {options.map((opt, i) => {
          const angleDeg = start + step * i;
          const rad = (angleDeg * Math.PI) / 180;
          const dir = side === "left" ? 1 : -1;
          const x = Math.cos(rad) * radius * dir;
          const y = Math.sin(rad) * radius;
          const active = opt === value;
          return (
            <button
              key={opt}
              data-cycle
              onClick={(e) => {
                e.stopPropagation();
                onChange(opt);
              }}
              className={`aura-dial-item ${active ? "is-active" : ""}`}
              style={{ transform: `translate(${x}px, ${y}px) translate(-50%, -50%)` }}
            >
              {active && <span className="aura-dial-dot" />}
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
