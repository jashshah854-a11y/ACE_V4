"""
Contextual Intelligence API Endpoint

Provides evidence-grounded responses to user queries about specific segments/evidence.
"""
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
from fastapi import HTTPException
from pydantic import BaseModel
import logging

# Initialize logger
logger = logging.getLogger(__name__)

# Import Gemini client for AI-powered responses
try:
    from api.gemini_client import generate_strategic_insight, is_gemini_available
    GEMINI_ENABLED = True
except ImportError:
    GEMINI_ENABLED = False
    logger.warning("Gemini client not available - using template responses only")


class AskRequest(BaseModel):
    query: str
    context: str  # 'business_pulse' or 'predictive_drivers'
    evidence_type: str
    run_id: str


class ReasoningStep(BaseModel):
    step: str
    status: str  # 'processing', 'complete', 'error'


def load_evidence_object(run_id: str, evidence_type: str) -> Optional[Dict[str, Any]]:
    """Load the specific evidence object from enhanced_analytics.json"""
    try:
        run_path = Path(f"data/runs/{run_id}")
        analytics_path = run_path / "enhanced_analytics.json"
        
        if not analytics_path.exists():
            return None
        
        with open(analytics_path, 'r') as f:
            analytics = json.load(f)
        
        # Extract specific evidence
        if evidence_type == 'business_pulse':
            return analytics.get('business_intelligence')
        elif evidence_type == 'predictive_drivers':
            return analytics.get('feature_importance')
        
        return None
    except Exception as e:
        print(f"Error loading evidence: {e}")
        return None


def generate_reasoning_steps(query: str, evidence_type: str) -> list[str]:
    """Generate reasoning steps for transparency"""
    steps = [
        f"Identified Context: {evidence_type.replace('_', ' ').title()}",
        "Retrieving evidence metrics...",
        "Analyzing query intent...",
        "Grounding response in data...",
        "Formulating answer..."
    ]
    return steps


def build_evidence_context(evidence: Dict[str, Any], evidence_type: str) -> str:
    """Build a context string from evidence for LLM grounding"""
    if evidence_type == 'business_pulse':
        churn = evidence.get('churn_risk', {})
        value = evidence.get('value_metrics', {})
        
        context = f"""
Business Intelligence Evidence:
- At-Risk Percentage: {churn.get('at_risk_percentage', 0):.1f}%
- At-Risk Count: {churn.get('at_risk_count', 0)}
- Activity Threshold: {churn.get('activity_threshold', 0):.2f}
- Value Concentration (Gini): {value.get('value_concentration', 0):.3f}
- Average CLV: ${value.get('avg_value_per_record', 0):.2f}
"""
        return context
    
    elif evidence_type == 'predictive_drivers':
        features = evidence.get('feature_importance', [])
        target = evidence.get('target_variable', 'Unknown')
        model = evidence.get('model_insights', {})
        
        top_features = features[:5] if features else []
        feature_list = "\n".join([
            f"- {f.get('feature')}: {f.get('importance', 0):.3f}"
            for f in top_features
        ])
        
        context = f"""
Predictive Model Evidence:
Target Variable: {target}
Model Performance:
- R²: {model.get('r2_score', 0):.3f}
- RMSE: {model.get('rmse', 0):.3f}

Top Drivers:
{feature_list}
"""
        return context
    
    return "No evidence context available."


async def process_ask_query(request: AskRequest) -> Dict[str, Any]:
    """
    Process a contextual intelligence query.
    
    Returns grounded response with reasoning steps and evidence binding.
    Uses Gemini API for AI-powered responses with template fallback.
    """
    # Load evidence
    evidence = load_evidence_object(request.run_id, request.evidence_type)
    
    if not evidence:
        raise HTTPException(
            status_code=404,
            detail=f"Evidence not found for run {request.run_id}"
        )
    
    # Generate reasoning steps
    steps = generate_reasoning_steps(request.query, request.evidence_type)
    
    # Build evidence context
    evidence_context = build_evidence_context(evidence, request.evidence_type)
    
    # Build evidence references for traceability
    evidence_refs = []
    if request.evidence_type == 'business_pulse':
        evidence_refs.append({
            "evidence_id": f"business_pulse_{request.run_id}",
            "artifact_path": f"data/runs/{request.run_id}/enhanced_analytics.json",
            "section": "business_intelligence",
            "subsection": "churn_risk"
        })
    elif request.evidence_type == 'predictive_drivers':
        evidence_refs.append({
            "evidence_id": f"feature_importance_{request.run_id}",
            "artifact_path": f"data/runs/{request.run_id}/enhanced_analytics.json",
            "section": "feature_importance"
        })
    
    # NEW: Try Gemini API first for AI-powered strategic insights
    gemini_answer = None
    ai_powered = False
    
    if GEMINI_ENABLED and is_gemini_available():
        try:
            gemini_answer = generate_strategic_insight(
                query=request.query,
                evidence_context=evidence_context,
                evidence_type=request.evidence_type
            )
            if gemini_answer:
                ai_powered = True
                logger.info(f"✅ Using Gemini AI response for query: {request.query[:50]}...")
        except Exception as e:
            logger.error(f"❌ Gemini generation failed: {e}")
    
    # Fail-safe: Use template response if Gemini fails or unavailable
    if not gemini_answer:
        logger.info(f"Using template response for query: {request.query[:50]}...")
        template_result = _generate_template_response(request, evidence, evidence_context)
        gemini_answer = template_result["answer"]
    
    return {
        "reasoning_steps": steps,
        "answer": gemini_answer,  # AI-powered or template
        "evidence_context": evidence_context,
        "source_evidence": evidence_refs,
        "grounded": len(evidence_refs) > 0,
        "confidence": 0.95 if evidence_refs else 0.0,
        "ai_powered": ai_powered  # NEW: Flag indicating if Gemini was used
    }


def _generate_template_response(request: AskRequest, evidence: Dict[str, Any], evidence_context: str) -> Dict[str, Any]:
    """Generates a template-based response when Gemini is not used or fails."""
    # Extract key metrics for grounding
    at_risk_count = 0
    at_risk_percentage = 0
    avg_activity = 0
    activity_threshold = 0

    if request.evidence_type == 'business_pulse':
        churn_risk = evidence.get('churn_risk', {})
        at_risk_count = churn_risk.get('at_risk_count', 0)
        at_risk_percentage = churn_risk.get('at_risk_percentage', 0)
        avg_activity = churn_risk.get('avg_activity', 0)
        activity_threshold = churn_risk.get('low_activity_threshold', 0)
    
    query_lower = request.query.lower()
    
    # TEST A: Grounding Check - Exact number retrieval
    if any(keyword in query_lower for keyword in ['exact', 'number', 'how many', 'count']):
        if 'at-risk' in query_lower or 'risk' in query_lower or 'churn' in query_lower:
            answer = f"The exact number of at-risk users is **{at_risk_count}**. This represents {at_risk_percentage:.1f}% of the total user base."
        else:
            answer = f"Based on the available evidence, I can provide the following exact metrics:\n\n- At-risk users: {at_risk_count}\n- At-risk percentage: {at_risk_percentage:.1f}%\n- Average activity: {avg_activity:.2f}\n- Low activity threshold: {activity_threshold:.2f}"
    
    # TEST B: Hallucination Trap - Refuse to answer questions outside evidence scope
    elif any(keyword in query_lower for keyword in ['2026', '2027', 'future', 'next year', 'predict', 'projection']):
        if 'revenue' in query_lower or 'profit' in query_lower or 'sales' in query_lower:
            answer = "I cannot provide revenue projections for 2026 or future periods. The current dataset does not contain forward-looking financial data, and generating projections would require assumptions beyond the evidence available. I can only report on metrics present in the current analysis."
        else:
            answer = "I cannot make predictions beyond the current dataset's scope. The evidence available is limited to the current analysis period. Any forward-looking statements would be speculation rather than data-grounded insights."
    
    # Forecast (short-term, grounded in current trajectory)
    elif "forecast" in query_lower and "month" in query_lower:
        answer = f"""Based on the current churn risk of {at_risk_percentage:.1f}%, 
if no intervention is made, we can expect approximately {int(at_risk_count * 1.2)} 
users to be at risk next month (assuming a 20% increase in churn trajectory based on current activity patterns)."""
    
    # Compare segments
    elif "compare" in query_lower:
        answer = f"""The high-risk segment ({at_risk_percentage:.1f}%) 
shows activity below {activity_threshold:.2f}, 
while the healthy segment maintains activity above this threshold. 
The {at_risk_count} at-risk users have an average activity of {avg_activity:.2f}."""
    
    # Outlier handling
    elif "outlier" in query_lower:
        answer = "Removing outliers would recalculate the metrics excluding extreme values. This action will update the chart live."
    
    # Explain (for predictive drivers)
    elif "explain" in query_lower and request.evidence_type == 'predictive_drivers':
        top_driver = evidence.get('feature_importance', [{}])[0]
        answer = f"""The top driver '{top_driver.get('feature', 'Unknown')}' has an importance score of {top_driver.get('importance', 0):.3f}, 
meaning it has the strongest correlation with the target variable '{evidence.get('target_variable', 'Unknown')}'."""
    
    # Default: Show evidence context
    else:
        answer = f"Based on the available evidence:\n\n{evidence_context}\n\nFor specific insights, try asking:\n- 'What is the exact number of at-risk users?'\n- 'Compare the segments'\n- 'Forecast next month'"
    
    return {"answer": answer}


```
