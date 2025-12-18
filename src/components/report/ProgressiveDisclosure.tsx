import { useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Info, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProgressiveDisclosureProps {
    title: string;
    preview?: string;
    children: ReactNode;
    defaultOpen?: boolean;
    complexity?: "beginner" | "intermediate" | "advanced";
    className?: string;
}

export function ProgressiveDisclosure({
    title,
    preview,
    children,
    defaultOpen = false,
    complexity = "intermediate",
    className
}: ProgressiveDisclosureProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const complexityConfig = {
        beginner: { color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400", label: "Easy Read" },
        intermediate: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400", label: "Technical" },
        advanced: { color: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400", label: "Advanced" }
    };

    const config = complexityConfig[complexity];

    return (
        <div className={cn("border rounded-lg overflow-hidden", className)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-primary/10">
                        <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                        <h4 className="font-semibold text-sm">{title}</h4>
                        {preview && !isOpen && (
                            <p className="text-xs text-muted-foreground mt-0.5">{preview}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={cn("text-xs", config.color)}>
                        {config.label}
                    </Badge>
                    {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="px-4 py-4 border-t bg-muted/20">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface DetailLevel {
    level: "glance" | "scan" | "deep";
    label: string;
    description: string;
}

interface LayeredContentProps {
    glance: ReactNode;
    scan?: ReactNode;
    deep?: ReactNode;
    defaultLevel?: "glance" | "scan" | "deep";
    className?: string;
}

export function LayeredContent({
    glance,
    scan,
    deep,
    defaultLevel = "glance",
    className
}: LayeredContentProps) {
    const [currentLevel, setCurrentLevel] = useState<"glance" | "scan" | "deep">(defaultLevel);

    const levels: DetailLevel[] = [
        { level: "glance", label: "Quick Summary", description: "Key points in 10 seconds" },
        { level: "scan", label: "Overview", description: "Main insights and patterns" },
        { level: "deep", label: "Full Analysis", description: "Complete technical details" }
    ];

    const availableLevels = levels.filter(l =>
        l.level === "glance" || (l.level === "scan" && scan) || (l.level === "deep" && deep)
    );

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                <Info className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-xs text-muted-foreground mr-2">Detail level:</span>
                <div className="flex gap-1 flex-wrap">
                    {availableLevels.map((level) => (
                        <Button
                            key={level.level}
                            variant={currentLevel === level.level ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentLevel(level.level)}
                            className="h-7 text-xs"
                        >
                            {level.label}
                        </Button>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentLevel}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {currentLevel === "glance" && glance}
                    {currentLevel === "scan" && scan}
                    {currentLevel === "deep" && deep}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
