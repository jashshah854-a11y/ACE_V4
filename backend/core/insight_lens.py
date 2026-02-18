"""
Insight Lens — AI-powered Q&A over analysis snapshots.

Builds context-aware prompts for Gemini based on the active tab
and snapshot data, returning structured answers with evidence refs.

Performance: Uses lazy section loading — only reads the 2-3 sections
needed for the active tab from disk, not the entire snapshot.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional

from core.llm import call_gemini
from core.state_manager import StateManager

logger = logging.getLogger("ace.insight_lens")

# Map frontend tab keys to snapshot sections we should include.
# Each maps to (state_key, is_file) pairs — state_key for StateManager.read(),
# is_file=True for raw files that need special handling.
TAB_SECTIONS: Dict[str, List[str]] = {
    "summary": ["smart_narrative", "curated_kpis", "trust"],
    "insights": ["deep_insights", "governed_report", "smart_narrative"],
    "hypotheses": ["hypotheses", "trust", "smart_narrative"],
    "trust": ["trust", "governed_report", "curated_kpis"],
    "report": ["report_markdown", "smart_narrative", "trust"],
}

# Section-specific truncation limits (Phase 3: tighter budgets)
SECTION_CHAR_LIMITS: Dict[str, int] = {
    "report_markdown": 3000,   # Large text, aggressively truncate
    "smart_narrative": 2500,
    "deep_insights": 2500,
    "governed_report": 2000,
    "hypotheses": 2000,
    "trust": 1500,
    "curated_kpis": 1000,
}
DEFAULT_CHAR_LIMIT = 2000


def _truncate(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + "\n... [truncated]"


def _load_section(state: StateManager, run_path: Path, section_key: str) -> Any:
    """Load a single section from disk via StateManager or direct file read."""
    # Special cases: some sections live in specific files
    if section_key == "report_markdown":
        report_path = run_path / "final_report.md"
        if report_path.exists():
            try:
                return report_path.read_text(encoding="utf-8")
            except Exception:
                return None
        return None

    if section_key == "governed_report":
        gov_path = run_path / "artifacts" / "governed_report.json"
        if gov_path.exists():
            try:
                with open(gov_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return None
        return None

    if section_key == "trust":
        manifest_path = run_path / "run_manifest.json"
        if manifest_path.exists():
            try:
                with open(manifest_path, "r", encoding="utf-8") as f:
                    manifest = json.load(f)
                return manifest.get("trust")
            except Exception:
                return None
        return None

    if section_key == "curated_kpis":
        # Derive from identity — lightweight
        identity = state.read("identity_card") or {}
        return {
            "rows": identity.get("row_count"),
            "columns": identity.get("column_count"),
            "data_quality_score": identity.get("quality_score"),
        }

    # Default: read from StateManager (tries disk JSON then Redis)
    return state.read(section_key)


def _load_identity_summary(state: StateManager) -> Optional[Dict]:
    """Load minimal identity info for context."""
    identity = state.read("identity_card")
    if not identity:
        return None
    return {
        "row_count": identity.get("row_count"),
        "column_count": identity.get("column_count"),
        "data_type": identity.get("data_type"),
        "quality": identity.get("quality"),
        "columns": identity.get("columns", [])[:20],  # Cap at 20 column names
    }


def load_lens_context(run_path: str, active_tab: str) -> Dict[str, Any]:
    """
    Lazy-load only the snapshot sections needed for the given tab.

    Returns a lightweight dict with only the relevant data —
    much faster than _build_snapshot_payload().
    """
    rp = Path(run_path)
    if not rp.exists():
        raise FileNotFoundError(f"Run path does not exist: {run_path}")

    state = StateManager(str(rp))
    sections = TAB_SECTIONS.get(active_tab, TAB_SECTIONS["summary"])
    context: Dict[str, Any] = {}

    # Always load identity
    identity_summary = _load_identity_summary(state)
    if identity_summary:
        context["identity"] = {"summary": identity_summary}

    # Load only the sections we need
    for key in sections:
        data = _load_section(state, rp, key)
        if data is not None:
            context[key] = data

    return context


def _extract_context(snapshot: Dict[str, Any], active_tab: str) -> str:
    """Extract relevant snapshot sections as a readable context block."""
    sections = TAB_SECTIONS.get(active_tab, TAB_SECTIONS["summary"])
    parts: List[str] = []

    for section_key in sections:
        data = snapshot.get(section_key)
        if data is None:
            continue

        limit = SECTION_CHAR_LIMITS.get(section_key, DEFAULT_CHAR_LIMIT)

        if isinstance(data, str):
            parts.append(f"## {section_key}\n{_truncate(data, limit)}")
        elif isinstance(data, (dict, list)):
            serialized = json.dumps(data, indent=2, default=str)
            parts.append(f"## {section_key}\n{_truncate(serialized, limit)}")

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


def _validate_evidence(evidence: list) -> list:
    """Validate and sanitize evidence refs from Gemini response."""
    validated = []
    for ev in evidence:
        if isinstance(ev, dict) and all(k in ev for k in ("section", "key", "label", "value")):
            validated.append({
                "section": str(ev["section"]),
                "key": str(ev["key"]),
                "label": str(ev["label"]),
                "value": str(ev["value"]),
            })
    return validated


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

    result = call_gemini(prompt, temperature=0.2, max_tokens=1024, parse_json=True)

    if isinstance(result, dict):
        answer = result.get("answer", "")
        evidence = _validate_evidence(result.get("evidence", []))
        return {"answer": answer, "evidence": evidence}

    return {
        "answer": str(result) if result else "I wasn't able to analyze that. Please try rephrasing your question.",
        "evidence": [],
    }


def ask_insight_lens_stream(
    question: str,
    snapshot: Dict[str, Any],
    active_tab: str,
) -> Generator[str, None, None]:
    """
    Run Insight Lens over SSE, sending a single complete event when done.

    We buffer the full Gemini response server-side before sending — this avoids:
    - Raw JSON token display on the frontend
    - Incompatibility between JSON mode and streaming

    The SSE connection keeps the request alive (no timeout) while Gemini thinks.
    Frontend shows a shimmer until the complete event arrives.

    Yields SSE-formatted strings:
      data: {"type":"complete","answer":"...","evidence":[...]}
      data: {"type":"error","content":"..."}
    """
    context = _extract_context(snapshot, active_tab)

    prompt = f"""{SYSTEM_PROMPT}

--- ANALYSIS CONTEXT (tab: {active_tab}) ---
{context}

--- USER QUESTION ---
{question}

Respond with JSON only."""

    try:
        from core.llm import call_gemini_stream

        # Buffer all chunks — do NOT yield tokens (raw JSON looks terrible)
        buffer = ""
        for chunk in call_gemini_stream(prompt, temperature=0.2, max_tokens=1024):
            buffer += chunk

        # Clean markdown fences if present
        text = buffer.strip()
        if text.startswith("```"):
            text = "\n".join(text.split("\n")[1:])
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
        text = text.strip()

        try:
            parsed = json.loads(text)
            answer = parsed.get("answer", text)
            evidence = _validate_evidence(parsed.get("evidence", []))
        except json.JSONDecodeError:
            # Gemini returned plain text instead of JSON — use it as-is
            answer = text
            evidence = []

        yield f"data: {json.dumps({'type': 'complete', 'answer': answer, 'evidence': evidence})}\n\n"

    except Exception as e:
        logger.error(f"Insight Lens stream error: {e}")
        # Try synchronous fallback before giving up
        try:
            result = ask_insight_lens(question, snapshot, active_tab)
            yield f"data: {json.dumps({'type': 'complete', 'answer': result['answer'], 'evidence': result['evidence']})}\n\n"
        except Exception as e2:
            logger.error(f"Insight Lens fallback error: {e2}")
            yield f"data: {json.dumps({'type': 'error', 'content': 'Unable to analyze right now. Please try again in a moment.'})}\n\n"
