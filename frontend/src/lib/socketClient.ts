import type { InferenceResult, NetworkDescription } from "../types/network";
import type { SocketMessage } from "../types/socket";

type Handlers = {
  onConnectionState: (state: "connecting" | "connected" | "disconnected" | "error") => void;
  onNetworkDescription: (description: NetworkDescription) => void;
  onInferenceResult: (result: InferenceResult, requestId?: string) => void;
};

export class PlaygroundSocket {
  private ws: WebSocket | null = null;
  private latestRequestId: string | null = null;

  constructor(private readonly handlers: Handlers) {}

  connect() {
    this.handlers.onConnectionState("connecting");
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    this.ws = new WebSocket(`${protocol}://${window.location.host}${appPath("ws")}`);

    this.ws.addEventListener("open", () => {
      this.handlers.onConnectionState("connected");
      this.send("model.describe", {});
    });

    this.ws.addEventListener("close", () => this.handlers.onConnectionState("disconnected"));
    this.ws.addEventListener("error", () => this.handlers.onConnectionState("error"));
    this.ws.addEventListener("message", (event) => this.handleMessage(event.data));
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  requestInference(tensor: number[], mode: "preview" | "final") {
    const requestId = createRequestId();
    this.latestRequestId = requestId;
    this.send("inference.request", { tensor, mode }, requestId);
  }

  private send(type: string, payload: unknown, requestId?: string) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    const message: SocketMessage = {
      type,
      version: 1,
      requestId,
      timestamp: Date.now(),
      payload
    };
    this.ws.send(JSON.stringify(message));
  }

  private handleMessage(raw: string) {
    const message = JSON.parse(raw) as SocketMessage;

    if (message.type === "model.description") {
      this.handlers.onNetworkDescription(message.payload as NetworkDescription);
    }

    if (message.type === "inference.result") {
      if (message.requestId && message.requestId !== this.latestRequestId) return;
      this.handlers.onInferenceResult(message.payload as InferenceResult, message.requestId);
    }
  }
}

function appPath(path: string) {
  const basePath = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${basePath}${path}`;
}

function createRequestId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `request-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
