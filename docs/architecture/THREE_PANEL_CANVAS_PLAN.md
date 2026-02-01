# Phase I: Three-Panel Insight Canvas — Neural Refinery Transformation

Transforming ACE_V4 from a vertical dashboard into a horizontal "Neural Refinery" using the Pyramid Principle for top-down communication and Lab & Library typographic ritual to separate advice from evidence.

## User Review Required

> [!IMPORTANT]
> **Breaking Change: Complete UI Paradigm Shift**
> This plan replaces the current vertical `IntelligenceCanvas` with a horizontal three-panel layout. The existing "Neural Spine" (left navigation) will be repurposed as "The Pulse" (dataset identity + quality metrics). This is a fundamental architectural change that affects all report viewing experiences.

> [!WARNING]
> **Typography & Font Loading**
> The plan introduces three distinct font families (Merriweather/Georgia for narrative, Inter/Roboto for UI, JetBrains Mono for data). We'll need to ensure these are properly loaded via Google Fonts or local assets. Performance impact should be minimal but will add ~50-100KB to initial page load.

> [!CAUTION]
> **Scroll Behavior Complexity**
> Independent scrolling for Center and Right panels while keeping Left panel fixed requires careful CSS management. This can cause issues on mobile devices and with certain browser zoom levels. We'll implement progressive enhancement with mobile fallbacks.

## Proposed Changes

### Component Architecture

#### [NEW] [ThreePanelCanvas.tsx](file:///c:/Users/jashs/Projects/ACE_V4/src/components/canvas/ThreePanelCanvas.tsx)

Complete replacement for `IntelligenceCanvas.tsx` implementing the fixed-viewport triptych layout.

**Key Features:**

- CSS Grid with three columns: 20% (Pulse), 50% (Narrative), 30% (Lab)
- `overflow-hidden` on root viewport to lock height at 100vh
- Independent scroll contexts for Center and Right panels
- Fixed positioning for Left panel (The Pulse)

**Responsive Strategy:**

- Desktop (≥1280px): Full three-panel layout
- Tablet (768-1279px): Collapsible left panel, center + right
- Mobile (<768px): Single column, tabbed navigation between panels

---

### Panel 1: The Pulse (Left — 20%)

#### [NEW] [DatasetPulse.tsx](file:///c:/Users/jashs/Projects/ACE_V4/src/components/canvas/DatasetPulse.tsx)

Replaces the current "Neural Spine" navigation with an identity rail anchoring the user to dataset context.

**Components:**

##### Dataset Identity Card

- **Schema Visualization**: Enumerated field names with data types (extracted from `schema_scan_output`)
- **Volume Metrics**: Total rows, column count, file size (from `dataset_identity_card` state)
- **Quality Gate UI**:
  - High/Medium/Low badge using semantic colors (Green: #22c55e, Amber: #f59e0b, Red: #ef4444)
  - Deep Navy (#163E93) for stability anchors
  - Electric Blue (#005eb8) for interactive elements

##### Safe Mode Banner

- Triggers when `confidence_score <= MIN_CONFIDENCE_FOR_INSIGHTS` (currently 0.1)
- Displays amber alert with `AlertTriangle` icon
- Message: "Data confidence below threshold. Predictive insights suppressed."

**Data Sources:**

```typescript
// From backend state
const identityCard = {
  schema: state.read("schema_scan_output").fields,
  rowCount: state.read("dataset_identity_card").row_count,
  columnCount: state.read("dataset_identity_card").column_count,
  qualityScore: state.read("schema_scan_output").quality_score,
  confidence: state.read("confidence_report").data_confidence
}
```

---

### Panel 2: The Narrative (Center — 50%)

#### [MODIFY] [NarrativeStream.tsx](file:///c:/Users/jashs/Projects/ACE_V4/src/components/canvas/NarrativeStream.tsx)

Transform from generic markdown renderer to Pyramid Principle-driven narrative engine.

**Structural Changes:**

##### 1. Governing Thought Header

Replace generic "Intelligence Report" with declarative headlines extracted from report sections.

**Before:**

```tsx
<p className="font-mono text-xs">Intelligence Report // ACE V4</p>
```

**After:**

```tsx
<h1 className="font-serif text-4xl text-slate-900 dark:text-slate-100 mb-2">
  {extractGoverningThought(content)}
</h1>
<p className="font-mono text-xs text-slate-500 uppercase tracking-widest">
  Intelligence Report // ACE V4
</p>
```

##### 2. SCQA Story Blocks

Parse markdown sections into Situation-Complication-Question-Answer structure:

```typescript
interface SCQABlock {
  situation: string;      // Historical baseline (from "Executive Summary")
  complication: string;   // Anomalies/issues (from "Anomaly Detection")
  question: string;       // Implicit from task_contract
  answer: string;         // Strategic response (from "Business Intelligence")
}
```

**Implementation:**

- Use `extractSections()` from `reportParser.ts` to identify section boundaries
- Map sections to SCQA components based on headers
- Render each block with distinct typography:
  - **Situation**: Regular serif, neutral tone
  - **Complication**: Bold serif with amber accent
  - **Answer**: Bold serif with electric blue accent

##### 3. Task Contract Declaration

Render upfront scope disclaimer at the top of narrative:

```tsx
<div className="border-l-4 border-blue-600 bg-blue-50 dark:bg-blue-950/30 p-4 mb-8">
  <h3 className="font-sans text-sm font-semibold mb-2">Analysis Scope</h3>
  <p className="text-sm">This report covers: {allowedSections.join(", ")}</p>
  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
    Excluded: Revenue projections, causal inference (insufficient data)
  </p>
</div>
```

##### 4. Forbidden Claim Filtering

Implement section suppression logic:

```typescript
function shouldRenderSection(sectionId: string, taskContract: TaskContract): boolean {
  const allowedSections = taskContract.allowed_sections;
  const blockedAgents = taskContract.blocked_agents || [];
  
  // Map sections to required agents
  const sectionAgentMap = {
    "behavioral-clusters": "overseer",
    "outcome-modeling": "regression",
    "personas-strategies": "fabricator"
  };
  
  const requiredAgent = sectionAgentMap[sectionId];
  if (requiredAgent && blockedAgents.includes(requiredAgent)) {
    return false;
  }
  
  return allowedSections.includes(sectionId);
}
```

**Typography:**

- **Serif Font**: Merriweather (primary) with Georgia fallback for all narrative text
- **Font Sizes**:
  - H1 (Governing Thought): 2.25rem (36px)
  - H2 (Section Headers): 1.875rem (30px)
  - Body: 1.125rem (18px) for readability
- **Line Height**: 1.75 for comfortable reading
- **Max Width**: 65ch (optimal reading line length)

---

### Panel 3: The Evidence Rail (Right — 30%)

#### [MODIFY] [EvidenceRail.tsx](file:///c:/Users/jashs/Projects/ACE_V4/src/components/report/EvidenceRail.tsx)

Transform from overlay to permanent sidebar with "Lab" aesthetics.

**Structural Changes:**

##### 1. Raw Truth Aesthetics

```tsx
<div className="font-mono bg-slate-950 text-green-400 p-6 h-full overflow-y-auto">
  {/* All content in monospace */}
</div>
```

**Typography:**

- **Monospace Font**: JetBrains Mono for all data, metrics, and code
- **Color Scheme**:
  - Background: Slate-950 (#020617)
  - Text: Green-400 (#4ade80) for "terminal" aesthetic
  - Accents: Cyan-400 (#22d3ee) for interactive elements

##### 2. Click-to-Verify Wiring

Implement bidirectional linking between narrative claims and evidence:

**In NarrativeStream.tsx:**

```tsx
// Enhance the existing strong component
strong({ children, ...props }: any) {
  const text = String(children);
  const isMetric = /[%$]/.test(text) || /\d+/.test(text);
  
  if (isMetric && onClaimClick) {
    return (
      <button
        onClick={() => onClaimClick('business_pulse', extractEvidenceId(text))}
        className="font-bold text-blue-600 hover:underline cursor-pointer"
        data-evidence-id={extractEvidenceId(text)}
      >
        {children}
        <sup className="ml-1 text-xs">[i]</sup>
      </button>
    );
  }
  return <strong {...props}>{children}</strong>;
}
```

**In EvidenceRail.tsx:**

```tsx
interface EvidenceObject {
  id: string;
  type: 'business_pulse' | 'predictive_drivers' | 'correlation';
  claim: string;
  proof: {
    sql?: string;
    python?: string;
    rawData: any;
  };
  lineage: {
    sourceTable: string;
    transformations: string[];
  };
}

function EvidenceCard({ evidence, isHighlighted }: { evidence: EvidenceObject, isHighlighted: boolean }) {
  return (
    <div className={cn(
      "border border-slate-700 rounded p-4 mb-4",
      isHighlighted && "ring-2 ring-cyan-400 animate-pulse-once"
    )}>
      <h4 className="text-sm font-semibold text-cyan-400 mb-2">{evidence.claim}</h4>
      
      {/* View Source Button */}
      <Collapsible>
        <CollapsibleTrigger className="text-xs text-green-400 hover:text-green-300">
          <Code className="w-3 h-3 inline mr-1" />
          View Source
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="text-xs bg-slate-900 p-2 rounded mt-2 overflow-x-auto">
            {evidence.proof.sql || evidence.proof.python}
          </pre>
        </CollapsibleContent>
      </Collapsible>
      
      {/* Raw Data Preview */}
      <div className="mt-2 text-xs">
        <pre>{JSON.stringify(evidence.proof.rawData, null, 2)}</pre>
      </div>
    </div>
  );
}
```

##### 3. Evidence Object Generation

Create evidence objects from backend analytics:

```typescript
// In reportParser.ts
export function extractEvidenceObjects(
  markdown: string,
  enhancedAnalytics: any
): EvidenceObject[] {
  const evidence: EvidenceObject[] = [];
  
  // Business Pulse Evidence
  if (enhancedAnalytics.business_intelligence?.value_metrics) {
    evidence.push({
      id: 'total-value',
      type: 'business_pulse',
      claim: `Total Value: $${enhancedAnalytics.business_intelligence.value_metrics.total_value}`,
      proof: {
        python: `df['${enhancedAnalytics.business_intelligence.evidence.value_column}'].sum()`,
        rawData: enhancedAnalytics.business_intelligence.value_metrics
      },
      lineage: {
        sourceTable: 'active_dataset',
        transformations: ['sum aggregation']
      }
    });
  }
  
  // Correlation Evidence
  if (enhancedAnalytics.correlation_analysis?.strong_correlations) {
    enhancedAnalytics.correlation_analysis.strong_correlations.forEach((corr: any) => {
      evidence.push({
        id: `corr-${corr.feature1}-${corr.feature2}`,
        type: 'correlation',
        claim: `${corr.feature1} ↔ ${corr.feature2}: ${corr.pearson.toFixed(3)}`,
        proof: {
          python: `df[['${corr.feature1}', '${corr.feature2}']].corr(method='pearson')`,
          rawData: corr
        },
        lineage: {
          sourceTable: 'active_dataset',
          transformations: ['pearson correlation']
        }
      });
    });
  }
  
  return evidence;
}
```

---

### Visual Grammar & Subtractive Design

#### [NEW] [typography.css](file:///c:/Users/jashs/Projects/ACE_V4/src/styles/typography.css)

Centralized typography system implementing the Lab & Library ritual.

```css
/* Import Fonts */
@import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

/* Typography Ritual */
:root {
  /* The Voice of the Narrator (Serif) */
  --font-narrator: 'Merriweather', Georgia, serif;
  
  /* The Voice of the Data (Sans-Serif) */
  --font-ui: 'Inter', 'Roboto', sans-serif;
  
  /* The Voice of the Machine (Monospace) */
  --font-data: 'JetBrains Mono', 'Courier New', monospace;
  
  /* Semantic Color Architecture */
  --color-authority: #163E93;        /* Deep Navy - stability */
  --color-action: #005eb8;           /* Electric Blue - focal points */
  --color-quality-high: #22c55e;     /* Green - high quality */
  --color-quality-medium: #f59e0b;   /* Amber - medium quality */
  --color-quality-low: #ef4444;      /* Red - low quality */
  
  /* Breathing Room */
  --spacing-breathe: 10%;
}

/* Apply Typography Ritual */
.voice-narrator {
  font-family: var(--font-narrator);
  line-height: 1.75;
}

.voice-ui {
  font-family: var(--font-ui);
  line-height: 1.5;
}

.voice-data {
  font-family: var(--font-data);
  line-height: 1.4;
  letter-spacing: -0.02em;
}

/* Subtractive Design */
.data-ink-optimized {
  /* Remove all gridlines */
  --recharts-grid-stroke: transparent;
  
  /* Remove shadows */
  box-shadow: none !important;
  
  /* Remove 3D effects */
  transform: none !important;
}

/* Breathing Room Enforcement */
.breathe {
  padding: var(--spacing-breathe);
}

.breathe-x {
  padding-left: var(--spacing-breathe);
  padding-right: var(--spacing-breathe);
}

.breathe-y {
  padding-top: var(--spacing-breathe);
  padding-bottom: var(--spacing-breathe);
}
```

#### [MODIFY] [tailwind.config.ts](file:///c:/Users/jashs/Projects/ACE_V4/tailwind.config.ts)

Extend Tailwind with custom typography and color tokens:

```typescript
export default {
  theme: {
    extend: {
      fontFamily: {
        narrator: ['Merriweather', 'Georgia', 'serif'],
        ui: ['Inter', 'Roboto', 'sans-serif'],
        data: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      colors: {
        authority: '#163E93',
        action: '#005eb8',
        quality: {
          high: '#22c55e',
          medium: '#f59e0b',
          low: '#ef4444',
        },
      },
      spacing: {
        breathe: '10%',
      },
    },
  },
}
```

---

### Data Flow & Integration

#### Backend Data Requirements

**Current State (Available):**

- ✅ `schema_scan_output` — field names, types, quality_score
- ✅ `dataset_identity_card` — row_count, column_count
- ✅ `confidence_report` — data_confidence, confidence_label, reasons
- ✅ `task_contract` — allowed_sections, blocked_agents
- ✅ `enhanced_analytics` — business_intelligence, correlation_analysis, distribution_analysis, feature_importance
- ✅ `final_report` — markdown content

**New Requirements:**

- 🆕 **Evidence Objects**: Need to generate structured evidence from `enhanced_analytics` (implemented in `reportParser.ts`)
- 🆕 **SCQA Mapping**: Need to parse markdown sections into SCQA structure (implemented in `NarrativeStream.tsx`)

#### Frontend Hook Updates

**[MODIFY] [useReportData.ts](file:///c:/Users/jashs/Projects/ACE_V4/src/hooks/useReportData.ts)**

Extend to include evidence objects:

```typescript
export interface ReportData {
  runId: string;
  status: string;
  reportContent: string;
  metadata: {
    quality_score: number;
    confidence: number;
    row_count: number;
    column_count: number;
  };
  identityCard: {
    schema: Array<{ name: string; type: string }>;
    rowCount: number;
    columnCount: number;
    qualityScore: number;
    confidence: number;
  };
  evidenceObjects: EvidenceObject[];  // NEW
  taskContract: {
    allowed_sections: string[];
    blocked_agents: string[];
  };
}

export function useReportData(runId: string) {
  return useQuery({
    queryKey: ['report', runId],
    queryFn: async () => {
      const response = await fetch(`/api/runs/${runId}/report`);
      const data = await response.json();
      
      // Parse evidence objects from enhanced_analytics
      const evidenceObjects = extractEvidenceObjects(
        data.reportContent,
        data.enhanced_analytics
      );
      
      return {
        ...data,
        evidenceObjects,
      };
    },
  });
}
```

---

### File Structure Summary

```
src/
├── components/
│   ├── canvas/
│   │   ├── ThreePanelCanvas.tsx          [NEW] - Main layout container
│   │   ├── DatasetPulse.tsx              [NEW] - Left panel (The Pulse)
│   │   ├── NarrativeStream.tsx           [MODIFY] - Center panel (The Narrative)
│   │   └── IntelligenceCanvas.tsx        [DEPRECATE] - Old layout
│   └── report/
│       └── EvidenceRail.tsx              [MODIFY] - Right panel (The Lab)
├── lib/
│   └── reportParser.ts                   [MODIFY] - Add extractEvidenceObjects, extractGoverningThought
├── hooks/
│   └── useReportData.ts                  [MODIFY] - Extend with evidenceObjects
├── styles/
│   └── typography.css                    [NEW] - Typography ritual
└── pages/
    └── ReportPage.tsx                    [MODIFY] - Use ThreePanelCanvas instead of IntelligenceCanvas
```

---

## Verification Plan

### Automated Tests

```bash
# Component rendering
npm run test -- ThreePanelCanvas.test.tsx
npm run test -- DatasetPulse.test.tsx
npm run test -- NarrativeStream.test.tsx

# Integration tests
npm run test -- report-flow.test.tsx
```

**Test Coverage:**

1. **Layout Tests**: Verify three-panel grid renders correctly at different viewport sizes
2. **Scroll Tests**: Ensure independent scrolling works for center and right panels
3. **Typography Tests**: Verify correct font families are applied to narrator/ui/data elements
4. **Evidence Linking Tests**: Verify click-to-verify wiring connects narrative claims to evidence cards
5. **Safe Mode Tests**: Verify Safe Mode banner appears when confidence < 0.1

### Manual Verification

#### Desktop (1920x1080)

1. Navigate to `/report/{runId}` with a completed analysis
2. Verify three-panel layout: 20% left, 50% center, 30% right
3. Scroll center panel — left panel should remain fixed
4. Scroll right panel independently — center should not move
5. Click a bold metric in narrative — right panel should highlight corresponding evidence card
6. Click "View Source" in evidence card — should reveal SQL/Python code

#### Tablet (768x1024)

1. Left panel should collapse to hamburger menu
2. Center and right panels should resize to fill space
3. Tap hamburger — left panel should slide in as overlay

#### Mobile (375x667)

1. Single column layout with tab navigation
2. Tabs: "Overview" (Pulse), "Narrative", "Evidence"
3. Swipe between tabs should work smoothly

#### Typography Verification

1. Open browser DevTools
2. Inspect narrative text — should use Merriweather/Georgia
3. Inspect UI labels — should use Inter/Roboto
4. Inspect evidence cards — should use JetBrains Mono
5. Verify no FOUT (Flash of Unstyled Text) on page load

#### Color Verification

1. Verify Deep Navy (#163E93) used for section headers
2. Verify Electric Blue (#005eb8) used for interactive links
3. Verify quality badges use correct semantic colors (green/amber/red)
4. Test dark mode — colors should maintain contrast ratios

---

## Implementation Sequence

### Phase 1: Foundation (Tasks 1-2)

1. Create `typography.css` and update `tailwind.config.ts`
2. Create `ThreePanelCanvas.tsx` with basic grid layout
3. Create `DatasetPulse.tsx` with identity card and safe mode banner
4. **Checkpoint**: Verify layout renders and left panel is fixed

### Phase 2: Narrative Transformation (Task 3)

1. Modify `NarrativeStream.tsx` to extract governing thought
2. Implement SCQA block parsing
3. Add task contract declaration
4. Implement forbidden claim filtering
5. **Checkpoint**: Verify narrative renders with correct typography and structure

### Phase 3: Evidence Lab (Task 4)

1. Implement `extractEvidenceObjects()` in `reportParser.ts`
2. Modify `EvidenceRail.tsx` with Lab aesthetics
3. Implement click-to-verify wiring
4. Add "View Source" lineage display
5. **Checkpoint**: Verify evidence cards render and linking works

### Phase 4: Visual Polish (Task 5)

1. Apply subtractive design to all charts (remove gridlines, shadows)
2. Enforce 10% breathing room margins
3. Optimize data-ink ratio
4. **Checkpoint**: Visual QA across all breakpoints

### Phase 5: Integration & Testing

1. Update `ReportPage.tsx` to use `ThreePanelCanvas`
2. Run automated test suite
3. Manual verification across devices
4. Performance profiling (target: <100ms interaction latency)

---

## Performance Considerations

**Font Loading Strategy:**

- Use `font-display: swap` to prevent FOIT
- Preload critical fonts in `index.html`:

  ```html
  <link rel="preload" href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap" as="style">
  ```

**Scroll Performance:**

- Use `will-change: transform` on scrollable panels
- Implement virtual scrolling for evidence cards if count > 50
- Debounce scroll event handlers (16ms for 60fps)

**Bundle Size Impact:**

- Typography CSS: ~2KB
- Font files: ~50KB (Merriweather) + ~30KB (JetBrains Mono) = 80KB total
- New components: ~15KB (gzipped)
- **Total Impact**: ~97KB (acceptable for feature richness)

---

## Rollback Plan

If critical issues arise:

1. Revert `ReportPage.tsx` to use `IntelligenceCanvas`
2. Keep new components in codebase but unused
3. Feature flag: `ENABLE_THREE_PANEL_CANVAS` in environment variables
4. Gradual rollout: A/B test with 10% of users first

---

## Future Enhancements (Out of Scope for Phase I)

- **Keyboard Navigation**: Arrow keys to navigate between evidence cards
- **Export to PDF**: Preserve three-panel layout in print view
- **Collaborative Annotations**: Allow users to comment on specific evidence objects
- **Real-time Updates**: WebSocket connection to update evidence as backend recomputes
- **Accessibility**: ARIA labels for screen readers, focus management
