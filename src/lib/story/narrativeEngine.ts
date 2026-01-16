/**
 * Narrative Engine
 * 
 * Core engine for generating story narratives from templates and data.
 */

import { StoryTemplate, getTemplate } from './storyTemplates';
import { getPhraseLibrary, selectRandomPhrase } from './tonePhrases';
import { getAnecdote } from './anecdotes';
import { TemplateProcessor } from './templateProcessor';
import {
    Story,
    StoryPoint,
    StoryType,
    ToneProfile,
    StoryGenerationContext,
    ChartSpec
} from '@/types/StoryTypes';

export class NarrativeEngine {
    /**
     * Generate a complete story from analytics data
     */
    static generateStory(context: StoryGenerationContext): Story {
        const storyPoints = this.generateStoryPoints(context);

        return {
            run_id: context.run_id,
            title: this.generateTitle(storyPoints, context.tone),
            summary: this.generateSummary(storyPoints, context.tone),
            tone: context.tone,
            points: storyPoints,
            metadata: {
                created_at: new Date().toISOString(),
                dataset_name: context.dataset_profile?.name,
                row_count: context.dataset_profile?.row_count,
                column_count: context.dataset_profile?.column_count
            }
        };
    }

    /**
     * Generate story points from analytics data
     */
    private static generateStoryPoints(
        context: StoryGenerationContext
    ): StoryPoint[] {
        const points: StoryPoint[] = [];
        let sequence = 1;

        // Analyze the data and determine which story types to use
        const storyTypes = this.selectStoryTypes(context.analytics_data);

        for (const storyType of storyTypes) {
            const point = this.generateStoryPoint(
                storyType,
                context,
                sequence
            );

            if (point) {
                points.push(point);
                sequence++;
            }
        }

        return points;
    }

    /**
     * Generate a single story point
     */
    private static generateStoryPoint(
        storyType: StoryType,
        context: StoryGenerationContext,
        sequence: number
    ): StoryPoint | null {
        const template = getTemplate(storyType, context.tone);

        if (!template) return null;

        // Extract variables from analytics data based on story type
        const variables = this.extractVariables(storyType, context.analytics_data);

        // Process conditional variables
        const processedVariables = this.processTemplateVariables(
            template,
            variables
        );

        // Generate narrative text
        const { headline, narrative } = TemplateProcessor.process(template, {
            variables: processedVariables,
            tone: context.tone,
            story_type: storyType
        });

        // Add anecdote if conversational or playful
        const enhancedNarrative = this.addAnecdote(
            narrative,
            storyType,
            context.tone
        );

        // Generate chart spec
        const visual = this.generateChartSpec(storyType, variables);

        return {
            id: `point_${sequence}`,
            sequence,
            headline,
            narrative: enhancedNarrative,
            visual,
            evidence: [],
            interactions: [],
            metadata: {
                storyType,
                tone: context.tone,
                confidence: 0.85, // TODO: Calculate actual confidence
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Select appropriate story types based on analytics data
     */
    private static selectStoryTypes(analyticsData: any): StoryType[] {
        const types: StoryType[] = [];

        // Check for time series data
        if (analyticsData?.time_series || analyticsData?.trends) {
            types.push('change_over_time');
        }

        // Check for hierarchical data
        if (analyticsData?.segments || analyticsData?.breakdown) {
            types.push('drill_down');
        }

        // Check for comparisons
        if (analyticsData?.comparisons || analyticsData?.ab_test) {
            types.push('contrast');
        }

        // Check for outliers
        if (analyticsData?.outliers || analyticsData?.anomalies) {
            types.push('outliers');
        }

        // Check for correlations
        if (analyticsData?.correlations || analyticsData?.relationships) {
            types.push('intersections');
        }

        // Default to at least one story type
        if (types.length === 0) {
            types.push('change_over_time');
        }

        return types;
    }

    /**
     * Extract variables from analytics data for a story type
     */
    private static extractVariables(
        storyType: StoryType,
        analyticsData: any
    ): Record<string, any> {
        // This is a simplified version - in production, this would be more sophisticated
        const variables: Record<string, any> = {};

        switch (storyType) {
            case 'change_over_time':
                variables.metric_name = analyticsData?.primary_metric || 'Revenue';
                variables.start_value = analyticsData?.start_value || 8200000;
                variables.end_value = analyticsData?.end_value || 10100000;
                variables.change_percent = analyticsData?.change_percent || 23;
                variables.time_period = analyticsData?.time_period || 'Q1-Q4';
                variables.context_statement = analyticsData?.context || 'This growth was driven by enterprise customers.';
                break;

            case 'drill_down':
                variables.parent_metric = analyticsData?.parent_metric || 'Total Revenue';
                variables.parent_value = analyticsData?.parent_value || 10100000;
                variables.child_metric = analyticsData?.child_metric || 'Enterprise Segment';
                variables.contribution_percent = analyticsData?.contribution_percent || 65;
                break;

            case 'contrast':
                variables.item_a = analyticsData?.item_a || 'Product A';
                variables.item_b = analyticsData?.item_b || 'Product B';
                variables.value_a = analyticsData?.value_a || 5000;
                variables.value_b = analyticsData?.value_b || 3000;
                variables.difference_percent = analyticsData?.difference_percent || 67;
                variables.driver = analyticsData?.driver || 'better marketing';
                break;

            case 'outliers':
                variables.outlier_count = analyticsData?.outlier_count || 12;
                variables.entity_type = analyticsData?.entity_type || 'customers';
                variables.mean_value = analyticsData?.mean_value || 100;
                variables.outlier_min = analyticsData?.outlier_min || 500;
                variables.outlier_max = analyticsData?.outlier_max || 2000;
                variables.outlier_percent = analyticsData?.outlier_percent || 5;
                variables.explanation = analyticsData?.explanation || 'These are enterprise clients with bulk purchases';
                break;

            case 'intersections':
                variables.factor_a = analyticsData?.factor_a || 'Marketing Spend';
                variables.factor_b = analyticsData?.factor_b || 'Customer Acquisition';
                variables.correlation_coefficient = analyticsData?.correlation_coefficient || 0.85;
                variables.implication = analyticsData?.implication || 'increased marketing investment drives customer growth';
                break;
        }

        return variables;
    }

    /**
     * Process template variables including conditionals
     */
    private static processTemplateVariables(
        template: StoryTemplate,
        variables: Record<string, any>
    ): Record<string, any> {
        const processed = { ...variables };

        // Process conditional variables defined in template
        for (const [key, value] of Object.entries(template.variables)) {
            if (typeof value === 'object' && 'condition' in value) {
                processed[key] = TemplateProcessor.processConditionalVariable(
                    value,
                    variables
                );
            }
        }

        return processed;
    }

    /**
     * Add anecdote to narrative if appropriate
     */
    private static addAnecdote(
        narrative: string,
        storyType: StoryType,
        tone: ToneProfile
    ): string {
        if (tone === 'formal') return narrative;

        // Map story type to anecdote category
        const categoryMap: Record<StoryType, any> = {
            'change_over_time': 'trends',
            'drill_down': 'distributions',
            'contrast': 'comparisons',
            'outliers': 'outliers',
            'intersections': 'correlations'
        };

        const category = categoryMap[storyType];
        const anecdote = getAnecdote(category, tone);

        if (anecdote && narrative.includes('{{anecdote}}')) {
            return narrative.replace('{{anecdote}}', anecdote);
        }

        return narrative;
    }

    /**
     * Generate chart specification for a story point
     */
    private static generateChartSpec(
        storyType: StoryType,
        variables: Record<string, any>
    ): ChartSpec {
        // Simplified chart spec generation
        const chartTypeMap: Record<StoryType, ChartSpec['type']> = {
            'change_over_time': 'line_chart',
            'drill_down': 'bar_chart',
            'contrast': 'bar_chart',
            'outliers': 'scatter_plot',
            'intersections': 'scatter_plot'
        };

        return {
            type: chartTypeMap[storyType],
            data: {}, // TODO: Populate with actual data
            config: {
                title: variables.metric_name || 'Chart',
                legend: true,
                colors: ['#3b82f6', '#8b5cf6', '#ec4899']
            }
        };
    }

    /**
     * Generate story title
     */
    private static generateTitle(
        points: StoryPoint[],
        tone: ToneProfile
    ): string {
        if (points.length === 0) return 'Data Story';

        const firstHeadline = points[0].headline;

        if (tone === 'formal') {
            return `Analysis: ${firstHeadline}`;
        } else {
            return firstHeadline;
        }
    }

    /**
     * Generate story summary
     */
    private static generateSummary(
        points: StoryPoint[],
        tone: ToneProfile
    ): string {
        if (points.length === 0) return 'No insights available';

        const phrases = getPhraseLibrary(tone);
        const transition = selectRandomPhrase(phrases.conclusions);

        return `${transition} ${points[0].narrative.split('.')[0]}.`;
    }
}
