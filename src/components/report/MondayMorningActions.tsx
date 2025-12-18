import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Users, TrendingUp, AlertCircle } from "lucide-react";
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
            label: "Do First",
            color: "bg-red-500 text-white",
            icon: AlertCircle,
            border: "border-red-200 dark:border-red-800"
        },
        high: {
            label: "High Priority",
            color: "bg-orange-500 text-white",
            icon: TrendingUp,
            border: "border-orange-200 dark:border-orange-800"
        },
        medium: {
            label: "Medium Priority",
            color: "bg-blue-500 text-white",
            icon: CheckCircle2,
            border: "border-blue-200 dark:border-blue-800"
        }
    };

    const effortConfig = {
        low: { label: "Quick Win", color: "text-green-600 dark:text-green-400" },
        medium: { label: "Moderate Effort", color: "text-yellow-600 dark:text-yellow-400" },
        high: { label: "Significant Effort", color: "text-orange-600 dark:text-orange-400" }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className={className}
        >
            <Card className="border-2 border-primary/20 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <CheckCircle2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">Monday Morning Actions</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Concrete next steps you can take immediately
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        {actions.map((action, index) => {
                            const priority = priorityConfig[action.priority];
                            const effort = effortConfig[action.effort];
                            const PriorityIcon = priority.icon;

                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 * index }}
                                    className={cn(
                                        "p-4 rounded-lg border-2 bg-card hover:shadow-md transition-shadow",
                                        priority.border
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 mt-1">
                                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold", priority.color)}>
                                                {index + 1}
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className={priority.color}>
                                                        <PriorityIcon className="h-3 w-3 mr-1" />
                                                        {priority.label}
                                                    </Badge>
                                                    <Badge variant="outline" className={effort.color}>
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        {effort.label}
                                                    </Badge>
                                                    {action.owner && (
                                                        <Badge variant="secondary">
                                                            <Users className="h-3 w-3 mr-1" />
                                                            {action.owner}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <h4 className="font-semibold text-base text-foreground">
                                                    {action.title}
                                                </h4>
                                            </div>

                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {action.description}
                                            </p>

                                            <div className="pt-2 border-t border-border/50">
                                                <div className="flex items-start gap-2">
                                                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
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
