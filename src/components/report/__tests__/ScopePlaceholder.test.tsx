import { render, screen } from "@testing-library/react";
import { ScopePlaceholder } from "@/components/report/ScopePlaceholder";

describe("ScopePlaceholder", () => {
  it("renders constraint-driven copy when a matching agent constraint exists", () => {
    render(
      <ScopePlaceholder
        sectionName="Outcome Modeling"
        agentKey="regression"
        scopeConstraints={[
          { agent: "regression", reasonCode: "intent_exploratory", title: "Outcome modeling not applicable", detail: "This dataset supports descriptive insights." },
        ]}
        analysisIntent="exploratory"
        targetCandidate={{ detected: false, column: null, reason: "none", confidence: 0 }}
      />
    );

    expect(screen.getByText(/Outcome Modeling/i)).toBeInTheDocument();
    expect(screen.getByText(/not applicable/i)).toBeInTheDocument();
    expect(screen.getByText(/descriptive insights/i)).toBeInTheDocument();
  });

  it("renders a generic scope message when no constraint is present", () => {
    render(
      <ScopePlaceholder
        sectionName="Personas"
        agentKey="personas"
        scopeConstraints={[]}
      />
    );

    expect(screen.getByText(/Not applicable for this run/i)).toBeInTheDocument();
    expect(screen.getByText(/descriptive intelligence/i)).toBeInTheDocument();
  });
});
