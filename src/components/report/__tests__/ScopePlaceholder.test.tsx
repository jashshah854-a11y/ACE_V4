import { render } from "@testing-library/react";
import { ScopePlaceholder } from "@/components/report/ScopePlaceholder";

describe("ScopePlaceholder", () => {
  it("renders constraint-driven copy when a matching agent constraint exists", () => {
    const { container } = render(
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
    expect(container.firstChild).toBeNull();
  });

  it("renders a generic scope message when no constraint is present", () => {
    const { container } = render(
      <ScopePlaceholder
        sectionName="Personas"
        agentKey="personas"
        scopeConstraints={[]}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
