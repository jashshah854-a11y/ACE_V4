import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Cell: () => null,
  ReferenceLine: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ReferenceDot: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ReferenceArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Label: ({ value }: { value: string }) => <span>{value}</span>,
}));

import { StoryCanvas } from "@/components/story/StoryCanvas";
import { NarrativeProvider } from "@/components/narrative/NarrativeContext";
import { ValidationSummaryPanel } from "@/components/trust/ValidationSummaryPanel";
import { StoryLineChart } from "@/components/story/StoryCharts";
import { NarrativeStream } from "@/components/canvas/NarrativeStream";
import type { Story } from "@/types/StoryTypes";

const baseStory: Story = {
  run_id: "run-123",
  title: "Phase 6 Story",
  summary: "Summary line.",
  tone: "formal",
  points: [
    {
      id: "p1",
      sequence: 1,
      headline: "Top Insight",
      narrative: "This is the executive narrative. Analysts see more detail. Experts see caveats.",
      narrative_variations: {
        executive: "Executive summary only.",
        analyst: "Analyst mode narrative with drivers.",
        expert: "Expert mode narrative with assumptions.",
      },
      explanation: {
        what_happened: "Metric X spiked in Q2.",
        why_it_happened: "Primary driver was segment churn reduction.",
        why_it_matters: "Revenue impact concentrates on core accounts.",
        what_to_watch: "Monitor retention drift in Segment B.",
      },
      visual: {
        type: "table",
        data: [],
        config: {},
      },
      evidence: [],
      interactions: [],
      metadata: {
        storyType: "contrast",
        tone: "formal",
        confidence: 0.82,
        timestamp: "2025-01-01",
      },
    },
  ],
  metadata: {
    created_at: "2025-01-01",
  },
};

function renderWithNarrative(ui: React.ReactElement) {
  return render(<NarrativeProvider>{ui}</NarrativeProvider>);
}

describe("Phase 6 Narrative Intelligence behaviors", () => {
  beforeEach(() => {
    localStorage.removeItem("ace_narrative_mode");
  });

  it("switches narrative depth without changing the governing headline", async () => {
    const user = userEvent.setup();
    renderWithNarrative(<StoryCanvas story={baseStory} onToneChange={() => undefined} />);

    expect(screen.getByText("Top Insight")).toBeInTheDocument();
    expect(screen.getByText("Executive summary only.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /analyst/i }));
    expect(screen.getByText("Top Insight")).toBeInTheDocument();
    expect(screen.getByText("Analyst mode narrative with drivers.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /expert/i }));
    expect(screen.getByText("Top Insight")).toBeInTheDocument();
    expect(screen.getByText("Expert mode narrative with assumptions.")).toBeInTheDocument();
  });

  it("expands InsightExplanation in expert mode with all four sections", async () => {
    const user = userEvent.setup();
    renderWithNarrative(<StoryCanvas story={baseStory} onToneChange={() => undefined} />);

    await user.click(screen.getByRole("button", { name: /expert/i }));

    expect(screen.getByText(/what happened/i)).toBeInTheDocument();
    expect(screen.getByText(/why it happened/i)).toBeInTheDocument();
    expect(screen.getByText(/why it matters/i)).toBeInTheDocument();
    expect(screen.getByText(/critical watchouts/i)).toBeInTheDocument();
  });

  it("summarizes narrative for executive mode when no variations are provided", () => {
    const story: Story = {
      ...baseStory,
      points: [
        {
          ...baseStory.points[0],
          narrative_variations: undefined,
          narrative: "Sentence one. Sentence two with extra detail.",
        },
      ],
    };

    renderWithNarrative(<StoryCanvas story={story} onToneChange={() => undefined} />);
    expect(screen.getByText("Sentence one.")).toBeInTheDocument();
  });

  it("shows validation status and insight policy in governance panel", () => {
    render(
      <ValidationSummaryPanel
        dataQualityScore={0.62}
        issues={[
          { type: "warning", message: "Borderline variance." },
          { type: "error", message: "Missing target variable." },
        ]}
        suppressedCount={2}
        insightPolicy="blocked"
      />
    );

    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Blocked by policy")).toBeInTheDocument();
    expect(screen.getByText(/2 insights suppressed/i)).toBeInTheDocument();
  });

  it("filters chart annotations by narrative mode", () => {
    const annotations = [
      { type: "point" as const, value: 1, label: "Inflection" },
      { type: "point" as const, value: 2, label: "Outlier" },
      { type: "threshold" as const, value: 3, label: "Threshold" },
    ];

    const { rerender } = render(
      <StoryLineChart
        data={[
          { label: "Jan", value: 1 },
          { label: "Feb", value: 2 },
        ]}
        annotations={annotations}
        mode="executive"
      />
    );

    expect(screen.getAllByText(/Inflection|Outlier|Threshold/).length).toBe(1);

    rerender(
      <StoryLineChart
        data={[
          { label: "Jan", value: 1 },
          { label: "Feb", value: 2 },
        ]}
        annotations={annotations}
        mode="analyst"
      />
    );

    expect(screen.getAllByText(/Inflection|Outlier|Threshold/).length).toBe(2);

    rerender(
      <StoryLineChart
        data={[
          { label: "Jan", value: 1 },
          { label: "Feb", value: 2 },
        ]}
        annotations={annotations}
        mode="expert"
      />
    );

    expect(screen.getAllByText(/Inflection|Outlier|Threshold/).length).toBe(3);
  });

  it("surfaces guardrail notes in the narrative header", () => {
    const content = [
      "# Intelligence Report",
      "## Validation & Guardrails",
      "Blocked Agents: regression",
      "variance: low",
      "## Business Intelligence",
      "Revenue rose 12%.",
    ].join("\n");

    render(
      <NarrativeStream content={content} confidence={0.72} />
    );

    expect(screen.getAllByText(/validation & guardrails/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/blocked_agents: regression/i)).toBeInTheDocument();
    expect(screen.getAllByText(/variance:\s*low/i).length).toBeGreaterThan(0);
  });
});
