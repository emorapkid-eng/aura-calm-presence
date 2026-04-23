import { useState } from "react";

interface Props {
  side: "left" | "right";
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}

/**
 * Hidden semi-circular dial that fades in when the cursor approaches the edge.
 * Options are arranged along an arc; selection is understated.
 */
export function SideDial({ side, label, options, value, onChange }: Props) {
  const [visible, setVisible] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);

  // arc angles for items, centered vertically
  const count = options.length;
  const arcSpan = 70; // degrees total
  const start = -arcSpan / 2;
  const step = count > 1 ? arcSpan / (count - 1) : 0;
  const radius = 130;
  const selectOffset = (direction: number) => {
    const current = options.indexOf(value);
    const next = (current + direction + options.length) % options.length;
    onChange(options[next]);
  };

  return (
    <>
      {/* invisible hover hot-zone at the screen edge */}
      <div
        data-cycle
        className={`aura-edge-zone aura-edge-${side}`}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      />
      <div
        data-cycle
        className={`aura-dial aura-dial-${side} ${visible ? "is-visible" : ""}`}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onWheel={(e) => {
          e.preventDefault();
          selectOffset(e.deltaY > 0 ? 1 : -1);
        }}
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
          // left dial: arc opens to the right; right dial: arc opens to the left
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
