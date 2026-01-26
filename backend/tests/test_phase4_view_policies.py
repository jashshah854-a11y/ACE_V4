from core.view_policies import build_view_policies


def test_view_policy_executive_primary_only():
    policies = build_view_policies({"allow_regression_sections": True}, ["regression"])
    assert "supporting_evidence" in policies["executive"]["allowed_sections"]
    assert "governing_thought" in policies["executive"]["allowed_sections"]


def test_view_policy_expert_includes_diagnostics():
    policies = build_view_policies({"allow_regression_sections": True}, ["regression", "simulation"])
    assert "diagnostics" not in policies["expert"]["allowed_sections"]
