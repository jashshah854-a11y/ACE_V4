# Phase One: Data Type Identification & Validation Framework

## Overview

Phase One implements comprehensive data validation and domain-aware reasoning guardrails to ensure ACE prefers honest uncertainty over false clarity.

## Core Components

### 1. Data Type Identifier (`agents/type_identifier.py`)

**Purpose**: Mandatory step that classifies datasets before analysis begins.

**Features**:
- Uses both schema and content signals
- Supports 15+ data types (marketing, technical, financial, political, etc.)
- Returns primary type, secondary types, and confidence level
- Detects time dimensions and mixed types
- Stores limitations when confidence is low

**Output**: `data_type_identification` artifact with:
- `primary_type`: Detected data type
- `confidence`: "high", "moderate", or "low"
- `reason`: Explanation of classification
- `signals`: Scoring details for top matches

### 2. Data Sufficiency Validator (`agents/validator.py`)

**Purpose**: Validates data meets minimum conditions before insight generation.

**Checks**:
1. **Sample Size**: Minimum 50 rows
2. **Target Variable**: Presence of outcome/target column
3. **Variance**: Meaningful variance in numeric fields
4. **Time Coverage**: Adequate time span (if time dimension exists)
5. **Observational vs Causal**: Detects experimental design signals

**Output**: `data_validation_report` artifact with:
- `can_proceed`: Boolean flag
- `mode`: "insight" or "limitations"
- `checks`: Detailed results for each check
- `limitations`: List of blocking issues
- `warnings`: Non-blocking concerns

**Behavior**: If checks fail, switches to "limitations" mode and blocks insight generation.

### 3. Domain Constraints (`core/data_guardrails.py`)

**Purpose**: Enforces domain-specific reasoning boundaries.

**Features**:
- `DOMAIN_CONSTRAINTS`: Defines what each data type can/cannot suggest
- `is_agent_allowed()`: Checks if agent can run on data type
- `get_domain_constraints()`: Returns reasoning boundaries
- `calculate_confidence_level()`: Computes confidence from data quality metrics
- `label_confidence()`: Labels insights with confidence metadata
- `check_validation_passed()`: Validates data before allowing insights

**Domain Examples**:
- Marketing: Can suggest trends, cannot suggest causality
- Correlation: Can explain relationships, cannot make causal decisions
- Forecast: Must include confidence intervals and assumptions

### 4. Conflict Detection (`core/conflict_detector.py`)

**Purpose**: Detects conflicts between data sources or analysis results.

**Conflict Types**:
1. **Correlation vs Trend**: Historical correlation contradicts recent trends
2. **Model vs Observation**: Predictions deviate significantly from actuals
3. **Cluster vs Segment**: Different grouping methods produce different counts
4. **Data Source**: Conflicting values between sources

**Philosophy**: Conflict is an insight, not an error. System surfaces conflicts with explanations.

### 5. Orchestrator Integration (`orchestrator.py`)

**Pipeline Flow**:
1. `type_identifier` → Classify dataset
2. `scanner` → Profile dataset
3. `interpreter` → Create schema map
4. `validator` → Validate sufficiency
5. **Guardrails** → Check validation and domain constraints before each agent
6. Analytics agents → Run with domain awareness
7. **Conflict Detection** → Run at end to surface conflicts

**Guardrail Enforcement**:
- Before `overseer`, `regression`, `personas`: Check validation passed
- Check domain constraints and store for agent awareness
- Block agents if validation fails or domain mismatch
- Record limitations for report generation

## Key Principles Enforced

### 1. Explicit Data Typing Before Reasoning
- Every dataset classified before analysis
- Agents know which data types they can handle
- Unknown/mixed types require uncertainty messaging

### 2. Data Sufficiency Checks
- Target variable presence
- Sample size adequacy
- Variance meaningfulness
- Time coverage (if applicable)
- Observational vs causal detection

### 3. Zero Tolerance for Placeholder Reasoning
- No generic marketing language
- No best practices without data grounding
- No predictions without model basis
- Missing data → explicit "cannot conclude" statements

### 4. Domain-Constrained Reasoning
- Each data type has reasoning boundaries
- Agents refuse questions outside scope
- Constraints stored and enforced

### 5. Transparent Confidence Labeling
- Every insight labeled: "high", "moderate", or "exploratory"
- Based on data completeness, method robustness, consistency
- Never hide weak confidence behind polished language

### 6. Conflict-Aware Integration
- Conflicts detected explicitly
- Explained why conflict exists
- Only valid portions of each dataset used
- Conflict treated as insight, not error

## Success Criteria

✅ ACE says "cannot conclude" without being prompted  
✅ Different data types produce visibly different reasoning styles  
✅ Conflicting data is surfaced, not smoothed over  
✅ Executives trust reports even when conclusions are limited  
✅ Validation failures block insight generation  
✅ Domain constraints prevent overreach  

## Usage

### Running Locally

```powershell
# Start server
Set-Location 'ACE_V3_Source/backend'
$env:PYTHONPATH='.'
..\venv\Scripts\python.exe -m uvicorn api.server:app --host 127.0.0.1 --port 8001

# Start worker
Set-Location 'ACE_V3_Source/backend'
$env:PYTHONPATH='.'
..\venv\Scripts\python.exe jobs/worker.py
```

### Pipeline Execution

The pipeline automatically:
1. Identifies data type
2. Validates sufficiency
3. Enforces guardrails
4. Runs domain-aware analysis
5. Detects conflicts

### Checking Results

```python
from core.state_manager import StateManager

state = StateManager(run_path)

# Check data type
type_info = state.read("data_type_identification")
print(f"Type: {type_info['primary_type']}, Confidence: {type_info['confidence']}")

# Check validation
validation = state.read("data_validation_report")
print(f"Can proceed: {validation['can_proceed']}, Mode: {validation['mode']}")

# Check limitations
limitations = state.read("limitations")
for lim in limitations:
    print(f"{lim['severity']}: {lim['message']}")

# Check conflicts
conflicts = state.read("conflict_analysis")
if conflicts.get("has_conflicts"):
    print(f"Found {conflicts['conflict_count']} conflict(s)")
```

## Next Steps (Future Phases)

- Phase Two: Progressive disclosure layers (what data shows → what can be inferred → what cannot be concluded)
- Phase Three: Post-processing filters to remove generic filler language
- Phase Four: Agent-specific prompt engineering with domain constraints
- Phase Five: Confidence-aware report generation


