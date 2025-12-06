# core/pipeline_map.py

PIPELINE_SEQUENCE = [
    "scanner",
    "interpreter",
    "overseer",
    "sentry",
    "personas",
    "fabricator",
    "expositor"
]

# Optional descriptions for clarity if you want UI to show it
PIPELINE_DESCRIPTIONS = {
    "scanner": "Profile dataset",
    "interpreter": "Create schema map",
    "overseer": "Clustering and segmentation",
    "sentry": "Anomaly detection",
    "personas": "Persona generation",
    "fabricator": "Strategy generation",
    "expositor": "Final report assembly"
}
