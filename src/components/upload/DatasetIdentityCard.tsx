
import { Card } from "@/components/ui/card";
import { DatasetIdentity } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Check, X, AlertTriangle, FileText, Activity } from "lucide-react";

interface DatasetIdentityCardProps {
    identity: DatasetIdentity;
}

export function DatasetIdentityCard({ identity }: DatasetIdentityCardProps) {
    const qualityColor = identity.quality_score > 0.7 ? "teal" : identity.quality_score > 0.5 ? "amber" : "red";

    return (
        <Card className="bg-slate-950 border-slate-800 font-mono text-sm overflow-hidden shadow-xl">
            {/* Header */}
            <div className="border-b border-slate-800 p-4 bg-slate-900/50 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-teal-500" />
                        DATASET IDENTITY CARD
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Ingestion complete - ID: {Math.random().toString(36).substring(7).toUpperCase()}</p>
                </div>
                <div className="text-xs px-2 py-1 rounded bg-teal-950/30 text-teal-400 border border-teal-800/50">
                    Source loaded
                </div>
            </div>

            {/* Vitals */}
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-3 gap-6 text-center">
                    <div className="bg-slate-900/40 p-3 rounded border border-slate-800/60">
                        <div className="text-2xl font-bold text-teal-400">{identity.row_count.toLocaleString()}</div>
                        <div className="text-[10px] tracking-wider text-slate-500 uppercase mt-1">ROWS DETECTED</div>
                    </div>
                    <div className="bg-slate-900/40 p-3 rounded border border-slate-800/60">
                        <div className="text-2xl font-bold text-teal-400">{identity.column_count}</div>
                        <div className="text-[10px] tracking-wider text-slate-500 uppercase mt-1">COLUMNS</div>
                    </div>
                    <div className="bg-slate-900/40 p-3 rounded border border-slate-800/60">
                        <div className="text-2xl font-bold text-teal-400">{identity.file_type}</div>
                        <div className="text-[10px] tracking-wider text-slate-500 uppercase mt-1">FORMAT</div>
                    </div>
                </div>

                {/* Quality Score */}
                <div className="border-t border-slate-800 pt-5">
                    <div className="flex justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-400">DATA INTEGRITY SCORE</span>
                        <span className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded",
                            identity.quality_score > 0.7 ? "bg-teal-950 text-teal-400" :
                                identity.quality_score > 0.5 ? "bg-amber-950 text-amber-400" : "bg-red-950 text-red-400"
                        )}>
                            {(identity.quality_score * 100).toFixed(0)}%
                        </span>
                    </div>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                            className={cn(
                                "h-full transition-all duration-1000 ease-out",
                                identity.quality_score > 0.7 ? "bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]" :
                                    identity.quality_score > 0.5 ? "bg-amber-500" : "bg-red-500"
                            )}
                            style={{ width: `${identity.quality_score * 100}%` }}
                        />
                    </div>
                    {identity.quality_score < 0.5 && (
                        <div className="mt-3 flex items-start gap-2 text-xs text-amber-400 bg-amber-950/20 p-2 rounded border border-amber-900/50">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>WARNING: Data density is low. The Sentry has detected significant gaps that may limit predictive analysis.</span>
                        </div>
                    )}
                </div>

                {/* Schema Preview */}
                <div className="border-t border-slate-800 pt-5">
                    <div className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-2">
                        <FileText className="w-3 h-3" />
                        FIELD RECONNAISSANCE (TOP 5)
                    </div>
                    <div className="space-y-1 bg-slate-900/30 p-2 rounded border border-slate-800/50">
                        {identity.schema_map.map((field, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs p-1 hover:bg-slate-800/50 rounded transition-colors">
                                <span className="text-slate-300 font-medium">{field.name}</span>
                                <span className="text-slate-500 font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                    {field.type.toUpperCase()}
                                </span>
                            </div>
                        ))}
                        <div className="text-center pt-1 text-[10px] text-slate-600 italic">
                            + {Math.max(0, identity.column_count - 5)} more fields
                        </div>
                    </div>
                </div>

                {/* Capabilities */}
                <div className="border-t border-slate-800 pt-5">
                    <div className="text-xs font-semibold text-slate-400 mb-3">ANALYSIS CAPABILITIES</div>
                    <div className="grid grid-cols-2 gap-2">
                        <CapabilityBadge
                            label="Financial Modeling"
                            enabled={identity.detected_capabilities.has_financial_columns}
                        />
                        <CapabilityBadge
                            label="Time-Series Forecasting"
                            enabled={identity.detected_capabilities.has_time_series}
                        />
                        <CapabilityBadge
                            label="Segmentation"
                            enabled={identity.detected_capabilities.has_categorical}
                        />
                        <CapabilityBadge
                            label="Regression / Numeric"
                            enabled={identity.detected_capabilities.has_numeric}
                        />
                    </div>
                </div>

                {/* Warnings */}
                {identity.warnings.length > 0 && (
                    <div className="border-t border-slate-800 pt-5">
                        <div className="text-xs text-amber-400 space-y-1">
                            {identity.warnings.slice(0, 3).map((warning, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <AlertTriangle className="w-3 h-3" />
                                    {warning}
                                </div>
                            ))}
                            {identity.warnings.length > 3 && (
                                <div className="text-slate-500 text-[10px] pl-5">
                                    ...and {identity.warnings.length - 3} more issues
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}

function CapabilityBadge({ label, enabled }: { label: string; enabled: boolean }) {
    return (
        <div className={cn(
            "px-3 py-2 rounded text-xs flex items-center justify-between transition-colors",
            enabled
                ? "bg-teal-950/20 text-teal-300 border border-teal-900/50"
                : "bg-slate-900/50 text-slate-600 border border-slate-800"
        )}>
            <span>{label}</span>
            {enabled ? <Check className="w-3.5 h-3.5 text-teal-500" /> : <X className="w-3.5 h-3.5 text-slate-700" />}
        </div>
    );
}
