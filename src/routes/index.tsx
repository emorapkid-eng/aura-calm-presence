import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AuraRing, type AuraState } from "@/components/AuraRing";
import { SideDial } from "@/components/SideDial";
import { JarvisProvider, type JarvisMode, type JarvisModel, useJarvis } from "@/state/jarvis-store";

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
  component: () => (
    <JarvisProvider>
      <Index />
    </JarvisProvider>
  ),
});

const STATES: AuraState[] = ["idle", "listening", "processing", "responding"];

const STATUS_LABEL: Record<AuraState, string> = {
  idle: "Ready",
  listening: "Listening",
  processing: "Thinking",
  responding: "Responding",
};

const MODES: JarvisMode[] = ["AI", "Study", "Calm", "Pro"];
const MODELS: JarvisModel[] = ["OpenAI", "Google", "Local", "Other"];

function Index() {
  const [introDone, setIntroDone] = useState(false);
  const { state, mode, model, setMode, setModel, setVisualState, sendCommand } = useJarvis();
  const stateRef = useRef<AuraState>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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
      setVisualState("listening");
    };

    const stopListen = () => {
      void sendCommand("voice-input");
      setVisualState("processing");
      releaseTimer = setTimeout(() => {
        setVisualState("responding");
        releaseTimer = setTimeout(() => setVisualState("idle"), 2400);
      }, 1400);
    };

    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement)?.dataset.cycle) return;
      startListen();
    };
    const onUp = () => {
      if (stateRef.current === "listening") stopListen();
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
  }, [sendCommand, setVisualState]);

  // allow clicking through states for demo without holding
  const cycleState = () => {
    const i = STATES.indexOf(state);
    setVisualState(STATES[(i + 1) % STATES.length]);
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

          <SideDial
            side="left"
            label="Mode"
            options={MODES}
            value={mode}
              onChange={(next) => void setMode(next as JarvisMode)}
          />
          <SideDial
            side="right"
            label="Model"
            options={MODELS}
            value={model}
              onChange={(next) => void setModel(next as JarvisModel)}
          />

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
