export type TrustComponentStatus = "high" | "medium" | "low" | "unknown";

export interface TrustComponent {
  score: number | null;
  status: TrustComponentStatus;
  evidence: string[];
  notes: string;
}

export interface TrustModel {
  overall_confidence: number | null;
  components: {
    data_quality: TrustComponent;
    model_fit: TrustComponent;
    stability: TrustComponent;
    validation_strength: TrustComponent;
    leakage_risk: TrustComponent;
  };
  applied_caps?: Array<{
    code: string;
    max: number;
    evidence?: string[];
  }>;
}
