import type { TrustScore, TrustBand, TrustComponents, TrustCertification } from "@/types/trust";

export interface TrustInputs {
  dataQualityScore?: number; // 0-100
  validationFailed?: boolean;
  sampleSize?: number;
  signalStability?: number; // 0-100
  featureDominance?: number; // 0-1
  assumptionRisk?: number; // 0-1 (1 = low risk)
  hasCriticalAssumptions?: boolean;
  insightId?: string;
  runId?: string;
  createdAt?: string;
}

export const TRUST_RULESET_VERSION = "v1.0";

const WEIGHTS = {
  dataQuality: 0.22,
  validation: 0.2,
  sampleSize: 0.16,
  stability: 0.18,
  featureDominance: 0.14,
  assumptionRisk: 0.1,
};

const CERTIFICATION_THRESHOLDS = {
  minQuality: 0.8,
  minTrustScore: 0.75,
};

export function computeTrustScore(inputs: TrustInputs): TrustScore {
  const dataQuality = normalizePercent(inputs.dataQualityScore ?? 0);
  const validation = inputs.validationFailed ? 0 : 1;
  const sampleSize = scoreSampleSize(inputs.sampleSize);
  const stability = normalizePercent(inputs.signalStability ?? 0);
  const featureDominance = clamp(inputs.featureDominance ?? 0.5);
  const assumptionRisk = clamp(inputs.assumptionRisk ?? 0.7);

  const components: TrustComponents = {
    dataQuality,
    validation,
    sampleSize,
    stability,
    featureDominance,
    assumptionRisk,
  };

  const score = roundTo(
    components.dataQuality * WEIGHTS.dataQuality +
      components.validation * WEIGHTS.validation +
      components.sampleSize * WEIGHTS.sampleSize +
      components.stability * WEIGHTS.stability +
      components.featureDominance * WEIGHTS.featureDominance +
      components.assumptionRisk * WEIGHTS.assumptionRisk,
    3
  );

  const hasCriticalAssumptions = inputs.hasCriticalAssumptions === true;
  const certified =
    !inputs.validationFailed &&
    components.dataQuality >= CERTIFICATION_THRESHOLDS.minQuality &&
    score >= CERTIFICATION_THRESHOLDS.minTrustScore &&
    !hasCriticalAssumptions;

  const band = resolveBand(score, certified);
  const { factors, positives, negatives, risks, improvements } = describeTrust(components, inputs);

  const certification: TrustCertification = {
    certified,
    rulesetVersion: TRUST_RULESET_VERSION,
    inputs: {
      dataQuality: components.dataQuality,
      validationPassed: !inputs.validationFailed,
      sampleSize: inputs.sampleSize ?? 0,
      stability: components.stability,
      featureDominance: components.featureDominance,
      assumptionRisk: components.assumptionRisk,
    },
    certifiedAt: inputs.createdAt || undefined,
    expiryCondition: "Refresh certification when data or validation changes.",
  };

  return {
    score,
    band,
    factors,
    positives,
    negatives,
    risks,
    improvements,
    components,
    certification,
  };
}

function resolveBand(score: number, certified: boolean): TrustBand {
  if (certified) return "certified";
  if (score >= 0.55) return "conditional";
  return "caution";
}

function describeTrust(components: TrustComponents, inputs: TrustInputs) {
  const factors: string[] = [];
  const positives: string[] = [];
  const negatives: string[] = [];
  const risks: string[] = [];
  const improvements: string[] = [];

  if (components.dataQuality >= 0.8) {
    positives.push("Strong data quality signals.");
  } else {
    negatives.push("Data quality limits confidence.");
    improvements.push("Improve data completeness and consistency.");
  }

  if (inputs.validationFailed) {
    negatives.push("Validation checks failed.");
    risks.push("Validation gaps weaken trust.");
    improvements.push("Resolve validation failures to certify insight.");
  } else {
    positives.push("Validation checks passed.");
  }

  if (components.sampleSize >= 0.75) {
    positives.push("Sample size supports stability.");
  } else {
    negatives.push("Sample size is limited.");
    improvements.push("Increase sample size for stronger evidence.");
  }

  if (components.stability >= 0.7) {
    positives.push("Signal stability is consistent.");
  } else {
    negatives.push("Signal stability is uneven.");
    improvements.push("Collect more data for stable signals.");
  }

  if (components.featureDominance >= 0.6) {
    positives.push("Drivers are clearly dominant.");
  } else {
    negatives.push("Drivers are diffuse.");
    improvements.push("Clarify top drivers with additional modeling.");
  }

  if (components.assumptionRisk >= 0.7) {
    positives.push("Assumptions remain low risk.");
  } else {
    risks.push("Assumption risk is elevated.");
    improvements.push("Reduce assumption risk with additional validation.");
  }

  if (inputs.hasCriticalAssumptions) {
    risks.push("Critical assumptions block certification.");
    improvements.push("Clear critical assumption violations.");
  }

  factors.push(...positives.slice(0, 2), ...negatives.slice(0, 2));

  return {
    factors,
    positives,
    negatives,
    risks,
    improvements,
  };
}

function normalizePercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value > 1) return clamp(value / 100);
  return clamp(value);
}

function scoreSampleSize(sampleSize?: number) {
  if (!sampleSize || !Number.isFinite(sampleSize)) return 0.4;
  if (sampleSize >= 5000) return 1;
  if (sampleSize >= 1500) return 0.9;
  if (sampleSize >= 500) return 0.75;
  if (sampleSize >= 200) return 0.6;
  if (sampleSize >= 80) return 0.45;
  return 0.3;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
