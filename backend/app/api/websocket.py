from fastapi import WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from ..ml.inference import InferenceService
from ..schemas.socket import SocketMessage

inference_service = InferenceService()


async def handle_socket(websocket: WebSocket) -> None:
    await websocket.accept()

    try:
        while True:
            raw = await websocket.receive_json()
            try:
                message = SocketMessage.model_validate(raw)
            except ValidationError as exc:
                await websocket.send_json(
                    error_message("socket.error", "Invalid message shape", details=str(exc))
                )
                continue

            if message.type == "model.describe":
                await websocket.send_json(
                    SocketMessage(
                        type="model.description",
                        request_id=message.request_id,
                        payload=inference_service.describe_model(),
                    ).model_dump(by_alias=True)
                )
                continue

            if message.type == "inference.request":
                result = inference_service.predict(message.payload)
                await websocket.send_json(
                    SocketMessage(
                        type="inference.result",
                        request_id=message.request_id,
                        payload=result,
                    ).model_dump(by_alias=True)
                )
                continue

            await websocket.send_json(
                error_message("socket.error", f"Unsupported message type: {message.type}")
            )
    except WebSocketDisconnect:
        return


def error_message(message_type: str, message: str, details: str | None = None) -> dict:
    return SocketMessage(
        type=message_type, payload={"message": message, "details": details}
    ).model_dump(by_alias=True)
