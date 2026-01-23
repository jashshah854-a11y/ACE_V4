import { render, screen, waitFor } from "@testing-library/react";
import { TableOfContents } from "../TableOfContents";

function Wrapper() {
  return (
    <div>
      <section id="alpha">Alpha Section</section>
      <TableOfContents
        items={[
          { id: "alpha", label: "Alpha" },
          { id: "missing", label: "Missing" },
        ]}
      />
    </div>
  );
}

describe("TableOfContents", () => {
  beforeAll(() => {
    class IntersectionObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    if (!("IntersectionObserver" in globalThis)) {
      (globalThis as typeof globalThis & { IntersectionObserver: typeof IntersectionObserverMock }).IntersectionObserver =
        IntersectionObserverMock;
    }
  });

  it("renders entries only for sections that exist in the DOM", async () => {
    render(<Wrapper />);

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    });

    expect(screen.queryByText("Missing")).not.toBeInTheDocument();
  });
});
