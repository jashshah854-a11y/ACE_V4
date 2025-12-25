import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Users, TrendingUp, Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Action {
    title: string;
    description: string;
    priority: "immediate" | "high" | "medium";
    effort: "low" | "medium" | "high";
    expectedImpact: string;
    owner?: string;
}

interface MondayMorningActionsProps {
    actions: Action[];
    className?: string;
}

export function MondayMorningActions({ actions, className }: MondayMorningActionsProps) {
    // Null safety - return empty if no actions
    if (!actions || actions.length === 0) return null;

    const priorityConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
        immediate: { label: "High Priority", bg: "bg-copper-100", text: "text-copper-700", border: "border-copper-200" },
        high: { label: "High Priority", bg: "bg-copper-100", text: "text-copper-700", border: "border-copper-200" },
        medium: { label: "Medium Priority", bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200" }
    };

    const defaultPriority = { label: "Priority", bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };

    const effortConfig: Record<string, { label: string; color: string }> = {
        low: { label: "Quick Win", color: "text-teal-600 border-teal-200" },
        medium: { label: "Significant Effort", color: "text-copper-600 border-copper-200" },
        high: { label: "Significant Effort", color: "text-copper-600 border-copper-200" }
    };

    const defaultEffort = { label: "Effort TBD", color: "text-muted-foreground border-border" };

    // Filter valid actions
    const validActions = actions.filter(a => a && (a.title || a.description));

    if (validActions.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className={className}
        >
            <div className="bg-card border border-border rounded-sm shadow-soft overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-sm bg-navy-900">
                            <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-serif text-lg font-semibold text-navy-900">Monday Morning Actions</h3>
                            <p className="text-sm text-muted-foreground">
                                Concrete next steps you can take immediately
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions List */}
                <div className="divide-y divide-border/50">
                    {validActions.map((action, index) => {
                        const priority = priorityConfig[action.priority] || defaultPriority;
                        const effort = effortConfig[action.effort] || defaultEffort;

                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 + index * 0.08, duration: 0.4 }}
                                className="p-6 hover:bg-muted/20 transition-colors"
                            >
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        "w-8 h-8 rounded-sm flex items-center justify-center text-sm font-bold shrink-0",
                                        priority.bg, priority.text
                                    )}>
                                        {index + 1}
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-3">
                                        {/* Badges */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge className={cn("text-[10px] font-semibold", priority.bg, priority.text, "border", priority.border)}>
                                                <Zap className="h-2.5 w-2.5 mr-1" />
                                                {priority.label}
                                            </Badge>
                                            <Badge variant="outline" className={cn("text-[10px] font-semibold", effort.color)}>
                                                <Clock className="h-2.5 w-2.5 mr-1" />
                                                {effort.label}
                                            </Badge>
                                            {action.owner && (
                                                <Badge variant="secondary" className="text-[10px] font-semibold">
                                                    <Users className="h-2.5 w-2.5 mr-1" />
                                                    {action.owner}
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Title & Description */}
                                        <div>
                                            <h4 className="font-semibold text-navy-900 mb-1">
                                                {action.title}
                                            </h4>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {action.description}
                                            </p>
                                        </div>

                                        {/* Expected Impact */}
                                        <div className="flex items-center gap-2 pt-2">
                                            <TrendingUp className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                                            <span className="text-xs">
                                                <span className="font-medium text-muted-foreground">Expected Impact:</span>{" "}
                                                <span className="text-foreground">{action.expectedImpact}</span>
                                            </span>
                                        </div>
                                    </div>

                                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0 hidden sm:block" />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
}