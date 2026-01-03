"""
Gemini API Client for ACE V4 Contextual Intelligence

Provides strategic insight generation using Google's Gemini API.
Includes fail-safe fallback if API is unavailable.
"""

import os
import logging
from typing import Dict, Any, Optional
import google.generativeai as genai

logger = logging.getLogger("ace.gemini")

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    logger.info("✅ Gemini API configured successfully")
else:
    logger.warning("⚠️ GEMINI_API_KEY not found - Gemini features disabled")

# System prompt for ACE
SYSTEM_PROMPT = """You are ACE (Autonomous Cognitive Engine), a Decision-Grade Intelligence Engine.

Your role is to provide strategic insights based on hard evidence from data analysis.

CRITICAL RULES:
1. ONLY use numbers and facts from the provided evidence
2. Do NOT make up statistics or projections
3. If evidence is insufficient, explicitly state limitations
4. Keep responses brief, high-impact, consultant-grade (2-3 paragraphs max)
5. Use markdown formatting for clarity
6. Cite specific metrics when making claims

Tone: Elite consultant - precise, actionable, no fluff.

EVIDENCE GROUNDING:
- Every claim must reference a specific metric from the evidence
- If asked about something not in the evidence, say "The current analysis does not include [X]"
- Never speculate or extrapolate beyond what the data shows"""


def generate_strategic_insight(
    query: str,
    evidence_context: str,
    evidence_type: str = "business_pulse"
) -> Optional[str]:
    """
    Generate strategic insight using Gemini API.
    
    Args:
        query: User's question
        evidence_context: Structured evidence from ACE analysis
        evidence_type: Type of evidence (business_pulse, predictive_drivers, etc.)
    
    Returns:
        AI-generated insight or None if API fails
    """
    if not GEMINI_API_KEY:
        logger.warning("Gemini API key not configured - falling back to templates")
        return None
    
    try:
        # Use Gemini 1.5 Flash for speed (1-2 second response time)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Construct prompt
        prompt = f"""{SYSTEM_PROMPT}

EVIDENCE TYPE: {evidence_type}

HARD EVIDENCE:
{evidence_context}

USER QUESTION:
{query}

Provide a strategic answer based ONLY on the evidence above. If the question cannot be answered with the available evidence, state this clearly and explain what data would be needed."""
        
        # Generate response with safety settings
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.3,  # Low temperature for factual responses
                max_output_tokens=500,  # Keep responses concise
            )
        )
        
        if response and response.text:
            logger.info(f"✅ Gemini response generated for query: {query[:50]}...")
            return response.text
        else:
            logger.warning("⚠️ Gemini returned empty response")
            return None
            
    except Exception as e:
        logger.error(f"❌ Gemini API error: {e}")
        return None


def is_gemini_available() -> bool:
    """Check if Gemini API is configured and available."""
    return GEMINI_API_KEY is not None
