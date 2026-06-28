from time import perf_counter
from typing import Any

import torch

from .checkpoints import latest_checkpoint, load_model_manifest
from .model import DigitMLP


class InferenceService:
    def __init__(self) -> None:
        self.model = DigitMLP()
        self.checkpoint_path = latest_checkpoint()
        self.manifest = load_model_manifest()
        if self.checkpoint_path:
            checkpoint = torch.load(self.checkpoint_path, map_location="cpu")
            state_dict = checkpoint.get("model_state_dict", checkpoint)
            self.model.load_state_dict(state_dict)
        self.model.eval()

    def describe_model(self) -> dict[str, Any]:
        return {
            "layers": [
                {"key": "input", "label": "Input tensor", "size": 784},
                {"key": "hidden1", "label": "Hidden layer 1", "size": 32},
                {"key": "hidden2", "label": "Hidden layer 2", "size": 16},
                {"key": "output", "label": "Output", "size": 10},
            ],
            "checkpoint": str(self.checkpoint_path) if self.checkpoint_path else None,
            "manifest": self.manifest,
        }

    def predict(self, payload: Any) -> dict[str, Any]:
        tensor_values = payload.get("tensor", []) if isinstance(payload, dict) else []
        mode = payload.get("mode", "final") if isinstance(payload, dict) else "final"
        x = self._to_tensor(tensor_values)

        started = perf_counter()
        with torch.no_grad():
            result = self.model.forward_with_activations(x)
        inference_ms = (perf_counter() - started) * 1000

        probabilities = result["probabilities"].squeeze(0)
        logits = result["logits"].squeeze(0)
        prediction = int(torch.argmax(probabilities).item())

        return {
            "prediction": prediction,
            "confidence": float(probabilities[prediction].item()),
            "probabilities": [float(value) for value in probabilities.tolist()],
            "logits": [float(value) for value in logits.tolist()],
            "activations": {
                "hidden1": [float(value) for value in result["hidden1"].squeeze(0).tolist()],
                "hidden2": [float(value) for value in result["hidden2"].squeeze(0).tolist()],
                "output": [float(value) for value in probabilities.tolist()],
            },
            "inferenceMs": round(inference_ms, 4),
            "mode": "preview" if mode == "preview" else "final",
        }

    def _to_tensor(self, values: list[float]) -> torch.Tensor:
        clean = values[:784] + [0.0] * max(0, 784 - len(values))
        return torch.tensor(clean, dtype=torch.float32).view(1, 784)
