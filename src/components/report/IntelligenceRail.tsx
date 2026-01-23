import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
    Target,
    AlertTriangle,
    TrendingUp,
    Zap,
    ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface IntelligenceRailProps {
    keyTakeaways?: string[];
    criticalIssues?: {
        count: number;
        items: string[];
    };
    quickStats?: {
        dataQuality?: number;
        anomalies?: number;
    };
    sections?: Array<{
        id: string;
        title: string;
    }>;
    currentSection?: string;
    readingProgress?: number;
    onSectionClick?: (sectionId: string) => void;
}

export function IntelligenceRail({
    keyTakeaways = [],
    criticalIssues,
    quickStats,
    sections = [],
    currentSection,
    readingProgress = 0,
    onSectionClick
}: IntelligenceRailProps) {
    return (
        <div className="space-y-6">
            {/* Key Takeaways */}
            {keyTakeaways.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-card border border-border rounded-sm shadow-soft overflow-hidden"
                >
                    <div className="px-4 py-3 border-b border-border bg-muted/30">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-copper-600 flex items-center gap-2">
                            <Target className="h-3.5 w-3.5" />
                            Key Takeaways
                        </h4>
                    </div>
                    <div className="p-4">
                        <ul className="space-y-3">
                            {keyTakeaways.slice(0, 5).map((takeaway, idx) => (
                                <motion.li 
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + idx * 0.05 }}
                                    className="text-sm flex items-start gap-2 group"
                                >
                                    <span className="text-copper-400 mt-0.5 group-hover:text-copper-600 transition-colors">•</span>
                                    <span className="text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
                                        {takeaway}
                                    </span>
                                </motion.li>
                            ))}
                        </ul>
                    </div>
                </motion.div>
            )}

            {/* Critical Issues */}
            {criticalIssues && criticalIssues.count > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-copper-50 border border-copper-200 rounded-sm shadow-soft overflow-hidden"
                >
                    <div className="px-4 py-3 border-b border-copper-200 bg-copper-100/50 flex items-center justify-between">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-copper-700 flex items-center gap-2">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Attention Required
                        </h4>
                        <Badge className="bg-copper-500 text-white text-[10px] px-1.5 py-0">
                            {criticalIssues.count}
                        </Badge>
                    </div>
                    <div className="p-4">
                        <ul className="space-y-2">
                            {criticalIssues.items.slice(0, 3).map((issue, idx) => (
                                <li key={idx} className="text-sm text-copper-700 flex items-start gap-2">
                                    <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                    <span>{issue}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </motion.div>
            )}

            {/* Quick Stats */}
            {quickStats && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-card border border-border rounded-sm shadow-soft overflow-hidden"
                >
                    <div className="px-4 py-3 border-b border-border bg-muted/30">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-navy-800 flex items-center gap-2">
                            <Zap className="h-3.5 w-3.5" />
                            Quick Stats
                        </h4>
                    </div>
                    <div className="p-4 space-y-4">
                        {quickStats.dataQuality !== undefined && (
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-medium text-muted-foreground">Data Quality</span>
                                    <span className="text-sm font-bold text-navy-900">{quickStats.dataQuality}%</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${quickStats.dataQuality}%` }}
                                        transition={{ duration: 0.8, delay: 0.4 }}
                                        className={cn(
                                            "h-full rounded-full",
                                            quickStats.dataQuality >= 70 ? "bg-teal-500" : "bg-copper-400"
                                        )}
                                    />
                                </div>
                            </div>
                        )}
                        {quickStats.anomalies !== undefined && (
                            <div className="flex justify-between items-center pt-2 border-t border-border">
                                <span className="text-xs font-medium text-muted-foreground">Anomalies Found</span>
                                <Badge 
                                    variant={quickStats.anomalies > 0 ? "destructive" : "secondary"}
                                    className="text-xs"
                                >
                                    {quickStats.anomalies}
                                </Badge>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Section Navigation */}
            {sections.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-card border border-border rounded-sm shadow-soft overflow-hidden"
                >
                    <div className="px-4 py-3 border-b border-border bg-muted/30">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-navy-800">
                            Jump To Section
                        </h4>
                    </div>
                    <nav className="p-2">
                        {sections.map((section, idx) => (
                            <button
                                key={section.id}
                                onClick={() => onSectionClick?.(section.id)}
                                className={cn(
                                    "w-full text-left text-sm px-3 py-2 rounded-sm transition-all flex items-center gap-2",
                                    currentSection === section.id 
                                        ? "bg-copper-50 text-copper-600 font-medium" 
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <ChevronRight className={cn(
                                    "h-3 w-3 transition-transform",
                                    currentSection === section.id && "rotate-90 text-copper-400"
                                )} />
                                {section.title}
                            </button>
                        ))}
                    </nav>
                </motion.div>
            )}
        </div>
    );
}
