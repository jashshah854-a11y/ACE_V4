import { motion } from "framer-motion";
import { Calendar, Hash, Database, Target, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportMetadataProps {
  runId?: string;
  generatedAt?: string;
  qualityScore?: number;
  domain?: string;
  targetInfo?: {
    name: string;
    r2?: number;
    rmse?: number;
    mae?: number;
  };
  className?: string;
}

export function ReportMetadata({
  runId,
  generatedAt,
  qualityScore,
  domain,
  targetInfo,
  className
}: ReportMetadataProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getQualityLabel = (score?: number) => {
    if (!score) return null;
    if (score >= 0.9) return { label: "Excellent", color: "text-teal-600 bg-teal-50" };
    if (score >= 0.7) return { label: "Good", color: "text-teal-600 bg-teal-50" };
    if (score >= 0.5) return { label: "Fair", color: "text-copper-600 bg-copper-50" };
    return { label: "Needs Work", color: "text-copper-600 bg-copper-50" };
  };

  const quality = getQualityLabel(qualityScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className={cn("bg-muted/30 border border-border rounded-sm p-4", className)}
    >
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
        Report Details
      </h4>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Run ID */}
        {runId && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Hash className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wider font-medium">Run ID</span>
            </div>
            <p className="font-mono text-xs font-medium text-foreground">{runId.slice(0, 8)}</p>
          </div>
        )}

        {/* Generated */}
        {generatedAt && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wider font-medium">Generated</span>
            </div>
            <p className="text-xs font-medium text-foreground">{formatDate(generatedAt)}</p>
          </div>
        )}

        {/* Quality Score */}
        {qualityScore !== undefined && quality && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wider font-medium">Quality</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", quality.color)}>
                {(qualityScore * 100).toFixed(0)}%
              </span>
              <span className="text-xs text-muted-foreground">{quality.label}</span>
            </div>
          </div>
        )}

        {/* Domain */}
        {domain && domain !== 'mock_domain' && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Database className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wider font-medium">Domain</span>
            </div>
            <p className="text-xs font-medium text-foreground capitalize">{domain.replace(/_/g, ' ')}</p>
          </div>
        )}
      </div>

      {/* Target Info - Only show if meaningful */}
      {targetInfo && targetInfo.r2 !== undefined && targetInfo.r2 > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
            <Target className="h-3 w-3" />
            <span className="text-[10px] uppercase tracking-wider font-medium">Model Performance</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Target:</span>{" "}
              <span className="font-medium">{targetInfo.name}</span>
            </div>
            {targetInfo.r2 !== undefined && (
              <div>
                <span className="text-muted-foreground">R²:</span>{" "}
                <span className={cn("font-medium", targetInfo.r2 > 0.5 ? "text-teal-600" : "text-muted-foreground")}>
                  {targetInfo.r2.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}