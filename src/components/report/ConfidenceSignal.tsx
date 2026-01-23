interface SignalProps {
  signal: {
    strength: "high" | "moderate" | "low";
    bars: 1 | 2 | 3;
    color: string;
    label: string;
    confidenceScore: number;
  };
  limitationsReason?: string | null;
}

export function ConfidenceSignal({ signal, limitationsReason }: SignalProps) {
  return null;
}
