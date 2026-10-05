from agents.deep_insight import DeepInsightAgent
from agents.executive_narrator import ExecutiveNarratorAgent
from agents.story_framer import StoryFramer
from core.smart_narrative import _extract_context


class _State:
    def __init__(self, values):
        self.values = values

    def read(self, name):
        return self.values.get(name)


INTENT = {
    "primary_question": "Which customer segments should we retain first?",
    "required_output_type": "diagnostic",
    "decision_context": "Plan the next customer review",
    "success_criteria": "Evidence for the affected groups",
    "constraints": "Do not infer causality",
    "confidence_threshold": 80,
}


def test_deep_insight_context_labels_user_request_not_evidence():
    agent = DeepInsightAgent(_State({"task_intent": INTENT}))
    agent._load_artifacts()

    context = agent._build_context()

    assert "## User Request (not evidence)" in context
    assert INTENT["primary_question"] in context
    assert "Requested output: diagnostic" in context
    assert INTENT["constraints"] in context


def test_story_context_carries_user_request_not_evidence():
    agent = StoryFramer(_State({"task_intent": INTENT}))

    context = agent._build_story_context({}, {}, {}, {}, {})

    assert "## User Request (not evidence)" in context
    assert INTENT["primary_question"] in context
    assert INTENT["success_criteria"] in context


def test_executive_report_quotes_requested_analysis_for_story_path():
    agent = ExecutiveNarratorAgent(_State({}))

    report = agent._build_report(
        "Narrative body",
        {"domain_detected": "business", "insights": [], "recommendations": []},
        {"row_count": 1, "column_count": 1, "quality_score": 100, "anomaly_count": 0, "anomaly_pct": 0, "confidence_score": 90},
        task_intent={"primary_question": "# Do not make this a heading", "required_output_type": "diagnostic", "constraints": "Do not infer causality"},
    )

    assert "## Requested Analysis" in report["markdown"]
    assert "> # Do not make this a heading" in report["markdown"]
    assert "Requested output: diagnostic" in report["markdown"]
    assert "> constraints: Do not infer causality" in report["markdown"]


def test_executive_fallback_prompt_labels_user_request_not_evidence(monkeypatch):
    captured = {}
    monkeypatch.setattr(
        "agents.executive_narrator.call_gemini",
        lambda prompt, **_kwargs: captured.setdefault("prompt", prompt) or "draft",
    )
    agent = ExecutiveNarratorAgent(_State({}))

    agent._pass1_draft(
        {"domain_detected": "business", "insights": [], "recommendations": []},
        {"row_count": 1, "column_count": 1, "quality_score": 100, "anomaly_count": 0, "anomaly_pct": 0, "confidence_score": 90},
        INTENT,
    )

    assert "USER REQUEST (not evidence or a finding):" in captured["prompt"]
    assert INTENT["primary_question"] in captured["prompt"]
    assert INTENT["constraints"] in captured["prompt"]


def test_smart_narrative_context_carries_user_request_not_evidence():
    context = _extract_context({"task_intent": INTENT})

    assert context["user_request"] == {
        "label": "User request (not evidence)",
        **INTENT,
    }


def test_smart_narrative_request_label_cannot_be_overwritten_by_input():
    context = _extract_context({"task_intent": {"primary_question": "Which segment?", "label": "evidence"}})

    assert context["user_request"]["label"] == "User request (not evidence)"
