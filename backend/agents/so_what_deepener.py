"""
So-What Deepener Agent - Recursively deepens implications.

This agent takes findings and asks "so what?" three times to get
to the root business implications. Transforms:
- "Skewness is 69.41" → "Most participants are invisible failures"
- "75% have zero" → "This is a lottery where most tickets lose"
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any, List
from dataclasses import dataclass, asdict

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.state_manager import StateManager
from core.llm import call_gemini
from utils.logging import log_launch, log_ok, log_warn, log_info


@dataclass
class DeepImplication:
    """A deepened implication from a finding."""
    finding_title: str
    level_1_immediate: str  # What does this mean right now?
    level_2_business: str   # What does that mean for business?
    level_3_root: str       # What does that tell us about the market/system?
    stark_truth: str        # One memorable sentence
    stakeholder_impact: Dict[str, str]  # Who is affected and how


class SoWhatDeepener:
    """Deepen the 'so what' for each finding."""
    
    def __init__(self, state: StateManager):
        self.state = state
        self.name = "SoWhatDeepener"
    
    def run(self) -> Dict[str, Any]:
        """Generate deep implications for findings."""
        log_launch(f"Agent {self.name}")
        
        # Load inputs
        deep_insights = self.state.read("deep_insights") or {}
        hypotheses = self.state.read("hypotheses") or {}
        dot_connections = self.state.read("dot_connections") or {}
        
        insights = deep_insights.get("insights", [])
        connections = dot_connections.get("connections", [])
        red_flags = hypotheses.get("red_flags", [])
        
        if not insights:
            log_warn("No insights to deepen")
            return {"status": "skipped"}
        
        # Domain for context
        domain = deep_insights.get("domain_detected", "general")
        
        # Deepen top insights
        log_info("Deepening implications for top insights...")
        implications = []
        stark_truths = []
        
        for insight in insights[:5]:
            impl = self._deepen_finding(insight, domain, red_flags)
            if impl:
                implications.append(impl)
                if impl.stark_truth:
                    stark_truths.append(impl.stark_truth)
        
        # Deepen connections
        log_info("Deepening implications for connections...")
        for conn in connections[:2]:
            impl = self._deepen_connection(conn, domain)
            if impl:
                implications.append(impl)
                if impl.stark_truth:
                    stark_truths.append(impl.stark_truth)
        
        # Generate overall stark truth
        log_info("Synthesizing overall stark truth...")
        overall_stark_truth = self._generate_overall_stark_truth(
            implications, stark_truths, domain
        )
        
        result = {
            "status": "success",
            "implication_count": len(implications),
            "implications": [asdict(i) for i in implications],
            "stark_truths": stark_truths,
            "overall_stark_truth": overall_stark_truth,
        }
        
        self.state.write("deep_implications", result)
        
        log_ok(f"Deepened {len(implications)} findings into stark business truths")
        return result
    
    def _deepen_finding(
        self, 
        insight: Dict, 
        domain: str,
        red_flags: List[Dict]
    ) -> DeepImplication | None:
        """Deepen a single finding through 3 levels of 'so what'."""
        
        # Check if any red flags relate to this finding
        related_red_flags = [
            rf for rf in red_flags
            if insight.get("title", "").lower() in rf.get("finding_title", "").lower()
        ]
        
        red_flag_context = ""
        if related_red_flags:
            red_flag_context = f"\nRED FLAGS identified: {[rf.get('hypothesis', '') for rf in related_red_flags]}"
        
        prompt = f"""You are a senior business consultant distilling insights for executives.

DOMAIN: {domain}

FINDING:
Title: {insight.get('title', '')}
What: {insight.get('finding', '')}
Why it matters: {insight.get('why_it_matters', '')}
{red_flag_context}

Ask "SO WHAT?" three times to get to the deepest implication:

LEVEL 1 - IMMEDIATE: What does this mean RIGHT NOW for operations?
(What would someone see if they walked in tomorrow?)

LEVEL 2 - BUSINESS: So what does THAT mean for the business strategy?
(Revenue, competition, resources, priorities)

LEVEL 3 - ROOT CAUSE: What does this tell us about the UNDERLYING MARKET or SYSTEM?
(The fundamental dynamic or structural issue)

Then distill everything into a STARK TRUTH - one memorable sentence that a CEO would repeat in meetings.

Return JSON:
{{
  "level_1_immediate": "Direct operational implication...",
  "level_2_business": "Strategic business implication...",
  "level_3_root": "Fundamental market/system insight...",
  "stark_truth": "One punchy, memorable sentence. Example: '75% of your games are invisible - most developers are just burning money.'",
  "stakeholder_impact": {{
    "executives": "What this means for leadership decisions...",
    "operators": "What this means for day-to-day work...",
    "customers": "What this means for end users..."
  }}
}}

CRITICAL:
- The stark truth should be MEMORABLE. It should shock slightly.
- Use specific numbers when available
- Be DIRECT and CONFIDENT, not hedging
- Think about what a journalist would put in a headline
"""
        
        result = call_gemini(prompt, temperature=0.5, max_tokens=1500, parse_json=True)
        
        if isinstance(result, dict):
            return DeepImplication(
                finding_title=insight.get("title", "Untitled"),
                level_1_immediate=result.get("level_1_immediate", ""),
                level_2_business=result.get("level_2_business", ""),
                level_3_root=result.get("level_3_root", ""),
                stark_truth=result.get("stark_truth", ""),
                stakeholder_impact=result.get("stakeholder_impact", {}),
            )
        
        return None
    
    def _deepen_connection(self, connection: Dict, domain: str) -> DeepImplication | None:
        """Deepen a connection finding."""
        
        prompt = f"""You are a senior business consultant.

DOMAIN: {domain}

CONNECTION DISCOVERED:
Title: {connection.get('title', '')}
Theory: {connection.get('unified_theory', '')}
Connected Findings: {connection.get('connected_findings', [])}

Generate the 3 levels of "SO WHAT" and a stark truth (same JSON format).
Focus on what this CONNECTION means - the fact that these things are RELATED.
"""
        
        result = call_gemini(prompt, temperature=0.5, max_tokens=1200, parse_json=True)
        
        if isinstance(result, dict):
            return DeepImplication(
                finding_title=connection.get("title", "Connection"),
                level_1_immediate=result.get("level_1_immediate", ""),
                level_2_business=result.get("level_2_business", ""),
                level_3_root=result.get("level_3_root", ""),
                stark_truth=result.get("stark_truth", ""),
                stakeholder_impact=result.get("stakeholder_impact", {}),
            )
        
        return None
    
    def _generate_overall_stark_truth(
        self, 
        implications: List[DeepImplication],
        stark_truths: List[str],
        domain: str
    ) -> str:
        """Generate one overarching stark truth from all implications."""
        
        if not stark_truths:
            return "Further investigation required."
        
        prompt = f"""You have distilled these stark truths from data analysis:

{chr(10).join(f"- {st}" for st in stark_truths)}

DOMAIN: {domain}

Generate the ONE OVERARCHING STARK TRUTH that captures everything.

This should be:
- ONE sentence
- Memorable and quotable
- Specific enough to be actionable
- Bold enough to command attention

Examples of good stark truths:
- "Steam is a lottery where 99% of tickets lose"
- "Your recommendation engine is creating a self-fulfilling prophecy of invisibility"
- "80% of your inventory is dead weight masquerading as product"

Return ONLY the stark truth, no JSON, no explanation.
"""
        
        result = call_gemini(prompt, temperature=0.6, max_tokens=200, parse_json=False)
        
        if isinstance(result, str):
            return result.strip().strip('"')
        
        return stark_truths[0] if stark_truths else "Pattern detected requiring investigation."


def main():
    """Command-line entry point."""
    if len(sys.argv) < 2:
        print("Usage: python so_what_deepener.py <run_path>")
        sys.exit(1)
    
    run_path = sys.argv[1]
    state = StateManager(run_path)
    
    agent = SoWhatDeepener(state)
    try:
        result = agent.run()
        print(json.dumps(result, indent=2, default=str))
    except Exception as e:
        import traceback
        print(f"[ERROR] SoWhatDeepener agent failed: {e}")
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
