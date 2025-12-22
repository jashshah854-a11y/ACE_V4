import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Users, TrendingUp, Zap } from "lucide-react";
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
    const priorityConfig = {
        immediate: {
            label: "High Priority",
            color: "bg-warning text-warning-foreground",
            border: "border-warning/25"
        },
        high: {
            label: "High Priority",
            color: "bg-warning text-warning-foreground",
            border: "border-warning/25"
        },
        medium: {
            label: "Medium Priority",
            color: "bg-info text-info-foreground",
            border: "border-info/25"
        }
    };

    const effortConfig = {
        low: { label: "Quick Win", color: "text-success border-success/30" },
        medium: { label: "Significant Effort", color: "text-warning border-warning/30" },
        high: { label: "Significant Effort", color: "text-warning border-warning/30" }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={className}
        >
            <Card className="border shadow-soft">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Monday Morning Actions</CardTitle>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Concrete next steps you can take immediately
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-3">
                        {actions.map((action, index) => {
                            const priority = priorityConfig[action.priority];
                            const effort = effortConfig[action.effort];

                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + index * 0.08, duration: 0.4 }}
                                    className={cn(
                                        "p-4 rounded-xl border bg-card hover:shadow-sm transition-all duration-300",
                                        priority.border
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 mt-0.5">
                                            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-sm font-semibold", priority.color)}>
                                                {index + 1}
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <Badge className={cn("text-xs", priority.color)}>
                                                        <Zap className="h-2.5 w-2.5 mr-1" />
                                                        {priority.label}
                                                    </Badge>
                                                    <Badge variant="outline" className={cn("text-xs", effort.color)}>
                                                        <Clock className="h-2.5 w-2.5 mr-1" />
                                                        {effort.label}
                                                    </Badge>
                                                    {action.owner && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            <Users className="h-2.5 w-2.5 mr-1" />
                                                            {action.owner}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <h4 className="font-semibold text-sm text-foreground">
                                                    {action.title}
                                                </h4>
                                            </div>

                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {action.description}
                                            </p>

                                            <div className="pt-3 border-t border-border/40">
                                                <div className="flex items-start gap-2">
                                                    <TrendingUp className="h-3.5 w-3.5 text-success mt-0.5 flex-shrink-0" />
                                                    <div>
                                                        <span className="text-xs font-medium text-muted-foreground">Expected Impact: </span>
                                                        <span className="text-xs text-foreground">{action.expectedImpact}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
