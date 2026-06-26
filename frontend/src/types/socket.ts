export type SocketMessage<TPayload = unknown> = {
  type: string;
  version: 1;
  requestId?: string;
  timestamp?: number;
  payload: TPayload;
};
