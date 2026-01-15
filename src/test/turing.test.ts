import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ReportDataResult } from "@/types/reportTypes";
import { runGroundingAudit, shouldRefuseQuestion, simulateReasoningStream } from "@/lib/turingHarness";
import { TuringFixtures, type TuringFixture } from "./turingFixtures";

interface LoadedFixture {
  report: ReportDataResult;
  identityCard?: any;
  confidenceReport?: any;
  contract?: any;
  runRoot: string;
}

function safeReadJson(runRoot: string, fileName: string) {
  try {
    return JSON.parse(readFileSync(path.join(runRoot, fileName), "utf-8"));
  } catch {
    return undefined;
  }
}

function collectEvidenceIds(analytics: any) {
  const ids = new Set<string>();
  const maybePush = (value?: string | null) => {
    if (value) ids.add(value);
  };

  maybePush(analytics?.business_intelligence?.evidence_id);
  maybePush(analytics?.feature_importance?.evidence_id);
  const driverEvidence = analytics?.feature_importance?.evidence?.evidence_id;
  maybePush(driverEvidence);
  return Array.from(ids);
}

function loadFixtureData(fixture: TuringFixture): LoadedFixture {
  const runRoot = path.resolve(process.cwd(), "data/runs", fixture.runId);
  let enhancedAnalytics: any = {};
  try {
    enhancedAnalytics = JSON.parse(
      readFileSync(path.join(runRoot, "enhanced_analytics.json"), "utf-8"),
    );
  } catch (error) {
    if (!fixture.allowMissingAnalytics) {
      throw error;
    }
  }

  return {
    report: {
      enhancedAnalytics,
      scopeLocks: fixture.scopeLocks ?? [],
    } as unknown as ReportDataResult,
    identityCard: safeReadJson(runRoot, "dataset_identity_card.json"),
    confidenceReport: safeReadJson(runRoot, "confidence_report.json"),
    contract: safeReadJson(runRoot, "task_contract.json"),
    runRoot,
  };
}

function logGovernanceTrace(
  fixture: TuringFixture,
  loaded: LoadedFixture,
) {
  const { identityCard, confidenceReport, contract, report } = loaded;
  const locks = JSON.stringify(report.scopeLocks ?? []);
  const evidenceIds = collectEvidenceIds(report.enhancedAnalytics).join(", ") || "none";
  const reasons = (confidenceReport?.reasons ?? []).join("; ") || "none";

  console.info(
    `[GovernanceTrace] run=${fixture.runId} label=${fixture.label} ` +
      `rows=${identityCard?.row_count ?? "n/a"} cols=${identityCard?.column_count ?? "n/a"} ` +
      `data_conf=${confidenceReport?.data_confidence ?? "n/a"} reasons=${reasons} locks=${locks} evidence=${evidenceIds} ` +
      `allowed_sections=${contract?.allowed_sections ?? "n/a"}`,
  );
}

describe("Turing harness", () => {
  TuringFixtures.forEach((fixture) => {
    describe(`run ${fixture.runId} (${fixture.label})`, () => {
      const loaded = loadFixtureData(fixture);
      const report = loaded.report;
      logGovernanceTrace(fixture, loaded);

      it("matches grounding expectation", () => {
        const audit = runGroundingAudit(report);
        expect(audit.grounded).toBe(fixture.expectGrounded);
        if (fixture.expectGrounded) {
          fixture.answerIncludes?.forEach((needle) => {
            expect(audit.answer).toContain(needle);
          });
        } else {
          expect(audit.answer).toBe("Unsupported");
        }
      });

      if (fixture.refusalQuestion) {
        it("refuses forbidden questions", () => {
          const response = shouldRefuseQuestion(fixture.refusalQuestion!, report);
          console.info(`[GovernanceTrace] refusal reason=${response.reason}`);
          expect(response.refuse).toBe(true);
          expect(response.reason).toBeTruthy();
        });
      }

      if (fixture.expectedChurn) {
        it("matches churn diagnostics", () => {
          const churn = report.enhancedAnalytics?.business_intelligence?.churn_risk;
          expect(churn).toBeTruthy();
          expect(churn.at_risk_count).toBeCloseTo(fixture.expectedChurn!.count, 5);
          expect(churn.at_risk_percentage).toBeCloseTo(fixture.expectedChurn!.percentage, 1);
          expect(churn.activity_column).toBe(fixture.expectedChurn!.activityColumn);
        });
      }

      if (fixture.expectFailSafe) {
        it("stays in fail-safe descriptive mode", () => {
          const confidence = loaded.confidenceReport?.data_confidence ?? 1;
          expect(confidence).toBeLessThanOrEqual(0.1);
          const allowedSections = loaded.contract?.allowed_sections;
          expect(allowedSections).toEqual(["data_overview", "quality"]);
        });
      }

      if (fixture.expectedConcentration) {
        it("keeps long-tail segments MECE", () => {
          const valueMetrics = report.enhancedAnalytics?.business_intelligence?.value_metrics;
          expect(valueMetrics?.value_concentration ?? 0).toBeGreaterThanOrEqual(
            fixture.expectedConcentration!,
          );
          const segments = report.enhancedAnalytics?.business_intelligence?.segment_value ?? [];
          expect(Array.isArray(segments) && segments.length >= 3).toBe(true);
          const total = segments.reduce(
            (sum: number, seg: any) => sum + (seg.value_contribution_pct ?? 0),
            0,
          );
          expect(Math.abs(total - 100)).toBeLessThanOrEqual(0.5);
        });
      }
    });
  });

  it("streams reasoning steps sequentially", () => {
    const emit = vi.fn();
    simulateReasoningStream(["Load dataset", "Compute churn"], emit);
    expect(emit).toHaveBeenCalledTimes(3);
    expect(emit.mock.calls[0][0]).toMatchObject({ step: "Load dataset", status: "progress" });
    expect(emit.mock.calls[1][0]).toMatchObject({ step: "Compute churn", status: "progress" });
    expect(emit.mock.calls[2][0]).toMatchObject({ status: "complete" });
  });
});
