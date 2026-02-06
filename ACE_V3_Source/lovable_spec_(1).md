# ACE V4 Frontend Specification for Lovable AI

## What This App Is

ACE (Automated Curiosity Engine) is a data analysis platform that transforms raw CSV data into executive-quality intelligence reports using a 19-agent AI pipeline.

**The flow:**
1. User uploads a CSV file
2. Backend runs 19 AI agents (statistical analysis + LLM interpretation)
3. Frontend shows real-time pipeline progress
4. When complete, display the full report with insights, hypotheses, and recommendations

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** FastAPI (Python) - already deployed, DO NOT modify
- **State Management:** React Query (TanStack Query)

## Backend API (Already Working - DO NOT CHANGE)

Base URL: `https://ace-v4-backend.up.railway.app` (or localhost:8000 for dev)

### Endpoints

#### 1. Upload Dataset
```
POST /upload
Content-Type: multipart/form-data
Body: file (CSV file)

Response:
{
  "run_id": "abc123",
  "filename": "sales_data.csv",
  "row_count": 65521,
  "column_count": 10,
  "size_bytes": 1048576,
  "identity": {
    "columns": [...],
    "dtypes": {...},
    "sample_values": {...}
  }
}
```

#### 2. Start Analysis
```
POST /analyze
Content-Type: application/json
Body: {
  "run_id": "abc123",
  "fast_mode": false,
  "task_intent": {
    "primary_question": "What insights can we find in this data?",
    "decisions_to_drive": "Business strategy",
    "audience": "executives",
    "time_horizon": "quarterly"
  }
}

Response:
{
  "run_id": "abc123",
  "status": "running"
}
```

#### 3. Get Run Status (Poll this every 2 seconds while running)
```
GET /run/{run_id}/status

Response:
{
  "run_id": "abc123",
  "status": "running" | "completed" | "failed",
  "current_step": "deep_insight",
  "current_step_index": 11,
  "total_steps": 19,
  "steps_completed": ["type_identifier", "scanner", ...],
  "progress_pct": 57.9,
  "elapsed_seconds": 45.2
}
```

#### 4. Get Full Snapshot (After completion)
```
GET /run/{run_id}/snapshot

Response:
{
  "run_id": "abc123",
  "status": "completed",
  "identity": { ... dataset info ... },
  "deep_insights": {
    "insights": [
      {
        "title": "Significant Drop in Sales",
        "finding": "Sales dropped 35% after October 2024",
        "why_it_matters": "This could indicate...",
        "recommendation": "The sales team should...",
        "impact_score": 90,
        "confidence": "high",
        "category": "trend"
      }
    ],
    "headline_insight": { ... },
    "recommendations": [ ... ]
  },
  "hypotheses": {
    "hypotheses": [
      {
        "finding_title": "...",
        "hypothesis_type": "charitable" | "suspicious" | "wild",
        "hypothesis": "...",
        "confidence": 8,
        "is_red_flag": true
      }
    ],
    "red_flags": [ ... ]
  },
  "executive_narrative": {
    "markdown": "# Report...",
    "headline": "Your data reveals...",
    "narrative": "..."
  },
  "trust": {
    "overall_confidence": 75,
    "level": "medium"
  },
  "report_markdown": "# Full Report..."
}
```

#### 5. Get List of All Runs
```
GET /run?limit=20&offset=0

Response:
{
  "runs": ["abc123", "def456", ...],
  "total": 42,
  "limit": 20,
  "offset": 0,
  "has_more": true
}
```

## Pages to Build

### Page 1: Home / Upload Page (`/`)

**Layout:**
- Clean, centered design
- ACE logo/title at top
- Large drag-and-drop zone for CSV upload
- "Or click to browse" text
- Accepted formats: .csv, .xlsx, .xls

**Behavior:**
1. User drops/selects file
2. Call `POST /upload`
3. Show brief preview (filename, row count, column count)
4. "Start Analysis" button
5. On click: Call `POST /analyze`, then redirect to `/pipeline/{run_id}`

### Page 2: Pipeline Progress (`/pipeline/:runId`)

**Layout:**
- Progress bar at top showing percentage
- List of all 19 pipeline steps with status icons:
  - ⏳ Pending (gray)
  - 🔄 Running (blue, animated)
  - ✅ Completed (green)
  - ❌ Failed (red)
- Current step highlighted
- Elapsed time counter

**Pipeline Steps (in order):**
1. type_identifier - Detecting data types
2. scanner - Profiling dataset
3. interpreter - Understanding schema
4. validator - Validating data quality
5. overseer - Task planning
6. regression - Building models
7. time_series - Analyzing trends
8. sentry - Detecting anomalies
9. personas - Identifying segments
10. fabricator - Engineering features
11. raw_data_sampler - Sampling data
12. deep_insight - Finding patterns
13. dot_connector - Connecting insights
14. hypothesis_engine - Generating theories
15. so_what_deepener - Analyzing implications
16. story_framer - Crafting narrative
17. executive_narrator - Polishing report
18. expositor - Finalizing output
19. trust_evaluation - Scoring confidence

**Behavior:**
1. Poll `GET /run/{run_id}/status` every 2 seconds
2. Update progress bar and step statuses
3. When status === "completed": redirect to `/report/{run_id}`
4. When status === "failed": show error message with retry button

### Page 3: Report Dashboard (`/report/:runId`)

**Layout:**
Tabbed interface with 4 tabs:

#### Tab 1: Executive Summary (default)
- **Headline card:** Large, bold headline from `executive_narrative.headline`
- **Key metrics row:** 4 cards showing:
  - Records Analyzed
  - Insights Found
  - Red Flags
  - Confidence Score
- **Executive narrative:** The `executive_narrative.narrative` text
- **Top 3 Recommendations:** Cards with priority badges (P1, P2, P3)

#### Tab 2: Insights
- List of all insights from `deep_insights.insights`
- Each insight card shows:
  - Title
  - Finding
  - Why It Matters
  - Recommendation
  - Impact score badge (color-coded: 80+ red, 60+ yellow, else green)
  - Confidence badge

#### Tab 3: Hypotheses
- Section: "Red Flags to Investigate" (if any)
  - Cards with red border for `is_red_flag: true` items
- Section: "All Hypotheses"
  - Grouped by type: Charitable / Suspicious / Wild
  - Each shows hypothesis text and confidence score

#### Tab 4: Full Report
- Render `report_markdown` as formatted markdown
- Use a markdown renderer (react-markdown)
- Clean typography, proper headings

**Behavior:**
1. On mount: Call `GET /run/{run_id}/snapshot`
2. Display loading state while fetching
3. Populate all tabs with data

### Page 4: History (`/history`)

**Layout:**
- List of previous runs
- Each row shows: Run ID (truncated), Date, Status badge
- Click to go to `/report/{run_id}`
- Pagination controls

**Behavior:**
1. Call `GET /run?limit=20&offset=0`
2. For each run_id, optionally fetch lite status
3. Paginate with offset

## Design Guidelines

**Theme:** Professional, clean, dark mode preferred
**Colors:**
- Primary: Blue (#3B82F6)
- Success: Green (#22C55E)
- Warning: Yellow (#EAB308)
- Danger: Red (#EF4444)
- Background: Dark gray (#1F2937)
- Cards: Slightly lighter (#374151)

**Typography:**
- Headings: Inter or system font, bold
- Body: 16px, comfortable reading
- Code/data: Monospace

**Components to use:**
- shadcn/ui Card, Button, Badge, Tabs, Progress
- Tailwind CSS for styling
- Lucide icons

## File Structure

```
src/
├── App.tsx              # Router setup
├── main.tsx             # Entry point
├── lib/
│   ├── api.ts           # API functions (fetch calls)
│   └── queries.ts       # React Query hooks
├── pages/
│   ├── UploadPage.tsx
│   ├── PipelinePage.tsx
│   ├── ReportPage.tsx
│   └── HistoryPage.tsx
├── components/
│   ├── layout/
│   │   └── AppLayout.tsx    # Shared navbar
│   ├── upload/
│   │   └── DropZone.tsx
│   ├── pipeline/
│   │   └── StepList.tsx
│   └── report/
│       ├── InsightCard.tsx
│       ├── HypothesisCard.tsx
│       └── MetricCard.tsx
└── index.css            # Tailwind imports
```

## API Client Code

```typescript
// src/lib/api.ts
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function uploadDataset(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export async function startAnalysis(runId: string) {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      run_id: runId,
      fast_mode: false,
      task_intent: {
        primary_question: "What key insights and patterns can we discover in this dataset that would inform business decisions?",
        decisions_to_drive: "Strategic planning and operational improvements",
        audience: "Business executives and analysts",
        time_horizon: "Quarterly review"
      }
    }),
  });
  return res.json();
}

export async function getRunStatus(runId: string) {
  const res = await fetch(`${API_BASE}/run/${runId}/status`);
  return res.json();
}

export async function getSnapshot(runId: string) {
  const res = await fetch(`${API_BASE}/run/${runId}/snapshot`);
  return res.json();
}

export async function getAllRuns(limit = 20, offset = 0) {
  const res = await fetch(`${API_BASE}/run?limit=${limit}&offset=${offset}`);
  return res.json();
}
```

## React Query Hooks

```typescript
// src/lib/queries.ts
import { useQuery } from '@tanstack/react-query';
import * as api from './api';

export function useRunStatus(runId: string | undefined) {
  return useQuery({
    queryKey: ['runStatus', runId],
    queryFn: () => api.getRunStatus(runId!),
    enabled: !!runId,
    refetchInterval: (data) =>
      data?.status === 'running' ? 2000 : false,
  });
}

export function useSnapshot(runId: string | undefined) {
  return useQuery({
    queryKey: ['snapshot', runId],
    queryFn: () => api.getSnapshot(runId!),
    enabled: !!runId,
    staleTime: 60000,
  });
}

export function useRunsList(limit = 20, offset = 0) {
  return useQuery({
    queryKey: ['runs', limit, offset],
    queryFn: () => api.getAllRuns(limit, offset),
  });
}
```

## Environment Variables

Create `.env` file:
```
VITE_API_URL=https://ace-v4-backend.up.railway.app
```

## Important Notes

1. The backend is already deployed and working - do not modify any backend code
2. All API calls need CORS - backend already allows all origins
3. The pipeline takes 2-4 minutes to complete, so the polling on PipelinePage is essential
4. The snapshot endpoint returns a large JSON object - handle loading states properly
5. Mobile responsiveness is nice-to-have but not critical
6. Focus on functionality first, polish second

## Success Criteria

1. User can upload a CSV and see it accepted
2. User can start analysis and see real-time progress
3. User can view the complete report with all insights
4. User can see hypothesis theories and red flags
5. User can view previous analysis runs

That's it. Build this and ACE has a working frontend.
