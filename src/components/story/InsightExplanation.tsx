
import { useState, useEffect } from "react";
import { ExplanationContent } from "@/types/StoryTypes";
import { useNarrative } from "@/components/narrative/NarrativeContext";
import { ChevronDown, ChevronUp, AlertTriangle, Lightbulb, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface InsightExplanationProps {
    explanation?: ExplanationContent;
    className?: string;
}

export function InsightExplanation({ explanation, className }: InsightExplanationProps) {
    const { mode } = useNarrative();
    const [isExpanded, setIsExpanded] = useState(false);

    // Auto-expand based on mode
    useEffect(() => {
        if (mode === 'expert') {
            setIsExpanded(true);
        } else if (mode === 'analyst') {
            // Partial expansion logic could go here, or just default to collapsed but easier to open
            setIsExpanded(false);
        } else {
            setIsExpanded(false);
        }
    }, [mode]);

    if (!explanation) return null;

    return (
        <div className={cn("rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden", className)}>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 text-sm font-medium hover:bg-muted/30 transition-colors"
            >
                <div className="flex items-center gap-2 text-primary">
                    <Lightbulb className="w-4 h-4" />
                    <span>Understanding this Insight</span>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="border-t border-border/40"
                    >
                        <div className="p-4 space-y-4 text-sm">
                            {/* What Happened - Main Observation */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <Target className="w-3.5 h-3.5" /> What Happened
                                </div>
                                <p className="text-foreground/90 pl-5.5">{explanation.what_happened}</p>
                            </div>

                            {/* Why it Happened - Drivers (Analyst+) */}
                            {(mode === 'analyst' || mode === 'expert') && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        <TrendingUp className="w-3.5 h-3.5" /> Why it Happened
                                    </div>
                                    <p className="text-foreground/90 pl-5.5">{explanation.why_it_happened}</p>
                                </div>
                            )}

                            {/* Why it Matters - Business Impact */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <Lightbulb className="w-3.5 h-3.5" /> Why it Matters
                                </div>
                                <p className="text-foreground/90 pl-5.5">{explanation.why_it_matters}</p>
                            </div>

                            {/* Watchouts - Risks (Expert only) */}
                            {mode === 'expert' && (
                                <div className="space-y-1 border-l-2 border-amber-500/50 pl-3 ml-1">
                                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600">
                                        <AlertTriangle className="w-3.5 h-3.5" /> Critical Watchouts
                                    </div>
                                    <p className="text-muted-foreground">{explanation.what_to_watch}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
