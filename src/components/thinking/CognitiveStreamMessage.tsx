import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MessageType = "info" | "warning" | "success" | "error";

interface CognitiveStreamMessageProps {
    type?: MessageType;
    children: ReactNode;
    isActive?: boolean;
    isCompleted?: boolean;
    isPending?: boolean;
    className?: string;
}

const MESSAGE_ICONS: Record<MessageType, string> = {
    info: "●",
    success: "✓",
    warning: "⚠",
    error: "✗",
};

const MESSAGE_COLORS: Record<MessageType, string> = {
    info: "text-[hsl(var(--lab-signal))]",
    success: "text-[hsl(var(--lab-signal))]",
    warning: "text-[hsl(var(--lab-alert))]",
    error: "text-[hsl(var(--lab-alert))]",
};

export function CognitiveStreamMessage({
    type = "info",
    children,
    isActive = false,
    isCompleted = false,
    isPending = false,
    className,
}: CognitiveStreamMessageProps) {
    const icon = isCompleted
        ? MESSAGE_ICONS.success
        : isActive
            ? MESSAGE_ICONS.info
            : MESSAGE_ICONS.info;

    const iconColor = type === "warning" || type === "error"
        ? MESSAGE_COLORS[type]
        : isCompleted
            ? MESSAGE_COLORS.success
            : MESSAGE_COLORS.info;

    return (
        <div
            className={cn(
                "flex items-start gap-3 transition-all duration-400",
                isPending && "opacity-30",
                isActive && "opacity-100",
                isCompleted && "opacity-60",
                className
            )}
        >
            {/* Status Indicator */}
            <div className="flex-shrink-0 mt-1">
                <span className={cn(iconColor, isActive && "animate-pulse")}>
                    {icon}
                </span>
            </div>

            {/* Message Content */}
            <div className="flex-1 min-w-0">
                <span className={cn(
                    "text-[hsl(var(--lab-silver))]",
                    type === "warning" && "text-[hsl(var(--lab-alert))]"
                )}>
                    {children}
                </span>
            </div>
        </div>
    );
}

// Helper component for dynamic feedback messages
interface DynamicFeedbackProps {
    issue: string;
    context?: string;
}

export function DynamicFeedback({ issue, context }: DynamicFeedbackProps) {
    return (
        <CognitiveStreamMessage type="warning" isCompleted>
            <div className="space-y-1">
                <div>Note: {issue}</div>
                {context && (
                    <div className="text-xs opacity-75 ml-4">→ {context}</div>
                )}
            </div>
        </CognitiveStreamMessage>
    );
}

// Safe Mode trigger message
export function SafeModeTrigger({ reason }: { reason: string }) {
    return (
        <CognitiveStreamMessage type="warning" isCompleted>
            <div className="space-y-1">
                <div>⚠ Confidence levels are low for predictive modeling.</div>
                <div className="text-xs opacity-75 ml-4">→ Switching to Safe Mode to ensure factual accuracy.</div>
                <div className="text-xs opacity-75 ml-4">→ {reason}</div>
            </div>
        </CognitiveStreamMessage>
    );
}
