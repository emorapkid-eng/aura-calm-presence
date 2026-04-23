import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

const STATUS_LABEL: Record<AuraState, string> = {
  idle: "Ready",
  listening: "Listening…",
  thinking: "Thinking…",
  processing: "Thinking…",
  responding: "Responding…",
};

const MODES: JarvisMode[] = ["AI", "Study", "Calm", "Pro"];
const MODELS: JarvisModel[] = ["OpenAI", "Google", "Local", "Other"];

function Index() {
  const [introDone, setIntroDone] = useState(false);
  const { state, mode, model, setMode, setModel } = useJarvis();

  // intro completes after the CSS animation
  useEffect(() => {
    const t = setTimeout(() => setIntroDone(true), 3200);
    return () => clearTimeout(t);
  }, []);

  const label = STATUS_LABEL[state];

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

          <div
            className="aura-status"
            style={{ opacity: label ? 1 : 0 }}
            aria-live="polite"
          >
            {label}
          </div>
        </>
      )}
    </main>
  );
}
