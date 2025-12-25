# core/pipeline_map.py

PIPELINE_SEQUENCE = [
    "type_identifier",
    "scanner",
    "interpreter",
    "validator",
    "overseer",
    "regression",
    "sentry",
    "personas",
    "fabricator",
    "expositor",
]

# Optional descriptions for clarity if you want UI to show it
PIPELINE_DESCRIPTIONS = {
    "type_identifier": "Identify dataset domain/type from schema and content",
    "scanner": "Profile dataset",
    "interpreter": "Create schema map",
    "validator": "Validate data sufficiency and guardrails",
    "overseer": "Clustering and segmentation",
    "regression": "Model numeric outcomes",
    "sentry": "Anomaly detection",
    "personas": "Persona generation",
    "fabricator": "Strategy generation",
    "expositor": "Final report assembly",
}

# Map backend steps to user-facing stages
STEP_TO_STAGE_MAP = {
    "ingestion": {"stage": "ingestion", "display": "Data Ingestion", "weight": 1},
    "type_identifier": {"stage": "ingestion", "display": "Data Ingestion", "weight": 1},
    "scanner": {"stage": "scanner", "display": "Schema Analysis", "weight": 1},
    "interpreter": {"stage": "scanner", "display": "Schema Analysis", "weight": 1},
    "validator": {"stage": "validator", "display": "Data Validation", "weight": 1},
    "overseer": {"stage": "clustering", "display": "Behavioral Clustering", "weight": 1},
    "regression": {"stage": "regression", "display": "Predictive Modeling", "weight": 1},
    "sentry": {"stage": "anomaly", "display": "Anomaly Detection", "weight": 1},
    "personas": {"stage": "personas", "display": "Persona Generation", "weight": 1},
    "fabricator": {"stage": "report", "display": "Strategy Generation", "weight": 1},
    "expositor": {"stage": "report", "display": "Report Generation", "weight": 1},
}

# Total steps including pre-pipeline ingestion
TOTAL_PIPELINE_STEPS = 11  # ingestion + 10 pipeline steps


def calculate_progress(current_step: str, steps_completed: list) -> dict:
    """Calculate accurate progress percentage and stage information.

    Args:
        current_step: The current pipeline step being executed
        steps_completed: List of completed step names

    Returns:
        Dictionary with progress, current_stage, stage_progress, completed_steps, total_steps
    """
    completed_count = len(steps_completed)
    total_steps = TOTAL_PIPELINE_STEPS

    # Calculate overall progress (0-100)
    progress = int((completed_count / total_steps) * 100)

    # Get current stage info
    stage_info = STEP_TO_STAGE_MAP.get(current_step, {})
    current_stage = stage_info.get("display", current_step)

    # Calculate stage progress (percentage within current stage group)
    stage_key = stage_info.get("stage", current_step)
    stage_steps = [k for k, v in STEP_TO_STAGE_MAP.items() if v.get("stage") == stage_key]
    stage_completed = [s for s in steps_completed if s in stage_steps]
    stage_progress = int((len(stage_completed) / len(stage_steps)) * 100) if stage_steps else 0

    return {
        "progress": progress,
        "current_stage": current_stage,
        "stage_progress": stage_progress,
        "completed_steps": completed_count,
        "total_steps": total_steps
    }

