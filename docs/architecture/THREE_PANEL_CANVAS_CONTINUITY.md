# Three-Panel Canvas — Continuity Notes & Phase Priorities

**Last Updated:** January 15, 2026  
**Status:** Phase I Complete, Phase II Ready to Start

---

## ✅ Addressed: Type Safety for Enhanced Analytics

### Issue

Original `extractEvidenceObjects()` used `any` type for `enhancedAnalytics` parameter, risking type-confusion crashes during runtime.

### Resolution

- Created [`src/lib/enhancedAnalyticsTypes.ts`](file:///c:/Users/jashs/Projects/ACE_V4/src/lib/enhancedAnalyticsTypes.ts) with strict TypeScript interfaces:
  - `EnhancedAnalyticsData` — Complete structure
  - `BusinessIntelligence`, `CorrelationAnalysis`, `DistributionAnalysis`, `QualityMetrics`, `FeatureImportance` — Sub-structures
  - `isValidEnhancedAnalytics()` — Type guard for runtime validation
- Updated `reportParser.ts` to use `EnhancedAnalyticsData | null | undefined` instead of `any`

### Benefits

- ✅ Full IntelliSense/autocomplete support
- ✅ Compile-time type checking prevents crashes
- ✅ Self-documenting code (interfaces show expected structure)
- ✅ Easier debugging (TypeScript errors point to exact issues)

### Remaining Minor Lints

The following `any` types remain in `reportParser.ts` but are acceptable for now:

- Line 565: `corr: any` in forEach — will be typed when we add `CorrelationPair[]` type assertion
- Line 579: `feat: any` in forEach — will be typed when we add `FeatureImportanceItem[]` type assertion
- Line 621: Nested property access — acceptable for optional chaining

**Action:** These will be cleaned up during Phase IV integration when we add full type assertions.

---

## 🎯 Priority: Mobile Navigation Integration

### Context

Mobile/tablet users are a **primary target** for "on-the-go" executive reviews. The `MobileTabNavigation` component is built but not yet integrated into the main flow.

### Current State

- ✅ `MobileTabNavigation` component created in `ThreePanelCanvas.tsx`
- ✅ `ResponsiveThreePanelCanvas` wrapper handles mobile tabs automatically
- ⏳ Not yet integrated into `ReportPage.tsx`

### Integration Plan (Phase II Priority)

#### Step 1: Update ReportPage to use ResponsiveThreePanelCanvas

```tsx
// src/pages/ReportPage.tsx
import { ResponsiveThreePanelCanvas } from '@/components/canvas/ThreePanelCanvas';

export default function ReportPage() {
  const { runId } = useParams<{ runId: string }>();
  const { data, isLoading } = useReportData(runId);
  
  if (isLoading) return <LoadingState />;
  if (!data) return <ErrorState />;
  
  return (
    <ResponsiveThreePanelCanvas
      defaultMobileTab="narrative" // Start on narrative for executives
      pulsePanel={<DatasetPulse {...data.identityCard} />}
      narrativePanel={<NarrativeStream content={data.reportContent} />}
      labPanel={<EvidenceLab evidence={data.evidenceObjects} />}
    />
  );
}
```

#### Step 2: Mobile UX Enhancements

- **Tab Persistence**: Save active tab to localStorage for session continuity
- **Swipe Gestures**: Add swipe-left/right to navigate between tabs (use `react-swipeable`)
- **Tab Badges**: Show notification badges on tabs (e.g., "3 Anomalies" on Lab tab)
- **Quick Actions**: Add floating action button for "Share Report" or "Export PDF"

#### Step 3: Tablet-Specific Optimizations

- **Landscape Mode**: Show two panels side-by-side (Narrative + Lab) in landscape
- **Split View**: Allow dragging to resize panels on iPad
- **Keyboard Shortcuts**: Support arrow keys for tab navigation on tablets with keyboards

### Testing Checklist

- [ ] iPhone SE (375x667): Tab navigation works, no horizontal scroll
- [ ] iPhone 14 Pro (393x852): Tabs render correctly, safe area respected
- [ ] iPad Mini (768x1024): Landscape mode shows split view
- [ ] iPad Pro (1024x1366): Full three-panel layout on large tablets
- [ ] Android (various): Test on Samsung, Pixel devices

### Performance Targets

- **Tab Switch**: <100ms animation
- **Initial Load**: <2s to interactive on 4G
- **Scroll Performance**: 60fps on all panels

---

## 📋 Phase II Priorities (In Order)

### 1. Mobile Navigation Integration (HIGHEST PRIORITY)

**Why:** Executive users need mobile access for board meetings, travel, etc.  
**Effort:** 0.5 days  
**Impact:** HIGH — Unlocks mobile use case

### 2. Narrative Transformation with SCQA Blocks

**Why:** Core value proposition of Three-Panel Canvas  
**Effort:** 1-2 days  
**Impact:** HIGH — Delivers Pyramid Principle storytelling

### 3. Evidence Lab with Click-to-Verify

**Why:** Trust architecture for data-driven decisions  
**Effort:** 1-2 days  
**Impact:** MEDIUM-HIGH — Enables evidence validation

### 4. Integration & Testing

**Why:** Ensure everything works together  
**Effort:** 1 day  
**Impact:** HIGH — Production readiness

---

## 🔧 Technical Debt to Address

### Low Priority (Can defer to Phase IV)

- Remove unused imports (`ProgressMetricsSchema`, `ClusterMetricsSchema`, `Metrics`)
- Add type assertions for `forEach` loops in `extractEvidenceObjects()`
- Create `@tailwindcss/postcss7-compat` config to suppress CSS lint warnings

### Medium Priority (Address in Phase III)

- Add error boundaries around each panel to prevent full-page crashes
- Implement retry logic for failed evidence object extraction
- Add telemetry to track which evidence objects users click most

### High Priority (Address in Phase II)

- **Mobile navigation integration** (see above)
- Add loading skeletons for each panel during data fetch
- Implement optimistic UI updates for faster perceived performance

---

## 🎨 Design Refinements for Phase II

### Typography Adjustments

Based on user feedback, consider:

- Slightly larger governing thought on mobile (2rem instead of 1.875rem)
- Tighter line-height for SCQA blocks on small screens (1.6 instead of 1.75)
- Increase contrast for lab terminal text (green-300 instead of green-400 for better readability)

### Color Palette Tweaks

- Add `quality.warning` color for "medium-low" quality scores (between medium and low)
- Consider darker `authority` color (#0F2E6D) for better contrast in light mode
- Add `lab.highlight` color for active evidence cards (cyan-500 instead of cyan-400)

### Animation Polish

- Add subtle fade-in for SCQA blocks as user scrolls (intersection observer)
- Implement "typewriter" effect for governing thought on first load (optional, A/B test)
- Add micro-interactions for evidence card hover (slight scale + glow)

---

## 📊 Success Metrics

### Phase II Completion Criteria

- [ ] Mobile navigation fully integrated and tested on 5+ devices
- [ ] SCQA blocks render correctly with distinct typography
- [ ] Evidence Lab displays all evidence objects with lineage
- [ ] Click-to-verify wiring connects narrative to evidence
- [ ] Performance: <100ms interaction latency, 60fps scroll
- [ ] Accessibility: WCAG AA compliance, keyboard navigation works
- [ ] User testing: 3+ executives can navigate report on mobile without confusion

### KPIs to Track

- **Mobile Usage**: % of report views on mobile/tablet
- **Evidence Engagement**: % of users who click evidence links
- **Time to Insight**: Average time from page load to first evidence click
- **Completion Rate**: % of users who scroll through full narrative
- **Satisfaction**: NPS score from executive users

---

## 🚀 Next Immediate Actions

1. **Integrate Mobile Navigation** (30 minutes)
   - Update `ReportPage.tsx` to use `ResponsiveThreePanelCanvas`
   - Test on iPhone and iPad simulators
   - Deploy to staging for user testing

2. **Transform NarrativeStream** (2-3 hours)
   - Integrate `extractGoverningThought()` for headline
   - Render SCQA blocks with distinct styling
   - Add Task Contract Declaration component

3. **Build Evidence Lab** (3-4 hours)
   - Create `EvidenceCard` component
   - Implement "View Source" collapsible
   - Wire up click-to-verify interactions

4. **Integration Testing** (1-2 hours)
   - Test full flow: upload → analysis → three-panel report
   - Verify mobile navigation works end-to-end
   - Check performance metrics

---

## 📝 Notes for Future Phases

### Phase III: Advanced Features

- **Collaborative Annotations**: Allow users to comment on specific evidence objects
- **Export to PDF**: Preserve three-panel layout in print view
- **Real-time Updates**: WebSocket connection to update evidence as backend recomputes
- **Keyboard Navigation**: Arrow keys to navigate between evidence cards

### Phase IV: Production Hardening

- **Error Recovery**: Graceful degradation when evidence extraction fails
- **Caching Strategy**: Cache evidence objects in IndexedDB for offline access
- **A/B Testing**: Test different SCQA block orderings for comprehension
- **Analytics Integration**: Track user interactions for product insights

---

## ✨ Conclusion

Phase I foundation is solid. The "luxurious, glass-walled observation deck" is built. Now we need to:

1. **Prioritize mobile navigation** for executive users
2. **Complete narrative transformation** with SCQA blocks
3. **Build evidence lab** for trust architecture
4. **Test rigorously** across devices

The type safety improvements ensure we won't hit runtime crashes, and the mobile navigation priority ensures we deliver value to our primary user segment.

**Ready to proceed with Phase II!** 🚀
