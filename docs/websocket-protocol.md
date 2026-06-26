# WebSocket Protocol

All real-time app messages use a single endpoint:

```text
/ws
```

Message envelope:

```json
{
  "type": "inference.request",
  "version": 1,
  "requestId": "uuid",
  "timestamp": 1760000000000,
  "payload": {}
}
```

## Client Messages

- `model.describe`
- `inference.request`

## Server Messages

- `model.description`
- `inference.result`
- `socket.error`

Training replay messages are intentionally deferred.
