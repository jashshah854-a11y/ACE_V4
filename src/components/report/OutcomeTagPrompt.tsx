import { useState } from "react";
import { ThumbsUp, Minus, ThumbsDown, HelpCircle, X } from "lucide-react";
import { API_BASE } from "@/lib/api-client";

/**
 * Phase 5.2: Outcome Tag Prompt
 * 
 * Minimal UI for optional outcome tagging.
 * Shows only on return visits. Fully dismissible.
 * No insights, no pressure, no nudges.
 */

type OutcomeStatus = 'positive' | 'neutral' | 'negative' | 'unknown';

interface OutcomeTagPromptProps {
    runId: string;
    decisionTouchId: string;
    actionItemId?: string;
    onDismiss: () => void;
}

export function OutcomeTagPrompt({
    runId,
    decisionTouchId,
    actionItemId,
    onDismiss,
}: OutcomeTagPromptProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleOutcomeSelect = async (status: OutcomeStatus) => {
        setIsSubmitting(true);

        try {
            const payload = {
                decision_touch_id: decisionTouchId,
                run_id: runId,
                action_item_id: actionItemId,
                status,
            };

            await fetch(`${API_BASE}/api/action-outcome`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            // Success - dismiss immediately (no confirmation needed)
            onDismiss();
        } catch (error) {
            // Silent failure - tagging is optional
            onDismiss();
        }
    };

    return (
        <div className="bg-muted/30 border-b border-border px-6 py-3">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                <p className="text-sm text-foreground font-medium">
                    How did this decision turn out?
                </p>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleOutcomeSelect('positive')}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 text-sm rounded-md border border-border bg-background hover:bg-green-50 hover:border-green-300 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        title="Positive outcome"
                    >
                        <ThumbsUp className="h-4 w-4 text-green-600" />
                        <span>Positive</span>
                    </button>

                    <button
                        onClick={() => handleOutcomeSelect('neutral')}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 text-sm rounded-md border border-border bg-background hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        title="Neutral outcome"
                    >
                        <Minus className="h-4 w-4 text-gray-600" />
                        <span>Neutral</span>
                    </button>

                    <button
                        onClick={() => handleOutcomeSelect('negative')}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 text-sm rounded-md border border-border bg-background hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        title="Negative outcome"
                    >
                        <ThumbsDown className="h-4 w-4 text-red-600" />
                        <span>Negative</span>
                    </button>

                    <button
                        onClick={() => handleOutcomeSelect('unknown')}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 text-sm rounded-md border border-border bg-background hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        title="Not sure / unknown"
                    >
                        <HelpCircle className="h-4 w-4 text-blue-600" />
                        <span>Not sure</span>
                    </button>

                    <button
                        onClick={onDismiss}
                        disabled={isSubmitting}
                        className="p-1.5 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 ml-2"
                        title="Dismiss"
                    >
                        <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>
            </div>
        </div>
    );
}
