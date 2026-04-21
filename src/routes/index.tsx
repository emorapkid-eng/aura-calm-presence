import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuraRing, type AuraState } from "@/components/AuraRing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AURA — Ambient AI" },
      {
        name: "description",
        content:
          "AURA is a calm, ambient AI presence. A minimal, monochrome interface that quietly listens, thinks, and responds.",
      },
    ],
  }),
  component: Index,
});

const STATES: AuraState[] = ["idle", "listening", "processing", "responding"];

const STATUS_LABEL: Record<AuraState, string> = {
  idle: "Ready",
  listening: "Listening",
  processing: "Thinking",
  responding: "Responding",
};

function Index() {
  const [introDone, setIntroDone] = useState(false);
  const [state, setState] = useState<AuraState>("idle");

  // intro completes after the CSS animation
  useEffect(() => {
    const t = setTimeout(() => setIntroDone(true), 3200);
    return () => clearTimeout(t);
  }, []);

  // hold to listen — pointer & space key
  useEffect(() => {
    let releaseTimer: ReturnType<typeof setTimeout> | null = null;

    const startListen = () => {
      if (releaseTimer) clearTimeout(releaseTimer);
      setState("listening");
    };

    const stopListen = () => {
      setState("processing");
      releaseTimer = setTimeout(() => {
        setState("responding");
        releaseTimer = setTimeout(() => setState("idle"), 2400);
      }, 1400);
    };

    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement)?.dataset.cycle) return;
      startListen();
    };
    const onUp = () => {
      if (state === "listening" || stateRef.current === "listening") stopListen();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        startListen();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") stopListen();
    };

    // tiny ref-trick to read latest state in pointerup
    const stateRef = { current: state } as { current: AuraState };
    const sync = () => (stateRef.current = state);
    sync();

    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      if (releaseTimer) clearTimeout(releaseTimer);
    };
  }, [state]);

  // allow clicking through states for demo without holding
  const cycleState = () => {
    const i = STATES.indexOf(state);
    setState(STATES[(i + 1) % STATES.length]);
  };

  return (
    <main className="aura-stage">
      {!introDone && (
        <div className="aura-intro-wrap">
          <div className="aura-intro-text">A U R A</div>
        </div>
      )}

      <AuraRing state={state} />

      {introDone && (
        <>
          <div className="aura-hint">Hold space or press to speak</div>

          <button
            data-cycle
            onClick={cycleState}
            className="aura-status cursor-pointer bg-transparent border-0 outline-none"
            style={{ opacity: introDone ? 1 : 0 }}
            aria-label={`Current state: ${STATUS_LABEL[state]}. Click to change.`}
          >
            {STATUS_LABEL[state]}
          </button>
        </>
      )}
    </main>
  );
}
