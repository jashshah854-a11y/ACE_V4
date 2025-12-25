# ACE V2 Codebase Inspection Report

## One Architecture Map

### Top Level Structure

* **`orchestrator.py`**: Main event loop that polls triggers and executes agents via subprocess.
* **`ace_v3_entry.py`**: Linear pipeline script that runs the full ACE V3 sequence (Sanitizer -> Scanner -> Interpreter -> Agents).
* **`ace_v3_proof.py`**: CLI wrapper for `ace_v3_entry.py` that prints a "proof of work" report to the console.
* **`agents/`**: Contains the logic for individual agents (Overseer, Sentry, Persona, Fabricator, Expositor).
* **`core/`**: Shared logic for analytics, schema definitions (Pydantic), and LLM interactions.
* **`schema_scanner/`**: Module for profiling raw CSV datasets.
* **`utils/`**: Helper functions, primarily logging.
* **`api/`**: FastAPI server for shared state management (`server.py`).
* **`data/`**: Directory for input CSVs and output JSON/Markdown artifacts.
* **`triggers.json`**: Configuration defining when each agent should run.
* **`agent_registry.json`**: Configuration mapping agent IDs to their Python scripts.

### Entry Points

* **User/UI Entry**: `ace_v3_entry.py` (via `run_ace_v3` function).
* **Background Process**: `orchestrator.py` (runs as a daemon).
* **CLI Verification**: `ace_v3_proof.py`.

## Two Module Summaries

### Orchestrator (`orchestrator.py`)

```python
def main():
    # ...
    registry = load_json(REGISTRY_PATH)
    triggers = load_json(TRIGGERS_PATH)
    # ...
    while True:
        for trigger in triggers:
            # ...
            if trigger['type'] == 'event' and trigger['event'] == 'file_change':
                # Check file hash
            elif trigger['type'] == 'condition':
                # Check API state
            if should_run:
                run_agent(agent)
```

**Explanation**: The orchestrator is a simple polling loop. It reads `triggers.json` to decide when to run an agent. It supports two trigger types: file changes (hashing) and API state conditions (checking values at `localhost:8000`). It assumes agents are independent scripts run via `subprocess`.

### Pipeline Entry (`ace_v3_entry.py`)

```python
def run_ace_v3(data_path):
    # ...
    scan = scan_dataset(data_path)
    # ...
    interpreter = SchemaInterpreter()
    schema_map_dict = interpreter.run(scan)
    # ...
    overseer = Overseer(schema_map=schema_map)
    overseer.run()
    # ... (runs Sentry, PersonaEngine, Fabricator, Expositor sequentially)
```

**Explanation**: This is the "monolithic" runner. It executes the entire intelligence chain in a single process. It assumes `data_path` is a valid CSV and that each step succeeds before moving to the next. It manually passes the `schema_map` object to each agent.

### Core Analytics (`core/analytics.py`)

```python
def run_clustering(df: pd.DataFrame, features: list = None):
    # ...
    risk_score = (
        savings_risk * 0.3 +
        util_risk * 0.3 +
        debt_risk * 0.2 +
        volatility_risk * 0.2
    )
    # ...
```

**Explanation**: Contains the heavy lifting for clustering and risk calculation. **Critical Assumption**: It hardcodes business logic for banking (savings, utilization, debt) and assumes specific column names exist or can be derived. It is not truly universal.

### Schema Interpreter (`agents/schema_interpreter.py`)

```python
class SchemaInterpreter:
    def run(self, scan: Dict[str, Any]) -> Dict[str, Any]:
        # ...
        llm_response = call_llm_json(system_prompt, user_prompt, model_name=self.model_name)
        # ...
        # merge scanner structure with LLM annotations
```

**Explanation**: Bridges the gap between raw data and semantic meaning. It uses an LLM to "guess" the domain and map columns to roles (income, spend, risk). It assumes the LLM returns valid JSON and falls back to a generic schema if it fails.

## Three Fragility Findings

### 1. Hardcoded Column Access

```python
# core/analytics.py
df_out["savings_rate"] = (df_out["annual_income"] - annual_spend) / df_out["annual_income"]
df_out["utilization"] = df_out["monthly_spend"] / df_out["credit_limit"]
```

**Why Brittle**: This code will crash immediately if the dataset does not contain `annual_income`, `monthly_spend`, or `credit_limit`. It defeats the purpose of a "Universal" engine.
**Suggestion**: Use the `SchemaMap` to look up columns by their semantic role (e.g., `schema.semantic_roles.income_like[0]`). If the role is missing, skip the calculation or use a generic fallback.

### 2. Blind Mean Imputation

```python
# agents/overseer.py
X = X.fillna(X.mean())
```

**Why Brittle**: If a column is entirely NaN or non-numeric (but passed the filter), `mean()` will fail or leave NaNs, causing the subsequent `KMeans` or `StandardScaler` to crash.
**Suggestion**: Use a robust imputer that handles all-NaN columns (e.g., dropping them) and ensures the data type is strictly numeric before calling `mean()`.

### 3. Brittle JSON Parsing

```python
# agents/persona_engine.py
cleaned = response.replace("```json", "").replace("```", "").strip()
personas = json.loads(cleaned)
```

**Why Brittle**: LLMs often add preamble text ("Here is the JSON...") or use different markdown formatting. This simple string replacement is prone to failure.
**Suggestion**: Use a robust JSON extractor regex (e.g., `r"\{.*\}"` or `r"\[.*\]"` with `DOTALL`) or a dedicated library/function that can find the first valid JSON object in a string.

## Four State and Orchestration

### State Storage

* **Hybrid Model**: State is stored in two places:
    1. **Disk**: JSON files in `data/` (`overseer_output.json`, `personas_output.json`, etc.).
    2. **Memory (API)**: The `api/server.py` maintains a global `ACE_MEMORY` dict.
* **Sync**: Agents write to disk *and* try to POST to `http://localhost:8000/update`.

### Orchestration Logic

* **Triggers**: Defined in `triggers.json`.
  * `file_change`: Watches for file hash changes (e.g., `data/customers.csv`).
  * `condition`: Polls the API for specific keys/values (e.g., `strategies` field exists).
* **Execution**: `orchestrator.py` runs an infinite loop. When a trigger fires, it launches the agent's script as a subprocess.
* **Run Identifiers**: **None**. Files are overwritten on every run. There is no history or versioning.

## Five Error and Fallback Gaps

### 1. Missing Required Columns

* **Code**: `analytics.py` accessing `annual_income`.
* **Failure**: Crash (KeyError).
* **Fallback**: Check if columns exist. If not, disable the specific metric (e.g., `risk_score = 0`) and log a warning.

### 2. Empty Dataset after Filtering

* **Code**: `scanner.py` or `overseer.py` filtering for numeric columns.
* **Failure**: `KMeans` throws error on empty input.
* **Fallback**: Check `df.shape` before clustering. If empty, return a "Single Cluster" result with default values.

### 3. LLM Failure / Quota

* **Code**: `agents/persona_engine.py` calling `ask_gemini`.
* **Failure**: Returns `None` or crashes.
* **Fallback**: Use "Template Personas" (e.g., "High Value", "Low Value") based purely on statistical quantiles without narrative generation.

### 4. API Unreachable

* **Code**: `requests.post("http://localhost:8000/...")`.
* **Failure**: `try...except pass` swallows the error, leading to state desync. The orchestrator won't trigger the next step.
* **Fallback**: Implement a retry mechanism or write a "signal file" to disk that the orchestrator also watches as a backup.

### 5. Schema Interpretation Failure

* **Code**: `SchemaInterpreter` LLM call.
* **Failure**: Returns generic schema.
* **Fallback**: The generic fallback exists but is very basic. It should be enhanced to use regex-based heuristics (e.g., column name contains "id", "date", "price") to improve the non-LLM guess.
