import { z } from "zod";

export const MetricsSchema = z.object({
    dataQualityScore: z.number().min(0).max(100).optional(),
    clusterCount: z.number().int().min(0).optional(),
    silhouetteScore: z.number().min(-1).max(1).optional(),
    anomalyCount: z.number().int().min(0).optional(),
    recordCount: z.number().int().min(0).optional(),
    featureCount: z.number().int().min(0).optional(),
    r2Score: z.number().min(0).max(1).optional(),
    completenessScore: z.number().min(0).max(100).optional(),
});

export const ProgressMetricsSchema = z.object({
    dataIngestion: z.number().min(0).max(100).default(0),
    anomalyDetection: z.number().min(0).max(100).default(0),
    clustering: z.number().min(0).max(100).default(0),
    regression: z.number().min(0).max(100).default(0),
    reporting: z.number().min(0).max(100).default(0),
});

export const ClusterMetricsSchema = z.object({
    k: z.number().int().min(0).default(0),
    silhouette: z.number().min(-1).max(1).default(0),
    inertia: z.number().min(0).optional(),
});

export const PersonaSchema = z.object({
    name: z.string(),
    description: z.string(),
    size: z.number().int().min(0),
    percentage: z.number().min(0).max(100),
    characteristics: z.array(z.string()).optional(),
});

export const OutcomeModelSchema = z.object({
    r2: z.number().min(0).max(1).optional(),
    features: z.array(z.string()).optional(),
    topFeatures: z.array(z.object({
        name: z.string(),
        importance: z.number(),
    })).optional(),
});

export const AnomalySchema = z.object({
    type: z.string(),
    count: z.number().int().min(0),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    description: z.string().optional(),
});

export const ChartDataSchema = z.object({
    labels: z.array(z.string()).optional(),
    values: z.array(z.number()).optional(),
    type: z.enum(['bar', 'line', 'pie', 'scatter']).optional(),
});

export const SectionSchema = z.object({
    title: z.string(),
    content: z.string(),
    subsections: z.array(z.lazy(() => SectionSchema)).optional(),
});

export type Metrics = z.infer<typeof MetricsSchema>;
export type ProgressMetrics = z.infer<typeof ProgressMetricsSchema>;
export type ClusterMetrics = z.infer<typeof ClusterMetricsSchema>;
export type Persona = z.infer<typeof PersonaSchema>;
export type OutcomeModel = z.infer<typeof OutcomeModelSchema>;
export type Anomaly = z.infer<typeof AnomalySchema>;
export type ChartData = z.infer<typeof ChartDataSchema>;
export type Section = z.infer<typeof SectionSchema>;
