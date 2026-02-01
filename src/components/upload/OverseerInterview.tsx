/**
 * OverseerInterview - Task Contract interview form.
 *
 * Composed from:
 * - InterviewQuestions: Text input fields for context, criteria, question
 * - InterviewConstraints: Scope boundary constraint checkboxes
 * - contractSuggestions: AI-generated suggestion utilities
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { DatasetIdentity } from "@/lib/api-client";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { InterviewQuestions } from "./interview/InterviewQuestions";
import {
  InterviewConstraints,
  type ConstraintOption,
} from "./interview/InterviewConstraints";
import {
  normalizeCapabilities,
  buildContractSuggestion,
} from "./interview/contractSuggestions";

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
    [identity]
  );

  const hasCapability = useCallback(
    (capability: string) => capabilityRecord[capability] === true,
    [capabilityRecord]
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
        : [...prev, claimId]
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
        prev.trim().length ? prev : suggestions.decisionContext
      );
      setPrimaryQuestion((prev) =>
        prev.trim().length ? prev : suggestions.primaryQuestion
      );
      setSuccessCriteria((prev) =>
        prev.trim().length ? prev : suggestions.successCriteria
      );
      if (suggestions.forbiddenClaims?.length) {
        setForbiddenClaims((prev) =>
          Array.from(new Set([...prev, ...suggestions.forbiddenClaims]))
        );
      }
      toast.success(
        "Suggested answers added. Adjust anything you need before launching."
      );
    } catch (error) {
      console.error("[OverseerInterview] Failed to build suggestions", error);
      toast.error(
        "Could not generate suggestions. Please fill in the details manually."
      );
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className={cn("w-full max-w-4xl mx-auto font-serif", className)}>
      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-900/50 px-8 py-6 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-3xl text-slate-900 dark:text-slate-100 mb-2 font-bold tracking-tight">
          Task Contract
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-sans">
          Help us understand your goals and boundaries
        </p>
      </div>

      {/* Body */}
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

        <InterviewQuestions
          decisionContext={decisionContext}
          onDecisionContextChange={setDecisionContext}
          successCriteria={successCriteria}
          onSuccessCriteriaChange={setSuccessCriteria}
          primaryQuestion={primaryQuestion}
          onPrimaryQuestionChange={setPrimaryQuestion}
          errors={errors}
        />

        <InterviewConstraints
          options={constraintsOptions}
          forbiddenClaims={forbiddenClaims}
          onToggle={handleForbiddenClaimToggle}
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-8 border-t border-slate-200 dark:border-slate-800 font-sans">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-slate-500 hover:text-slate-900"
            >
              Back to Identity Card
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
