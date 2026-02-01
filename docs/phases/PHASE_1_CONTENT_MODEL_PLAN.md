# Phase 1: Content Model Normalization — Implementation Plan

**Purpose:** Convert raw backend output into a stable RunSummaryViewModel that eliminates duplication and translates technical signals into business language.

**Status:** Planning  
**Date:** January 15, 2026

---

## Principles

1. **The UI reads from one object only** — No direct backend field access
2. **No component reads raw backend fields directly** — All data flows through mapper
3. **Every technical signal is translated** — No engine jargon in default UI
4. **Every issue appears once and only once** — De-duplication enforced

---

## Task Breakdown

### ✅ Task 1: Inventory All Existing Fields

**Goal:** Understand current data structure and identify duplication

**Actions:**

1. Audit `/run/{runId}` endpoint response
2. Tag fields by audience (executive, operator, technical, internal_only)
3. Identify duplicate/near-duplicate content
4. Create field inventory table

**Deliverable:** `FIELD_INVENTORY.md`

---

### ✅ Task 2: Define RunSummaryViewModel Schema

**Goal:** Lock the canonical data shape for UI consumption

**Schema:**

```typescript
interface RunSummaryViewModel {
  run: {
    id: string;
    shortId: string;  // First 8 chars
    createdAt: string;
    mode: 'normal' | 'limitations' | 'failed';
    statusLabel: string;
  };
  
  trust: {
    score: number;  // 0-1
    label: 'low' | 'moderate' | 'high';
    guidance: string;
  };
  
  dataset: {
    typeLabel: string;
    rows: number;
    columns: number;
    timeCoverage: 'unknown' | 'partial' | 'sufficient';
  };
  
  executive: {
    oneLiner: string;  // Max 140 chars
    bullets: string[];  // Max 4
  };
  
  kpis: KPI[];  // 3-4 cards
  
  limitations: {
    validationIssues: Issue[];
    governanceBlocks: Issue[];
    practicalImpact: string;
  };
  
  actions: {
    primary: 'fixDataset';
    secondary: Array<'viewValidation' | 'openLab' | 'viewEvidence'>;
  };
  
  technical: {
    metadataTable: Record<string, any>[];
    scqaNarrative: {
      situation: string;
      complication: string;
      question: string;
      answer: string;
    } | null;
    rawJson: any;
  };
}
```

**Deliverable:** `src/types/RunSummaryViewModel.ts`

---

### ✅ Task 3: Normalize Validation & Governance Issues

**Goal:** Single source of truth for all limitations

**Issue Schema:**

```typescript
interface Issue {
  key: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  whyItMatters: string;
  howToFix: string;
}
```

**Validation Issue Keys:**

- `missing_target` — No outcome column detected
- `missing_time_coverage` — No temporal data
- `observational_only` — Cannot build predictive models
- `low_signal_schema` — Too few features

**Governance Block Keys:**

- `segmentation_disabled` — Clustering unavailable
- `outcome_modeling_disabled` — Regression blocked
- `strategy_lab_disabled` — Persona generation blocked
- `agent_regression_disabled` — Specific agent blocked
- `agent_fabricator_disabled` — Specific agent blocked

**Deliverable:** `src/lib/issueRegistry.ts`

---

### ✅ Task 4: Build View Model Mapper

**Goal:** Pure function to translate backend → RunSummaryViewModel

**Implementation:**

```typescript
// src/lib/runSummaryMapper.ts
export function mapToRunSummaryViewModel(
  rawPayload: any
): RunSummaryViewModel {
  // 1. Derive run mode
  const mode = deriveRunMode(rawPayload);
  
  // 2. Normalize issues
  const validationIssues = normalizeValidationIssues(rawPayload);
  const governanceBlocks = normalizeGovernanceBlocks(rawPayload);
  
  // 3. Generate executive summary
  const oneLiner = generateExecutiveOneLiner(mode, validationIssues);
  const bullets = generateExecutiveBullets(rawPayload, validationIssues);
  
  // 4. Normalize KPIs
  const kpis = normalizeKPIs(rawPayload);
  
  // 5. Assemble view model
  return {
    run: { ... },
    trust: { ... },
    dataset: { ... },
    executive: { oneLiner, bullets },
    kpis,
    limitations: { validationIssues, governanceBlocks, ... },
    actions: { ... },
    technical: { ... }
  };
}
```

**Rules:**

- **Failed mode:** Critical validation errors present
- **Limitations mode:** Run valid but blocking issues exist
- **Normal mode:** No blocking issues

**Deliverable:** `src/lib/runSummaryMapper.ts`

---

### ✅ Task 5: Define KPI Normalization

**Goal:** Consistent, meaningful KPI cards

**KPI Schema:**

```typescript
interface KPI {
  key: string;
  label: string;
  value: string | number;
  status: 'good' | 'warning' | 'bad';
  meaning: string;
}
```

**Default KPIs (3-4):**

1. **Confidence** — Overall trust score
2. **Data Clarity** — Quality/completeness score
3. **Records Analyzed** — Row count

**Score Translation:**

```typescript
function translateConfidence(score: number): string {
  if (score >= 0.7) return 'high';
  if (score >= 0.4) return 'moderate';
  return 'low';
}
```

**Deliverable:** `src/lib/kpiNormalizer.ts`

---

### ✅ Task 6: Consolidate SCQA into Single Narrative

**Goal:** Remove repeated SCQA blocks

**Approach:**

- Extract core SCQA elements from markdown
- Store in `technical.scqaNarrative` (hidden by default)
- No SCQA labels in default UI
- Render as human-readable paragraph if expanded

**Deliverable:** Updated `src/lib/reportParser.ts`

---

### ✅ Task 7: Create Fixture Data & Tests

**Goal:** Lock behavior before UI implementation

**Fixtures Needed:**

1. **Normal Run** — All insights allowed
2. **Limitations (Missing Target)** — No outcome modeling
3. **Limitations (Governance Blocked)** — Agent disabled
4. **Failed Run** — Critical validation errors

**Test Assertions:**

- Correct run mode derived
- No duplicate issues
- Executive bullets ≤ 4
- Raw JSON preserved but not rendered by default

**Deliverable:**

- `src/lib/__fixtures__/runSummaryFixtures.ts`
- `src/lib/__tests__/runSummaryMapper.test.ts`

---

## File Structure

```
src/
├── types/
│   └── RunSummaryViewModel.ts
├── lib/
│   ├── runSummaryMapper.ts
│   ├── issueRegistry.ts
│   ├── kpiNormalizer.ts
│   ├── reportParser.ts (updated)
│   ├── __fixtures__/
│   │   └── runSummaryFixtures.ts
│   └── __tests__/
│       └── runSummaryMapper.test.ts
└── docs/
    └── FIELD_INVENTORY.md
```

---

## Success Criteria

- [ ] All backend fields inventoried
- [ ] RunSummaryViewModel schema finalized
- [ ] Issue registry created (validation + governance)
- [ ] Mapper implemented and tested
- [ ] KPIs normalized with status labels
- [ ] SCQA consolidated (no duplication)
- [ ] Fixtures created for all run states
- [ ] Tests pass with 100% coverage

---

## Handoff to Phase 2

**Guarantees:**

1. UI consumes one stable object (`RunSummaryViewModel`)
2. No duplication logic in components
3. No engine jargon leaks by default
4. All run states clearly encoded (`normal`, `limitations`, `failed`)

**Next Phase:** Build UI components that render `RunSummaryViewModel` following Phase 0 guardrails.

---

**Status:** Ready to implement  
**Estimated Time:** 4-6 hours
