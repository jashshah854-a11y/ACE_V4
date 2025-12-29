import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ThinkingStage {
    id: string;
    agent: string;
    message: string;
    status: "pending" | "active" | "complete" | "skipped";
    timestamp?: string;
}

interface ThinkingViewProps {
    currentStep?: string;
    stepsCompleted?: string[];
    className?: string;
}

const STAGE_MESSAGES: Record<string, string> = {
    ingestion: "Listening to your data...",
    type_identifier: "Identifying data patterns and structure...",
    scanner: "Scanning for quality signals...",
    interpreter: "Interpreting schema and relationships...",
    validator: "Validating data sufficiency...",
    overseer: "Defining analytical scope...",
    regression: "Computing statistical relationships...",
    sentry: "Checking for anomalies and outliers...",
    personas: "Modeling behavioral patterns...",
    fabricator: "Assembling evidence chains...",
    expositor: "Constructing narrative...",
};

const AGENT_LABELS: Record<string, string> = {
    ingestion: "Ingestion",
    type_identifier: "Type Identifier",
    scanner: "Scanner",
    interpreter: "Schema Interpreter",
    validator: "Sentry",
    overseer: "Overseer",
    regression: "Analyst Core",
    sentry: "Sentry",
    personas: "Persona Engine",
    fabricator: "Fabricator",
    expositor: "Expositor",
};

export function ThinkingView({ currentStep, stepsCompleted = [], className }: ThinkingViewProps) {
    const [visibleStages, setVisibleStages] = useState<ThinkingStage[]>([]);
    const [typingIndex, setTypingIndex] = useState(0);

    useEffect(() => {
        const allStages = Object.keys(STAGE_MESSAGES);
        const stages: ThinkingStage[] = allStages.map((id) => {
            let status: ThinkingStage["status"] = "pending";

            if (stepsCompleted.includes(id)) {
                status = "complete";
            } else if (currentStep === id) {
                status = "active";
            }

            return {
                id,
                agent: AGENT_LABELS[id] || id,
                message: STAGE_MESSAGES[id] || "Processing...",
                status,
            };
        });

        setVisibleStages(stages);
    }, [currentStep, stepsCompleted]);

    // Typing animation for active stage
    useEffect(() => {
        if (!currentStep) return;

        const activeStage = visibleStages.find((s) => s.status === "active");
        if (!activeStage) return;

        const message = activeStage.message;
        if (typingIndex < message.length) {
            const timer = setTimeout(() => {
                setTypingIndex(typingIndex + 1);
            }, 30);
            return () => clearTimeout(timer);
        }
    }, [typingIndex, currentStep, visibleStages]);

    return (
        <div className={cn("w-full max-w-4xl mx-auto", className)}>
            {/* Terminal Header */}
            <div className="bg-[hsl(var(--lab-charcoal))] border border-[hsl(var(--lab-border))] rounded-t-lg px-4 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-[hsl(var(--lab-silver))] font-[family-name:var(--font-lab)] text-sm ml-2">
                    ACE Intelligence Engine
                </span>
            </div>

            {/* Terminal Body */}
            <div className="bg-[hsl(var(--lab-charcoal))] border-x border-b border-[hsl(var(--lab-border))] rounded-b-lg p-6 min-h-[400px] font-[family-name:var(--font-lab)] text-sm">
                <div className="space-y-3">
                    {visibleStages.map((stage, index) => (
                        <div
                            key={stage.id}
                            className={cn(
                                "flex items-start gap-3 transition-all duration-300",
                                stage.status === "pending" && "opacity-30",
                                stage.status === "active" && "opacity-100",
                                stage.status === "complete" && "opacity-60",
                                stage.status === "skipped" && "opacity-40 line-through"
                            )}
                            style={{
                                animationDelay: `${index * 50}ms`,
                            }}
                        >
                            {/* Status Indicator */}
                            <div className="flex-shrink-0 mt-1">
                                {stage.status === "complete" && (
                                    <span className="text-[hsl(var(--lab-signal))]">✓</span>
                                )}
                                {stage.status === "active" && (
                                    <span className="text-[hsl(var(--lab-signal))] animate-pulse">●</span>
                                )}
                                {stage.status === "pending" && (
                                    <span className="text-[hsl(var(--lab-silver))]">○</span>
                                )}
                                {stage.status === "skipped" && (
                                    <span className="text-[hsl(var(--lab-silver))]">−</span>
                                )}
                            </div>

                            {/* Agent and Message */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[hsl(var(--lab-signal))] font-medium">
                                        [{stage.agent}]
                                    </span>
                                    <span className="text-[hsl(var(--lab-silver))]">
                                        {stage.status === "active"
                                            ? stage.message.substring(0, typingIndex)
                                            : stage.message}
                                        {stage.status === "active" && typingIndex < stage.message.length && (
                                            <span className="inline-block w-2 h-4 bg-[hsl(var(--lab-signal))] ml-1 animate-pulse" />
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Thinking Indicator */}
                {currentStep && (
                    <div className="mt-8 flex items-center gap-2 text-[hsl(var(--lab-silver))]">
                        <div className="flex gap-1">
                            <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                            <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                            <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                        </div>
                        <span className="text-sm">Thinking</span>
                    </div>
                )}
            </div>
        </div>
    );
}
