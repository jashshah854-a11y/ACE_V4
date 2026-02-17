"""
Insight Lens — AI-powered Q&A over analysis snapshots.

Builds context-aware prompts for Gemini based on the active tab
and snapshot data, returning structured answers with evidence refs.
"""

import json
from typing import Any, Dict, List, Optional

from core.llm import call_gemini

# Map frontend tab keys to snapshot sections we should include
TAB_SECTIONS: Dict[str, List[str]] = {
    "summary": ["smart_narrative", "curated_kpis", "trust"],
    "insights": ["deep_insights", "governed_report", "smart_narrative"],
    "hypotheses": ["hypotheses", "trust", "smart_narrative"],
    "trust": ["trust", "governed_report", "curated_kpis"],
    "report": ["report_markdown", "smart_narrative", "trust"],
}

MAX_SECTION_CHARS = 4000  # Truncate large sections to stay within token budget


def _truncate(text: str, limit: int = MAX_SECTION_CHARS) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + "\n... [truncated]"


def _extract_context(snapshot: Dict[str, Any], active_tab: str) -> str:
    """Extract relevant snapshot sections as a readable context block."""
    sections = TAB_SECTIONS.get(active_tab, TAB_SECTIONS["summary"])
    parts: List[str] = []

    for section_key in sections:
        data = snapshot.get(section_key)
        if data is None:
            continue

        if isinstance(data, str):
            parts.append(f"## {section_key}\n{_truncate(data)}")
        elif isinstance(data, dict):
            serialized = json.dumps(data, indent=2, default=str)
            parts.append(f"## {section_key}\n{_truncate(serialized)}")
        elif isinstance(data, list):
            serialized = json.dumps(data, indent=2, default=str)
            parts.append(f"## {section_key}\n{_truncate(serialized)}")

    # Always include identity for context
    identity = snapshot.get("identity", {})
    summary = identity.get("summary") or identity.get("identity", {})
    if summary:
        parts.insert(0, f"## Dataset Identity\n{json.dumps(summary, indent=2, default=str)}")

    return "\n\n".join(parts)


SYSTEM_PROMPT = """You are an expert data analyst assistant embedded in ACE, an automated data analysis platform.
You answer questions about dataset analysis results. Be concise, insightful, and cite specific data points.

RULES:
- Answer in clear, conversational language appropriate for business stakeholders
- Use markdown formatting (bold, bullets, etc.) for readability
- Every claim must be backed by data from the analysis context provided
- If the data doesn't support an answer, say so honestly
- Keep answers focused — 2-4 paragraphs maximum

You MUST respond in valid JSON with exactly this structure:
{
  "answer": "<markdown-formatted answer>",
  "evidence": [
    {
      "section": "<snapshot section key, e.g. trust, smart_narrative, deep_insights>",
      "key": "<specific data key within that section>",
      "label": "<short human-readable label for the badge, 2-4 words>",
      "value": "<the actual value or finding being referenced>"
    }
  ]
}

Include 1-4 evidence references. Each must point to real data from the context below."""


def ask_insight_lens(
    question: str,
    snapshot: Dict[str, Any],
    active_tab: str,
) -> Dict[str, Any]:
    """
    Answer a user question about their analysis using Gemini.

    Returns dict with 'answer' (markdown string) and 'evidence' (list of refs).
    """
    context = _extract_context(snapshot, active_tab)

    prompt = f"""{SYSTEM_PROMPT}

--- ANALYSIS CONTEXT (tab: {active_tab}) ---
{context}

--- USER QUESTION ---
{question}

Respond with JSON only."""

    result = call_gemini(prompt, temperature=0.3, max_tokens=2048, parse_json=True)

    # Validate structure
    if isinstance(result, dict):
        answer = result.get("answer", "")
        evidence = result.get("evidence", [])
        # Ensure evidence items have required fields
        validated_evidence = []
        for ev in evidence:
            if isinstance(ev, dict) and all(k in ev for k in ("section", "key", "label", "value")):
                validated_evidence.append({
                    "section": str(ev["section"]),
                    "key": str(ev["key"]),
                    "label": str(ev["label"]),
                    "value": str(ev["value"]),
                })
        return {"answer": answer, "evidence": validated_evidence}

    # Fallback if Gemini returned something unexpected
    return {
        "answer": str(result) if result else "I wasn't able to analyze that. Please try rephrasing your question.",
        "evidence": [],
    }
