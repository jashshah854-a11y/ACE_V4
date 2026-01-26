import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ExecutivePulse from "@/pages/ExecutivePulse";

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<any>("@/lib/api-client");
  return {
    ...actual,
    getRunSnapshot: vi.fn(async () => ({
      run_id: "test-run",
      generated_at: "2026-01-25T00:00:00Z",
      lite: false,
      report_markdown: "## Run Metadata\n{}",
      governed_report: null,
      manifest: { manifest_version: "1.0", render_policy: { allow_report: true } },
      diagnostics: {},
      identity: {},
    })),
  };
});

vi.mock("@/hooks/useGovernedReport", () => ({
  useGovernedReport: () => ({ data: null }),
}));

const mockReportData = {
  viewModel: { executiveBrief: [], heroInsight: {}, sections: [] },
  evidenceMap: {},
  runWarnings: [],
  trustModel: null,
  renderPolicy: { allow_report: true, allow_regression_sections: false },
  viewPolicies: {
    executive: { allowed_sections: ["governing_thought", "key_metrics"], default_collapsed_sections: [] },
    analyst: { allowed_sections: ["governing_thought", "key_metrics", "supporting_evidence", "tools"], default_collapsed_sections: [] },
    expert: { allowed_sections: ["governing_thought", "key_metrics", "supporting_evidence", "tools"], default_collapsed_sections: [] },
  },
  manifestLoading: false,
  manifestCompatible: true,
  evidenceMap: {},
  profile: { columns: {}, numericColumns: [] },
  dataQualityValue: 80,
  identityStats: { rows: "100", completeness: 0.9 },
  safeMode: false,
  enhancements: null,
  enhancedAnalytics: null,
  modelArtifacts: null,
  analyticsLoading: false,
  diagnostics: null,
  governingThought: "Test thought",
  primaryQuestion: "Test question",
  narrativeModules: [],
  appendixModules: [],
  scopeLocks: [],
};

vi.mock("@/hooks/useReportData", () => ({
  useReportData: () => mockReportData,
}));

describe("ExecutivePulse view gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hides tools drawer trigger when tools not allowed", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const router = createMemoryRouter(
      [{ path: "/", element: <ExecutivePulse /> }],
      {
        initialEntries: ["/?run=test-run"],
        future: {
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        },
      }
    );
    render(
      <QueryClientProvider client={client}>
        <RouterProvider
          router={router}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        />
      </QueryClientProvider>
    );
    expect(screen.queryByText(/open tools/i)).not.toBeInTheDocument();
  });

  it("renders TOC entries only for mounted sections", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const router = createMemoryRouter(
      [{ path: "/", element: <ExecutivePulse /> }],
      {
        initialEntries: ["/?run=test-run"],
        future: {
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        },
      }
    );
    render(
      <QueryClientProvider client={client}>
        <RouterProvider
          router={router}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Governing Thought")).toBeInTheDocument();
    expect(await screen.findByText("Key Metrics")).toBeInTheDocument();
    expect(screen.queryByText("Analysis & Evidence")).not.toBeInTheDocument();

    const tocLinks = screen.getAllByRole("link");
    tocLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      const id = href.startsWith("#") ? href.slice(1) : "";
      if (id) {
        expect(document.getElementById(id)).not.toBeNull();
      }
    });

    expect(document.getElementById("supporting-evidence")).toBeNull();
  });
});
