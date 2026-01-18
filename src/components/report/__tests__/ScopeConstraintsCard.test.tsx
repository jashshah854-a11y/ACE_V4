import { render, screen } from "@testing-library/react";
import { ScopeConstraintsCard } from "@/components/report/ScopeConstraintsCard";

describe("ScopeConstraintsCard", () => {
  it("renders scope constraints when provided", () => {
    render(
      <ScopeConstraintsCard
        constraints={[
          {
            title: "Outcome modeling not applicable",
            detail: "This dataset supports descriptive insights only.",
            agent: "regression",
            reasonCode: "intent_exploratory",
          },
        ]}
      />
    );

    expect(screen.getByText(/scope constraints/i)).toBeInTheDocument();
    expect(screen.getByText(/Outcome modeling not applicable/i)).toBeInTheDocument();
    expect(screen.getByText(/descriptive insights only/i)).toBeInTheDocument();
  });

  it("renders nothing when constraints are empty", () => {
    const { container } = render(<ScopeConstraintsCard constraints={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
