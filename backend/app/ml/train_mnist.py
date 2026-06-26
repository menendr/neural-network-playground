from pathlib import Path
import ssl

import torch
from torch import nn
from torch.utils.data import ConcatDataset, DataLoader, Dataset, Subset
from torchvision import datasets, transforms

from .checkpoints import CHECKPOINTS_DIR, DEFAULT_MANIFEST, checkpoint_sha256, latest_checkpoint
from .model import DigitMLP


def train(epochs: int = 8, batch_size: int = 256, learning_rate: float = 0.0008) -> Path:
    ssl._create_default_https_context = ssl._create_unverified_context
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

    base_dir = Path(__file__).resolve().parents[3] / "models" / "data"
    flatten = transforms.Lambda(lambda image: image.view(-1))
    train_transform = transforms.Compose(
        [
            transforms.RandomAffine(
                degrees=8,
                translate=(0.08, 0.08),
                scale=(0.9, 1.1),
                shear=5,
                fill=0,
            ),
            transforms.ToTensor(),
            flatten,
        ]
    )
    validation_transform = transforms.Compose([transforms.ToTensor(), flatten])

    mnist_train = datasets.MNIST(
        root=str(base_dir), train=True, download=True, transform=train_transform
    )
    validation_dataset = datasets.MNIST(
        root=str(base_dir), train=True, download=True, transform=validation_transform
    )
    mnist_indices = torch.randperm(
        len(mnist_train), generator=torch.Generator().manual_seed(42)
    ).tolist()
    mnist_train_subset = Subset(mnist_train, mnist_indices[:55_000])
    train_set = LabelAwareDigitDataset(
        ConcatDataset(
            [
                mnist_train_subset,
                mnist_train_subset,
            ]
        )
    )
    validation_set = Subset(validation_dataset, mnist_indices[55_000:])

    train_loader = DataLoader(train_set, batch_size=batch_size, shuffle=True)
    validation_loader = DataLoader(validation_set, batch_size=batch_size)

    model = DigitMLP()
    resume_checkpoint = latest_checkpoint()
    if resume_checkpoint:
        checkpoint = torch.load(resume_checkpoint, map_location="cpu")
        state_dict = checkpoint.get("model_state_dict", checkpoint)
        model.load_state_dict(state_dict)
        print(f"resuming={resume_checkpoint}")
    model = model.to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
    loss_fn = nn.CrossEntropyLoss()
    best_accuracy = evaluate(model, validation_loader, device)
    best_state_dict = {
        key: value.detach().cpu().clone() for key, value in model.state_dict().items()
    }
    print(f"initial_val_accuracy={best_accuracy:.4f}")

    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0
        for x, y in train_loader:
            x = x.to(device)
            y = y.to(device)
            optimizer.zero_grad()
            logits = model.forward_with_activations(x)["logits"]
            loss = loss_fn(logits, y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * x.size(0)

        accuracy = evaluate(model, validation_loader, device)
        if accuracy > best_accuracy:
            best_accuracy = accuracy
            best_state_dict = {
                key: value.detach().cpu().clone() for key, value in model.state_dict().items()
            }
        print(f"epoch={epoch} loss={total_loss / len(train_set):.4f} val_accuracy={accuracy:.4f}")

    CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)
    output_path = CHECKPOINTS_DIR / "digit_mlp.pt"
    torch.save(
        {
            "model_state_dict": best_state_dict,
            "architecture": "784-32-16-10",
            "epochs": epochs,
            "best_validation_accuracy": best_accuracy,
            "training": "mnist-finetune-canvas-augmentation",
            "resumed_from": str(resume_checkpoint) if resume_checkpoint else None,
        },
        output_path,
    )
    write_manifest(output_path, epochs, best_accuracy)
    return output_path


def write_manifest(checkpoint_path: Path, epochs: int, best_validation_accuracy: float) -> None:
    DEFAULT_MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    DEFAULT_MANIFEST.write_text(
        json_manifest(
            checkpoint_path=checkpoint_path,
            epochs=epochs,
            best_validation_accuracy=best_validation_accuracy,
        )
    )


def json_manifest(checkpoint_path: Path, epochs: int, best_validation_accuracy: float) -> str:
    import json

    return json.dumps(
        {
            "modelName": "DigitMLP",
            "task": "Handwritten digit inference",
            "architecture": "784-32-16-10",
            "framework": "PyTorch",
            "checkpoint": str(checkpoint_path.relative_to(Path(__file__).resolve().parents[3])),
            "checkpointSha256": checkpoint_sha256(checkpoint_path),
            "training": {
                "dataset": "MNIST",
                "recipe": "mnist-finetune-canvas-augmentation",
                "augmentation": [
                    "random affine",
                    "crossbar sevens",
                    "stroke thickening",
                    "stroke softening",
                    "intensity variation",
                ],
                "epochs": epochs,
                "bestValidationAccuracy": best_validation_accuracy,
            },
            "visualization": {
                "displayedArchitecture": "784 -> 32 -> 16 -> 10",
                "backgroundMesh": "sampled symmetric paths",
                "signalGraph": "fully connected displayed hidden/output layers",
            },
        },
        indent=2,
    )


def evaluate(model: DigitMLP, loader: DataLoader, device: torch.device) -> float:
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for x, y in loader:
            x = x.to(device)
            y = y.to(device)
            logits = model.forward_with_activations(x)["logits"]
            correct += int((logits.argmax(dim=1) == y).sum().item())
            total += int(y.numel())
    return correct / total


class LabelAwareDigitDataset(Dataset):
    def __init__(self, dataset: Dataset) -> None:
        self.dataset = dataset

    def __len__(self) -> int:
        return len(self.dataset)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, int]:
        x, y = self.dataset[index]
        if y == 7 and torch.rand(()) < 0.68:
            x = add_crossbar_to_seven(x)
        if torch.rand(()) < 0.28:
            x = thicken_stroke(x)
        if torch.rand(()) < 0.08:
            x = soften_stroke(x)
        if torch.rand(()) < 0.1:
            x = vary_intensity(x)
        return x, int(y)


def add_crossbar_to_seven(x: torch.Tensor) -> torch.Tensor:
    image = x.view(28, 28).clone()
    row = int(torch.randint(10, 15, ()).item())
    start = int(torch.randint(6, 10, ()).item())
    end = int(torch.randint(18, 24, ()).item())
    strength = float(torch.empty(()).uniform_(0.72, 0.96).item())
    image[row : row + 2, start:end] = torch.maximum(
        image[row : row + 2, start:end], torch.tensor(strength)
    )
    return image.clamp(0, 1).view(-1)


def thicken_stroke(x: torch.Tensor) -> torch.Tensor:
    image = x.view(1, 1, 28, 28)
    thickened = torch.nn.functional.max_pool2d(image, kernel_size=3, stride=1, padding=1)
    blend = float(torch.empty(()).uniform_(0.18, 0.38).item())
    return torch.maximum(x.view(28, 28), thickened.view(28, 28) * blend).clamp(0, 1).view(-1)


def soften_stroke(x: torch.Tensor) -> torch.Tensor:
    image = x.view(1, 1, 28, 28)
    softened = torch.nn.functional.avg_pool2d(image, kernel_size=3, stride=1, padding=1)
    blend = float(torch.empty(()).uniform_(0.18, 0.34).item())
    return (x.view(28, 28) * (1 - blend) + softened.view(28, 28) * blend).clamp(0, 1).view(-1)


def vary_intensity(x: torch.Tensor) -> torch.Tensor:
    scale = float(torch.empty(()).uniform_(0.78, 1.14).item())
    gamma = float(torch.empty(()).uniform_(0.82, 1.18).item())
    return (x.clamp(0, 1).pow(gamma) * scale).clamp(0, 1)


if __name__ == "__main__":
    checkpoint = train()
    print(f"saved={checkpoint}")
