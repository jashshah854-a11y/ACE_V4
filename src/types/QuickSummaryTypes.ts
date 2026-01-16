/**
 * Quick Summary Types
 * 
 * TypeScript interfaces for Quick View mode data structures.
 */

export type ColumnType = 'numeric' | 'categorical' | 'datetime' | 'text';

export interface SchemaColumn {
    name: string;
    type: ColumnType;
    missing_count: number;
}

export interface NumericStats {
    count: number;
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
}

export interface CategoricalStats {
    count: number;
    top_categories: Array<{
        value: string;
        count: number;
    }>;
}

export interface Correlation {
    x: string;
    y: string;
    corr: number;
    p_value: number;
}

export interface QuickSummaryData {
    run_id: string;
    status: 'running' | 'completed' | 'failed';
    schema: SchemaColumn[];
    statistics: Record<string, NumericStats | CategoricalStats>;
    correlations: Correlation[];
    questions: string[];
    row_count: number;
    column_count: number;
    error?: string;
}

export type AnalysisMode = 'full' | 'summary';
