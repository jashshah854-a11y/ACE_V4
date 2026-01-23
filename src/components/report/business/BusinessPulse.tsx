import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, AlertTriangle, DollarSign, Activity, Info } from "lucide-react";
import { BusinessIntelligence } from "@/types/reportTypes";
import { cn } from "@/lib/utils";
import { isValidArtifact } from "@/lib/artifactGuard";

interface BusinessPulseProps {
    data: BusinessIntelligence;
    onViewEvidence?: () => void;
}

export function BusinessPulse({ data, onViewEvidence }: BusinessPulseProps) {
    if (!data || !isValidArtifact(data)) return null;

    const { value_metrics, clv_proxy, churn_risk, segment_value, insights } = data;

    // Formatting helpers
    const formatCurrency = (val: number) => {
        if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
        return `$${val.toFixed(0)}`;
    };

    const formatPercent = (val: number) => `${val.toFixed(1)}%`;

    return (
        <div className="space-y-6">
            {/* 1. Header & Insights */}
            <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
                        <Activity className="w-6 h-6 text-blue-500" />
                        Business Signals
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Strategic evaluation of value, retention, and customer equity.
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap justify-end">
                    {onViewEvidence && (
                        <button
                            type="button"
                            onClick={onViewEvidence}
                            className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-[#005eb8]"
                        >
                            <Info className="w-3.5 h-3.5" />
                            View Source
                        </button>
                    )}

                    {insights && insights.length > 0 && (
                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 max-w-xl text-sm text-blue-900 shadow-sm">
                            <SparklesIcon className="w-4 h-4 inline mr-2 text-blue-600" />
                            <span className="font-medium">{insights[0]}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Total Value */}
                {value_metrics && (
                    <MetricCard
                        title="Total Value Estimate"
                        value={formatCurrency(value_metrics.total_value)}
                        subtitle={`Avg: ${formatCurrency(value_metrics.avg_value)} per record`}
                        icon={DollarSign}
                        trend="neutral"
                    />
                )}

                {/* CLV / Equity */}
                {clv_proxy && (
                    <MetricCard
                        title="High-Value Volume"
                        value={formatCurrency(clv_proxy.estimated_total_value)}
                        subtitle={`${clv_proxy.high_value_count} records drive top equity`}
                        icon={TrendingUp}
                        trend="up"
                    />
                )}

                {/* Inequality (Gini) */}
                {value_metrics && (
                    <MetricCard
                        title="Value Concentration"
                        value={value_metrics.value_concentration.toFixed(2)}
                        subtitle={value_metrics.value_concentration > 0.5 ? "High inequality (Pareto)" : "Balanced distribution"}
                        icon={Users}
                        status={value_metrics.value_concentration > 0.6 ? "warning" : "success"}
                    />
                )}

                {/* Churn Risk */}
                {churn_risk && (
                    <MetricCard
                        title="Churn Risk Exposure"
                        value={formatPercent(churn_risk.at_risk_percentage)}
                        subtitle={`${churn_risk.at_risk_count} records show low activity`}
                        icon={AlertTriangle}
                        status={churn_risk.at_risk_percentage > 20 ? "danger" : "neutral"}
                    />
                )}
            </div>

            {/* 3. Deep Dive: Segments & Churn Context */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Value Segmentation */}
                {segment_value && (
                    <Card className="border-border/50 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Value Contribution by Segment</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {segment_value.slice(0, 5).map((seg, idx) => (
                                <div key={idx} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                                            {idx + 1}
                                        </span>
                                        <span className="font-medium text-sm text-foreground/80">{seg.segment}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold">{formatPercent(seg.value_contribution_pct)}</span>
                                        <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full"
                                                style={{ width: `${seg.value_contribution_pct}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Risk Context */}
                {churn_risk && (
                    <Card className={cn("border-border/50 shadow-sm", churn_risk.at_risk_percentage > 20 ? "bg-red-50/10 border-red-200/50" : "")}>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Retention Diagnostics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 text-sm text-secondary-foreground/90">
                                <p>
                                    We detected <b>{churn_risk.at_risk_count}</b> customers showing minimal engagement on key activity metric
                                    <code className="mx-1 px-1 py-0.5 bg-muted rounded text-xs font-mono">{churn_risk.activity_column}</code>.
                                </p>
                                <div className="p-3 bg-background rounded-lg border border-border/60">
                                    <div className="flex justify-between mb-1 text-xs text-muted-foreground">
                                        <span>Safe</span>
                                        <span>At Risk</span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                        <div
                                            className="bg-emerald-500 h-full"
                                            style={{ width: `${100 - churn_risk.at_risk_percentage}%` }}
                                        />
                                        <div
                                            className="bg-amber-500 h-full"
                                            style={{ width: `${churn_risk.at_risk_percentage}%` }}
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    *Risk is defined as activity falling into the bottom quartile of total distribution.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

            </div>
        </div>
    );
}

// Sub-component for individual card
function MetricCard({ title, value, subtitle, icon: Icon, trend, status }: any) {
    const statusColors = {
        neutral: "text-foreground",
        success: "text-emerald-600",
        warning: "text-amber-600",
        danger: "text-rose-600"
    };

    const colorClass = status ? statusColors[status as keyof typeof statusColors] : statusColors.neutral;

    return (
        <Card className="border-border/60 shadow-none hover:border-border transition-colors">
            <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <Icon className={cn("w-4 h-4 opacity-70", colorClass)} />
                </div>
                <div className="flex items-baseline gap-2">
                    <h3 className={cn("text-2xl font-bold tracking-tight", colorClass)}>{value}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
            </CardContent>
        </Card>
    );
}

function SparklesIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z" />
        </svg>
    );
}
