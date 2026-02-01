# Manual QA Golden Run — Test Plan

**Date:** January 15, 2026  
**Status:** Ready for Execution  
**Test Dataset:** `extreme_imbalance.csv` (25.1% churn risk verification)

---

## Pre-Flight Checklist

### Environment Setup

- [ ] Backend running on `http://localhost:8000`
- [ ] Frontend running on `http://localhost:5173` (or configured port)
- [ ] `extreme_imbalance.csv` uploaded and analyzed
- [ ] Run ID obtained from upload response
- [ ] Browser DevTools open (Console + Network tabs)

### Browser Targets

- [ ] Chrome (Latest) — Primary test browser
- [ ] Firefox (Latest) — Secondary test browser
- [ ] Safari (Latest) — macOS/iOS compatibility

### Device Targets

- [ ] Desktop (1920x1080) — Full triptych layout
- [ ] Tablet (iPad — 1024x768) — Hybrid layout
- [ ] Mobile (iPhone 14 Pro — 393x852) — Tab navigation

---

## Test Suite 1: Three-Panel Layout Verification

### Desktop (≥1280px)

**Test 1.1: Grid Distribution**

- [ ] Open report at `/report/{runId}`
- [ ] Verify three panels visible
- [ ] Measure widths: Left ~20%, Center ~50%, Right ~30%
- [ ] Check no horizontal scroll on viewport

**Test 1.2: Independent Scrolling**

- [ ] Scroll center panel → Left panel stays fixed
- [ ] Scroll right panel → Center panel doesn't move
- [ ] Verify smooth scroll (no jank, 60fps)

**Test 1.3: Panel Boundaries**

- [ ] Left panel has right border (visible separator)
- [ ] Right panel has left border with cyan accent
- [ ] No gaps between panels

**Expected Result:**

```
┌──────┬────────────────────┬──────────┐
│ 20%  │       50%          │   30%    │
│ Pulse│    Narrative       │   Lab    │
│      │                    │          │
│ FIXED│    SCROLLABLE      │SCROLLABLE│
└──────┴────────────────────┴──────────┘
```

---

## Test Suite 2: Typography & Visual Grammar

### Font Loading

**Test 2.1: Font Families**

- [ ] Open DevTools → Network → Filter "font"
- [ ] Verify Merriweather loaded (narrator voice)
- [ ] Verify Inter loaded (UI voice)
- [ ] Verify JetBrains Mono loaded (data voice)

**Test 2.2: Typography Application**

- [ ] Governing Thought: Merriweather, 2.25rem, font-weight 900
- [ ] Narrative body: Merriweather, 1.125rem, line-height 1.75
- [ ] Evidence Lab: JetBrains Mono, 0.8125rem
- [ ] UI labels: Inter, 0.875rem

**Test 2.3: Color Palette**

- [ ] Authority color (#163E93) on governing thought
- [ ] Action color (#005eb8) on interactive claims
- [ ] Lab background (#020617) on right panel
- [ ] Lab text (#4ade80) on evidence cards

**Expected Result:**

- Governing thought is large, bold, serif, navy blue
- Narrative is readable serif with comfortable line height
- Evidence Lab has terminal-style green text on dark background

---

## Test Suite 3: Click-to-Verify Flow (CRITICAL)

### Setup

- [ ] Navigate to report with `extreme_imbalance.csv`
- [ ] Locate narrative claim: "25.1% churn risk" or similar metric

**Test 3.1: Claim Detection**

- [ ] Verify claim has `[i]` superscript indicator
- [ ] Hover over claim → cursor changes to pointer
- [ ] Claim has dotted underline (`.claim-interactive`)

**Test 3.2: Click Interaction**

- [ ] Click claim with `[i]` indicator
- [ ] Observe console log: `[Click-to-Verify] User clicked claim: ...`
- [ ] Right panel (Evidence Lab) opens if closed

**Test 3.3: Smooth Scroll**

- [ ] Evidence card scrolls into view
- [ ] Scroll behavior is smooth (not instant jump)
- [ ] Card centers in viewport (`block: 'center'`)

**Test 3.4: Pulse Animation**

- [ ] Active evidence card highlights
- [ ] Border changes to cyan (`#22d3ee`)
- [ ] Background pulses (transparent → cyan/20 → transparent)
- [ ] Animation duration: 1.5s
- [ ] Animation runs at 60fps (no stuttering)

**Test 3.5: Evidence Card Content**

- [ ] Card shows claim: "25.1% churn risk" or equivalent
- [ ] Type badge displays (e.g., "∑ BUSINESS PULSE")
- [ ] Source table shown: `active_dataset`
- [ ] Transformation steps listed

**Expected Result:**

```
User clicks: "**25.1%**[i] churn risk"
             ↓
Evidence Lab scrolls to card
             ↓
Card highlights with cyan border
             ↓
Background pulses for 1.5s
             ↓
User sees: ∑ BUSINESS PULSE
           At Risk: 25.1%
           📊 active_dataset  🌿 3 steps
```

---

## Test Suite 4: SCQA Story Blocks

**Test 4.1: Governing Thought**

- [ ] Governing thought appears at top of narrative
- [ ] Large serif font (Merriweather, 2.25rem)
- [ ] Navy blue color (#163E93)
- [ ] Declarative statement (not question)

**Test 4.2: SCQA Block Rendering**

- [ ] Situation block: Gray text, subtle background
- [ ] Complication block: Amber left border, bold text
- [ ] Answer block: Blue left border, bold text
- [ ] Labels: "Context", "Complication", "Strategic Response"

**Test 4.3: Task Contract**

- [ ] Task contract box appears after governing thought
- [ ] Blue left border (`border-action`)
- [ ] Allowed sections shown with green checkmarks
- [ ] Excluded sections listed clearly

**Expected Result:**

```
┌─────────────────────────────────────┐
│ Revenue increased 12% driven by     │
│ a 40% surge in the Northeast        │
│ ═══════════════════════════════════ │
│                                     │
│ 📋 Analysis Scope & Task Contract   │
│ ✓ Insights  ✓ Quality  ✓ BI         │
│ ✗ Predictive Modeling (no data)     │
│                                     │
│ ─────────────────────────────────── │
│ Context                             │
│ We are the market leader...         │
│                                     │
│ ⚠ Complication                      │
│ New competitor eroded 5% share...   │
│                                     │
│ → Strategic Response                │
│ Focus retention on high-value...    │
└─────────────────────────────────────┘
```

---

## Test Suite 5: Evidence Lab Features

**Test 5.1: Terminal Aesthetics**

- [ ] Background color: #020617 (slate-950)
- [ ] Text color: #4ade80 (green-400)
- [ ] Accent color: #22d3ee (cyan-400)
- [ ] Font: JetBrains Mono throughout

**Test 5.2: Operator Glyphs**

- [ ] Business Pulse: ∑ (summation)
- [ ] Predictive Drivers: ∫ (integration)
- [ ] Correlation: ≈ (approximation)
- [ ] Distribution: Δ (delta)
- [ ] Quality: √ (square root)

**Test 5.3: Code Snippet Expansion**

- [ ] Click chevron to expand evidence card
- [ ] Code snippet appears in black box
- [ ] Syntax: Green text on black background
- [ ] Horizontal scroll if code is long

**Test 5.4: Data Lineage**

- [ ] Source table displayed with database icon
- [ ] Transformation steps shown as bulleted list
- [ ] Result shown with checkmark icon
- [ ] Visual flow: top-to-bottom

**Expected Result:**

```
┌─────────────────────────────────────┐
│ ∑ BUSINESS PULSE                [v] │
│ Total Value: $1,234,567             │
│ ─────────────────────────────────── │
│ 📊 active_dataset  🌿 3 steps       │
├─────────────────────────────────────┤
│ 💻 SOURCE CODE                      │
│ ┌─────────────────────────────────┐ │
│ │ df['revenue'].sum()             │ │
│ │ # Result: $1,234,567            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 🌿 DATA LINEAGE                     │
│ ● Source: active_dataset            │
│   · sum aggregation                 │
│   · currency formatting             │
│   ✓ Result: Total Value: $1.2M     │
└─────────────────────────────────────┘
```

---

## Test Suite 6: Subtractive Design Verification

**Test 6.1: Chart Cleanliness**

- [ ] No gridlines on any charts
- [ ] No drop shadows
- [ ] No 3D effects
- [ ] No background patterns

**Test 6.2: Breathing Room**

- [ ] 10% margin on narrative content (`px-breathe`)
- [ ] Content doesn't touch viewport edges
- [ ] Comfortable whitespace between sections

**Test 6.3: Data-Ink Ratio**

- [ ] Only essential visual elements present
- [ ] No decorative borders or dividers
- [ ] Focus on data, not chrome

---

## Test Suite 7: Safe Mode Enforcement

**Test 7.1: Low Confidence Detection**

- [ ] Upload dataset with confidence < 0.1
- [ ] Safe Mode banner appears below governing thought
- [ ] Banner has amber background and left border
- [ ] Message explains why insights are suppressed

**Test 7.2: Content Suppression**

- [ ] Speculative insights not shown
- [ ] Only descriptive statistics displayed
- [ ] Task contract shows excluded sections

**Expected Result:**

```
┌─────────────────────────────────────┐
│ ⚠ Safe Mode Active                  │
│ Data confidence below threshold     │
│ (8%). Predictive insights           │
│ suppressed. Displaying descriptive  │
│ statistics only.                    │
└─────────────────────────────────────┘
```

---

## Test Suite 8: Mobile Tab Navigation

### Mobile (iPhone 14 Pro — 393x852)

**Test 8.1: Tab Bar Rendering**

- [ ] Three tabs visible: Overview, Narrative, Evidence
- [ ] Icons displayed: 📊 📖 🔬
- [ ] Active tab highlighted with blue underline
- [ ] Tab bar sticky at top

**Test 8.2: Tab Switching**

- [ ] Tap "Overview" → Dataset Pulse panel shown
- [ ] Tap "Narrative" → SCQA story blocks shown
- [ ] Tap "Evidence" → Evidence Lab shown
- [ ] Smooth transition (no flash)

**Test 8.3: Panel Content**

- [ ] Overview: Navy background, white text, identity card
- [ ] Narrative: White background, serif text, SCQA blocks
- [ ] Evidence: Dark background, green text, evidence cards

**Test 8.4: Click-to-Verify on Mobile**

- [ ] Click claim in Narrative tab
- [ ] Auto-switch to Evidence tab
- [ ] Evidence card highlighted
- [ ] Smooth scroll to card

**Expected Result:**

```
┌─────────────────────────────────────┐
│ 📊 Overview │ 📖 Narrative │ 🔬 Evidence │
│ ─────────────────────────────────── │
│                                     │
│  [Active tab content displayed]     │
│                                     │
└─────────────────────────────────────┘
```

---

## Test Suite 9: Cross-Browser Compatibility

### Chrome

- [ ] All tests pass
- [ ] Smooth scroll works
- [ ] Fonts render correctly
- [ ] Animations run at 60fps

### Firefox

- [ ] Grid layout matches Chrome
- [ ] Scroll behavior identical
- [ ] Typography consistent
- [ ] No rendering glitches

### Safari

- [ ] Webkit-specific CSS works
- [ ] Fonts load properly
- [ ] Smooth scroll supported
- [ ] No layout shifts

---

## Test Suite 10: Performance Verification

**Test 10.1: Load Time**

- [ ] Open DevTools → Performance tab
- [ ] Record page load
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s

**Test 10.2: Scroll Performance**

- [ ] Open DevTools → Performance tab
- [ ] Record scroll interaction
- [ ] Frame rate: 60fps (16.67ms per frame)
- [ ] No dropped frames

**Test 10.3: Animation Performance**

- [ ] Click claim to trigger pulse animation
- [ ] Record animation in Performance tab
- [ ] Animation runs at 60fps
- [ ] No layout thrashing

**Test 10.4: Memory Usage**

- [ ] Open DevTools → Memory tab
- [ ] Take heap snapshot
- [ ] Total memory < 50MB
- [ ] No memory leaks after interactions

---

## Critical Path Test (End-to-End)

**Scenario:** Executive reviews churn risk report on mobile during board meeting

1. **Upload Dataset**
   - [ ] Upload `extreme_imbalance.csv`
   - [ ] Wait for analysis to complete
   - [ ] Navigate to `/report/{runId}`

2. **Mobile View**
   - [ ] Open on iPhone (or responsive mode)
   - [ ] Verify tab navigation appears
   - [ ] Default tab: Narrative

3. **Read Governing Thought**
   - [ ] Governing thought visible and readable
   - [ ] Font size appropriate for mobile (1.875rem)
   - [ ] No horizontal scroll

4. **Review SCQA Blocks**
   - [ ] Situation, Complication, Answer blocks visible
   - [ ] Labels clear and distinct
   - [ ] Comfortable reading experience

5. **Click-to-Verify**
   - [ ] Tap "25.1% churn risk" claim
   - [ ] Auto-switch to Evidence tab
   - [ ] Evidence card highlighted
   - [ ] View code snippet

6. **Check Dataset Identity**
   - [ ] Switch to Overview tab
   - [ ] View row count, column count
   - [ ] Check quality score
   - [ ] Verify Safe Mode banner (if applicable)

**Expected Duration:** 2-3 minutes  
**Success Criteria:** All steps complete without errors, smooth UX

---

## Bug Reporting Template

If issues are found, use this template:

```markdown
### Bug Report

**Test Suite:** [e.g., Test Suite 3: Click-to-Verify]
**Test Case:** [e.g., Test 3.4: Pulse Animation]
**Browser:** [e.g., Chrome 120.0.6099.109]
**Device:** [e.g., Desktop 1920x1080]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Screenshots:**
[Attach screenshots if applicable]

**Console Errors:**
[Paste any console errors]

**Severity:**
- [ ] Critical (blocks core functionality)
- [ ] High (major feature broken)
- [ ] Medium (minor issue, workaround exists)
- [ ] Low (cosmetic issue)
```

---

## Sign-Off Checklist

After completing all tests:

- [ ] All critical tests pass (Test Suites 1-5)
- [ ] Mobile navigation works (Test Suite 8)
- [ ] Cross-browser compatibility verified (Test Suite 9)
- [ ] Performance targets met (Test Suite 10)
- [ ] Critical path test successful
- [ ] No critical or high-severity bugs
- [ ] Screenshots captured for documentation
- [ ] Test results documented

**QA Engineer Signature:** ___________________  
**Date:** ___________________  
**Status:** [ ] PASS [ ] FAIL [ ] CONDITIONAL PASS

---

## Next Steps After QA

### If PASS

1. Deploy to staging environment
2. Conduct user acceptance testing
3. Prepare production deployment

### If FAIL

1. Document all bugs in issue tracker
2. Prioritize fixes (critical → high → medium → low)
3. Re-run failed tests after fixes
4. Repeat QA cycle

### If CONDITIONAL PASS

1. Document known issues
2. Create workaround documentation
3. Schedule fixes for next sprint
4. Deploy with release notes

---

**🎯 Ready for Golden Run Execution!**
