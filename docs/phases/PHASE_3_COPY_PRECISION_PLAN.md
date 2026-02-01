# Phase 3: Copy Precision, Decision Clarity, and Trust Calibration

**Purpose:** Turn structurally sound Run Overview into decision-ready surface users trust and act on without hesitation.

**Status:** In Progress  
**Date:** January 15, 2026

---

## Core Principles

1. **Clarity beats completeness** — Show what matters, hide the rest
2. **Every number must mean something** — No orphan percentages
3. **Every warning must explain impact and recovery** — Actionable guidance
4. **Tone must be calm, competent, and human** — No alarmism
5. **No ambiguity in recommendations** — Concrete, verb-first CTAs

---

## Task Breakdown

### ✅ Task 1: Finalize Trust and Confidence Language

**Goal:** Make trust levels instantly understandable

**Actions:**

1. Audit all numeric scores (no orphan numbers)
2. Standardize trust labels with clear guidance
3. Add one-line explanations for key scores

**Trust Level Copy:**

```typescript
{
  low: {
    label: "Low confidence",
    guidance: "Results are exploratory only and should not inform decisions"
  },
  moderate: {
    label: "Moderate confidence", 
    guidance: "Use for directional insight, not forecasts or commitments"
  },
  high: {
    label: "High confidence",
    guidance: "Suitable for planning and evaluation"
  }
}
```

**Score Explanations:**

- **Confidence:** "Reflects data completeness and allowed analysis depth"
- **Data Clarity:** "Measures schema consistency and cleanliness"
- **Records Analyzed:** "Sample size for statistical reliability"

---

### ✅ Task 2: Harden Recommendations and CTAs

**Goal:** Ensure every action is concrete and unambiguous

**CTA Rules:**

- Start with a verb
- Describe the outcome
- Avoid generic phrases

**Before/After Examples:**

| Bad (Generic) | Good (Concrete) |
|---------------|-----------------|
| "Fix dataset" | "Add target and time fields to unlock forecasting" |
| "View details" | "Review validation errors and fix data issues" |
| "Open lab" | "Generate customer personas and strategies" |

**Rationale Requirement:**
Every CTA must answer "why this matters" in one sentence.

---

### ✅ Task 3: Define Edge Case and Precedence Rules

**Goal:** Prevent conflicting messages in mixed states

**Message Precedence (highest to lowest):**

1. Failed (critical errors)
2. Critical validation issue
3. Governance block
4. Limitations
5. Normal

**Hero Message Rules:**

- Must reflect highest severity state
- Cannot contradict details sections
- Must be consistent across all cards

**Mixed State Examples:**

- Clean data + governance blocks → Show "Limited analysis mode"
- High confidence + missing target → Trust remains "Moderate"
- All checks pass + no blocks → Show "Full analysis enabled"

---

### ✅ Task 4: Tone and Language Refinement

**Goal:** Calm, credible, non-defensive tone

**Remove Alarmist Language:**

- ❌ "suppressed", "blocked", "prohibited"
- ✅ "not available for this run", "restricted due to setup", "requires additional data"

**Remove Hedging:**

- ❌ "may", "might", "potentially"
- ✅ Use definitive statements

**Ensure Failures Feel Fixable:**
Every failure message must include clear recovery path.

**Example Rewrites:**

- Before: "Agent suppressed by governance"
- After: "Persona generation requires additional data fields"

---

### ✅ Task 5: Reduce Cognitive Load

**Goal:** Effortless to read and act on

**Rules:**

- One idea per sentence
- Max 3 sentences per paragraph
- Convert paragraphs to single-line explanations where possible
- Each card answers ONE question only

**Audit Checklist:**

- [ ] Executive summary ≤ 140 chars
- [ ] Bullets ≤ 4 items
- [ ] Each bullet ≤ 20 words
- [ ] KPI meanings ≤ 15 words
- [ ] Issue descriptions ≤ 2 sentences

---

### ✅ Task 6: Final Usability Validation

**Goal:** Confirm page supports confident action

**10-Second Scan Test:**

- [ ] Run status obvious
- [ ] Trust level obvious
- [ ] Next action obvious
- [ ] No confusion about limitations

**Validation Question:**
"Do you feel confident acting on this page?"

- Any hesitation → Copy rewrite required

---

## Implementation Files

### Files to Update

1. `src/lib/kpiNormalizer.ts` — Update KPI meanings
2. `src/lib/issueRegistry.ts` — Refine issue copy
3. `src/lib/runSummaryMapper.ts` — Update executive summary generation
4. `src/components/run-summary/NextStepCard.tsx` — Harden CTAs
5. `src/components/run-summary/RunHeader.tsx` — Update trust guidance

---

## Out of Scope

- ❌ New backend logic
- ❌ New KPIs
- ❌ New visual components
- ❌ New lab features
- ❌ New scoring models

---

## Success Criteria

- [ ] All numbers explained
- [ ] All CTAs concrete and outcome-based
- [ ] No contradictory messages
- [ ] Tone calm and confident
- [ ] Warnings actionable
- [ ] Page passes 10-second scan test
- [ ] User feels confident acting

---

## Completion State

**Result:** Run Overview is decision-ready  
**Product Quality:** Feels intentional, credible, and usable  
**Ready For:** Future feature expansion without UX debt

---

**Status:** Ready to implement  
**Estimated Time:** 3-4 hours
