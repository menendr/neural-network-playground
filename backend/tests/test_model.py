import torch

from app.ml.model import DigitMLP


def test_digit_mlp_shapes() -> None:
    model = DigitMLP()
    output = model.forward_with_activations(torch.zeros(1, 784))

    assert output["hidden1"].shape == (1, 32)
    assert output["hidden2"].shape == (1, 16)
    assert output["logits"].shape == (1, 10)
    assert output["probabilities"].shape == (1, 10)
