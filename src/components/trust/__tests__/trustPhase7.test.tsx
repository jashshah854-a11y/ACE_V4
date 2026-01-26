import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrustSummary } from "@/components/trust/TrustSummary";
import type { TrustModel } from "@/types/trust";

const trust: TrustModel = {
  overall_confidence: 52,
  components: {
    data_quality: {
      score: 70,
      status: "medium",
      evidence: ["steps.validator"],
      notes: "Validator completed successfully.",
    },
    model_fit: {
      score: null,
      status: "unknown",
      evidence: ["steps.regression"],
      notes: "Regression did not complete.",
    },
    stability: {
      score: 40,
      status: "low",
      evidence: [],
      notes: "Stability diagnostics missing.",
    },
    validation_strength: {
      score: 60,
      status: "medium",
      evidence: ["steps.validator"],
      notes: "Validation checks completed.",
    },
    leakage_risk: {
      score: 10,
      status: "low",
      evidence: [],
      notes: "No leakage warning detected.",
    },
  },
  applied_caps: [{ code: "UNKNOWN_COMPONENTS", max: 60 }],
};

describe("Trust summary", () => {
  it("renders a single overall confidence entry with evidence references", async () => {
    render(<TrustSummary trust={trust} />);

    expect(screen.getByText(/Overall confidence:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/out of 100/i)).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: /view details/i }));
    expect(screen.getAllByText(/steps\.validator/i).length).toBeGreaterThan(0);
  });

  it("does not render certified language", () => {
    render(<TrustSummary trust={trust} />);
    expect(screen.queryByText(/certified/i)).toBeNull();
  });
});
