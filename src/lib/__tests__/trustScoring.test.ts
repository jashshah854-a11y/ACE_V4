import { computeTrustScore } from "@/lib/trustScoring";

describe("trust scoring", () => {
  it("is deterministic for the same inputs", () => {
    const inputs = {
      dataQualityScore: 82,
      validationFailed: false,
      sampleSize: 1200,
      signalStability: 78,
      featureDominance: 0.7,
      assumptionRisk: 0.85,
      hasCriticalAssumptions: false,
    };

    const first = computeTrustScore(inputs);
    const second = computeTrustScore(inputs);

    expect(first.score).toBe(second.score);
    expect(first.band).toBe(second.band);
    expect(first.certification.certified).toBe(second.certification.certified);
  });

  it("certifies only when rules are satisfied", () => {
    const certified = computeTrustScore({
      dataQualityScore: 90,
      validationFailed: false,
      sampleSize: 5000,
      signalStability: 85,
      featureDominance: 0.8,
      assumptionRisk: 0.9,
      hasCriticalAssumptions: false,
    });

    const blocked = computeTrustScore({
      dataQualityScore: 90,
      validationFailed: true,
      sampleSize: 5000,
      signalStability: 85,
      featureDominance: 0.8,
      assumptionRisk: 0.9,
      hasCriticalAssumptions: false,
    });

    expect(certified.certification.certified).toBe(true);
    expect(blocked.certification.certified).toBe(false);
  });

  it("downgrades to caution on low trust", () => {
    const low = computeTrustScore({
      dataQualityScore: 45,
      validationFailed: true,
      sampleSize: 30,
      signalStability: 20,
      featureDominance: 0.2,
      assumptionRisk: 0.3,
      hasCriticalAssumptions: true,
    });

    expect(low.band).toBe("caution");
  });
});
