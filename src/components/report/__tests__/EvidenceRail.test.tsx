import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import EvidenceRail from '../EvidenceRail';
import { ensureSafeReport } from '@/lib/ReportGuard';
import type { ReportDataResult, EvidenceSummary } from '@/types/reportTypes';

const buildReport = (overrides: Partial<ReportDataResult> = {}): ReportDataResult => ({
  ...ensureSafeReport({}),
  evidenceMap: {},
  governedInsights: [],
  guidanceNotes: [],
  ...overrides,
});

const baseBusinessIntelligence = {
  available: true,
  valid: true,
  status: "success",
  value_metrics: {
    total_value: 1000,
    avg_value: 100,
    median_value: 50,
    value_concentration: 0.4,
  },
  churn_risk: {
    at_risk_count: 10,
    at_risk_percentage: 25,
    activity_column: 'visits',
  },
};

describe('EvidenceRail', () => {
  const profile = {
    columns: {
      revenue: { dtype: 'float64' },
    },
    numericColumns: ['revenue'],
  };

  const renderRail = (data: ReportDataResult, props: Partial<Parameters<typeof EvidenceRail>[0]> = {}) => {
    const defaultProps = {
      mode: 'inline' as const,
      runId: 'test-run',
    };

    return render(
      <EvidenceRail
        {...defaultProps}
        {...props}
        data={data}
      />
    );
  };

  beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      value: vi.fn(),
      configurable: true,
    });
  });

  it('gates business intelligence when evidence is missing', () => {
    const data = buildReport({
      profile,
      enhancedAnalytics: {
        business_intelligence: baseBusinessIntelligence,
      },
    });

    renderRail(data);

    expect(screen.getByText(/Business Signals/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /view source/i })).not.toBeInTheDocument();
  });

  it('renders BusinessPulse when trusted evidence exists', () => {
    const businessEvidence: EvidenceSummary = {
      id: 'bi',
      title: 'BI Query',
      columns: ['revenue'],
      confidence: 80,
      scope: 'business_intelligence',
      sourceCode: 'SELECT revenue FROM mart',
      dataSource: 'warehouse.mart',
    };

    const data = buildReport({
      profile,
      enhancedAnalytics: {
        business_intelligence: baseBusinessIntelligence,
      },
      evidenceMap: {
        bi: businessEvidence,
      },
    });

    renderRail(data);

    expect(screen.queryByText(/Business intelligence requires traceable proof/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Business Signals/i)).toBeInTheDocument();
  });

  it('opens lineage modal when view source is clicked', async () => {
    const predictiveEvidence: EvidenceSummary = {
      id: 'drivers',
      title: 'Driver Audit',
      columns: ['visits'],
      confidence: 78,
      scope: 'feature_importance',
      sourceCode: 'fit_regression(feature_frame)',
      dataSource: 'governed_feature_frame',
      sourceNotes: 'White-box regression run',
    };

    const data = buildReport({
      profile,
      diagnostics: { regression_status: "success" },
      enhancedAnalytics: {
        feature_importance: {
          available: true,
          valid: true,
          status: "success",
          target: 'revenue',
          task_type: 'regression',
          feature_importance: [
            { feature: 'visits', importance: 0.6 },
          ],
          insights: ['Visits dominates revenue variance.'],
        },
      },
      evidenceMap: {
        drivers: predictiveEvidence,
      },
    });

    renderRail(data, { activeEvidence: 'predictive_drivers' });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /view source/i }));

    expect(screen.getByText(/Evidence Lineage/i)).toBeInTheDocument();
    expect(screen.getByText(/Data Source: governed_feature_frame/i)).toBeInTheDocument();
    expect(screen.getByText(/fit_regression/)).toBeInTheDocument();
  });

  it('responds to focus events by highlighting sections and opening lineage', () => {
    const businessEvidence: EvidenceSummary = {
      id: 'bi',
      title: 'BI Query',
      columns: ['revenue'],
      confidence: 82,
      scope: 'business_intelligence',
      sourceCode: 'select * from mart',
      dataSource: 'warehouse.mart',
    };

    const data = buildReport({
      profile,
      enhancedAnalytics: {
        business_intelligence: baseBusinessIntelligence,
      },
      evidenceMap: {
        bi: businessEvidence,
      },
    });

    renderRail(data);
    const section = document.querySelector(
      '[data-evidence-section="business_intelligence"]',
    ) as HTMLElement | null;

    expect(section).toBeTruthy();

    act(() => {
      window.dispatchEvent(
        new CustomEvent('ace:focus-evidence', {
          detail: { section: 'business_intelligence' },
        }),
      );
    });

    expect(section?.className).toContain('ring-offset-background');

    act(() => {
      window.dispatchEvent(
        new CustomEvent('ace:focus-evidence', {
          detail: { section: 'business_intelligence', evidenceId: 'bi' },
        }),
      );
    });

    expect(screen.getByText(/Evidence Lineage/i)).toBeInTheDocument();
  });

  it('renders simulation delta card when projection provided', () => {
    const businessEvidence: EvidenceSummary = {
      id: 'bi',
      title: 'BI Query',
      columns: ['revenue'],
      confidence: 90,
      scope: 'business_intelligence',
      sourceCode: 'select revenue from mart',
      dataSource: 'warehouse.mart',
    };

    const data = buildReport({
      profile,
      enhancedAnalytics: {
        business_intelligence: baseBusinessIntelligence,
      },
      evidenceMap: {
        bi: businessEvidence,
      },
    });

    renderRail(data, {
      simulationResult: {
        run_id: 'sim',
        delta: {
          churn_risk: { original: 25, simulated: 20, delta: -5 },
          ghost_revenue: { original: 100000, simulated: 120000, delta: 20000 },
        },
        business_impact: {},
      },
      simulationModifications: [{ target_column: 'price', modification_factor: 1.1 }],
    });

    const projectionCard = screen.getByTestId('simulation-delta-card');
    expect(projectionCard).toBeInTheDocument();
    expect(within(projectionCard).getByText(/Churn Risk/i)).toBeInTheDocument();
    expect(within(projectionCard).getByText(/price:\s*\+10%/i)).toBeInTheDocument();
  });

});

