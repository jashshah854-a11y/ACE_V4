# ACE V3: Autonomous Cognitive Entity

**Universal. Unbreakable. Intelligent.**

ACE V3 is a schema-agnostic analytics engine designed to ingest *any* tabular dataset, infer its semantic structure, and autonomously generate deep customer intelligence reports.

## Features

- **Universal Schema Inference**: Automatically detects semantic roles (Income, Spend, Risk, etc.) from column names using fuzzy logic and keyword matching.
- **Robust Analytics**:
  - **Auto-Clustering**: Determines optimal customer segments (k-means) with silhouette scoring.
  - **Anomaly Detection**: Identifies outliers using Isolation Forests based on semantic features.
  - **Data Quality Scoring**: Evaluates dataset health (completeness, uniqueness, numeric density).
- **Generative Intelligence**:
  - **Persona Engine**: Creates rich, data-driven personas with distinct motivations and behaviors.
  - **Fabricator**: Generates tailored strategic recommendations (Growth, Retention, Risk Mitigation) for each persona.
- **Resilience**:
  - **Fallback Systems**: If advanced analytics fail, ACE gracefully degrades to basic segmentation and heuristic personas.
  - **Crash-Proof**: Designed to handle missing data, unknown columns, and malformed inputs without exiting.

## Architecture

ACE V3 operates as a multi-agent pipeline:

1. **Scanner**: Profiling and initial data scan.
2. **Interpreter**: Infers semantic roles and domain context.
3. **Overseer**: Performs clustering and feature engineering.
4. **Sentry**: Detects anomalies and outliers.
5. **Persona Engine**: Synthesizes clusters into human-readable personas (LLM-powered).
6. **Fabricator**: Devises strategies for each persona.
7. **Expositor**: Compiles the final Markdown report.

## Installation

```bash
pip install -e .
```

## Usage

Run ACE on any CSV file:

```bash
python cli.py path/to/your/data.csv
```

Or using the installed module:

```bash
ace path/to/your/data.csv
```

## Output

ACE generates a `final_report.md` in the run directory containing:

- Executive Summary
- Behavioral Clusters (with metrics)
- Detailed Personas (Demographics, Motivations)
- Strategic Recommendations
- Anomaly Detection Report

## Development

Run the universal test suite:

```bash
python tests/test_universal.py
```

## ACE V4: The Next Generation

ACE V4 introduces a modular, layered architecture for enterprise-grade data processing:

### 1. Intake System 2.0

- **Multi-Format Support**: Native ingestion of CSV, JSON, NDJSON, and Log files.
- **Auto-Fusion**: Automatically detects relationships between tables (e.g., Customers -> Orders) and fuses them into a Master Dataset.
- **Fuzzy Matching**: Intelligent key discovery for joining tables with inconsistent naming (e.g., `cust_id` vs `client_id`).

### 2. Anomaly Engine

- **Adaptive Detection**: Dynamically selects the best algorithm (Isolation Forest, DBSCAN, Z-Score) based on data distribution.
- **Context Intelligence**: Applies business rules to filter false positives (e.g., "VIPs are allowed high spend").
- **Integration Checks**: Verifies referential integrity and summary consistency across tables.

### 3. Privacy & Security

- **PII Detection**: Automatically identifies sensitive columns (Email, Phone, SSN).
- **Masking**: Redacts or hashes PII before analysis to ensure compliance.

### 4. Versioning

- **Snapshot Tracking**: Tracks dataset changes over time with immutable snapshots.
- **Schema Evolution**: Detects added/removed columns and type changes.

### 5. Insight Delivery

- **Explainability**: Provides human-readable explanations for every detected anomaly.
- **Report Generation**: Produces comprehensive JSON and Markdown reports.

To run the full V4 pipeline test:

```bash
python tests/test_ace_v4_full_pipeline.py
```
