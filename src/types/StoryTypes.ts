/**
 * Narrative Schema
 * 
 * Defines the data structures for stories and story points.
 */

export type StoryType =
    | 'change_over_time'
    | 'drill_down'
    | 'contrast'
    | 'outliers'
    | 'intersections';

export type ToneProfile = 'formal' | 'conversational' | 'playful';

export type ChartType =
    | 'line_chart'
    | 'bar_chart'
    | 'scatter_plot'
    | 'map'
    | 'table'
    | 'pie_chart';

export interface ChartSpec {
    type: ChartType;
    data: any; // Chart data
    config: {
        xAxis?: string;
        yAxis?: string;
        title?: string;
        legend?: boolean;
        colors?: string[];
    };
}

export interface EvidenceRef {
    id: string;
    type: 'data_point' | 'calculation' | 'source';
    description: string;
    value?: any;
}

export interface Interaction {
    type: 'drill_down' | 'filter' | 'highlight';
    target: string;
    action: string;
}

export interface StoryPoint {
    id: string;
    sequence: number;
    headline: string;           // Governing thought
    narrative: string;          // Main text (tone-aware)
    visual: ChartSpec;          // Chart configuration
    evidence: EvidenceRef[];    // Links to evidence
    interactions: Interaction[]; // Drill-down actions
    metadata: {
        storyType: StoryType;
        tone: ToneProfile;
        confidence: number;       // 0-1 confidence in this insight
        timestamp: string;
    };
}

export interface Story {
    run_id: string;
    title: string;
    summary: string;            // One-liner summary
    tone: ToneProfile;
    points: StoryPoint[];
    metadata: {
        created_at: string;
        dataset_name?: string;
        row_count?: number;
        column_count?: number;
    };
}

export interface StoryGenerationContext {
    run_id: string;
    tone: ToneProfile;
    analytics_data: any;        // Enhanced analytics output
    dataset_profile: any;       // Dataset identity
}

export interface NarrativeVariable {
    name: string;
    value: string | number;
    type: 'string' | 'number' | 'percent' | 'currency';
}

export interface TemplateContext {
    variables: Record<string, any>;
    tone: ToneProfile;
    story_type: StoryType;
}
