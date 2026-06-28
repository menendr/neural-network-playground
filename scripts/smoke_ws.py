import asyncio
import json

import websockets


async def main() -> None:
    async with websockets.connect("ws://127.0.0.1:8000/ws") as websocket:
        await websocket.send(
            json.dumps(
                {
                    "type": "inference.request",
                    "version": 1,
                    "requestId": "smoke-test",
                    "payload": {"mode": "final", "tensor": [0.0] * 784},
                }
            )
        )
        response = json.loads(await websocket.recv())
        assert response["type"] == "inference.result"
        assert len(response["payload"]["probabilities"]) == 10
        print(json.dumps({"type": response["type"], "prediction": response["payload"]["prediction"]}))


asyncio.run(main())
