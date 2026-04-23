import type { AuraState } from "@/components/AuraRing";

export type JarvisMode = "AI" | "Study" | "Calm" | "Pro";
export type JarvisModel = "OpenAI" | "Google" | "Local" | "Other";

type ResponseCallback = (message: string) => void;
type StateCallback = (state: AuraState) => void;
type EventPayload = Record<string, unknown>;

type ElectronAPI = {
  sendCommand?: (input: string) => void | Promise<void>;
  setMode?: (mode: JarvisMode) => void | Promise<void>;
  setModel?: (model: JarvisModel) => void | Promise<void>;
  onResponse?: (callback: ResponseCallback) => (() => void) | void;
  onStateChange?: (callback: StateCallback) => (() => void) | void;
};

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

const hasWindow = () => typeof window !== "undefined";

class JarvisApiService {
  private socket: WebSocket | null = null;
  private responseCallbacks = new Set<ResponseCallback>();
  private stateCallbacks = new Set<StateCallback>();
  private electronDisposers: Array<() => void> = [];

  connect() {
    if (!hasWindow()) return;

    this.connectElectronBridge();
    this.connectWebSocket();
  }

  disconnect() {
    this.electronDisposers.forEach((dispose) => dispose());
    this.electronDisposers = [];
    this.socket?.close();
    this.socket = null;
  }

  async sendCommand(input: string) {
    await this.sendEvent("command", { input });
  }

  async setMode(mode: JarvisMode) {
    await this.sendEvent("mode", { mode });
  }

  async setModel(model: JarvisModel) {
    await this.sendEvent("model", { model });
  }

  onResponse(callback: ResponseCallback) {
    this.responseCallbacks.add(callback);
    return () => this.responseCallbacks.delete(callback);
  }

  onStateChange(callback: StateCallback) {
    this.stateCallbacks.add(callback);
    return () => this.stateCallbacks.delete(callback);
  }

  emitState(state: AuraState) {
    this.stateCallbacks.forEach((callback) => callback(state));
  }

  private connectElectronBridge() {
    const bridge = window.electronAPI;
    if (!bridge || this.electronDisposers.length) return;

    const responseDispose = bridge.onResponse?.((message) => this.emitResponse(message));
    const stateDispose = bridge.onStateChange?.((state) => this.emitState(state));
    if (responseDispose) this.electronDisposers.push(responseDispose);
    if (stateDispose) this.electronDisposers.push(stateDispose);
  }

  private connectWebSocket() {
    const url = import.meta.env.VITE_JARVIS_WS_URL as string | undefined;
    if (!url || this.socket) return;

    this.socket = new WebSocket(url);
    this.socket.addEventListener("message", (event) => this.handleSocketMessage(event.data));
    this.socket.addEventListener("close", () => {
      this.socket = null;
    });
  }

  private async sendEvent(type: "command" | "mode" | "model", payload: EventPayload) {
    if (hasWindow()) {
      const bridge = window.electronAPI;
      if (type === "command" && typeof payload.input === "string" && bridge?.sendCommand) {
        await bridge.sendCommand(payload.input);
        return;
      }
      if (type === "mode" && typeof payload.mode === "string" && bridge?.setMode) {
        await bridge.setMode(payload.mode as JarvisMode);
        return;
      }
      if (type === "model" && typeof payload.model === "string" && bridge?.setModel) {
        await bridge.setModel(payload.model as JarvisModel);
        return;
      }

      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type, ...payload }));
        return;
      }
    }

    await fetch(`/api/jarvis/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => undefined);
  }

  private handleSocketMessage(raw: string) {
    try {
      const message = JSON.parse(raw) as { type?: string; response?: string; state?: AuraState };
      if (message.type === "response" && message.response) this.emitResponse(message.response);
      if (message.type === "state" && message.state) this.emitState(message.state);
    } catch {
      this.emitResponse(String(raw));
    }
  }

  private emitResponse(message: string) {
    this.responseCallbacks.forEach((callback) => callback(message));
  }
}

export const jarvisApi = new JarvisApiService();