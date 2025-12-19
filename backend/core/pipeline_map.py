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

