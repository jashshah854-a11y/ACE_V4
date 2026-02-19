"""
Hypothesis Engine Agent - Generates bold, speculative theories.

This agent transforms observations into hypotheses. It asks:
- What's the CHARITABLE explanation?
- What's the SUSPICIOUS explanation?
- What's the WILD explanation we might be missing?

Uses high temperature (0.8) to encourage bold speculation.
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any, List
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.state_manager import StateManager
from core.llm import call_gemini
from utils.logging import log_launch, log_ok, log_warn, log_info


@dataclass
class Hypothesis:
    """A speculative hypothesis about a finding."""
    finding_title: str
    hypothesis_type: str  # charitable, suspicious, wild
    hypothesis: str
    expected_evidence: List[str]  # what we'd expect to see if true
    disproving_evidence: List[str]  # what would disprove it
    confidence: int  # 1-10
    is_red_flag: bool


class HypothesisEngine:
    """Generate bold, speculative hypotheses from observations."""
    
    def __init__(self, state: StateManager):
        self.state = state
        self.name = "HypothesisEngine"
    
    def run(self) -> Dict[str, Any]:
        """Generate hypotheses for all major findings."""
        log_launch(f"Agent {self.name}")
        
        # Load insights and connections
        deep_insights = self.state.read("deep_insights") or {}
        dot_connections = self.state.read("dot_connections") or {}
        raw_samples = self.state.read("raw_samples") or {}
        
        insights = deep_insights.get("insights", [])
        connections = dot_connections.get("connections", [])
        
        if not insights and not connections:
            log_warn("No insights or connections found")
            return {"status": "skipped", "reason": "No data available"}
        
        # Build context
        context = self._build_context(insights, connections, raw_samples)
        
        # Generate hypotheses for findings and connections in parallel (all independent)
        log_info("Generating hypotheses (parallel)...")
        all_hypotheses = []
        red_flags = []

        with ThreadPoolExecutor(max_workers=9) as pool:
            insight_futures = [
                pool.submit(self._generate_hypotheses_for_finding, ins, context)
                for ins in insights[:6]
            ]
            conn_futures = [
                pool.submit(self._generate_hypotheses_for_connection, conn, context)
                for conn in connections[:3]
            ]
            for f in insight_futures:
                hyps = f.result()
                all_hypotheses.extend(hyps)
                for h in hyps:
                    if h.is_red_flag:
                        red_flags.append(h)
            for f in conn_futures:
                hyps = f.result()
                all_hypotheses.extend(hyps)
                for h in hyps:
                    if h.is_red_flag:
                        red_flags.append(h)
        
        # Rank hypotheses by boldness and confidence
        ranked = self._rank_hypotheses(all_hypotheses)
        
        result = {
            "status": "success",
            "hypothesis_count": len(all_hypotheses),
            "red_flag_count": len(red_flags),
            "hypotheses": [asdict(h) for h in ranked],
            "red_flags": [asdict(h) for h in red_flags],
            "boldest_hypothesis": asdict(ranked[0]) if ranked else None,
        }
        
        self.state.write("hypotheses", result)
        
        log_ok(f"Generated {len(all_hypotheses)} hypotheses, {len(red_flags)} red flags")
        return result
    
    def _build_context(
        self, 
        insights: List[Dict], 
        connections: List[Dict],
        raw_samples: Dict
    ) -> str:
        """Build context for hypothesis generation."""
        parts = []
        
        # Domain
        domain = (self.state.read("deep_insights") or {}).get("domain_detected", "general")
        parts.append(f"## Domain: {domain}\n")
        
        # Add raw sample context
        samples = raw_samples.get("samples", {})
        if samples.get("zero_patterns"):
            parts.append("## Zero/Null Pattern Insights")
            for col, data in list(samples["zero_patterns"].items())[:3]:
                if data.get("insight"):
                    parts.append(f"- {data['insight']}")
        
        if samples.get("interesting_patterns"):
            parts.append("\n## High-Volume Entity Patterns")
            for pattern in samples["interesting_patterns"][:2]:
                parts.append(f"- {pattern.get('entities', [])}")
        
        return "\n".join(parts)
    
    def _generate_hypotheses_for_finding(
        self, 
        insight: Dict, 
        context: str
    ) -> List[Hypothesis]:
        """Generate 3 hypotheses for a single finding."""
        
        prompt = f"""You are a SKEPTICAL investigator analyzing data.

FINDING:
Title: {insight.get('title', '')}
What: {insight.get('finding', '')}
Category: {insight.get('category', '')}

CONTEXT:
{context}

Generate exactly 3 BOLD hypotheses to explain this finding:

1. **CHARITABLE** - Assuming good faith and normal behavior
2. **SUSPICIOUS** - Assuming something is wrong (fraud, errors, manipulation)
3. **WILD** - What explanation would we consider if we're missing something obvious?

For EACH hypothesis:
- State the hypothesis clearly
- What evidence would we EXPECT to see if true?
- What would DISPROVE this hypothesis?
- Confidence (1-10): how likely is this explanation?
- Is this a RED FLAG that suggests problems?

Return JSON:
[
  {{
    "type": "charitable",
    "hypothesis": "Clear statement of what might explain this...",
    "expected_evidence": ["What we'd see if true..."],
    "disproving_evidence": ["What would prove this wrong..."],
    "confidence": 7,
    "is_red_flag": false
  }},
  {{
    "type": "suspicious",
    "hypothesis": "Clear statement of suspicious interpretation...",
    "expected_evidence": ["..."],
    "disproving_evidence": ["..."],
    "confidence": 5,
    "is_red_flag": true
  }},
  {{
    "type": "wild",
    "hypothesis": "Unexpected explanation...",
    "expected_evidence": ["..."],
    "disproving_evidence": ["..."],
    "confidence": 3,
    "is_red_flag": false
  }}
]

BE BOLD. Speculate. Name specific entities if the data suggests patterns.
The goal is to generate hypotheses worth investigating, not to be safe.
"""
        
        # High temperature for bold speculation
        result = call_gemini(prompt, temperature=0.8, max_tokens=2000, parse_json=True)
        
        hypotheses = []
        if isinstance(result, list):
            for h in result:
                try:
                    hypotheses.append(Hypothesis(
                        finding_title=insight.get("title", "Untitled"),
                        hypothesis_type=h.get("type", "unknown"),
                        hypothesis=h.get("hypothesis", ""),
                        expected_evidence=h.get("expected_evidence", []),
                        disproving_evidence=h.get("disproving_evidence", []),
                        confidence=h.get("confidence", 5),
                        is_red_flag=h.get("is_red_flag", False),
                    ))
                except Exception as e:
                    log_warn(f"Could not parse hypothesis: {e}")
        
        return hypotheses
    
    def _generate_hypotheses_for_connection(
        self, 
        connection: Dict, 
        context: str
    ) -> List[Hypothesis]:
        """Generate hypotheses for a connection between findings."""
        
        prompt = f"""You are an investigative analyst.

CONNECTION FOUND:
Title: {connection.get('title', '')}
Theory: {connection.get('unified_theory', '')}
Connected Findings: {connection.get('connected_findings', [])}

Generate 2 hypotheses about this connection:

1. **LEGITIMATE** - A benign explanation for this pattern
2. **PROBLEMATIC** - A concerning explanation (fraud, gaming the system, errors)

For each, state:
- The hypothesis
- What evidence would confirm it
- What would disprove it
- Confidence (1-10)
- Is this a red flag?

Return JSON array (same format as before).
"""
        
        result = call_gemini(prompt, temperature=0.7, max_tokens=1500, parse_json=True)
        
        hypotheses = []
        if isinstance(result, list):
            for h in result:
                try:
                    hypotheses.append(Hypothesis(
                        finding_title=connection.get("title", "Connection"),
                        hypothesis_type=h.get("type", "unknown"),
                        hypothesis=h.get("hypothesis", ""),
                        expected_evidence=h.get("expected_evidence", []),
                        disproving_evidence=h.get("disproving_evidence", []),
                        confidence=h.get("confidence", 5),
                        is_red_flag=h.get("is_red_flag", False),
                    ))
                except Exception:
                    pass
        
        return hypotheses
    
    def _rank_hypotheses(self, hypotheses: List[Hypothesis]) -> List[Hypothesis]:
        """Rank hypotheses by importance and boldness."""
        
        def score(h: Hypothesis) -> float:
            # Red flags get priority
            red_flag_bonus = 20 if h.is_red_flag else 0
            
            # Suspicious hypotheses get attention
            type_bonus = {
                "suspicious": 10,
                "wild": 5,
                "charitable": 0,
                "problematic": 10,
                "legitimate": 0,
            }.get(h.hypothesis_type, 0)
            
            # Weight by confidence
            return h.confidence + type_bonus + red_flag_bonus
        
        return sorted(hypotheses, key=score, reverse=True)


def main():
    """Command-line entry point."""
    if len(sys.argv) < 2:
        print("Usage: python hypothesis_engine.py <run_path>")
        sys.exit(1)
    
    run_path = sys.argv[1]
    state = StateManager(run_path)
    
    agent = HypothesisEngine(state)
    try:
        result = agent.run()
        print(json.dumps(result, indent=2, default=str))
    except Exception as e:
        import traceback
        print(f"[ERROR] HypothesisEngine agent failed: {e}")
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
