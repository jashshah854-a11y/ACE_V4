import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type AnomalyStatus = "detected" | "investigating" | "resolved" | "dismissed";
type AnomalySeverity = "low" | "medium" | "high" | "critical";

interface Anomaly {
  id: string;
  title: string;
  description: string;
  table: string;
  affectedRecords: number;
  status: AnomalyStatus;
  severity: AnomalySeverity;
  detectedAt: string;
}

const mockAnomalies: Anomaly[] = [
  {
    id: "1",
    title: "Duplicate Customer Records",
    description: "Multiple entries with similar email patterns detected",
    table: "customers",
    affectedRecords: 234,
    status: "detected",
    severity: "high",
    detectedAt: "2 hours ago",
  },
  {
    id: "2",
    title: "Missing Phone Numbers",
    description: "Required field contains null values in recent imports",
    table: "contacts",
    affectedRecords: 89,
    status: "investigating",
    severity: "medium",
    detectedAt: "5 hours ago",
  },
  {
    id: "3",
    title: "Invalid Date Format",
    description: "Non-standard date formats in transaction records",
    table: "transactions",
    affectedRecords: 45,
    status: "resolved",
    severity: "low",
    detectedAt: "1 day ago",
  },
  {
    id: "4",
    title: "Orphaned Records",
    description: "Foreign key references to non-existent parent records",
    table: "orders",
    affectedRecords: 12,
    status: "detected",
    severity: "critical",
    detectedAt: "30 min ago",
  },
];

const statusConfig: Record<AnomalyStatus, { icon: typeof CheckCircle; color: string; bg: string }> = {
  detected: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  investigating: { icon: Clock, color: "text-info", bg: "bg-info/10" },
  resolved: { icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  dismissed: { icon: XCircle, color: "text-muted-foreground", bg: "bg-muted" },
};

const severityConfig: Record<AnomalySeverity, { color: string; bg: string }> = {
  low: { color: "text-muted-foreground", bg: "bg-muted" },
  medium: { color: "text-warning", bg: "bg-warning/10" },
  high: { color: "text-destructive", bg: "bg-destructive/10" },
  critical: { color: "text-destructive", bg: "bg-destructive/20" },
};

export function AnomalyList() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Detected Anomalies</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {mockAnomalies.filter(a => a.status === "detected").length} issues require attention
            </p>
          </div>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-border">
        {mockAnomalies.map((anomaly) => {
          const StatusIcon = statusConfig[anomaly.status].icon;
          
          return (
            <div
              key={anomaly.id}
              className="p-4 hover:bg-secondary/30 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-4">
                {/* Status Icon */}
                <div className={cn(
                  "p-2 rounded-lg shrink-0",
                  statusConfig[anomaly.status].bg
                )}>
                  <StatusIcon className={cn(
                    "h-4 w-4",
                    statusConfig[anomaly.status].color
                  )} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">{anomaly.title}</h4>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium capitalize",
                      severityConfig[anomaly.severity].bg,
                      severityConfig[anomaly.severity].color
                    )}>
                      {anomaly.severity}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {anomaly.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="font-mono bg-secondary px-1.5 py-0.5 rounded">
                      {anomaly.table}
                    </span>
                    <span>{anomaly.affectedRecords.toLocaleString()} records</span>
                    <span>{anomaly.detectedAt}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
