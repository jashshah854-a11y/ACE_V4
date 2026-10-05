import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import ReportPage from "@/pages/ReportPage";
import type { Snapshot } from "@/lib/types";

const { useSnapshot } = vi.hoisted(() => ({ useSnapshot: vi.fn() }));

vi.mock("@/lib/queries", () => ({ useSnapshot }));
vi.mock("@/components/report/insight-lens/InsightLens", () => ({
  InsightLens: () => null,
}));

const baseSnapshot: Snapshot = {
  run_id: "run-123",
  identity: { identity: { row_count: 1, column_count: 1, columns: [] } },
  curated_kpis: { rows: 1, columns: 1, data_quality_score: 1, completeness: 1 },
  trust: { overall_confidence: 90, components: {} },
  report_markdown: "# Report",
  governed_report: { insights: [] },
  smart_narrative: {
    executive_summary: "Summary",
    key_findings: [],
    data_story: "",
    recommendations: [],
    warnings: [],
  },
  enhanced_analytics: {},
};

function renderReport(snapshot: Snapshot) {
  useSnapshot.mockReturnValue({ data: snapshot, isLoading: false, error: null });

  return render(
    <MemoryRouter initialEntries={["/report/run-123"]}>
      <Routes>
        <Route path="/report/:runId" element={<ReportPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ReportPage task intent", () => {
  beforeEach(() => useSnapshot.mockReset());

  it("shows the original analysis question, decision context, and success criteria", () => {
    renderReport({
      ...baseSnapshot,
      task_intent: {
        primary_question: "Which customers should receive retention outreach?",
        decision_context: "Prioritize next quarter retention investment.",
        success_criteria: "Rank actionable customer segments with evidence.",
        required_output_type: "descriptive",
      },
    });

    expect(screen.getByRole("heading", { name: /original analysis context/i })).toBeInTheDocument();
    expect(screen.getByText(/Which customers should receive retention outreach/i)).toBeInTheDocument();
    expect(screen.getByText(/Prioritize next quarter retention investment/i)).toBeInTheDocument();
    expect(screen.getByText(/Rank actionable customer segments with evidence/i)).toBeInTheDocument();
  });

  it("states when no original question was recorded", () => {
    renderReport(baseSnapshot);

    expect(screen.getByText(/no original question was recorded for this run/i)).toBeInTheDocument();
  });

  it("preserves a recorded long question without clipping its content", () => {
    const primaryQuestion = `  ${"retention-segment-".repeat(40)}\nKeep the original spacing.  `;

    renderReport({
      ...baseSnapshot,
      task_intent: {
        primary_question: primaryQuestion,
        decision_context: "Prioritize retention investment.",
        success_criteria: "Rank actionable segments.",
        required_output_type: "descriptive",
      },
    });

    expect(screen.getByTestId("task-intent-question").textContent).toBe(primaryQuestion);
  });
});
