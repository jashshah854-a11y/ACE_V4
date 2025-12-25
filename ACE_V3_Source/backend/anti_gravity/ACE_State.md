# ACE State

This document represents the central shared memory for the **ACE V2 Orchestrator** project.
All agents read and write to this state.

## Schema

The state is a JSON object with the following keys:

### 1. Clusters (Written by Overseer)

```json
{
  "k": 6,
  "centers": [[income, spend, ...], ...]
}
```

### 2. Anomalies (Written by Sentry)

```json
{
  "feature": "income",
  "count": 5
}
```

### 3. Persona (Written by Persona Engine)

```json
{
  "personas": [
    {
      "cluster_id": 0,
      "label": "affluent surplus",
      "action": "invest_surplus",
      "state": {"valence": 1, "arousal": 1},
      "center": [100000, 10]
    },
    ...
  ],
  "narrative": "Gemini generated text..."
}
```

### 4. Strategy (Written by Fabricator)

```json
{
  "strategies": [
    {
      "cluster_id": 0,
      "persona": "affluent surplus",
      "recommended_action": "invest_surplus",
      "marketing_play": "..."
    },
    ...
  ],
  "strategy_memo": "Gemini generated text..."
}
```

### 5. Report (Written by Expositor)

```json
{
  "title": "ACE V2 customer intelligence report",
  "cluster_summary": {...},
  "persona_layer": {...},
  "strategy_layer": {...},
  "natural_language_report": "Gemini generated text..."
}
```

## Access

- **Read:** `GET /read/{key}`
- **Write:** `POST /write` (payload: `{"key": "...", "value": ...}`)
