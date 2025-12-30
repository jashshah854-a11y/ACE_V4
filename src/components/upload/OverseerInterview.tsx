
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DatasetIdentity } from "@/lib/api-client";
import { Lock } from "lucide-react";
import { toast } from "sonner";

export interface TaskContract {
    decisionContext: string;
    forbiddenClaims: string[];
    primaryQuestion: string;
}

interface OverseerInterviewProps {
    identity: DatasetIdentity;
    onSubmit: (contract: TaskContract) => void;
    onBack?: () => void;
    className?: string;
}

interface ConstraintOption {
    id: string;
    label: string;
    description: string;
    locked?: boolean;
    lockedReason?: string;
    defaultChecked?: boolean;
}

export function OverseerInterview({ identity, onSubmit, onBack, className }: OverseerInterviewProps) {
    const [decisionContext, setDecisionContext] = useState("");
    const [forbiddenClaims, setForbiddenClaims] = useState<string[]>([]);
    const [primaryQuestion, setPrimaryQuestion] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Initialize constraints based on identity capabilities
    useEffect(() => {
        const initialClaims: string[] = [];

        // Auto-lock logic
        if (!identity.detected_capabilities.has_financial_columns) {
            initialClaims.push("no_revenue_inference");
        }

        if (!identity.detected_capabilities.has_categorical) {
            initialClaims.push("no_persona_segmentation");
        }

        setForbiddenClaims(prev => [...new Set([...prev, ...initialClaims])]);
    }, [identity]);

    const constraintsOptions: ConstraintOption[] = [
        {
            id: "no_revenue_inference",
            label: "Do not infer revenue",
            description: "Financial Rigor: Disable revenue predictions",
            locked: !identity.detected_capabilities.has_financial_columns,
            lockedReason: "No financial columns detected in source"
        },
        {
            id: "no_persona_segmentation",
            label: "Do not segment personas",
            description: "Avoid Stereotyping: Skip persona generation",
            locked: !identity.detected_capabilities.has_categorical,
            lockedReason: "No categorical fields available for segmentation"
        },
        {
            id: "strict_mode",
            label: "Strict Mode",
            description: "Skip low-confidence insights (< 90%)",
        },
        {
            id: "no_causal_claims",
            label: "Do not make causal claims",
            description: "Show correlations only, not causation",
        },
    ];

    const handleForbiddenClaimToggle = (claimId: string, isLocked: boolean) => {
        if (isLocked) return;

        setForbiddenClaims((prev) =>
            prev.includes(claimId)
                ? prev.filter((id) => id !== claimId)
                : [...prev, claimId]
        );
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!decisionContext.trim() || decisionContext.length < 10) {
            newErrors.decisionContext = "Please describe the decision context (min 10 chars)";
        }

        if (!primaryQuestion.trim()) {
            newErrors.primaryQuestion = "Please provide a primary question";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) {
            toast.error("Please provide more details to establish the contract.");
            return;
        }

        onSubmit({
            decisionContext: decisionContext.trim(),
            forbiddenClaims,
            primaryQuestion: primaryQuestion.trim(),
        });
    };

    return (
        <div className={cn("w-full max-w-4xl mx-auto font-serif", className)}>
            {/* Header - Library Aesthetic */}
            <div className="bg-slate-50 dark:bg-slate-900/50 px-8 py-6 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-3xl text-slate-900 dark:text-slate-100 mb-2 font-bold tracking-tight">
                    Task Contract
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-sans">
                    Help us understand your goals and boundaries
                </p>
            </div>

            {/* Body - Library Aesthetic (Conversational) */}
            <div className="bg-white dark:bg-slate-950 border-x border-b border-slate-200 dark:border-slate-800 rounded-b-lg p-8 space-y-8">
                {/* Question 1: Decision Context */}
                <div className="space-y-3">
                    <h3 className="text-xl text-slate-900 dark:text-slate-100 font-medium">
                        What decision does this analysis support?
                    </h3>
                    <p className="font-sans text-sm text-slate-500">
                        Help us separate signal from noise. Are you deciding on pricing, churn strategy, or market expansion?
                    </p>
                    <Textarea
                        value={decisionContext}
                        onChange={(e) => setDecisionContext(e.target.value)}
                        placeholder="e.g., 'We need to understand why Q3 sales dropped in the Northeast region to decide on Q4 budget allocation...'"
                        className={cn(
                            "min-h-[120px] font-sans text-base leading-relaxed p-4 bg-slate-50 dark:bg-slate-900",
                            errors.decisionContext && "border-red-500 ring-red-500/20"
                        )}
                    />
                    {errors.decisionContext && (
                        <p className="text-sm text-red-600 font-sans mt-1">
                            {errors.decisionContext}
                        </p>
                    )}
                </div>

                {/* Question 2: Scope Boundaries (Forbidden Claims) */}
                <div className="space-y-3">
                    <h3 className="text-xl text-slate-900 dark:text-slate-100 font-medium">
                        Are there strict boundaries we must respect?
                    </h3>
                    <p className="font-sans text-sm text-slate-500">
                        Toggle any constraints that should limit our analysis.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 font-sans">
                        {constraintsOptions.map((option) => (
                            <label
                                key={option.id}
                                className={cn(
                                    "flex items-start gap-3 p-4 rounded-lg border transition-all duration-200",
                                    option.locked
                                        ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80 cursor-not-allowed"
                                        : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-teal-500/50 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 cursor-pointer"
                                )}
                            >
                                <Checkbox
                                    checked={forbiddenClaims.includes(option.id)}
                                    onCheckedChange={() => handleForbiddenClaimToggle(option.id, !!option.locked)}
                                    disabled={option.locked}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center justify-between">
                                        {option.label}
                                        {option.locked && <Lock className="w-3 h-3 text-slate-400" />}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        {option.description}
                                    </div>
                                    {option.locked && option.lockedReason && (
                                        <div className="text-[10px] text-amber-600 dark:text-amber-500 mt-1.5 font-medium flex items-center gap-1">
                                            <span>🔒 Locked: {option.lockedReason}</span>
                                        </div>
                                    )}
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Question 3: Success Criteria */}
                <div className="space-y-3">
                    <h3 className="text-xl text-slate-900 dark:text-slate-100 font-medium">
                        What is the primary question you need answered?
                    </h3>
                    <p className="font-sans text-sm text-slate-500">
                        Be specific. This helps us prioritize the most relevant insights.
                    </p>
                    <Input
                        value={primaryQuestion}
                        onChange={(e) => setPrimaryQuestion(e.target.value)}
                        placeholder="e.g., 'Why did sales drop in Q3?'"
                        className={cn(
                            "font-sans text-base h-12 px-4 bg-slate-50 dark:bg-slate-900",
                            errors.primaryQuestion && "border-red-500 ring-red-500/20"
                        )}
                    />
                    {errors.primaryQuestion && (
                        <p className="text-sm text-red-600 font-sans mt-1">
                            {errors.primaryQuestion}
                        </p>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-8 border-t border-slate-200 dark:border-slate-800 font-sans">
                    {onBack && (
                        <Button
                            variant="ghost"
                            onClick={onBack}
                            className="text-slate-500 hover:text-slate-900"
                        >
                            ← Back to Identity Card
                        </Button>
                    )}
                    <Button
                        onClick={handleSubmit}
                        size="lg"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 shadow-lg shadow-primary/20 ml-auto"
                    >
                        Establish Contract & Begin
                    </Button>
                </div>
            </div>
        </div>
    );
}
