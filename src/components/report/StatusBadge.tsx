import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
    severity: "critical" | "high" | "medium" | "low" | "info";
    label?: string;
    showIcon?: boolean;
    pulse?: boolean;
    className?: string;
}

export function StatusBadge({
    severity,
    label,
    showIcon = true,
    pulse = false,
    className,
}: StatusBadgeProps) {
    const config = {
        critical: {
            icon: AlertCircle,
            bg: "bg-red-500 hover:bg-red-600",
            text: "text-white",
            ring: "ring-red-500/50",
            label: label || "Critical",
        },
        high: {
            icon: AlertTriangle,
            bg: "bg-orange-500 hover:bg-orange-600",
            text: "text-white",
            ring: "ring-orange-500/50",
            label: label || "High",
        },
        medium: {
            icon: Info,
            bg: "bg-yellow-500 hover:bg-yellow-600",
            text: "text-white",
            ring: "ring-yellow-500/50",
            label: label || "Medium",
        },
        low: {
            icon: CheckCircle,
            bg: "bg-blue-500 hover:bg-blue-600",
            text: "text-white",
            ring: "ring-blue-500/50",
            label: label || "Low",
        },
        info: {
            icon: Info,
            bg: "bg-slate-500 hover:bg-slate-600",
            text: "text-white",
            ring: "ring-slate-500/50",
            label: label || "Info",
        },
    };

    const { icon: Icon, bg, text, ring, label: defaultLabel } = config[severity];

    return (
        <div className="relative inline-block">
            {pulse && (
                <span className={cn("absolute inset-0 rounded-full animate-ping opacity-75", ring)} />
            )}
            <Badge
                className={cn(
                    "gap-1.5 font-semibold shadow-lg transition-all duration-200",
                    bg,
                    text,
                    pulse && "ring-2 ring-offset-2" + ring,
                    className
                )}
            >
                {showIcon && <Icon className="h-3.5 w-3.5" />}
                {defaultLabel}
            </Badge>
        </div>
    );
}

interface TrafficLightProps {
    status: "green" | "yellow" | "red";
    label?: string;
    size?: "sm" | "md" | "lg";
}

export function TrafficLight({ status, label, size = "md" }: TrafficLightProps) {
    const sizeMap = {
        sm: "h-3 w-3",
        md: "h-4 w-4",
        lg: "h-6 w-6",
    };

    const colors = {
        green: "bg-green-500",
        yellow: "bg-yellow-500",
        red: "bg-red-500",
    };

    return (
        <div className="flex items-center gap-2">
            <div className="relative">
                <div className={cn("rounded-full", sizeMap[size], colors[status])} />
                {status === "red" && (
                    <div className={cn(
                        "absolute inset-0 rounded-full animate-ping",
                        colors[status],
                        "opacity-75"
                    )} />
                )}
            </div>
            {label && <span className="text-sm font-medium">{label}</span>}
        </div>
    );
}
