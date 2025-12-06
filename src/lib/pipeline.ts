export const PIPELINE_STEPS = [
  {
    id: "scanner",
    label: "Schema Scanner",
    description: "Analyzing columns, types, and value distributions",
  },
  {
    id: "interpreter",
    label: "Schema Interpreter",
    description: "Inferring semantic roles and business context",
  },
  {
    id: "overseer",
    label: "Overseer Agent",
    description: "Orchestrating agents and generating segmentation strategy",
  },
  {
    id: "sentry",
    label: "Sentry Agent",
    description: "Detecting anomalies, outliers, and data drift",
  },
  {
    id: "personas",
    label: "Persona Engine",
    description: "Generating data-driven customer profiles (ICPs)",
  },
  {
    id: "fabricator",
    label: "Fabricator Agent",
    description: "Creating targeted engagement strategies",
  },
  {
    id: "expositor",
    label: "Expositor Agent",
    description: "Assembling final research report and executive summary",
  },
];
