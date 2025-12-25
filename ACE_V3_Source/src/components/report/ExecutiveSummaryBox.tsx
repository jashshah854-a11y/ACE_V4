import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ExecutiveSummaryBoxProps {
    title?: string;
    keyPoints: Array<{
        icon?: ReactNode;
        text: string;
        highlight?: string | number;
    }>;
    className?: string;
}

/**
 * Visually distinct executive summary container
 * Full-width highlighted section with larger typography
 */
export function ExecutiveSummaryBox({
    title = "Executive Summary",
    keyPoints,
    className
}: ExecutiveSummaryBoxProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className={className}
        >
            <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border-primary/20 overflow-hidden">
                <div className="p-8">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Sparkles className="h-6 w-6 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold">{title}</h2>
                    </div>

                    {/* Grid of Key Points */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {keyPoints.map((point, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * idx, duration: 0.3 }}
                                className="flex items-start gap-3"
                            >
                                {/* Icon */}
                                <div className="shrink-0 mt-1">
                                    {point.icon || (
                                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-base leading-relaxed">
                                        {point.text}
                                        {point.highlight && (
                                            <span className="font-bold text-primary ml-1">
                                                {point.highlight}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Bottom accent bar */}
                <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
            </Card>
        </motion.div>
    );
}
