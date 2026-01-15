export interface TuringFixture {
  label: string;
  runId: string;
  expectGrounded: boolean;
  answerIncludes?: string[];
  refusalQuestion?: string;
  scopeLocks?: { dimension: string; reason?: string }[];
  allowMissingAnalytics?: boolean;
  expectedChurn?: { count: number; percentage: number; activityColumn: string };
  expectFailSafe?: boolean;
  expectedConcentration?: number;
}

export const TuringFixtures: TuringFixture[] = [
  {
    label: "Classification Imbalance",
    runId: "66785d98",
    expectGrounded: true,
    answerIncludes: ["251", "25.1", "visits"],
    refusalQuestion: "What is the projected revenue for 2026?",
    scopeLocks: [{ dimension: "revenue", reason: "Financial claims blocked" }],
    expectedChurn: { count: 251, percentage: 25.1, activityColumn: "visits" },
  },
  {
    label: "Safe Mode Fail-Safe",
    runId: "92c70a02",
    expectGrounded: true,
    answerIncludes: ["234", "58.5", "visits"],
    expectedChurn: { count: 234, percentage: 58.5, activityColumn: "visits" },
    expectFailSafe: true,
  },
  {
    label: "Regression Inhibited",
    runId: "2b1f142c",
    expectGrounded: false,
  },
  {
    label: "Categorical Explosion",
    runId: "d4174c4d",
    expectGrounded: false,
    expectedConcentration: 0.7,
  },
];
