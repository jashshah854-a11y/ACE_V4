/**
 * Pipeline types and constants
 */
import type { LucideIcon } from "lucide-react";
import {
  Database,
  Scan,
  ShieldCheck,
  Users,
  LineChart,
  AlertTriangle,
  Sparkles,
  FileText,
} from "lucide-react";
import type { RunState } from "@/lib/api-client";

export type StepState = "completed" | "active" | "pending";

export interface PipelineStep {
  key: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  backendSteps: string[];
}

export const PIPELINE_STEPS: PipelineStep[] = [
  {
    key: "ingestion",
    label: "Data Ingestion",
    shortLabel: "Ingestion",
    description: "Loading and parsing your dataset",
    icon: Database,
    backendSteps: ["ingestion", "type_identifier"],
  },
  {
    key: "scanner",
    label: "Schema Analysis",
    shortLabel: "Schema",
    description: "Understanding column types and structure",
    icon: Scan,
    backendSteps: ["scanner", "interpreter"],
  },
  {
    key: "validator",
    label: "Data Validation",
    shortLabel: "Validation",
    description: "Checking data quality and integrity",
    icon: ShieldCheck,
    backendSteps: ["validator"],
  },
  {
    key: "clustering",
    label: "Behavioral Clustering",
    shortLabel: "Clustering",
    description: "Grouping similar customers together",
    icon: Users,
    backendSteps: ["overseer"],
  },
  {
    key: "regression",
    label: "Predictive Modeling",
    shortLabel: "Modeling",
    description: "Building forecasting models",
    icon: LineChart,
    backendSteps: ["regression"],
  },
  {
    key: "anomaly",
    label: "Anomaly Detection",
    shortLabel: "Anomaly",
    description: "Finding unusual patterns",
    icon: AlertTriangle,
    backendSteps: ["sentry"],
  },
  {
    key: "personas",
    label: "Persona Generation",
    shortLabel: "Personas",
    description: "Creating customer profiles",
    icon: Sparkles,
    backendSteps: ["personas"],
  },
  {
    key: "report",
    label: "Report Generation",
    shortLabel: "Report",
    description: "Compiling insights into your report",
    icon: FileText,
    backendSteps: ["fabricator", "expositor"],
  },
];

export function getStepStates(state: RunState): Record<string, StepState> {
  const currentStage = state.current_step?.toLowerCase() || "";
  const completedSteps = state.steps_completed || [];
  const result: Record<string, StepState> = {};

  let foundActiveFromBackend = false;

  for (const step of PIPELINE_STEPS) {
    const allCompleted = step.backendSteps.every((s) =>
      completedSteps.includes(s)
    );
    const isActive = step.backendSteps.some((s) =>
      currentStage.includes(s.toLowerCase())
    );

    if (allCompleted) {
      result[step.key] = "completed";
    } else if (isActive && !foundActiveFromBackend) {
      result[step.key] = "active";
      foundActiveFromBackend = true;
    } else {
      result[step.key] = "pending";
    }
  }

  if (!foundActiveFromBackend) {
    for (const step of PIPELINE_STEPS) {
      if (result[step.key] === "pending") {
        result[step.key] = "active";
        break;
      }
    }
  }

  return result;
}

export function calculateProgress(stepStates: Record<string, StepState>): number {
  const total = PIPELINE_STEPS.length;
  let completed = 0;
  let activeIndex = -1;

  PIPELINE_STEPS.forEach((step, index) => {
    if (stepStates[step.key] === "completed") {
      completed++;
    } else if (stepStates[step.key] === "active" && activeIndex === -1) {
      activeIndex = index;
    }
  });

  const baseProgress = (completed / total) * 100;
  const activeProgress = activeIndex >= 0 ? (0.5 / total) * 100 : 0;

  return Math.min(100, baseProgress + activeProgress);
}
