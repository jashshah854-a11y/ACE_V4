
import { Calendar, FileText, ArrowRight, Activity, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RecentReport } from "@/lib/localStorage";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
    report: RecentReport;
    diagnosticHint?: string; // One-liner hint if available
    onClick: () => void;
    className?: string;
}

export function ProjectCard({ report, diagnosticHint, onClick, className }: ProjectCardProps) {
    // Format date for display
    const dateDisplay = report.createdAt || new Date(report.timestamp).toLocaleDateString();

    return (
        <div
            className={cn(
                "group relative flex flex-col p-5 rounded-xl border border-border/40 bg-card/50 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:border-primary/20 cursor-pointer overflow-hidden",
                className
            )}
            onClick={onClick}
        >
            {/* Hover Gradient Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                        <FileText className="w-5 h-5" />
                    </div>
                    {diagnosticHint && (
                        <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-50/50">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Use Diagnostics
                        </Badge>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 mb-4">
                    <h3 className="font-semibold text-lg text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                        {report.title || "Untitled Analysis"}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <span>{report.runId}</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-3 mt-auto">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{dateDisplay}</span>
                    </div>
                    <div className="flex items-center gap-1 text-primary font-medium opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                        Open Report <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>
        </div>
    );
}
