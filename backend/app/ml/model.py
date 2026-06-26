import torch
from torch import nn


class DigitMLP(nn.Module):
    """Small MLP chosen for honest, readable visualization."""

    def __init__(self) -> None:
        super().__init__()
        self.fc1 = nn.Linear(784, 32)
        self.fc2 = nn.Linear(32, 16)
        self.fc3 = nn.Linear(16, 10)
        self.activation = nn.ReLU()

    def forward_with_activations(self, x: torch.Tensor) -> dict[str, torch.Tensor]:
        z1 = self.fc1(x)
        h1 = self.activation(z1)
        z2 = self.fc2(h1)
        h2 = self.activation(z2)
        logits = self.fc3(h2)
        probabilities = torch.softmax(logits, dim=-1)
        return {
            "hidden1": h1,
            "hidden2": h2,
            "logits": logits,
            "probabilities": probabilities,
        }
