import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import type { ReactNode } from "react";
import {
  X,
  Send,
  Sparkles,
  CheckCircle,
  HelpCircle,
  Activity,
  BarChart3,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReportDataResult, EvidenceSummary } from "@/types/reportTypes";
import { BusinessPulse } from "./business/BusinessPulse";
import { PredictiveDriversChart } from "./predictive/PredictiveDriversChart";
import { VarianceBridgeChart } from "./analytics/VarianceBridgeChart";
import { MarimekkoShareChart } from "./analytics/MarimekkoShareChart";
import { EvidenceLineageModal } from "./EvidenceLineageModal";
import type { SimulationResult, Modification } from "@/lib/api-client";
import { focusGuidance } from "@/lib/guidanceFocus";
import { GuidanceOverlay } from "@/components/report/GuidanceOverlay";

interface EvidenceRailProps {
  mode?: "inline" | "overlay";
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
  activeEvidence?: "business_pulse" | "predictive_drivers" | null;
  data: ReportDataResult;
  runId: string;
  onFocusGuidance?: () => void;
  simulationResult?: SimulationResult | null;
  simulationModifications?: Modification[];
}

const SUGGESTION_CHIPS = {
  business_pulse: [
    { label: "Forecast Next Month", icon: "??" },
    { label: "Compare Segments", icon: "??" },
  ],
  predictive_drivers: [
    { label: "Remove Outliers", icon: "??" },
    { label: "Explain Top Driver", icon: "??" },
  ],
};

const MIN_CONFIDENCE = 50;

export default function EvidenceRail(props: EvidenceRailProps) {
  const {
    mode,
    className,
    data,
    runId,
    isOpen = false,
    onClose = () => undefined,
    activeEvidence = null,
    onFocusGuidance,
    simulationResult,
    simulationModifications,
  } = props;

  const numericColumns = useMemo(() => deriveNumericColumns(data), [data]);
  const resolvedMode =
    mode ?? (typeof props.isOpen !== "undefined" ? "overlay" : "inline");

  if (resolvedMode === "inline") {
    return (
      <InlineEvidenceRail
        data={data}
        runId={runId}
        className={className}
        numericColumns={numericColumns}
        onFocusGuidance={onFocusGuidance}
        simulationResult={simulationResult}
        simulationModifications={simulationModifications}
      />
    );
  }

  const [askQuery, setAskQuery] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [reasoningSteps, setReasoningSteps] = useState<string[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);

  const suggestions = useMemo(
    () => buildSuggestionChips(activeEvidence, data),
    [activeEvidence, data],
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askQuery.trim()) return;

    setIsAsking(true);
    setReasoningSteps([]);
    setAnswer(null);

    try {
      const response = await fetch("http://localhost:8000/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: askQuery,
          context: activeEvidence,
          evidence_type: activeEvidence || "business_pulse",
          run_id: runId,
        }),
      });

      if (!response.ok) throw new Error("Ask request failed");

      const result = await response.json();
      for (const step of result.reasoning_steps) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        setReasoningSteps((prev) => [...prev, step]);
      }
      setAnswer(result.answer);
    } catch (error) {
      console.error("Ask error:", error);
      setAnswer("Error processing query. Please try again.");
    } finally {
      setIsAsking(false);
      setAskQuery("");
    }
  };

  const handleChipClick = (chipLabel: string) => {
    setAskQuery(chipLabel);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/40"
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                  The Lab
                </p>
                <h3 className="text-xl font-mono text-foreground">
                  Evidence Console
                </h3>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {suggestions.length > 0 && (
              <div className="px-6 py-4 border-b border-border/40">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
                  Nudges
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => handleChipClick("action" in chip ? chip.action : chip.label)}
                      className="px-3 py-1.5 text-xs font-medium bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                    >
                      <span className="mr-1.5">{chip.icon}</span>
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-6 space-y-6">
              {activeEvidence === "business_pulse" && data.enhancedAnalytics?.business_intelligence && (
                <BusinessPulse data={data.enhancedAnalytics.business_intelligence} />
              )}

              {activeEvidence === "predictive_drivers" && data.enhancedAnalytics?.feature_importance && (
                <PredictiveDriversChart data={data.enhancedAnalytics.feature_importance} />
              )}

              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">
                  <Sparkles className="h-3.5 w-3.5" /> Ask ACE
                </div>
                <form onSubmit={handleAskSubmit} className="space-y-3">
                  <textarea
                    value={askQuery}
                    onChange={(e) => setAskQuery(e.target.value)}
                    className="w-full rounded-xl border border-border bg-muted/30 p-3 text-sm"
                    placeholder="Ask how this evidence was produced"
                    rows={3}
                  />
                  <Button type="submit" disabled={isAsking} className="w-full">
                    <Send className="mr-2 h-4 w-4" />
                    {isAsking ? "Thinking" : "Ask"}
                  </Button>
                </form>
                <div className="mt-4 space-y-2 font-mono text-xs">
                  {reasoningSteps.map((step, idx) => (
                    <div key={`step-${idx}`} className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                      <span>{step}</span>
                    </div>
                  ))}
                  {answer && <p className="text-sm text-foreground">{answer}</p>}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between border-b border-border/30 pb-3 mb-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Neural Chamber
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Simulation controls use RAM-only copies and respect scope locks
                    </p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                </div>
                <SimulationControls
                  runId={runId}
                  availableColumns={numericColumns}
                  onSimulationResult={() => undefined}
                  hint={data.guidanceNotes?.[0]?.message || null}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface InlineEvidenceProps {
  data: ReportDataResult;
  runId: string;
  className?: string;
  numericColumns: string[];
  onFocusGuidance?: () => void;
  simulationResult?: SimulationResult | null;
  simulationModifications?: Modification[];
}

function InlineEvidenceRail({
  data,
  className,
  onFocusGuidance,
  simulationResult,
  simulationModifications,
}: InlineEvidenceProps) {
  const [lineageEvidence, setLineageEvidence] =
    useState<EvidenceSummary | null>(null);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(
    null,
  );
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const businessEvidence = findEvidenceByScope(
    data.evidenceMap,
    "business_intelligence",
  );
  const predictiveEvidence = findEvidenceByScope(
    data.evidenceMap,
    "feature_importance",
  );

  const showBusiness = Boolean(
    data.enhancedAnalytics?.business_intelligence?.available &&
      businessEvidence?.confidence &&
      businessEvidence.confidence >= MIN_CONFIDENCE,
  );
  const showPredictive = Boolean(
    data.enhancedAnalytics?.feature_importance?.available &&
      predictiveEvidence?.confidence &&
      predictiveEvidence.confidence >= MIN_CONFIDENCE,
  );

  const businessData = data.enhancedAnalytics?.business_intelligence;
  const predictiveData = data.enhancedAnalytics?.feature_importance;

  const nudgeChips = useMemo(() => buildNudgeChips(data), [data]);

  const registerSectionRef = useCallback(
    (section: string) =>
      (node: HTMLElement | null) => {
        sectionRefs.current[section] = node;
      },
    [],
  );

  useEffect(() => {
    const handleFocus = (event: Event) => {
      const customEvent = event as CustomEvent<{
        section?: string;
        evidenceId?: string;
      }>;
      const { section, evidenceId } = customEvent.detail || {};
      if (!section) return;

      const target = sectionRefs.current[section];
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedSection(section);
      }

      if (evidenceId && data.evidenceMap?.[evidenceId]) {
        setLineageEvidence(data.evidenceMap[evidenceId]);
      }
    };

    window.addEventListener("ace:focus-evidence", handleFocus as EventListener);
    return () =>
      window.removeEventListener(
        "ace:focus-evidence",
        handleFocus as EventListener,
      );
  }, [data.evidenceMap]);

  useEffect(() => {
    if (!highlightedSection) return;
    const timer = window.setTimeout(() => setHighlightedSection(null), 2200);
    return () => window.clearTimeout(timer);
  }, [highlightedSection]);

  return (
    <div
      className={cn(
        "rounded-3xl border border-border/40 bg-card/70 shadow-sm",
        className,
      )}
      data-evidence-layout="inline"
    >
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            The Lab
          </p>
          <h3 className="font-mono text-lg text-foreground">Evidence Console</h3>
        </div>
        {onFocusGuidance && (
          <Button
            variant="ghost"
            size="sm"
            className="text-amber-600 hover:text-amber-700"
            onClick={onFocusGuidance}
            data-guidance-context="global"
          >
            <HelpCircle className="mr-2 h-4 w-4" /> Why Safe Mode?
          </Button>
        )}
      </div>
      {data.safeMode && (
        <div className="px-5 py-3 text-xs text-amber-900 bg-amber-50/70 border-b border-amber-200/60">
          Safe Mode is active here because predictive evidence requires traceable, decision-grade support.
          Descriptive insights elsewhere in the report remain available.
        </div>
      )}

      {nudgeChips.length > 0 && (
        <div className="px-5 pt-4 flex flex-wrap gap-2">
          {nudgeChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => focusGuidance("global")}
              className="text-[11px] uppercase tracking-[0.25em] border border-border/40 rounded-full px-3 py-1 text-action hover:border-action"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6 p-5">
        <section
          ref={registerSectionRef("business_intelligence")}
          data-evidence-section="business_intelligence"
          className={cn(
            "rounded-2xl border border-border/50 bg-background/70 p-4",
            highlightedSection === "business_intelligence" &&
              "ring-2 ring-offset-2 ring-[#005eb8] ring-offset-background",
          )}
        >
          {showBusiness && businessData ? (
            <>
              <SectionHeader
                title="Governed Signals"
                description="Value, churn, and retention diagnostics"
                icon={<Activity className="h-4 w-4 text-blue-500" />}
                onViewSource={
                  businessEvidence
                    ? () => setLineageEvidence(businessEvidence)
                    : undefined
                }
              />
              <BusinessPulse
                data={businessData}
                onViewEvidence={
                  businessEvidence
                    ? () => setLineageEvidence(businessEvidence)
                    : undefined
                }
              />
              {simulationResult?.delta && (
                <SimulationDeltaCard
                  result={simulationResult}
                  modifications={simulationModifications ?? []}
                />
              )}
            </>
          ) : (
            <EvidenceGate
              title="Evidence not applicable for this run"
              message="Business intelligence in the Lab requires traceable, decision-grade evidence. Descriptive insights in the report remain available."
              onWhy={onFocusGuidance}
            />
          )}
        </section>

        <section
          ref={registerSectionRef("feature_importance")}
          data-evidence-section="feature_importance"
          className={cn(
            "rounded-2xl border border-border/50 bg-background/70 p-4",
            highlightedSection === "feature_importance" &&
              "ring-2 ring-offset-2 ring-[#005eb8] ring-offset-background",
          )}
        >
          {showPredictive && predictiveData ? (
            <>
              <SectionHeader
                title="Governed Drivers"
                description="Feature importance audit"
                icon={<BarChart3 className="h-4 w-4 text-emerald-500" />}
                onViewSource={
                  predictiveEvidence
                    ? () => setLineageEvidence(predictiveEvidence)
                    : undefined
                }
              />
              <PredictiveDriversChart data={predictiveData} />
            </>
          ) : (
            <EvidenceGate
              title="Evidence not applicable for this run"
              message="Predictive drivers in the Lab require traceable, decision-grade evidence. Descriptive insights in the report remain available."
              onWhy={onFocusGuidance}
            />
          )}
        </section>

        {businessData && (
          <section
            data-evidence-section="variance"
            className="rounded-2xl border border-border/50 bg-background/70 p-4"
          >
            <SectionHeader
              title="Variance Bridge"
              description="How value stacks across key segments"
              icon={<Layers className="h-4 w-4 text-purple-500" />}
              onViewSource={
                businessEvidence
                  ? () => setLineageEvidence(businessEvidence)
                  : undefined
              }
            />
            <VarianceBridgeChart data={businessData} />
          </section>
        )}

        {businessData?.segment_value?.length ? (
          <section
            data-evidence-section="marimekko"
            className="rounded-2xl border border-border/50 bg-background/70 p-4"
          >
            <SectionHeader
              title="Market Map"
              description="Share and opportunity"
              icon={<BarChart3 className="h-4 w-4 text-sky-500" />}
              onViewSource={
                businessEvidence
                  ? () => setLineageEvidence(businessEvidence)
                  : undefined
              }
            />
            <MarimekkoShareChart data={businessData} />
          </section>
        ) : null}

        {data.guidanceNotes?.length ? (
          <GuidanceOverlay
            notes={data.guidanceNotes}
            context="rail"
            limit={3}
            className="!mb-0"
          />
        ) : null}
      </div>

      <EvidenceLineageModal
        evidence={lineageEvidence}
        onClose={() => setLineageEvidence(null)}
      />
    </div>
  );
}

function SectionHeader({
  title,
  description,
  icon,
  onViewSource,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  onViewSource?: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {icon}
          </span>
          {title}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      {onViewSource && (
        <Button variant="outline" size="sm" onClick={onViewSource} className="text-xs">
          View Source
        </Button>
      )}
    </div>
  );
}

function EvidenceGate({
  title = "Evidence not applicable for this run",
  message,
  onWhy,
}: {
  title?: string;
  message: string;
  onWhy?: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-4 text-sm text-amber-900">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-amber-900/90">{message}</p>
      {onWhy && (
        <button
          type="button"
          onClick={onWhy}
          className="mt-3 inline-flex items-center gap-2 text-[12px] font-semibold text-amber-700"
          data-guidance-context="global"
        >
          <HelpCircle className="h-3.5 w-3.5" /> Why am I seeing this?
        </button>
      )}
    </div>
  );
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function SimulationDeltaCard({
  result,
  modifications,
}: {
  result: SimulationResult;
  modifications: Modification[];
}) {
  const deltas = (result?.delta as Record<string, any>) || {};
  const rows: Array<{
    label: string;
    original: string;
    simulated: string;
    delta: string;
    improved: boolean;
  }> = [];

  const churn = deltas.churn_risk;
  if (churn) {
    rows.push({
      label: "Churn Risk",
      original: formatPercent(churn.original),
      simulated: formatPercent(churn.simulated),
      delta: formatPercent(churn.delta),
      improved:
        typeof churn.delta === "number" ? churn.delta < 0 : false,
    });
  }

  const ghost = deltas.ghost_revenue;
  if (ghost) {
    rows.push({
      label: "Ghost Revenue",
      original: formatCurrencyValue(ghost.original),
      simulated: formatCurrencyValue(ghost.simulated),
      delta: formatCurrencyValue(ghost.delta),
      improved:
        typeof ghost.delta === "number" ? ghost.delta > 0 : false,
    });
  }

  if (rows.length === 0) return null;

  return (
    <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 p-4 shadow-lg" data-testid="simulation-delta-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
            Neural Projection
          </p>
          <h4 className="text-lg font-semibold text-white">Projected Impact</h4>
        </div>
        <Sparkles className="h-4 w-4 text-cyan-300" />
      </div>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
              {row.label}
            </p>
            <div className="flex items-center gap-3 font-mono text-sm">
              <span className="text-slate-300">{row.original}</span>
              <span className="text-slate-500">{"?"}</span>
              <span className="font-semibold text-white">{row.simulated}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  row.improved
                    ? "bg-emerald-500/20 text-emerald-200"
                    : "bg-rose-500/20 text-rose-200"
                }`}
              >
                {row.delta}
              </span>
            </div>
          </div>
        ))}
      </div>
      {modifications.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
            Inputs Tested
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {modifications.map((mod) => (
              <span
                key={`${mod.target_column}-${mod.modification_factor}`}
                className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-mono"
              >
                {mod.target_column}: {formatModificationDelta(mod.modification_factor)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function deriveNumericColumns(data: ReportDataResult) {
  if (
    Array.isArray(data.profile?.numericColumns) &&
    data.profile.numericColumns.length
  ) {
    return data.profile.numericColumns;
  }

  if (data.profile?.columns) {
    return Object.entries(data.profile.columns)
      .filter(([, col]: any) =>
        col?.dtype && (col.dtype.includes("int") || col.dtype.includes("float")),
      )
      .map(([name]) => name);
  }

  return [];
}

function buildSuggestionChips(
  active: "business_pulse" | "predictive_drivers" | null,
  data: ReportDataResult,
) {
  const base = active ? SUGGESTION_CHIPS[active] : [];
  const dynamic: Array<{ label: string; icon: string; action: string }> = [];

  if (active === "business_pulse" && data.enhancedAnalytics) {
    const churnRisk =
      data.enhancedAnalytics.business_intelligence?.churn_risk
        ?.at_risk_percentage || 0;
    if (churnRisk > 20) {
      dynamic.push({
        label: "Analyze High-Risk Segment",
        icon: "??",
        action: "What are the top drivers of churn in this segment?",
      });
    }

    const hasClusters = Boolean(
      data.enhancedAnalytics.behavioral_clusters &&
        data.enhancedAnalytics.behavioral_clusters.length > 0,
    );
    if (hasClusters) {
      dynamic.push({
        label: "View Identified Personas",
        icon: "??",
        action: "Describe the key behavioral characteristics of these segments.",
      });
    }
  }

  return [...dynamic, ...base];
}

function buildNudgeChips(data: ReportDataResult): string[] {
  const chips: string[] = [];
  if (!data.hasTimeField) {
    chips.push("Anchor a synthetic timeline");
  }
  if ((data.profile?.numericColumns?.length ?? 0) > 0) {
    chips.push("Open What-If Cockpit");
  }
  if (data.enhancedAnalytics?.feature_importance?.available) {
    chips.push("Explain top driver");
  }
  if (
    (data.enhancedAnalytics?.business_intelligence?.value_metrics?.value_concentration ??
      0) > 0.5
  ) {
    chips.push("Inspect ghost revenue");
  }
  return Array.from(new Set(chips));
}

function findEvidenceByScope(
  map: Record<string, EvidenceSummary> | undefined,
  scope: string,
) {
  if (!map) return undefined;
  return Object.values(map).find((entry) => entry.scope === scope);
}

function formatModificationDelta(factor: number) {
  const pct = (factor - 1) * 100;
  if (!isFinite(pct) || pct === 0) return "0%";
  return `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`;
}

function formatPercent(value: unknown) {
  if (typeof value === "number" && isFinite(value)) {
    return `${value.toFixed(1)}%`;
  }
  return value != null ? String(value) : "";
}

function formatCurrencyValue(value: unknown) {
  if (typeof value === "number" && isFinite(value)) {
    return currencyFormatter.format(value);
  }
  return value != null ? String(value) : "";
}


