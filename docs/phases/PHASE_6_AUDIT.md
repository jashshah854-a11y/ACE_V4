# Phase 6 Feature Freeze Audit

## A1 Core Product Statement
This product helps executives understand the top drivers, risks, and actions in their dataset in order to decide the next business move.

## A2 Primary User and Job
Primary user: Executive making a quarterly decision from a single dataset.

Secondary users are not scope drivers in Phase 6.

---

## B1 Feature Inventory

Legend: classification = core / supporting / diagnostic / ornamental

1) Executive Pulse (governing thought, key metrics, supporting evidence, actions, trust summary)  
- user: executive  
- decision: “What should I do next, and why?”  
- dependencies: run manifest, report artifacts, trust model  
- trust dependency: required  
- classification: core  
- maintenance cost: medium

2) Reports list (history + diagnostics hints)  
- user: executive  
- decision: “Which run should I open?”  
- dependencies: run history, diagnostics cache  
- trust dependency: low  
- classification: supporting  
- maintenance cost: low

3) Pipeline status page (run progress)  
- user: operator  
- decision: “Is the run healthy?”  
- dependencies: orchestrator state, run manifest  
- trust dependency: medium  
- classification: diagnostic  
- maintenance cost: medium

4) Diagnostics page  
- user: operator  
- decision: “Why did sections gate?”  
- dependencies: run manifest, diagnostics artifacts  
- trust dependency: high  
- classification: diagnostic  
- maintenance cost: medium

5) Driver & correlation cards (TopDrivers, Correlations)  
- user: executive  
- decision: “What’s influencing outcomes?”  
- dependencies: regression + correlation artifacts  
- trust dependency: high  
- classification: supporting  
- maintenance cost: medium

6) Narrative blocks (headline + sentiment blocks)  
- user: executive  
- decision: “What does it mean?”  
- dependencies: report markdown + governed report  
- trust dependency: medium  
- classification: supporting  
- maintenance cost: low

---

## B2 Feature Classification Summary
- Core: Executive Pulse
- Supporting: Reports list, driver/correlation cards, narrative blocks
- Diagnostic: Pipeline status, Diagnostics page
- Ornamental: none (removed)

---

## C1 Value Scoring (1–5 each)
Executive Pulse: impact 5, frequency 5, clarity 5, trust 5 → 20  
Reports list: impact 3, frequency 4, clarity 3, trust 2 → 12  
Pipeline status: impact 2, frequency 2, clarity 2, trust 3 → 9  
Diagnostics page: impact 2, frequency 2, clarity 3, trust 4 → 11  
Drivers/correlations: impact 4, frequency 4, clarity 4, trust 4 → 16  
Narrative blocks: impact 3, frequency 4, clarity 4, trust 3 → 14

## C2 Cost Scoring (1–5 each)
Executive Pulse: complexity 3, bug surface 3, performance 2, test burden 3, copy burden 3 → 14  
Reports list: complexity 2, bug surface 2, performance 1, test burden 1, copy burden 1 → 7  
Pipeline status: complexity 3, bug surface 3, performance 2, test burden 3, copy burden 1 → 12  
Diagnostics page: complexity 3, bug surface 3, performance 2, test burden 3, copy burden 1 → 12  
Drivers/correlations: complexity 3, bug surface 3, performance 3, test burden 3, copy burden 2 → 14  
Narrative blocks: complexity 2, bug surface 2, performance 1, test burden 2, copy burden 2 → 9

## C3 Keep/Remove Matrix
No remaining feature has cost > value + 3. All retained features stay.

---

## D1 Removals Executed (Hard Deletes)
- Quick Summary view + summary engine + summary API
- Story mode endpoint + story generator
- Intelligence Canvas + Evidence Lab
- Strategy Lab + simulation engine + simulate APIs
- Ask ACE + contextual intelligence + Gemini client
- Outcome tagging prompt + query rail + feedback widgets
- Run Summary page + run-summary components
- Personas surface (PersonaDeck) + StorySkeleton

---

## E1 Canonical Report Flow (Executive)
1) Governing thought  
2) Key metrics  
3) Supporting evidence (drivers + correlations + narrative)  
4) Actions  
5) Trust summary  

## E2 Section Count Limit
Primary view must not exceed 7 visible sections.

---

## H1/H2 Tests Added
- Snapshot of view policy: `backend/tests/test_phase6_view_policy_snapshot.py`
- Section count limit enforced in same test and dev invariant hook.

