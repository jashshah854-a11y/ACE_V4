# Phase 4: Quick Summary Feature — Implementation Plan

**Purpose:** Add lightweight "Quick View" mode for fast dataset insights alongside existing Full Report.

**Status:** Planning  
**Date:** January 15, 2026

---

## Executive Summary

Create a Powerdrill-like Quick Summary mode that delivers:

- **Schema overview** (column types, row counts)
- **Basic statistics** (mean, median, std dev, top categories)
- **Simple correlations** (Pearson coefficients)
- **Suggested questions** (templated based on schema)
- **2-panel layout** (sidebar + main content)

This complements the existing Full Report (Phases 0-3) by offering a faster, simpler alternative for exploratory analysis.

---

## Scope

### ✅ In Scope

- Add `mode` parameter to `/run` endpoint (`full` | `summary`)
- Create `/runs/{run_id}/summary` endpoint
- Build Quick View toggle on upload page
- Create 2-panel `QuickSummaryView` component
- Generate suggested questions from schema
- Display basic charts (histograms, scatter plots)

### ❌ Out of Scope (Phase 4)

- Advanced analytics (personas, clusters, deep narrative)
- SCQA story blocks
- Governance and validation checks
- Evidence Lab features
- Strategy recommendations

---

## Architecture

### Mode Selection Flow

```
User uploads file
    ↓
Selects mode: [Quick View] or [Full Report]
    ↓
Quick View → /run?mode=summary → /runs/{id}/summary
Full Report → /run → /runs/{id} (existing)
```

### API Contract

#### 1. POST `/run?mode=summary`

**Request:**

```typescript
POST /run?mode=summary
Content-Type: multipart/form-data

file: <CSV/Excel file>
```

**Response:**

```json
{
  "run_id": "abc123",
  "status": "running",
  "mode": "summary"
}
```

#### 2. GET `/runs/{run_id}/summary`

**Response:**

```json
{
  "run_id": "abc123",
  "status": "completed",
  "schema": [
    {"name": "age", "type": "numeric", "missing_count": 5},
    {"name": "city", "type": "categorical", "missing_count": 0}
  ],
  "statistics": {
    "age": {
      "count": 1000,
      "mean": 35.2,
      "median": 34,
      "std": 12.5,
      "min": 18,
      "max": 85
    },
    "city": {
      "count": 1000,
      "top_categories": [
        {"value": "New York", "count": 350},
        {"value": "Los Angeles", "count": 280}
      ]
    }
  },
  "correlations": [
    {"x": "age", "y": "income", "corr": 0.75, "p_value": 0.001}
  ],
  "questions": [
    "What is the distribution of age?",
    "How does age relate to income?",
    "What are the most common cities?"
  ],
  "row_count": 1000,
  "column_count": 8
}
```

---

## Component Architecture

### Frontend Structure

```
src/
├── pages/
│   ├── QuickSummaryView.tsx (NEW)
│   └── RunSummaryPage.tsx (existing Full Report)
├── components/
│   └── quick-summary/
│       ├── QuickViewToggle.tsx (NEW)
│       ├── SummarySidebar.tsx (NEW)
│       ├── SummaryCard.tsx (NEW)
│       ├── DistributionChart.tsx (NEW)
│       └── CorrelationChart.tsx (NEW)
└── types/
    └── QuickSummaryTypes.ts (NEW)
```

### Component Responsibilities

#### `QuickViewToggle.tsx`

**Renders:** Checkbox/toggle on upload page  
**Props:** `onModeChange: (mode: 'full' | 'summary') => void`  
**State:** Selected mode

#### `QuickSummaryView.tsx`

**Layout:** 2-panel grid (sidebar 30% + main 70%)  
**Responsibilities:**

- Fetch summary data from `/runs/{id}/summary`
- Manage active question state
- Render sidebar + main content

#### `SummarySidebar.tsx`

**Renders:**

- Dataset metadata (rows, columns)
- List of suggested questions
- Active question highlight

#### `SummaryCard.tsx`

**Renders:**

- Chart (histogram, scatter plot, bar chart)
- Key statistics (mean, median, correlation)
- Short interpretation (1-2 sentences)

---

## Data Models

### TypeScript Interfaces

```typescript
// src/types/QuickSummaryTypes.ts

export type ColumnType = 'numeric' | 'categorical' | 'datetime' | 'text';

export interface SchemaColumn {
  name: string;
  type: ColumnType;
  missing_count: number;
}

export interface NumericStats {
  count: number;
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
}

export interface CategoricalStats {
  count: number;
  top_categories: Array<{ value: string; count: number }>;
}

export interface Correlation {
  x: string;
  y: string;
  corr: number;
  p_value: number;
}

export interface QuickSummaryData {
  run_id: string;
  status: 'running' | 'completed' | 'failed';
  schema: SchemaColumn[];
  statistics: Record<string, NumericStats | CategoricalStats>;
  correlations: Correlation[];
  questions: string[];
  row_count: number;
  column_count: number;
}
```

---

## Backend Implementation

### Tasks

1. **Add `mode` parameter to `/run` endpoint**
   - Validate `mode` is `'full'` or `'summary'`
   - Route to appropriate pipeline

2. **Create summary computation module**

   ```python
   # backend/summary_engine.py
   
   def compute_summary(df: pd.DataFrame) -> dict:
       schema = infer_schema(df)
       stats = compute_statistics(df, schema)
       corrs = compute_correlations(df, schema)
       questions = generate_questions(schema, corrs)
       
       return {
           "schema": schema,
           "statistics": stats,
           "correlations": corrs,
           "questions": questions,
           "row_count": len(df),
           "column_count": len(df.columns)
       }
   ```

3. **Create `/runs/{run_id}/summary` endpoint**
   - Store summary results in database
   - Return JSON matching `QuickSummaryData` interface

4. **Question generation logic**

   ```python
   def generate_questions(schema, correlations):
       questions = []
       
       # Distribution questions for numeric columns
       for col in schema:
           if col['type'] == 'numeric':
               questions.append(f"What is the distribution of {col['name']}?")
       
       # Correlation questions for strong correlations
       for corr in correlations:
           if abs(corr['corr']) > 0.5:
               questions.append(f"How does {corr['x']} relate to {corr['y']}?")
       
       # Category questions
       for col in schema:
           if col['type'] == 'categorical':
               questions.append(f"What are the most common {col['name']} values?")
       
       return questions[:10]  # Limit to 10 questions
   ```

---

## Frontend Implementation

### 1. Upload Page Integration

```typescript
// src/pages/Index.tsx (existing upload page)

const [analysisMode, setAnalysisMode] = useState<'full' | 'summary'>('full');

<QuickViewToggle 
  mode={analysisMode}
  onModeChange={setAnalysisMode}
/>

// On upload:
const formData = new FormData();
formData.append('file', file);

const response = await fetch(`${API_BASE}/run?mode=${analysisMode}`, {
  method: 'POST',
  body: formData
});
```

### 2. Quick Summary View

```typescript
// src/pages/QuickSummaryView.tsx

export default function QuickSummaryView() {
  const { runId } = useParams();
  const [summary, setSummary] = useState<QuickSummaryData | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  
  // Fetch summary data
  useEffect(() => {
    fetchSummary(runId).then(setSummary);
  }, [runId]);
  
  return (
    <div className="grid grid-cols-[30%_70%] h-screen">
      {/* Sidebar */}
      <SummarySidebar 
        summary={summary}
        activeQuestion={activeQuestion}
        onQuestionClick={setActiveQuestion}
      />
      
      {/* Main Content */}
      <main className="overflow-y-auto p-6">
        {activeQuestion ? (
          <SummaryCard 
            question={activeQuestion}
            summary={summary}
          />
        ) : (
          <OverviewCard summary={summary} />
        )}
      </main>
    </div>
  );
}
```

### 3. Summary Card Component

```typescript
// src/components/quick-summary/SummaryCard.tsx

interface SummaryCardProps {
  question: string;
  summary: QuickSummaryData;
}

export function SummaryCard({ question, summary }: SummaryCardProps) {
  const chartData = getChartDataForQuestion(question, summary);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{question}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Chart */}
        {chartData.type === 'histogram' && (
          <DistributionChart data={chartData} />
        )}
        {chartData.type === 'scatter' && (
          <CorrelationChart data={chartData} />
        )}
        
        {/* Key Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <StatBox label="Mean" value={chartData.stats.mean} />
          <StatBox label="Median" value={chartData.stats.median} />
          <StatBox label="Std Dev" value={chartData.stats.std} />
        </div>
        
        {/* Interpretation */}
        <p className="mt-4 text-sm text-muted-foreground">
          {generateInterpretation(chartData)}
        </p>
      </CardContent>
    </Card>
  );
}
```

---

## Routing

### Update App.tsx

```typescript
// src/App.tsx

<Routes>
  {/* Existing routes */}
  <Route path="/report/:runId" element={<RunSummaryPage />} />
  
  {/* NEW: Quick Summary route */}
  <Route path="/summary/:runId" element={<QuickSummaryView />} />
</Routes>
```

### Navigation Logic

After upload completes:

```typescript
if (analysisMode === 'summary') {
  navigate(`/summary/${runId}`);
} else {
  navigate(`/report/${runId}`);
}
```

---

## Testing Plan

### Backend Tests

```python
# tests/test_summary_engine.py

def test_schema_inference():
    df = pd.DataFrame({
        'age': [25, 30, 35],
        'city': ['NYC', 'LA', 'NYC']
    })
    schema = infer_schema(df)
    assert schema[0]['type'] == 'numeric'
    assert schema[1]['type'] == 'categorical'

def test_question_generation():
    schema = [{'name': 'age', 'type': 'numeric'}]
    questions = generate_questions(schema, [])
    assert "What is the distribution of age?" in questions
```

### Frontend Tests

```typescript
// src/components/quick-summary/__tests__/QuickViewToggle.test.tsx

test('calls onModeChange when toggled', () => {
  const handleChange = jest.fn();
  render(<QuickViewToggle mode="full" onModeChange={handleChange} />);
  
  fireEvent.click(screen.getByRole('checkbox'));
  expect(handleChange).toHaveBeenCalledWith('summary');
});
```

---

## Success Criteria

- [ ] User can select Quick View mode on upload page
- [ ] Backend generates summary in <5 seconds for datasets <10MB
- [ ] Summary endpoint returns valid JSON matching schema
- [ ] Suggested questions are relevant to dataset
- [ ] Charts render correctly (histograms, scatter plots)
- [ ] Sidebar questions are clickable and update main content
- [ ] Full Report mode continues to work unchanged
- [ ] Mobile responsive (sidebar collapses to tabs)

---

## Migration Strategy

### Phase 4A: Backend (Week 1-2)

1. Add `mode` parameter to `/run`
2. Implement summary computation logic
3. Create `/runs/{run_id}/summary` endpoint
4. Write backend tests

### Phase 4B: Frontend (Week 3-4)

1. Create TypeScript interfaces
2. Build Quick View toggle
3. Implement `QuickSummaryView` page
4. Create summary card components
5. Wire up routing

### Phase 4C: Integration & Testing (Week 5)

1. End-to-end testing
2. Performance benchmarking
3. Accessibility audit
4. Documentation updates

---

## Environment Variables

```bash
# .env
ACE_ENABLE_SUMMARY_MODE=true
VITE_ACE_SUMMARY_API_URL=http://localhost:8000
```

---

## Documentation Updates

### API Docs

- Add `mode` parameter to `/run` endpoint docs
- Document `/runs/{run_id}/summary` response schema
- Provide example curl commands

### User Guide

- Explain when to use Quick View vs Full Report
- Show how to toggle between modes
- Describe suggested questions feature

---

## Next Steps

1. **Review this plan** — Confirm scope and approach
2. **Backend implementation** — Start with `mode` parameter
3. **Frontend prototyping** — Build Quick View toggle
4. **Iterative testing** — Validate with sample datasets

---

**Status:** Ready for review  
**Estimated Time:** 5 weeks (2 backend + 2 frontend + 1 testing)
