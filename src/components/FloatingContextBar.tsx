import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FloatingContextBarProps {
    reportName?: string;
    runDate?: string;
    qualityScore?: number;
    criticalIssuesCount?: number;
}

export function FloatingContextBar({
    reportName = "Analysis Report",
    runDate,
    qualityScore,
    criticalIssuesCount = 0,
}: FloatingContextBarProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            // Show after scrolling past 400px (hero section)
            setVisible(window.scrollY > 400);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const getQualityStatus = () => {
        if (!qualityScore) return { label: "Unknown", color: "secondary" as const };
        if (qualityScore >= 90) return { label: "Excellent", color: "default" as const };
        if (qualityScore >= 70) return { label: "Good", color: "secondary" as const };
        return { label: "Needs Review", color: "destructive" as const };
    };

    const qualityStatus = getQualityStatus();

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="fixed top-16 left-0 right-0 z-40 px-4"
                >
                    <div
                        className="max-w-7xl mx-auto bg-background/80 backdrop-blur-lg border border-border/50 rounded-lg shadow-lg"
                        onClick={scrollToTop}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && scrollToTop()}
                    >
                        <div className="flex items-center justify-between px-4 py-3 gap-4">
                            {/* Left: Report Info */}
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-sm font-semibold truncate">
                                        {reportName}
                                    </h3>
                                    {runDate && (
                                        <p className="text-xs text-muted-foreground">
                                            {runDate}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Center: Status Badges */}
                            <div className="flex items-center gap-2 shrink-0">
                                {qualityScore !== undefined && (
                                    <Badge
                                        variant={qualityStatus.color}
                                        className="hidden sm:inline-flex"
                                        title={`Data quality: ${qualityScore}%`}
                                    >
                                        {qualityStatus.label}
                                    </Badge>
                                )}

                                {criticalIssuesCount > 0 && (
                                    <Badge variant="destructive" className="gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        {criticalIssuesCount} Critical
                                    </Badge>
                                )}
                            </div>

                            {/* Right: Scroll to Top */}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="shrink-0 hover:bg-muted"
                                title="Scroll to top"
                            >
                                <ArrowUp className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
