from pathlib import Path
from typing import Any
import hashlib
import json


MODELS_DIR = Path(__file__).resolve().parents[3] / "models"
CHECKPOINTS_DIR = MODELS_DIR / "checkpoints"
MANIFESTS_DIR = MODELS_DIR / "manifests"
DEFAULT_CHECKPOINT = CHECKPOINTS_DIR / "digit_mlp.pt"
DEFAULT_MANIFEST = MANIFESTS_DIR / "digit_mlp_manifest.json"


def latest_checkpoint() -> Path | None:
    checkpoints = sorted(CHECKPOINTS_DIR.glob("*.pt"))
    return checkpoints[-1] if checkpoints else None


def checkpoint_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_model_manifest() -> dict[str, Any] | None:
    if not DEFAULT_MANIFEST.exists():
        return None

    with DEFAULT_MANIFEST.open() as file:
        manifest = json.load(file)

    checkpoint = latest_checkpoint()
    if checkpoint:
        manifest["checkpoint"] = str(checkpoint)
        manifest["checkpointSha256"] = checkpoint_sha256(checkpoint)

    return manifest
