# Phase 0: Run Overview Guardrails — Implementation Guide

**Purpose:** Prevent the Run Overview page from becoming another log dump by establishing strict narrative contracts, content budgets, and scope boundaries.

---

## Quick Start

This specification defines **what the Run Overview page must answer** and **what it must hide by default**.

### Three Core Questions (in order)

1. **Is this run valid?** → Trust signals, mode, status
2. **What did we learn?** → KPIs, executive summary, key takeaways
3. **What should we do next?** → Primary CTA, Lab access

**Rule:** Everything on the page maps to one of these questions, or it's hidden behind an accordion.

---

## First Viewport Contract

### ✅ Must Contain (Above the fold)

- Run title + short ID (first 8 chars)
- Mode label ("Full analysis" / "Limited" / "Failed")
- Trust summary (confidence %, data quality %)
- 3-4 KPI tiles (max 6 lines each)
- One executive summary sentence (≤140 chars)
- Primary next step CTA

### ❌ Must NOT Contain (Default view)

- Raw JSON
- Agent names ("overseer", "fabricator")
- Orchestration terms ("identity contract", "SCQA")
- Long diagnostics lists
- Multiple executive summaries

---

## Content Budgets

| Element | Limit | Enforcement |
|---------|-------|-------------|
| Executive one-liner | 140 chars | Hard truncate |
| Executive bullets | 4 max | Take top 4 by priority |
| Total default bullets | 10 max | Rest go to accordions |
| KPI cards | 3-4 | Show top 4 by importance |
| Accordions open by default | 0 | All collapsed |

---

## Run States

### Normal

- **Meaning:** All insights allowed, data passes checks
- **Hero Label:** "Full analysis enabled"
- **Badge:** Success (green)

### Limitations

- **Meaning:** Valid but restricted (missing data/governance)
- **Hero Label:** "Limited analysis mode"
- **Badge:** Warning (yellow)

### Failed

- **Meaning:** Cannot be trusted (critical errors)
- **Hero Label:** "Run failed"
- **Badge:** Danger (red)

---

## Information Architecture

### Page Sections (in order)

1. **Run Snapshot Hero** — Title, status, trust signals
2. **What this means for you** — Executive summary (≤140 chars)
3. **Key KPIs** — 3-4 tiles, max 6 lines each
4. **Details accordions** — All collapsed by default
5. **Next steps and Lab access** — Primary CTA

### Details Accordions (collapsed by default)

- Data quality and validation
- Governance and limitations
- Story of this run
- Run metadata
- Raw JSON

---

## Copy Translation Rules

### Forbidden Terms (default view)

- ❌ "overseer", "fabricator", "agent suppressed"
- ❌ "identity contract", "SCQA headings"
- ❌ "priority %" without explanation

### Allowed (if expanded under "Technical")

- ✅ Raw agent logs
- ✅ Full diagnostic payload
- ✅ Scoring breakdown details

### Translation Pattern (for every technical item)

```
User-facing title: [short plain label]
What it means: [one sentence]
Impact: [one sentence]
How to fix: [one sentence]
```

**Example:**

```
Title: Data completeness
What it means: 95% of required fields have values
Impact: High-quality insights are available
How to fix: N/A (already passing)
```

---

## Visual Tokens

### Status Badges

- **Normal:** Success badge, calm positive tone
- **Limitations:** Warning badge, calm caution tone
- **Failed:** Danger badge, clear error tone

**Usage limits:**

- Only badges, icons, and thin card accents
- No full card background fills for status

### Card Rhythm Rules

Every card must have:

1. A title
2. One primary value or statement
3. One meaning line
4. Max 6 lines in default state

---

## Scope Boundaries

### ✅ In Scope (Phases 0-2)

- Run summary page layout restructure
- Copy rewrite and translation rules
- Progressive disclosure for technical details
- Component contracts and page hierarchy
- Stable view model shape definition

### ❌ Out of Scope (Initial Release)

- Backend inference improvements
- New modeling features
- New scoring algorithms
- New lab tools
- Run comparison dashboards
- Dataset upload flow changes

### Backend Change Policy

**Rule:** Phase 2 must work with current API output, using a mapper in the UI layer.  
**Exception:** Additive fields allowed only if they already exist in backend output but are unused.

---

## CTA Rules

| CTA | Show When | Otherwise |
|-----|-----------|-----------|
| Open Strategy Lab | `allowed === true` | Disabled with reason |
| View Evidence Console | `allowed === true` | Disabled with reason |
| Fix dataset | Always | N/A (always primary) |

---

## 10-Second Scan Test (Definition of Done)

User can answer without scrolling past KPI row:

1. ✅ Is it usable?
2. ✅ What is blocked?
3. ✅ Top 2-3 takeaways
4. ✅ Next action

**Pass criteria:**

- All answers visible above the fold
- Blocked features shown as disabled with reason
- Next action is a single primary CTA

---

## Implementation Checklist

- [ ] Narrative order locked (3 questions)
- [ ] First viewport contract locked
- [ ] Definition of done measurable (10-second scan test)
- [ ] Content budgets agreed (140 chars, 4 bullets, etc.)
- [ ] Run states defined with labels
- [ ] Scope boundaries documented
- [ ] Section IA and CTA rules decided
- [ ] Copy translation policy decided
- [ ] Visual token rules decided
- [ ] Handoff package assembled

---

## Files

- **Spec:** `PHASE_0_RUN_OVERVIEW_SPEC.json`
- **Guide:** `PHASE_0_README.md` (this file)

---

**Next:** Implement Phase 1 (Component contracts) using this specification as the guardrail.
