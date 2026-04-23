import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import type { AuraState } from "@/components/AuraRing";
import { jarvisApi, type JarvisMode, type JarvisModel } from "@/services/api";

type JarvisStore = {
  state: AuraState;
  mode: JarvisMode;
  model: JarvisModel;
  lastResponse: string;
};

type Action =
  | { type: "state"; state: AuraState }
  | { type: "mode"; mode: JarvisMode }
  | { type: "model"; model: JarvisModel }
  | { type: "response"; response: string };

const initialState: JarvisStore = {
  state: "idle",
  mode: "AI",
  model: "OpenAI",
  lastResponse: "",
};

const JarvisContext = createContext<
  | (JarvisStore & {
      sendCommand: (input: string) => Promise<void>;
      setMode: (mode: JarvisMode) => Promise<void>;
      setModel: (model: JarvisModel) => Promise<void>;
      setVisualState: (state: AuraState) => void;
    })
  | null
>(null);

function reducer(state: JarvisStore, action: Action): JarvisStore {
  switch (action.type) {
    case "state":
      return { ...state, state: action.state };
    case "mode":
      return { ...state, mode: action.mode };
    case "model":
      return { ...state, model: action.model };
    case "response":
      return { ...state, lastResponse: action.response };
  }
}

export function JarvisProvider({ children }: { children: ReactNode }) {
  const [store, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    jarvisApi.connect();
    const offResponse = jarvisApi.onResponse((response) => dispatch({ type: "response", response }));
    const offState = jarvisApi.onStateChange((state) => dispatch({ type: "state", state }));
    return () => {
      offResponse();
      offState();
      jarvisApi.disconnect();
    };
  }, []);

  const value = useMemo(
    () => ({
      ...store,
      sendCommand: (input: string) => jarvisApi.sendCommand(input),
      setMode: async (mode: JarvisMode) => {
        dispatch({ type: "mode", mode });
        await jarvisApi.setMode(mode);
      },
      setModel: async (model: JarvisModel) => {
        dispatch({ type: "model", model });
        await jarvisApi.setModel(model);
      },
      setVisualState: (state: AuraState) => {
        dispatch({ type: "state", state });
        jarvisApi.emitState(state);
      },
    }),
    [store],
  );

  return <JarvisContext.Provider value={value}>{children}</JarvisContext.Provider>;
}

export function useJarvis() {
  const context = useContext(JarvisContext);
  if (!context) throw new Error("useJarvis must be used inside JarvisProvider");
  return context;
}

export type { JarvisMode, JarvisModel };