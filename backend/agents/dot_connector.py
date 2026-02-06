"""
Dot Connector Agent - Links separate findings into unified patterns.

This agent takes individual insights and finds connections between them.
It answers questions like:
- "Do multiple findings involve the same entity?"
- "Could one finding explain another?"
- "Is there a unifying theory?"

Example: Links "Publisher Hede" + "$199.99 pricing" + "0 reviews" 
         → "Asset flipping operation hypothesis"
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
class Connection:
    """A connection between multiple findings."""
    title: str
    connected_findings: List[str]  # titles of linked findings
    connection_type: str  # same_entity, causal, correlated, pattern
    unified_theory: str  # the big picture explanation
    confidence: str  # low, medium, high
    evidence: List[str]


class DotConnector:
    """Connect separate findings into unified patterns."""
    
    def __init__(self, state: StateManager):
        self.state = state
        self.name = "DotConnector"
    
    def run(self) -> Dict[str, Any]:
        """Find connections between insights."""
        log_launch(f"Agent {self.name}")
        
        # Load deep insights
        deep_insights = self.state.read("deep_insights") or {}
        insights = deep_insights.get("insights", [])
        
        if not insights:
            log_warn("No insights found to connect")
            return {"status": "skipped", "reason": "No insights available"}
        
        # Load raw samples for additional context
        raw_samples = self.state.read("raw_samples") or {}
        
        # Build context for connection finding
        log_info("Building insight context...")
        context = self._build_context(insights, raw_samples)
        
        # Step 1: Find entity overlaps
        log_info("Detecting entity overlaps...")
        entity_overlaps = self._find_entity_overlaps(insights, raw_samples)
        
        # Step 2: Generate connection hypotheses via LLM
        log_info("Generating connection hypotheses...")
        connections = self._generate_connections(insights, context, entity_overlaps)
        
        # Step 3: Identify the "big picture"
        log_info("Synthesizing unified narrative...")
        big_picture = self._synthesize_big_picture(insights, connections)
        
        result = {
            "status": "success",
            "connection_count": len(connections),
            "entity_overlaps": entity_overlaps,
            "connections": [asdict(c) for c in connections],
            "big_picture": big_picture,
        }
        
        # Save to state
        self.state.write("dot_connections", result)
        
        log_ok(f"Found {len(connections)} connections between findings")
        return result
    
    def _build_context(self, insights: List[Dict], raw_samples: Dict) -> str:
        """Build context string for LLM."""
        parts = []
        
        # Summarize insights
        parts.append("## Current Findings\n")
        for i, insight in enumerate(insights, 1):
            parts.append(f"""
### Finding {i}: {insight.get('title', 'Untitled')}
- **What:** {insight.get('finding', '')}
- **Why it matters:** {insight.get('why_it_matters', '')}
- **Category:** {insight.get('category', 'unknown')}
- **Evidence:** {', '.join(insight.get('evidence', []))}
""")
        
        # Add raw sample highlights if available
        if raw_samples.get("samples"):
            samples = raw_samples["samples"]
            
            # Highlight interesting patterns
            if samples.get("interesting_patterns"):
                parts.append("\n## Interesting Data Patterns\n")
                for pattern in samples["interesting_patterns"][:3]:
                    parts.append(f"- {pattern.get('type')}: entities {pattern.get('entities', [])}")
            
            # Highlight zero patterns
            if samples.get("zero_patterns"):
                parts.append("\n## Zero/Null Patterns\n")
                for col, data in list(samples["zero_patterns"].items())[:3]:
                    if data.get("insight"):
                        parts.append(f"- {data['insight']}")
        
        return "\n".join(parts)
    
    def _find_entity_overlaps(self, insights: List[Dict], raw_samples: Dict) -> List[Dict]:
        """Find when the same entity appears across multiple findings."""
        overlaps = []
        
        # Extract all mentioned entities from findings
        entity_mentions = {}
        
        for insight in insights:
            title = insight.get("title", "")
            finding = insight.get("finding", "")
            text = f"{title} {finding}".lower()
            
            # Look for quoted entities or capitalized words
            # This is a simple heuristic - LLM will do better
            for word in text.split():
                # Skip common words
                if len(word) < 4 or word in ["the", "and", "this", "that", "with", "from"]:
                    continue
                if word[0].isupper() or "'" in text:  # Likely entity
                    if word not in entity_mentions:
                        entity_mentions[word] = []
                    entity_mentions[word].append(title)
        
        # Find entities mentioned in multiple findings
        for entity, findings in entity_mentions.items():
            if len(set(findings)) > 1:  # Appears in multiple findings
                overlaps.append({
                    "entity": entity,
                    "finding_count": len(set(findings)),
                    "findings": list(set(findings)),
                })
        
        # Add overlaps from raw samples if available
        samples = raw_samples.get("samples", {})
        if samples.get("interesting_patterns"):
            for pattern in samples["interesting_patterns"]:
                if pattern.get("entities"):
                    for entity in pattern["entities"][:3]:
                        overlaps.append({
                            "entity": str(entity),
                            "source": "raw_data",
                            "pattern_type": pattern.get("type", "unknown"),
                        })
        
        return overlaps[:10]  # Limit to top 10
    
    def _generate_connections(
        self, 
        insights: List[Dict], 
        context: str, 
        entity_overlaps: List[Dict]
    ) -> List[Connection]:
        """Use LLM to generate connection hypotheses."""
        
        prompt = f"""You are an investigative analyst connecting dots between separate findings.

{context}

## Entity Overlaps Detected
{json.dumps(entity_overlaps, indent=2)}

## Your Task

Find CONNECTIONS between the separate findings above. Look for:

1. **SAME ENTITY** - Do multiple findings involve the same publisher, product, category, etc.?
2. **CAUSAL** - Could one finding EXPLAIN or CAUSE another?
3. **CORRELATED** - Do findings move together or show similar patterns?
4. **UNIFIED PATTERN** - Is there a single underlying phenomenon explaining multiple findings?

For each connection you find, generate a UNIFIED THEORY - a bold hypothesis that explains how the findings are related.

Return as JSON array:
[
  {{
    "title": "Short title for this connection (e.g., 'Asset Flipping Operation')",
    "connected_findings": ["Finding 1 title", "Finding 2 title"],
    "connection_type": "same_entity | causal | correlated | pattern",
    "unified_theory": "Bold explanation of what connects these findings. Be specific and speculative. Example: 'Publisher Hede appears to be running an asset flipping operation - high volume of games, extreme pricing, zero engagement suggests...'",
    "confidence": "low | medium | high",
    "evidence": ["specific data points that support this connection"]
  }}
]

CRITICAL RULES:
- Be BOLD and SPECULATIVE - connect dots even if the connection isn't certain
- Name specific entities when you see patterns
- Generate unified theories, not just observations
- If three findings all point to the same issue, SAY what that issue is
- Don't just restate the findings - SYNTHESIZE them
- Return 2-5 connections, ranked by importance
"""
        
        result = call_gemini(prompt, temperature=0.6, max_tokens=3000, parse_json=True)
        
        connections = []
        if isinstance(result, list):
            for conn in result[:5]:
                try:
                    connections.append(Connection(
                        title=conn.get("title", "Unnamed Connection"),
                        connected_findings=conn.get("connected_findings", []),
                        connection_type=conn.get("connection_type", "pattern"),
                        unified_theory=conn.get("unified_theory", ""),
                        confidence=conn.get("confidence", "medium"),
                        evidence=conn.get("evidence", []),
                    ))
                except Exception as e:
                    log_warn(f"Could not parse connection: {e}")
        
        return connections
    
    def _synthesize_big_picture(self, insights: List[Dict], connections: List[Connection]) -> Dict[str, Any]:
        """Generate the unified big picture from all connections."""
        
        if not connections:
            return {"headline": "No major connections found", "narrative": ""}
        
        # Prepare connection summaries
        connection_summaries = "\n".join([
            f"- {c.title}: {c.unified_theory}" for c in connections
        ])
        
        prompt = f"""You found these connections between data findings:

{connection_summaries}

Now synthesize the BIG PICTURE. What is the ONE overarching story or pattern that explains all of these connections?

Return JSON:
{{
  "headline": "One sentence that captures the entire pattern (e.g., 'This marketplace is a winner-take-all system where 99% of participants are invisible')",
  "narrative": "2-3 paragraphs explaining the big picture story. What's really going on here? What would a CEO or executive need to understand?",
  "key_entities": ["List of specific entities (companies, products, etc.) that are central to this pattern"],
  "risk_level": "low | medium | high | critical",
  "implication": "What does this mean for decision-making?"
}}

Be BOLD. This is the "aha moment" that connects everything.
"""
        
        result = call_gemini(prompt, temperature=0.5, max_tokens=1500, parse_json=True)
        
        if isinstance(result, dict):
            return result
        
        return {
            "headline": "Multiple patterns detected requiring investigation",
            "narrative": connection_summaries,
        }


def main():
    """Command-line entry point."""
    if len(sys.argv) < 2:
        print("Usage: python dot_connector.py <run_path>")
        sys.exit(1)
    
    run_path = sys.argv[1]
    state = StateManager(run_path)
    
    agent = DotConnector(state)
    try:
        result = agent.run()
        print(json.dumps(result, indent=2, default=str))
    except Exception as e:
        import traceback
        print(f"[ERROR] DotConnector agent failed: {e}")
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
