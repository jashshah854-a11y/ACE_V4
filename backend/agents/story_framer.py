"""
Story Framer Agent - Transforms findings into narrative arc.

This agent takes all the analysis outputs and creates a coherent story
with beginning, middle, and end. Turns lists into narratives.

The output is structured as:
- ACT 1 (Setup): What kind of market/system is this?
- ACT 2 (Discovery): What did we find that's surprising?
- ACT 3 (Implications): What should stakeholders do?
- HEADLINE: One sentence that captures everything
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
class Narrative:
    """A structured narrative from analysis."""
    headline: str
    act1_setup: str      # The context/scene setting
    act2_discovery: str  # The aha moments
    act3_implications: str  # The so-what action items
    key_characters: List[str]  # Entities central to the story
    story_type: str  # warning, opportunity, investigation, crisis
    emotional_tone: str  # urgent, cautionary, optimistic, investigative


class StoryFramer:
    """Frame findings as a coherent narrative."""
    
    def __init__(self, state: StateManager):
        self.state = state
        self.name = "StoryFramer"
    
    def run(self) -> Dict[str, Any]:
        """Generate narrative from all analysis."""
        log_launch(f"Agent {self.name}")
        
        # Gather all inputs
        deep_insights = self.state.read("deep_insights") or {}
        dot_connections = self.state.read("dot_connections") or {}
        hypotheses = self.state.read("hypotheses") or {}
        implications = self.state.read("deep_implications") or {}
        raw_samples = self.state.read("raw_samples") or {}
        
        # Check if we have enough to create a story
        if not deep_insights.get("insights"):
            log_warn("No insights available for storytelling")
            return {"status": "skipped"}
        
        domain = deep_insights.get("domain_detected", "general")
        
        # Build comprehensive context
        log_info("Building story context from all analyses...")
        context = self._build_story_context(
            deep_insights, dot_connections, hypotheses, implications, raw_samples
        )
        
        # Generate the narrative
        log_info("Generating 3-act narrative...")
        narrative = self._generate_narrative(context, domain)
        
        # Generate alternative framings
        log_info("Generating headline variations...")
        alt_headlines = self._generate_alternative_headlines(context, narrative)
        
        result = {
            "status": "success",
            "narrative": asdict(narrative) if narrative else None,
            "headline": narrative.headline if narrative else None,
            "alternative_headlines": alt_headlines,
            "story_type": narrative.story_type if narrative else "investigation",
        }
        
        self.state.write("story_narrative", result)
        
        log_ok(f"Generated narrative: '{narrative.headline[:60]}...'" if narrative else "No narrative")
        return result
    
    def _build_story_context(
        self,
        deep_insights: Dict,
        dot_connections: Dict,
        hypotheses: Dict,
        implications: Dict,
        raw_samples: Dict
    ) -> str:
        """Build comprehensive context for story generation."""
        parts = []
        
        # Dataset basics
        insights = deep_insights.get("insights", [])
        parts.append(f"## Analysis Summary")
        parts.append(f"- Domain: {deep_insights.get('domain_detected', 'unknown')}")
        parts.append(f"- Insights found: {len(insights)}")
        
        # Top insights
        parts.append("\n## Key Findings")
        for i, insight in enumerate(insights[:5], 1):
            parts.append(f"{i}. **{insight.get('title')}**: {insight.get('finding', '')[:200]}")
        
        # Connections (the dots we connected)
        connections = dot_connections.get("connections", [])
        if connections:
            parts.append("\n## Connections Discovered")
            for conn in connections[:3]:
                parts.append(f"- **{conn.get('title')}**: {conn.get('unified_theory', '')[:200]}")
        
        # Big picture from dot connector
        big_picture = dot_connections.get("big_picture", {})
        if big_picture.get("headline"):
            parts.append(f"\n## Big Picture")
            parts.append(f"**Headline**: {big_picture.get('headline')}")
            parts.append(f"**Narrative**: {big_picture.get('narrative', '')[:300]}")
        
        # Red flags from hypotheses
        red_flags = hypotheses.get("red_flags", [])
        if red_flags:
            parts.append("\n## Red Flags Identified")
            for rf in red_flags[:3]:
                parts.append(f"- {rf.get('hypothesis', '')[:150]}")
        
        # Stark truths from implications
        stark_truths = implications.get("stark_truths", [])
        if stark_truths:
            parts.append("\n## Stark Truths")
            for st in stark_truths[:5]:
                parts.append(f"- {st}")
        
        overall_stark = implications.get("overall_stark_truth")
        if overall_stark:
            parts.append(f"\n**OVERALL**: {overall_stark}")
        
        # Raw data highlights
        samples = raw_samples.get("samples", {})
        if samples.get("zero_patterns"):
            parts.append("\n## Data Patterns")
            for col, data in list(samples["zero_patterns"].items())[:2]:
                if data.get("insight"):
                    parts.append(f"- {data['insight']}")
        
        return "\n".join(parts)
    
    def _generate_narrative(self, context: str, domain: str) -> Narrative | None:
        """Generate the 3-act narrative structure."""
        
        prompt = f"""You are a master storyteller translating data analysis into a compelling narrative.

DOMAIN: {domain}

ANALYSIS CONTEXT:
{context}

Create a compelling 3-ACT NARRATIVE:

**ACT 1 - THE SETUP** (2-3 sentences)
Set the scene. What kind of market, system, or situation are we looking at?
Make the reader understand the context before revealing discoveries.

**ACT 2 - THE DISCOVERY** (3-4 sentences)
The "aha moment". What did we find that's surprising, concerning, or important?
Connect the dots. Show how individual findings add up to something bigger.
This is the meat of the story.

**ACT 3 - THE IMPLICATIONS** (2-3 sentences)
The "so what". What should stakeholders DO with this knowledge?
What decisions should change? What risks need mitigation?

**HEADLINE**: One sentence that captures the ENTIRE story.
Think newspaper headline. Memorable. Quotable. Specific.

Return JSON:
{{
  "headline": "The one sentence that captures everything (e.g., 'Steam is a lottery where 99% of developers are invisible')",
  "act1_setup": "The scene-setting narrative...",
  "act2_discovery": "The discovery narrative with aha moments...",
  "act3_implications": "The action-oriented implications...",
  "key_characters": ["Entity 1", "Entity 2"],
  "story_type": "warning | opportunity | investigation | crisis",
  "emotional_tone": "urgent | cautionary | optimistic | investigative"
}}

CRITICAL RULES:
- Use SPECIFIC names and numbers from the data
- The headline must be MEMORABLE - someone should repeat it
- Don't just summarize - INTERPRET
- Create dramatic tension between setup and discovery
- End with clear calls to action
"""
        
        result = call_gemini(prompt, temperature=0.6, max_tokens=2000, parse_json=True)
        
        if isinstance(result, dict):
            return Narrative(
                headline=result.get("headline", "Analysis Complete"),
                act1_setup=result.get("act1_setup", ""),
                act2_discovery=result.get("act2_discovery", ""),
                act3_implications=result.get("act3_implications", ""),
                key_characters=result.get("key_characters", []),
                story_type=result.get("story_type", "investigation"),
                emotional_tone=result.get("emotional_tone", "investigative"),
            )
        
        return None
    
    def _generate_alternative_headlines(self, context: str, narrative: Narrative | None) -> List[str]:
        """Generate alternative headline options."""
        
        if not narrative:
            return []
        
        prompt = f"""Given this headline:
"{narrative.headline}"

And this story type: {narrative.story_type}

Generate 3 ALTERNATIVE headlines that capture the same insight differently:
1. A more SENSATIONAL headline (attention-grabbing)
2. A more CONSERVATIVE headline (business-appropriate)
3. A more SPECIFIC headline (names entities/numbers)

Return JSON array of strings: ["headline 1", "headline 2", "headline 3"]
"""
        
        result = call_gemini(prompt, temperature=0.7, max_tokens=500, parse_json=True)
        
        if isinstance(result, list):
            return result[:3]
        
        return []


def main():
    """Command-line entry point."""
    if len(sys.argv) < 2:
        print("Usage: python story_framer.py <run_path>")
        sys.exit(1)
    
    run_path = sys.argv[1]
    state = StateManager(run_path)
    
    agent = StoryFramer(state)
    try:
        result = agent.run()
        print(json.dumps(result, indent=2, default=str))
    except Exception as e:
        import traceback
        print(f"[ERROR] StoryFramer agent failed: {e}")
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
