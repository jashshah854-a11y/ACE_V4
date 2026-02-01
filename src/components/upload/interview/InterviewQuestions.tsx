/**
 * Text input questions section of the Overseer Interview.
 */
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface InterviewQuestionsProps {
  decisionContext: string;
  onDecisionContextChange: (value: string) => void;
  successCriteria: string;
  onSuccessCriteriaChange: (value: string) => void;
  primaryQuestion: string;
  onPrimaryQuestionChange: (value: string) => void;
  errors: Record<string, string>;
}

export function InterviewQuestions({
  decisionContext,
  onDecisionContextChange,
  successCriteria,
  onSuccessCriteriaChange,
  primaryQuestion,
  onPrimaryQuestionChange,
  errors,
}: InterviewQuestionsProps) {
  return (
    <>
      {/* Question 1: Decision Context */}
      <div className="space-y-3">
        <h3 className="text-xl text-slate-900 dark:text-slate-100 font-medium">
          What decision does this analysis support?
        </h3>

        <p className="font-sans text-sm text-slate-500">
          Help us separate signal from noise. Are you deciding on pricing, churn
          strategy, or market expansion?
        </p>

        <Textarea
          value={decisionContext}
          onChange={(e) => onDecisionContextChange(e.target.value)}
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

      {/* Question 2: Success Criteria */}
      <div className="space-y-3">
        <h3 className="text-xl text-slate-900 dark:text-slate-100 font-medium">
          What does success look like?
        </h3>

        <p className="font-sans text-sm text-slate-500">
          Define the measurable signal that tells us we answered the question.
        </p>

        <Textarea
          value={successCriteria}
          onChange={(e) => onSuccessCriteriaChange(e.target.value)}
          placeholder="e.g., 'Reduce churn by confirming which segment drives >15% of attrition'"
          className={cn(
            "min-h-[100px] font-sans text-base leading-relaxed p-4 bg-slate-50 dark:bg-slate-900",
            errors.successCriteria && "border-red-500 ring-red-500/20"
          )}
        />

        {errors.successCriteria && (
          <p className="text-sm text-red-600 font-sans mt-1">
            {errors.successCriteria}
          </p>
        )}
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
          onChange={(e) => onPrimaryQuestionChange(e.target.value)}
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
    </>
  );
}
