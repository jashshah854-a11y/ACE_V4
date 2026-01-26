import json
from pathlib import Path

from core.view_policies import build_view_policies


def test_view_policy_snapshot():
    policies = build_view_policies({"allow_regression_sections": True}, ["regression"])
    fixture_path = Path(__file__).parent / "fixtures" / "view_policy_snapshot.json"
    expected = json.loads(fixture_path.read_text(encoding="utf-8"))
    assert policies == expected


def test_executive_section_limit():
    policies = build_view_policies({"allow_regression_sections": True}, ["regression"])
    assert len(policies["executive"]["allowed_sections"]) <= 7
