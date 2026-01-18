export type TrustBand = "certified" | "conditional" | "caution";

export interface TrustComponents {
  dataQuality: number;
  validation: number;
  sampleSize: number;
  stability: number;
  featureDominance: number;
  assumptionRisk: number;
}

export interface TrustCertification {
  certified: boolean;
  rulesetVersion: string;
  inputs: Record<string, number | boolean | string>;
  certifiedAt?: string;
  expiryCondition?: string;
}

export interface TrustScore {
  score: number;
  band: TrustBand;
  factors: string[];
  positives: string[];
  negatives: string[];
  risks: string[];
  improvements: string[];
  components: TrustComponents;
  certification: TrustCertification;
}
