# Phase 2: Page Architecture and UI Refactor — Implementation Plan

**Purpose:** Build a calm, narrative-driven Run Overview page using RunSummaryViewModel.

**Status:** In Progress  
**Date:** January 15, 2026

---

## Guiding Principles

1. **Narrative before detail** — Answer-first, context later
2. **Hierarchy over completeness** — Show what matters, hide the rest
3. **One reading path** — Top to bottom, no jumping
4. **Progressive disclosure** — Technical depth behind accordions
5. **No backend knowledge** — Components read only from RunSummaryViewModel

---

## Page Structure (Vertical Rhythm)

### Above the Fold

1. **Run Snapshot Hero** — Title, mode badge, trust signals
2. **Executive Summary** — One-liner (140 chars max)
3. **Key KPIs** — 3-4 cards in a row
4. **Primary CTA** — "Fix dataset issues"

### Below the Fold

5. **Details Accordions** — All collapsed by default
2. **Next Steps** — Secondary actions
3. **Lab Access** — Available/disabled tools

---

## Component Tree

```
RunSummaryPage
├── RunHeader
│   ├── RunTitle (id + mode badge)
│   ├── TrustBadge (confidence %)
│   └── DatasetFacts (rows, columns)
├── ExecutiveSummaryCard
│   ├── Heading
│   └── BulletList (max 4)
├── KpiRow
│   └── KpiCard[] (3-4 cards)
├── AccordionGroup
│   ├── ValidationAccordion
│   ├── GovernanceAccordion
│   ├── SCQAAccordion
│   ├── MetadataAccordion
│   └── RawJsonAccordion
├── NextStepCard
│   └── ActionChecklist
└── LabAccessCard
    ├── AvailableTools
    └── DisabledTools (with reasons)
```

---

## Component Responsibilities

### RunHeader

**Renders:**

- Run ID (short) + copy button
- Mode badge (normal/limitations/failed)
- Trust badge (confidence %)
- Dataset facts (rows, columns, time coverage)

**Does NOT render:**

- Warnings or diagnostics
- Raw values without labels
- Agent names or technical terms

### ExecutiveSummaryCard

**Renders:**

- Section heading ("What This Means For You")
- One-liner (max 140 chars)
- Up to 4 bullets

**Rules:**

- No duplication with KPIs
- Business language only
- No SCQA labels

### KpiCard

**Renders:**

- Label (e.g., "Confidence")
- Value (e.g., "85%")
- Status indicator (good/warning/bad)
- Meaning line (one sentence)

**Rules:**

- Max 6 lines per card
- No raw scores without context
- Consistent visual rhythm

### AccordionSection

**Renders:**

- Title + issue count badge
- Collapsed summary (one line)
- Expanded content (issues list)

**Auto-open rules:**

- Validation accordion opens if `mode === 'failed'`
- All others collapsed by default

---

## Accordion Sections (in order)

1. **Data Quality and Validation**
   - Shows: `limitations.validationIssues`
   - Auto-open: If `mode === 'failed'`

2. **Governance and Limitations**
   - Shows: `limitations.governanceBlocks`
   - Auto-open: Never

3. **Story of This Run**
   - Shows: `technical.scqaNarrative`
   - Auto-open: Never

4. **Run Metadata**
   - Shows: `technical.metadataTable`
   - Auto-open: Never

5. **Raw Technical Output**
   - Shows: `technical.rawJson`
   - Auto-open: Never

---

## Visual Hierarchy

### Typography Levels

- **Page Title**: 2rem, bold
- **Section Title**: 1.5rem, semibold
- **Card Title**: 1.125rem, medium
- **Body Text**: 1rem, regular
- **Helper Text**: 0.875rem, muted

### Density Rules

- No card shows more than one primary idea
- No section shows more than one warning paragraph
- Lists longer than 5 items must be collapsed

---

## Status Rendering

### Mode Badges

- **Normal**: Green badge, "Full analysis enabled"
- **Limitations**: Yellow badge, "Limited analysis mode"
- **Failed**: Red badge, "Run failed"

### Trust Badges

- **High (≥70%)**: Green, "High confidence"
- **Moderate (40-69%)**: Yellow, "Moderate confidence"
- **Low (<40%)**: Red, "Low confidence"

### Disabled CTAs

- Show tooltip with reason
- Gray out button
- No click action

---

## Responsive Behavior

### Mobile Stacking Order

1. Run Snapshot Hero
2. Primary CTA (sticky)
3. Executive Summary
4. KPIs (stacked vertically)
5. Next Steps
6. Accordions

### Sticky CTA

- Visible when primary CTA scrolls off screen
- Fixed to bottom of viewport
- "Fix dataset issues" action

---

## Acceptance Criteria (10-Second Scan Test)

User can answer without scrolling:

- ✅ Is this run usable?
- ✅ What is blocked?
- ✅ Top 2-3 takeaways
- ✅ Next action

**Pass criteria:**

- All answers visible above KPI row
- No engine internals visible
- Single primary CTA

---

## File Structure

```
src/
├── pages/
│   └── RunSummaryPage.tsx (new)
├── components/
│   └── run-summary/
│       ├── RunHeader.tsx
│       ├── ExecutiveSummaryCard.tsx
│       ├── KpiRow.tsx
│       ├── KpiCard.tsx
│       ├── AccordionGroup.tsx
│       ├── AccordionSection.tsx
│       ├── NextStepCard.tsx
│       └── LabAccessCard.tsx
```

---

## Implementation Order

1. ✅ Create component structure
2. ✅ Implement RunHeader
3. ✅ Implement ExecutiveSummaryCard
4. ✅ Implement KpiRow + KpiCard
5. ✅ Implement AccordionGroup + AccordionSection
6. ✅ Implement NextStepCard
7. ✅ Implement LabAccessCard
8. ✅ Wire up RunSummaryPage
9. ✅ Test with fixtures
10. ✅ Verify 10-second scan test

---

**Status:** Ready to implement  
**Estimated Time:** 6-8 hours
