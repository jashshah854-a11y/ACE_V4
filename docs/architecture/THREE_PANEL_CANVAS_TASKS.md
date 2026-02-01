# Three-Panel Insight Canvas — Task Breakdown

Implementation checklist for transforming ACE_V4 into a horizontal Neural Refinery.

## Phase 1: Foundation & Layout Architecture

### Task 1.1: Typography System Setup

- [ ] Create `src/styles/typography.css` with font imports and CSS variables
- [ ] Update `tailwind.config.ts` with custom font families and color tokens
- [ ] Add font preload links to `index.html` for performance
- [ ] Test font loading with DevTools Network tab (verify FOUT prevention)

**Deliverables:**

- Typography CSS file with narrator/ui/data font families
- Tailwind config extended with custom tokens
- Fonts loading with `font-display: swap`

**Verification:**

- Inspect computed styles in DevTools
- No Flash of Unstyled Text on page load
- All three font families render correctly

---

### Task 1.2: Three-Panel Grid Container

- [ ] Create `src/components/canvas/ThreePanelCanvas.tsx`
- [ ] Implement CSS Grid with 20-50-30 column distribution
- [ ] Set `overflow-hidden` on root viewport to lock height at 100vh
- [ ] Add responsive breakpoints (desktop/tablet/mobile)
- [ ] Implement mobile tab navigation fallback

**Deliverables:**

- `ThreePanelCanvas` component with grid layout
- Responsive behavior at 1280px, 768px, 375px breakpoints
- Mobile tab navigation between panels

**Verification:**

- Resize browser window — panels should resize proportionally
- Mobile view shows tab navigation
- No horizontal scrollbar on any viewport size

---

## Phase 2: The Pulse (Left Panel — 20%)

### Task 2.1: Dataset Identity Card Component

- [ ] Create `src/components/canvas/DatasetPulse.tsx`
- [ ] Implement schema field enumeration (from `schema_scan_output`)
- [ ] Display volume metrics (rows, columns, file size)
- [ ] Add quality score badge with semantic colors
- [ ] Style with Deep Navy (#163E93) background

**Deliverables:**

- `DatasetPulse` component rendering identity card
- Schema fields displayed with data types
- Quality badge (High/Medium/Low) with correct colors

**Verification:**

- Load report with different quality scores
- Verify badge color changes (green/amber/red)
- Schema fields match backend `schema_scan_output`

---

### Task 2.2: Safe Mode Banner

- [ ] Add conditional Safe Mode banner to `DatasetPulse`
- [ ] Trigger when `confidence_score <= MIN_CONFIDENCE_FOR_INSIGHTS`
- [ ] Display amber alert with `AlertTriangle` icon
- [ ] Show message: "Data confidence below threshold"

**Deliverables:**

- Safe Mode banner component
- Conditional rendering based on confidence score
- Amber styling with warning icon

**Verification:**

- Test with low confidence dataset (< 0.1)
- Banner should appear with correct styling
- Test with high confidence — banner should not appear

---

### Task 2.3: Fixed Positioning & Scroll Lock

- [ ] Apply `position: sticky` or `position: fixed` to left panel
- [ ] Ensure panel stays visible during center/right panel scrolling
- [ ] Test on different browsers (Chrome, Firefox, Safari)

**Deliverables:**

- Left panel remains fixed during scroll
- No layout shift or jank

**Verification:**

- Scroll center panel — left panel should not move
- Scroll right panel — left panel should not move
- Test on mobile — left panel behavior should adapt

---

## Phase 3: The Narrative (Center Panel — 50%)

### Task 3.1: Governing Thought Extraction

- [ ] Add `extractGoverningThought()` function to `reportParser.ts`
- [ ] Parse first H1 or H2 from markdown as declarative headline
- [ ] Fallback to "Intelligence Report" if no suitable header found
- [ ] Update `NarrativeStream.tsx` to use extracted headline

**Deliverables:**

- `extractGoverningThought()` parser function
- Large serif H1 rendering in narrative
- Fallback logic for missing headlines

**Verification:**

- Test with various report formats
- Headline should be extracted correctly
- Fallback should work when no H1/H2 exists

---

### Task 3.2: SCQA Story Block Parser

- [ ] Create `parseSCQABlocks()` function in `reportParser.ts`
- [ ] Map markdown sections to Situation/Complication/Question/Answer
- [ ] Use section headers to identify SCQA components
- [ ] Return structured SCQA objects

**Deliverables:**

- `parseSCQABlocks()` function
- SCQA interface definition
- Section-to-SCQA mapping logic

**Verification:**

- Parse sample report markdown
- Verify correct sections mapped to SCQA components
- Handle edge cases (missing sections)

---

### Task 3.3: SCQA Block Rendering

- [ ] Update `NarrativeStream.tsx` to render SCQA blocks
- [ ] Apply distinct typography to each block type
  - Situation: Regular serif, neutral
  - Complication: Bold serif, amber accent
  - Answer: Bold serif, electric blue accent
- [ ] Add visual separators between blocks

**Deliverables:**

- SCQA blocks rendered with correct styling
- Typography differentiation between block types
- Visual hierarchy clear to users

**Verification:**

- Inspect rendered blocks in browser
- Verify font weights and colors match spec
- Test with different report content

---

### Task 3.4: Task Contract Declaration

- [ ] Extract `task_contract` from backend state
- [ ] Render scope disclaimer at top of narrative
- [ ] List allowed sections and excluded sections
- [ ] Style with blue border and background

**Deliverables:**

- Task contract declaration component
- Allowed/excluded sections displayed
- Blue accent styling

**Verification:**

- Load report with different task contracts
- Verify allowed sections listed correctly
- Excluded sections should be mentioned

---

### Task 3.5: Forbidden Claim Filtering

- [ ] Implement `shouldRenderSection()` logic
- [ ] Map sections to required agents (overseer, regression, fabricator)
- [ ] Check `blocked_agents` from task contract
- [ ] Suppress sections when required agent is blocked
- [ ] Add placeholder text for suppressed sections

**Deliverables:**

- Section filtering logic
- Placeholder text for suppressed sections
- Correct sections hidden based on task contract

**Verification:**

- Test with blocked agents (e.g., overseer blocked)
- Verify "Behavioral Clusters" section is suppressed
- Placeholder text should appear

---

### Task 3.6: Typography & Reading Optimization

- [ ] Apply Merriweather/Georgia to all narrative text
- [ ] Set font size to 1.125rem (18px) for body
- [ ] Set line height to 1.75 for readability
- [ ] Constrain max width to 65ch for optimal line length
- [ ] Add 10% breathing room margins

**Deliverables:**

- Serif typography applied to narrative
- Optimal line length and spacing
- Breathing room margins

**Verification:**

- Measure line length (should be ~65 characters)
- Verify font family in DevTools
- Check line height for comfortable reading

---

## Phase 4: The Evidence Lab (Right Panel — 30%)

### Task 4.1: Evidence Object Extraction

- [ ] Create `extractEvidenceObjects()` in `reportParser.ts`
- [ ] Parse `enhanced_analytics.business_intelligence` for value metrics
- [ ] Parse `enhanced_analytics.correlation_analysis` for correlations
- [ ] Parse `enhanced_analytics.feature_importance` for drivers
- [ ] Generate structured `EvidenceObject[]` array

**Deliverables:**

- `extractEvidenceObjects()` function
- `EvidenceObject` interface definition
- Evidence objects generated from backend analytics

**Verification:**

- Test with sample `enhanced_analytics` data
- Verify evidence objects contain correct claims and proofs
- Check lineage information is populated

---

### Task 4.2: Evidence Rail Lab Aesthetics

- [ ] Update `EvidenceRail.tsx` with terminal-style background
- [ ] Apply JetBrains Mono font to all content
- [ ] Use green-400 text color on slate-950 background
- [ ] Add cyan-400 accents for interactive elements
- [ ] Remove overlay behavior, make permanent sidebar

**Deliverables:**

- Evidence Rail with "Lab" terminal aesthetics
- Monospace typography throughout
- Green/cyan color scheme

**Verification:**

- Inspect styles in DevTools
- Verify JetBrains Mono font applied
- Check color contrast meets WCAG AA standards

---

### Task 4.3: Evidence Card Component

- [ ] Create `EvidenceCard` component within `EvidenceRail.tsx`
- [ ] Display claim, proof (SQL/Python), and raw data
- [ ] Add "View Source" collapsible section
- [ ] Implement highlight animation when linked from narrative
- [ ] Add lineage information display

**Deliverables:**

- `EvidenceCard` component
- Collapsible source code viewer
- Highlight animation on click-through

**Verification:**

- Render evidence cards with sample data
- Click "View Source" — should reveal code
- Highlight animation should trigger correctly

---

### Task 4.4: Click-to-Verify Wiring (Narrative → Evidence)

- [ ] Update `NarrativeStream.tsx` strong component to detect metrics
- [ ] Add `data-evidence-id` attribute to clickable claims
- [ ] Implement `onClaimClick` handler to scroll to evidence
- [ ] Add visual indicator (superscript [i]) to clickable claims
- [ ] Pass evidence ID to `EvidenceRail` for highlighting

**Deliverables:**

- Clickable claims in narrative
- Click handler scrolls to evidence card
- Visual indicator on hoverable claims

**Verification:**

- Click bold metric in narrative
- Right panel should scroll to corresponding evidence
- Evidence card should highlight briefly

---

### Task 4.5: Independent Scroll Context

- [ ] Set `overflow-y: auto` on right panel container
- [ ] Ensure scrolling right panel doesn't affect center panel
- [ ] Add smooth scrolling behavior
- [ ] Optimize scroll performance with `will-change: transform`

**Deliverables:**

- Independent scrolling for right panel
- Smooth scroll behavior
- No scroll jank or lag

**Verification:**

- Scroll right panel — center should not move
- Scroll center panel — right should not move
- Test with 50+ evidence cards for performance

---

## Phase 5: Visual Polish & Subtractive Design

### Task 5.1: Chart Data-Ink Optimization

- [ ] Remove gridlines from all Recharts components
- [ ] Remove shadows and 3D effects
- [ ] Simplify chart legends
- [ ] Increase contrast for data points
- [ ] Apply subtractive design principles

**Deliverables:**

- Charts with minimal non-data ink
- High data-ink ratio
- Clean, professional appearance

**Verification:**

- Inspect charts visually
- Compare before/after screenshots
- Verify data is still readable

---

### Task 5.2: Breathing Room Enforcement

- [ ] Add 10% margin to all major containers
- [ ] Ensure no content touches viewport edges
- [ ] Apply consistent spacing between sections
- [ ] Test on different screen sizes

**Deliverables:**

- 10% breathing room on all panels
- Consistent spacing throughout
- No cramped layouts

**Verification:**

- Measure margins in DevTools
- Visual inspection at different viewport sizes
- No content should touch edges

---

### Task 5.3: Color Consistency Audit

- [ ] Verify Deep Navy (#163E93) used for stability anchors
- [ ] Verify Electric Blue (#005eb8) used for action items
- [ ] Verify semantic colors for quality badges
- [ ] Test dark mode color contrast
- [ ] Ensure WCAG AA compliance

**Deliverables:**

- Consistent color usage across all panels
- Dark mode support
- WCAG AA compliant contrast ratios

**Verification:**

- Use color picker to verify hex values
- Test with dark mode toggle
- Run accessibility audit in DevTools

---

## Phase 6: Integration & Testing

### Task 6.1: Update ReportPage

- [ ] Modify `src/pages/ReportPage.tsx` to use `ThreePanelCanvas`
- [ ] Remove old `IntelligenceCanvas` import
- [ ] Pass correct props to new component
- [ ] Test routing to `/report/:runId`

**Deliverables:**

- `ReportPage` using new three-panel layout
- Correct data flow from API to components
- Routing working correctly

**Verification:**

- Navigate to report page
- Verify new layout renders
- Check for console errors

---

### Task 6.2: Update useReportData Hook

- [ ] Extend `useReportData` to include `evidenceObjects`
- [ ] Call `extractEvidenceObjects()` in query function
- [ ] Update `ReportData` interface
- [ ] Handle loading and error states

**Deliverables:**

- Updated hook with evidence objects
- Type-safe interface
- Error handling

**Verification:**

- Test with valid runId
- Verify evidence objects in React DevTools
- Test error states (invalid runId)

---

### Task 6.3: Automated Testing

- [ ] Write unit tests for `extractGoverningThought()`
- [ ] Write unit tests for `parseSCQABlocks()`
- [ ] Write unit tests for `extractEvidenceObjects()`
- [ ] Write component tests for `ThreePanelCanvas`
- [ ] Write integration test for click-to-verify flow

**Deliverables:**

- Test suite with >80% coverage
- All tests passing
- Integration tests for key flows

**Verification:**

- Run `npm run test`
- Check coverage report
- All tests should pass

---

### Task 6.4: Manual QA — Desktop

- [ ] Test on Chrome (1920x1080)
- [ ] Test on Firefox (1920x1080)
- [ ] Test on Safari (1920x1080)
- [ ] Verify three-panel layout renders correctly
- [ ] Test scroll independence
- [ ] Test click-to-verify linking
- [ ] Test typography rendering

**Deliverables:**

- QA checklist completed
- Screenshots of each browser
- Bug reports for any issues

**Verification:**

- All browsers render consistently
- No layout bugs
- All interactions work

---

### Task 6.5: Manual QA — Tablet & Mobile

- [ ] Test on iPad (768x1024)
- [ ] Test on iPhone (375x667)
- [ ] Verify responsive breakpoints
- [ ] Test mobile tab navigation
- [ ] Test touch interactions

**Deliverables:**

- Mobile QA checklist completed
- Device screenshots
- Bug reports

**Verification:**

- Mobile layout adapts correctly
- Tab navigation works
- Touch interactions smooth

---

### Task 6.6: Performance Profiling

- [ ] Run Lighthouse audit
- [ ] Measure Time to Interactive (TTI)
- [ ] Measure First Contentful Paint (FCP)
- [ ] Profile scroll performance (60fps target)
- [ ] Check bundle size impact

**Deliverables:**

- Lighthouse report with >90 score
- Performance metrics documented
- Bundle size analysis

**Verification:**

- TTI < 3 seconds
- FCP < 1.5 seconds
- Scroll at 60fps
- Bundle increase < 100KB

---

## Summary

**Total Tasks:** 23
**Estimated Effort:** 5-7 days (1 developer)
**Critical Path:** Tasks 1.1 → 1.2 → 2.1 → 3.1 → 4.1 → 6.1

**Dependencies:**

- Typography system must be complete before any component work
- Evidence extraction must be complete before Evidence Rail work
- All components must be complete before integration testing

**Risk Mitigation:**

- Keep old `IntelligenceCanvas` as fallback
- Feature flag for gradual rollout
- Comprehensive testing before production deployment
