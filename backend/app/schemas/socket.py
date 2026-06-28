from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class SocketMessage(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    type: str
    version: Literal[1] = 1
    request_id: str | None = Field(default=None, alias="requestId")
    timestamp: int | None = None
    payload: Any = Field(default_factory=dict)
