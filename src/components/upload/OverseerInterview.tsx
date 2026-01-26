import { useState, useEffect, useMemo, useCallback } from "react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";

import { Input } from "@/components/ui/input";

import { Checkbox } from "@/components/ui/checkbox";

import { DatasetIdentity } from "@/lib/api-client";

import { Lock, Loader2, Sparkles } from "lucide-react";

import { toast } from "sonner";

export interface TaskContract {
  decisionContext: string;

  forbiddenClaims: string[];

  primaryQuestion: string;

  successCriteria: string;
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

export function OverseerInterview({
  identity,
  onSubmit,
  onBack,
  className,
}: OverseerInterviewProps) {
  const [decisionContext, setDecisionContext] = useState("");

  const [forbiddenClaims, setForbiddenClaims] = useState<string[]>([]);

  const [primaryQuestion, setPrimaryQuestion] = useState("");

  const [successCriteria, setSuccessCriteria] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [isSuggesting, setIsSuggesting] = useState(false);

  const capabilityRecord = useMemo(
    () => normalizeCapabilities(identity?.detected_capabilities),
    [identity],
  );

  const hasCapability = useCallback(
    (capability: string) => capabilityRecord[capability] === true,
    [capabilityRecord],
  );

  // Initialize constraints based on identity capabilities

  useEffect(() => {
    const initialClaims: string[] = [];

    if (!hasCapability("has_financial_columns")) {
      initialClaims.push("no_revenue_inference");
    }

    if (!hasCapability("has_categorical")) {
      initialClaims.push("no_persona_segmentation");
    }

    setForbiddenClaims((prev) => [...new Set([...prev, ...initialClaims])]);
  }, [hasCapability]);

  const constraintsOptions: ConstraintOption[] = [
    {
      id: "no_revenue_inference",

      label: "Do not infer revenue",

      description: "Financial Rigor: Disable revenue predictions",

      locked: !hasCapability("has_financial_columns"),

      lockedReason: "No financial columns detected in source",
    },

    {
      id: "no_persona_segmentation",

      label: "Do not segment personas",

      description: "Avoid Stereotyping: Skip persona generation",

      locked: !hasCapability("has_categorical"),

      lockedReason: "No categorical fields available for segmentation",
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
        : [...prev, claimId],
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!decisionContext.trim() || decisionContext.trim().length < 25) {
      newErrors.decisionContext =
        "Describe the decision context with at least ~25 characters.";
    }

    if (!successCriteria.trim() || successCriteria.trim().length < 20) {
      newErrors.successCriteria =
        "Spell out the success signal so the team knows when to stop.";
    }

    if (!primaryQuestion.trim() || primaryQuestion.trim().length < 20) {
      newErrors.primaryQuestion =
        "Make the primary question specific (min ~20 characters).";
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

      successCriteria: successCriteria.trim(),
    });
  };

  const handleSuggest = () => {
    setIsSuggesting(true);

    try {
      const suggestions = buildContractSuggestion(identity, capabilityRecord);

      setDecisionContext((prev) =>
        prev.trim().length ? prev : suggestions.decisionContext,
      );

      setPrimaryQuestion((prev) =>
        prev.trim().length ? prev : suggestions.primaryQuestion,
      );

      setSuccessCriteria((prev) =>
        prev.trim().length ? prev : suggestions.successCriteria,
      );

      if (suggestions.forbiddenClaims?.length) {
        setForbiddenClaims((prev) =>
          Array.from(new Set([...prev, ...suggestions.forbiddenClaims])),
        );
      }

      toast.success(
        "Suggested answers added. Adjust anything you need before launching.",
      );
    } catch (error) {
      console.error("[OverseerInterview] Failed to build suggestions", error);

      toast.error(
        "Could not generate suggestions. Please fill in the details manually.",
      );
    } finally {
      setIsSuggesting(false);
    }
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between font-sans text-sm text-slate-600">
          <p className="text-slate-500">
            Need a fast start? Let ACE draft the first pass from your dataset
            identity.
          </p>

          <Button
            type="button"
            variant="outline"
            onClick={handleSuggest}
            disabled={isSuggesting}
            className="ml-auto inline-flex items-center gap-2 border-dashed"
          >
            {isSuggesting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-amber-500" />
                Suggest answers
              </>
            )}
          </Button>
        </div>

        {/* Question 1: Decision Context */}

        <div className="space-y-3">
          <h3 className="text-xl text-slate-900 dark:text-slate-100 font-medium">
            What decision does this analysis support?
          </h3>

          <p className="font-sans text-sm text-slate-500">
            Help us separate signal from noise. Are you deciding on pricing,
            churn strategy, or market expansion?
          </p>

          <Textarea
            value={decisionContext}
            onChange={(e) => setDecisionContext(e.target.value)}
            placeholder="e.g., 'We need to understand why Q3 sales dropped in the Northeast region to decide on Q4 budget allocation...'"
            className={cn(
              "min-h-[120px] font-sans text-base leading-relaxed p-4 bg-slate-50 dark:bg-slate-900",

              errors.decisionContext && "border-red-500 ring-red-500/20",
            )}
          />

          {errors.decisionContext && (
            <p className="text-sm text-red-600 font-sans mt-1">
              {errors.decisionContext}
            </p>
          )}
        </div>

        {/* Question 1b: Success Criteria */}

        <div className="space-y-3">
          <h3 className="text-xl text-slate-900 dark:text-slate-100 font-medium">
            What does success look like?
          </h3>

          <p className="font-sans text-sm text-slate-500">
            Define the measurable signal that tells us we answered the question.
          </p>

          <Textarea
            value={successCriteria}
            onChange={(e) => setSuccessCriteria(e.target.value)}
            placeholder="e.g., 'Reduce churn by confirming which segment drives >15% of attrition'"
            className={cn(
              "min-h-[100px] font-sans text-base leading-relaxed p-4 bg-slate-50 dark:bg-slate-900",

              errors.successCriteria && "border-red-500 ring-red-500/20",
            )}
          />

          {errors.successCriteria && (
            <p className="text-sm text-red-600 font-sans mt-1">
              {errors.successCriteria}
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
                    : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-teal-500/50 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 cursor-pointer",
                )}
              >
                <Checkbox
                  checked={forbiddenClaims.includes(option.id)}
                  onCheckedChange={() =>
                    handleForbiddenClaimToggle(option.id, !!option.locked)
                  }
                  disabled={option.locked}
                  className="mt-1"
                />

                <div className="flex-1">
                  <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    {option.label}

                    {option.locked && (
                      <Lock className="w-3 h-3 text-slate-400" />
                    )}
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

        {/* Question 3: Primary Question */}

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

              errors.primaryQuestion && "border-red-500 ring-red-500/20",
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

interface ContractSuggestionPayload {
  decisionContext: string;

  primaryQuestion: string;

  successCriteria: string;

  forbiddenClaims: string[];
}

function normalizeCapabilities(
  input:
    | DatasetIdentity["detected_capabilities"]
    | Record<string, boolean>
    | undefined
    | null,
) {
  if (!input) {
    return {} as Record<string, boolean>;
  }

  if (Array.isArray(input)) {
    return input.reduce<Record<string, boolean>>((acc, capability) => {
      if (typeof capability === "string") {
        acc[capability] = true;
      }

      return acc;
    }, {});
  }

  if (typeof input === "object") {
    return Object.entries(
      input as Record<string, boolean | number | string | undefined>,
    ).reduce<Record<string, boolean>>((acc, [key, value]) => {
      acc[key] = Boolean(value);

      return acc;
    }, {});
  }

  return {} as Record<string, boolean>;
}

function buildContractSuggestion(
  identity: DatasetIdentity,
  capabilities: Record<string, boolean>,
): ContractSuggestionPayload {
  const rowCount = identity?.row_count ?? 0;

  const columnCount = identity?.column_count ?? 0;

  const warnings = identity?.warnings ?? [];

  const hasFinancial = capabilities["has_financial_columns"];

  const hasTime =
    capabilities["has_time_series"] || capabilities["has_time_column"];

  const hasCategorical = capabilities["has_categorical"];

  const focus = hasFinancial
    ? "revenue stability"
    : hasTime
      ? "trend health"
      : "customer retention";

  const decisionDecision = hasFinancial
    ? "decide whether to adjust monetization levers this quarter"
    : hasTime
      ? "decide whether to accelerate investment where velocity is rising or intervene where it is fading"
      : "decide which retention playbook to activate immediately";

  const decisionContext = `Leadership needs to ${decisionDecision} by interrogating ${rowCount.toLocaleString()} records across ${columnCount} tracked signals in this dataset.`;

  const primaryQuestion = hasFinancial
    ? "Which customer or product segments are driving the biggest revenue swings?"
    : hasTime
      ? "Where do we see the sharpest acceleration or slowdown across the observed timeline?"
      : "Which cohorts drive the majority of attrition so we can stabilize them first?";

  const successCriteria = hasFinancial
    ? "Success = isolate segments causing >10% of revenue variation so we can intervene with pricing or retention plays."
    : hasTime
      ? "Success = confirm the top inflection points in activity so we can explain the change in direction."
      : "Success = surface one segment responsible for at least 15% of churn so we can deploy a save plan.";

  const suggestedClaims = new Set<string>();

  if (!hasFinancial) {
    suggestedClaims.add("no_revenue_inference");
  }

  if (!hasCategorical) {
    suggestedClaims.add("no_persona_segmentation");
  }

  suggestedClaims.add("no_causal_claims");

  if (warnings.length) {
    suggestedClaims.add("strict_mode");
  }

  return {
    decisionContext,

    primaryQuestion,

    successCriteria,

    forbiddenClaims: Array.from(suggestedClaims),
  };
}

