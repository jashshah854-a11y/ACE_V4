
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { RunStatus } from "@/lib/api-client";

interface RunStatusBadgeProps {
  status: RunStatus | string;
  className?: string;
  showIcon?: boolean;
}

export function RunStatusBadge({ status, className, showIcon = true }: RunStatusBadgeProps) {
  const normalizedStatus = status?.toLowerCase() || "pending";

  let styles = "border-transparent";
  let Icon = Clock;
  let label = "Pending";

  switch (normalizedStatus) {
    case "pending":
    case "accepted":
      styles = "bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200";
      Icon = Clock;
      label = normalizedStatus === "accepted" ? "Queued" : "Pending";
      break;
    case "running":
      styles = "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200 animate-pulse";
      Icon = Loader2;
      label = "Running";
      break;
    case "running_with_errors":
      styles = "bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200 animate-pulse";
      Icon = AlertCircle;
      label = "Running (Issues)";
      break;
    case "complete":
      styles = "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200";
      Icon = CheckCircle2;
      label = "Complete";
      break;
    case "complete_with_errors":
      styles = "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200";
      Icon = AlertCircle;
      label = "Complete (Warnings)";
      break;
    case "failed":
      styles = "bg-red-100 text-red-800 hover:bg-red-200 border-red-200";
      Icon = XCircle;
      label = "Failed";
      break;
    default:
      styles = "bg-gray-100 text-gray-800 border-gray-200";
      label = status;
  }

  return (
    <Badge variant="outline" className={cn("gap-1.5", styles, className)}>
      {showIcon && <Icon className={cn("h-3.5 w-3.5", normalizedStatus.includes("running") && "animate-spin")} />}
      {label}
    </Badge>
  );
}
