import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NarrativeProvider } from "@/components/narrative/NarrativeContext";
import { StoryCanvas } from "@/components/story/StoryCanvas";
import { TrustBreakdown } from "@/components/trust/TrustBreakdown";
import type { TrustScore } from "@/types/trust";
import type { Story } from "@/types/StoryTypes";

const cautionTrust: TrustScore = {
  score: 0.32,
  band: "caution",
  factors: ["Data quality limits confidence."],
  positives: [],
  negatives: ["Data quality limits confidence."],
  risks: ["Validation gaps weaken trust."],
  improvements: ["Improve data completeness and consistency."],
  components: {
    dataQuality: 0.4,
    validation: 0,
    sampleSize: 0.3,
    stability: 0.2,
    featureDominance: 0.4,
    assumptionRisk: 0.4,
  },
  certification: {
    certified: false,
    rulesetVersion: "v1.0",
    inputs: {},
  },
};

describe("Phase 7 trust behaviors", () => {
  it("softens narrative language for caution insights", () => {
    const story: Story = {
      run_id: "run-1",
      title: "Trust Story",
      summary: "Summary",
      tone: "formal",
      points: [
        {
          id: "insight-1",
          sequence: 1,
          headline: "Risk Signal",
          narrative: "The churn driver shows a spike.",
          narrative_variations: {
            executive: "Churn driver spiked.",
            analyst: "Churn driver spiked with cohort concentration.",
            expert: "Churn driver spiked with cohort concentration and missing cohort size.",
          },
          trust: cautionTrust,
          explanation: {
            what_happened: "Churn spiked.",
            why_it_happened: "Drivers were concentrated.",
            why_it_matters: "Retention risk.",
            what_to_watch: "Sample coverage.",
          },
          visual: { type: "table", data: [], config: {} },
          evidence: [],
          interactions: [],
          metadata: {
            storyType: "contrast",
            tone: "formal",
            confidence: 0.4,
            timestamp: "2025-01-01",
          },
        },
      ],
      metadata: { created_at: "2025-01-01" },
    };

    render(
      <NarrativeProvider>
        <StoryCanvas story={story} onToneChange={() => undefined} />
      </NarrativeProvider>
    );

    expect(screen.getByText(/preliminary/i)).toBeInTheDocument();
  });

  it("renders expert trust breakdown details", async () => {
    const user = userEvent.setup();
    render(
      <TrustBreakdown trust={cautionTrust} mode="expert" insightId="insight-1" />
    );

    await user.click(screen.getByRole("button", { name: /trust breakdown/i }));
    expect(screen.getByText(/data quality/i)).toBeInTheDocument();
    expect(screen.getByText(/sample sufficiency/i)).toBeInTheDocument();
  });
});
