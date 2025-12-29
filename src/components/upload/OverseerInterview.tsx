import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export interface TaskContract {
    decisionContext: string;
    forbiddenClaims: string[];
    primaryQuestion: string;
}

interface OverseerInterviewProps {
    onSubmit: (contract: TaskContract) => void;
    onBack?: () => void;
    className?: string;
}

const FORBIDDEN_CLAIMS_OPTIONS = [
    {
        id: "no_revenue_inference",
        label: "Do not infer revenue",
        description: "Financial columns missing/unverified",
    },
    {
        id: "no_persona_segmentation",
        label: "Do not segment personas",
        description: "Avoid stereotyping or demographic assumptions",
    },
    {
        id: "strict_mode",
        label: "Strict Mode: Skip low-confidence insights",
        description: "Do not guess - show only high-confidence findings",
    },
    {
        id: "no_causal_claims",
        label: "Do not make causal claims",
        description: "Show correlations only, not causation",
    },
];

export function OverseerInterview({ onSubmit, onBack, className }: OverseerInterviewProps) {
    const [decisionContext, setDecisionContext] = useState("");
    const [forbiddenClaims, setForbiddenClaims] = useState<string[]>([]);
    const [primaryQuestion, setPrimaryQuestion] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleForbiddenClaimToggle = (claimId: string) => {
        setForbiddenClaims((prev) =>
            prev.includes(claimId)
                ? prev.filter((id) => id !== claimId)
                : [...prev, claimId]
        );
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!decisionContext.trim()) {
            newErrors.decisionContext = "Please describe the decision context";
        }

        if (!primaryQuestion.trim()) {
            newErrors.primaryQuestion = "Please provide a primary question";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;

        onSubmit({
            decisionContext: decisionContext.trim(),
            forbiddenClaims,
            primaryQuestion: primaryQuestion.trim(),
        });
    };

    return (
        <div className={cn("w-full max-w-4xl mx-auto", className)}>
            {/* Header - Library Aesthetic */}
            <div className="bg-[hsl(var(--library-bg))] px-8 py-6 border-b border-[hsl(var(--library-muted))]/20">
                <h2 className="font-[family-name:var(--font-library-heading)] text-3xl text-[hsl(var(--library-text))] mb-2">
                    Task Contract
                </h2>
                <p className="font-[family-name:var(--font-library-body)] text-[hsl(var(--library-muted))] text-sm">
                    Help us understand your goals and boundaries
                </p>
            </div>

            {/* Body - Library Aesthetic (Conversational) */}
            <div className="bg-white border-x border-b border-[hsl(var(--library-muted))]/20 rounded-b-lg p-8 space-y-8">
                {/* Question 1: Decision Context */}
                <div className="space-y-3">
                    <h3 className="font-[family-name:var(--font-library-heading)] text-xl text-[hsl(var(--library-text))]">
                        What decision does this analysis support?
                    </h3>
                    <p className="font-[family-name:var(--font-library-body)] text-sm text-[hsl(var(--library-muted))]">
                        Help us separate signal from noise. Are you deciding on pricing, churn strategy, or market expansion?
                    </p>
                    <Textarea
                        value={decisionContext}
                        onChange={(e) => setDecisionContext(e.target.value)}
                        placeholder="e.g., 'We need to understand why Q3 sales dropped in the Northeast region'"
                        className={cn(
                            "min-h-[100px] font-[family-name:var(--font-library-body)]",
                            errors.decisionContext && "border-[hsl(var(--lab-alert))]"
                        )}
                    />
                    {errors.decisionContext && (
                        <p className="text-sm text-[hsl(var(--lab-alert))] font-[family-name:var(--font-library-body)]">
                            {errors.decisionContext}
                        </p>
                    )}
                </div>

                {/* Question 2: Scope Boundaries (Forbidden Claims) */}
                <div className="space-y-3">
                    <h3 className="font-[family-name:var(--font-library-heading)] text-xl text-[hsl(var(--library-text))]">
                        Are there strict boundaries we must respect?
                    </h3>
                    <p className="font-[family-name:var(--font-library-body)] text-sm text-[hsl(var(--library-muted))]">
                        Toggle any constraints that should limit our analysis.
                    </p>

                    <div className="space-y-3 pt-2">
                        {FORBIDDEN_CLAIMS_OPTIONS.map((option) => (
                            <label
                                key={option.id}
                                className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-[hsl(var(--library-bg))] transition-colors"
                            >
                                <Checkbox
                                    checked={forbiddenClaims.includes(option.id)}
                                    onCheckedChange={() => handleForbiddenClaimToggle(option.id)}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <div className="font-[family-name:var(--font-library-body)] font-medium text-[hsl(var(--library-text))]">
                                        {option.label}
                                    </div>
                                    <div className="font-[family-name:var(--font-library-body)] text-xs text-[hsl(var(--library-muted))] mt-0.5">
                                        {option.description}
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Question 3: Success Criteria */}
                <div className="space-y-3">
                    <h3 className="font-[family-name:var(--font-library-heading)] text-xl text-[hsl(var(--library-text))]">
                        What is the primary question you need answered?
                    </h3>
                    <p className="font-[family-name:var(--font-library-body)] text-sm text-[hsl(var(--library-muted))]">
                        Be specific. This helps us prioritize the most relevant insights.
                    </p>
                    <Input
                        value={primaryQuestion}
                        onChange={(e) => setPrimaryQuestion(e.target.value)}
                        placeholder="e.g., 'Why did sales drop in Q3?'"
                        className={cn(
                            "font-[family-name:var(--font-library-body)]",
                            errors.primaryQuestion && "border-[hsl(var(--lab-alert))]"
                        )}
                    />
                    {errors.primaryQuestion && (
                        <p className="text-sm text-[hsl(var(--lab-alert))] font-[family-name:var(--font-library-body)]">
                            {errors.primaryQuestion}
                        </p>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-[hsl(var(--library-muted))]/20">
                    {onBack && (
                        <Button
                            variant="ghost"
                            onClick={onBack}
                            className="font-[family-name:var(--font-library-body)]"
                        >
                            ← Back to Identity Card
                        </Button>
                    )}
                    <Button
                        onClick={handleSubmit}
                        className="bg-[hsl(var(--lab-signal))] hover:bg-[hsl(var(--lab-signal))]/90 font-[family-name:var(--font-library-body)] ml-auto"
                    >
                        Begin Analysis
                    </Button>
                </div>
            </div>
        </div>
    );
}
