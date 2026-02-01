import type { RedundancyReport } from "@/types/reportTypes";
import { ChartWrapper } from "@/components/report/ChartWrapper";
import { ExplanationBlock } from "@/components/report/ExplanationBlock";
import { getSectionCopy } from "@/lib/reportCopy";
import { isValidArtifact } from "@/lib/artifactGuard";

interface RedundancyReportCardProps {
  data?: RedundancyReport | null;
}

export function RedundancyReportCard({ data }: RedundancyReportCardProps) {
  if (!data || !isValidArtifact(data)) {
    return null;
  }

  const constants = data.constants ?? [];
  const nearConstants = data.near_constants ?? [];
  const redundantPairs = data.redundant_pairs ?? [];

  if (constants.length === 0 && nearConstants.length === 0 && redundantPairs.length === 0) {
    return null;
  }

  const explanationCopy = getSectionCopy("data_quality");

  const chartContent = (
    <div className="space-y-4 text-sm text-slate-700">
      {constants.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Constant columns</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {constants.slice(0, 12).map((col) => (
              <span key={col} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                {col}
              </span>
            ))}
          </div>
        </div>
      )}

      {nearConstants.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Near-constant columns</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {nearConstants.slice(0, 12).map((col) => (
              <span key={col} className="rounded-full bg-amber-100/70 px-2 py-1 text-xs text-amber-800">
                {col}
              </span>
            ))}
          </div>
        </div>
      )}

      {redundantPairs.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Highly correlated pairs</div>
          <div className="mt-2 space-y-2">
            {redundantPairs.slice(0, 6).map((pair) => (
              <div key={`${pair.feature1}-${pair.feature2}`} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-700">
                  <span>{pair.feature1}</span>
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">corr</span>
                  <span>{pair.feature2}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">r = {Number(pair.correlation).toFixed(4)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <ExplanationBlock {...explanationCopy} />
      <ChartWrapper
        title="Feature Redundancy & Constants"
        questionAnswered="Which columns are redundant or add little signal?"
        source="Redundancy scan"
        sampleSize={data.redundant_pair_count}
        chart={chartContent}
        caption={{
          text: "Redundant or constant columns can inflate correlations and destabilize models.",
          severity: "neutral",
        }}
      />
    </div>
  );
}
