import { render, screen } from "@testing-library/react";
import { CorrelationInsightsCard } from "../CorrelationInsightsCard";

const baseCorrelation = {
  available: true,
  valid: true,
  status: "success",
  strong_correlations: [
    {
      feature1: "x",
      feature2: "y",
      pearson: 0.82,
      spearman: 0.8,
      strength: "strong",
      direction: "positive",
      pearson_ci_low: 0.7,
      pearson_ci_high: 0.9,
      n: 120,
    },
  ],
  total_correlations: 1,
};

describe("CorrelationInsightsCard", () => {
  it("hides strength labels when CI artifact is missing", () => {
    render(<CorrelationInsightsCard data={baseCorrelation} correlationCi={null} />);
    expect(screen.queryByText(/^strong$/i)).not.toBeInTheDocument();
  });

  it("shows strength labels when CI artifact is valid", () => {
    render(
      <CorrelationInsightsCard
        data={baseCorrelation}
        correlationCi={{ valid: true, status: "success", pairs: [] }}
      />
    );
    expect(screen.getByText(/^strong$/i)).toBeInTheDocument();
  });
});
