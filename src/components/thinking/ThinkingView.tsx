import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ThinkingStage {
    id: string;
    agent: string;
    messages: string[];
    status: "pending" | "active" | "complete" | "skipped";
}

interface ThinkingViewProps {
    currentStep?: string;
    stepsCompleted?: string[];
    className?: string;
}

// Four-Stage Reasoning: Detailed progressive messages per agent
const STAGE_MESSAGES: Record<string, string[]> = {
    ingestion: [
        "Listening to your data...",
    ],
    type_identifier: [
        "Overseer: Establishing Task Contract...",
        "Defining scope boundaries to ensure relevance...",
    ],
    scanner: [
        "Sentry: Scanning dataset structure...",
        "Validating schema integrity...",
    ],
    interpreter: [
        "Sentry: Interpreting field relationships...",
        "Mapping data semantics...",
    ],
    validator: [
        "Sentry: Running validation checks...",
        "Assessing data quality and completeness...",
    ],
    overseer: [
        "Overseer: Locking analytical scope...",
        "Preventing scope drift and hallucinations...",
    ],
    regression: [
        "Analyst Core: Isolating signal from noise...",
        "Testing correlations against context...",
        "Computing confidence intervals for key findings...",
    ],
    sentry: [
        "Sentry: Checking for anomalies and outliers...",
        "Validating statistical assumptions...",
    ],
    personas: [
        "Analyst Core: Modeling behavioral patterns...",
        "Segmenting user cohorts...",
    ],
    fabricator: [
        "Fabricator: Constructing evidence-backed narrative...",
        "Verifying traceability links...",
        "Finalizing the Insight Canvas...",
    ],
    expositor: [
        "Fabricator: Weaving findings into story...",
        "Ensuring Context → Finding → Why it matters structure...",
    ],
};

const AGENT_LABELS: Record<string, string> = {
    ingestion: "Ingestion",
    type_identifier: "Overseer",
    scanner: "Sentry",
    interpreter: "Sentry",
    validator: "Sentry",
    overseer: "Overseer",
    regression: "Analyst Core",
    sentry: "Sentry",
    personas: "Analyst Core",
    fabricator: "Fabricator",
    expositor: "Fabricator",
};

export function ThinkingView({ currentStep, stepsCompleted = [], className }: ThinkingViewProps) {
    const [visibleStages, setVisibleStages] = useState<ThinkingStage[]>([]);
    const [activeMessageIndex, setActiveMessageIndex] = useState(0);
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
                messages: STAGE_MESSAGES[id] || ["Processing..."],
                status,
            };
        });

        setVisibleStages(stages);

        // Reset message index when step changes
        if (currentStep) {
            setActiveMessageIndex(0);
            setTypingIndex(0);
        }
    }, [currentStep, stepsCompleted]);

    // Progressive message display with typing animation - READING PACE (60ms)
    useEffect(() => {
        if (!currentStep) return;

        const activeStage = visibleStages.find((s) => s.status === "active");
        if (!activeStage) return;

        const currentMessage = activeStage.messages[activeMessageIndex];
        if (!currentMessage) return;

        if (typingIndex < currentMessage.length) {
            const timer = setTimeout(() => {
                setTypingIndex(typingIndex + 1);
            }, 60); // Reading pace: 60ms per character (calm confidence)
            return () => clearTimeout(timer);
        } else if (activeMessageIndex < activeStage.messages.length - 1) {
            // Move to next message after a pause
            const timer = setTimeout(() => {
                setActiveMessageIndex(activeMessageIndex + 1);
                setTypingIndex(0);
            }, 800); // 800ms pause between messages
            return () => clearTimeout(timer);
        }
    }, [typingIndex, activeMessageIndex, currentStep, visibleStages]);

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

            {/* Terminal Body - The Cognitive Stream */}
            <div className="bg-[hsl(var(--lab-charcoal))] border-x border-b border-[hsl(var(--lab-border))] rounded-b-lg p-6 min-h-[400px] font-[family-name:var(--font-lab)] text-sm">
                <div className="space-y-3">
                    {visibleStages.map((stage, stageIndex) => (
                        <div key={stage.id}>
                            {stage.messages.map((message, msgIndex) => {
                                const isActive = stage.status === "active" && msgIndex === activeMessageIndex;
                                const isCompleted = stage.status === "complete" || (stage.status === "active" && msgIndex < activeMessageIndex);
                                const isPending = stage.status === "pending" || (stage.status === "active" && msgIndex > activeMessageIndex);

                                return (
                                    <div
                                        key={`${stage.id}-${msgIndex}`}
                                        className={cn(
                                            "flex items-start gap-3 transition-all duration-400",
                                            isPending && "opacity-30",
                                            isActive && "opacity-100",
                                            isCompleted && "opacity-60",
                                            stage.status === "skipped" && "opacity-40 line-through"
                                        )}
                                    >
                                        {/* Status Indicator */}
                                        <div className="flex-shrink-0 mt-1">
                                            {isCompleted && (
                                                <span className="text-[hsl(var(--lab-signal))]">✓</span>
                                            )}
                                            {isActive && (
                                                <span className="text-[hsl(var(--lab-signal))] animate-pulse">●</span>
                                            )}
                                            {isPending && (
                                                <span className="text-[hsl(var(--lab-silver))]">○</span>
                                            )}
                                            {stage.status === "skipped" && (
                                                <span className="text-[hsl(var(--lab-silver))]">−</span>
                                            )}
                                        </div>

                                        {/* Message with typing animation */}
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[hsl(var(--lab-silver))]">
                                                {isActive
                                                    ? message.substring(0, typingIndex)
                                                    : message}
                                                {isActive && typingIndex < message.length && (
                                                    <span className="inline-block w-2 h-4 bg-[hsl(var(--lab-signal))] ml-1 animate-pulse" />
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
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
