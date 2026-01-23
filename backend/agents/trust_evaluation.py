import sys
from pathlib import Path

from core.state_manager import StateManager
from core.trust_model import compute_trust_from_manifest
from core.run_manifest import _read_manifest


def main(run_path: str) -> None:
    manifest = _read_manifest(run_path)
    if not manifest:
        raise RuntimeError("Run manifest missing; cannot compute trust.")
    trust = compute_trust_from_manifest(manifest)
    state_manager = StateManager(run_path)
    state_manager.write("trust_object_pending", trust)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: trust_evaluation.py <run_path>")
        sys.exit(1)
    run_path = Path(sys.argv[1])
    main(str(run_path))
