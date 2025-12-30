
import React from "react";
import { QueryThread } from "@/context/SimulationContext";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TruthCheck } from "../feedback/TruthCheck";

export function AnalystResponseCard({ thread }: { thread: QueryThread }) {
    return (
        <Card className="p-4 space-y-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm transition-all animate-in slide-in-from-right-2">
            {/* Header: User Intent */}
            <div className="flex items-start gap-2">
                <div className="min-w-[4px] h-full bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 italic">
                    "{thread.user_intent}"
                </div>
            </div>

            {/* Body: Analyst Response */}
            <div className="pl-3 border-l text-sm font-sans space-y-2">
                <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-xs uppercase tracking-wider font-bold">
                    <Sparkles className="w-3 h-3" />
                    ACE Analyst
                </div>

                {thread.status === 'thinking' && (
                    <div className="flex items-center gap-2 text-slate-500 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Isolating variables...</span>
                    </div>
                )}

                {thread.status === 'answered' && thread.analyst_response && (
                    <div className="space-y-3">
                        <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                            {thread.analyst_response.text_content}
                        </p>

                        {/* Confidence Badge */}
                        <div className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border",
                            thread.analyst_response.confidence_score > 0.8
                                ? "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-800"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                            {thread.analyst_response.confidence_score > 0.8
                                ? <CheckCircle className="w-3 h-3" />
                                : <AlertCircle className="w-3 h-3" />}
                            {thread.analyst_response.confidence_score > 0.8 ? "High Confidence" : "Low Confidence"}
                            <span className="opacity-60 ml-1">
                                {(thread.analyst_response.confidence_score * 100).toFixed(0)}%
                            </span>
                        </div>
                    </div>
                )}

                {thread.status === 'error' && (
                    <div className="text-red-500 text-xs">
                        Unable to analyze this data point.
                    </div>
                )}
            </div>

            {/* Feedback Loop */}
            {thread.status === 'answered' && (
                <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <TruthCheck targetId={thread.id} targetType="query_response" />
                </div>
            )}
        </Card>
    );
}
