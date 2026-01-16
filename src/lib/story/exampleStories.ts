/**
 * Example Story Generator
 * 
 * Demonstrates how to use the narrative engine to generate stories.
 */

import { NarrativeEngine } from './narrativeEngine';
import { StoryGenerationContext } from '@/types/StoryTypes';

// Example analytics data (this would come from ACE's enhanced analytics)
const EXAMPLE_ANALYTICS_DATA = {
    primary_metric: 'Revenue',
    start_value: 8200000,
    end_value: 10100000,
    change_percent: 23.2,
    time_period: 'Q1-Q4 2025',
    context: 'This growth was driven primarily by enterprise customers',

    // Drill-down data
    parent_metric: 'Total Revenue',
    parent_value: 10100000,
    child_metric: 'Enterprise Segment',
    contribution_percent: 65,

    // Comparison data
    item_a: 'Product A',
    item_b: 'Product B',
    value_a: 5000000,
    value_b: 3000000,
    difference_percent: 67,
    driver: 'better online reviews and marketing',

    // Outlier data
    outlier_count: 12,
    entity_type: 'customers',
    mean_value: 100,
    outlier_min: 500,
    outlier_max: 2000,
    outlier_percent: 5,
    explanation: 'These are enterprise clients with bulk purchase agreements',

    // Correlation data
    factor_a: 'Marketing Spend',
    factor_b: 'Customer Acquisition',
    correlation_coefficient: 0.85,
    implication: 'increased marketing investment consistently drives customer growth',

    // Flags for story type selection
    time_series: true,
    segments: true,
    comparisons: true,
    outliers: true,
    correlations: true
};

const EXAMPLE_DATASET_PROFILE = {
    name: 'Sales Performance 2025',
    row_count: 10000,
    column_count: 15
};

/**
 * Generate an example story in formal tone
 */
export function generateFormalStoryExample(): any {
    const context: StoryGenerationContext = {
        run_id: 'example_formal_001',
        tone: 'formal',
        analytics_data: EXAMPLE_ANALYTICS_DATA,
        dataset_profile: EXAMPLE_DATASET_PROFILE
    };

    return NarrativeEngine.generateStory(context);
}

/**
 * Generate an example story in conversational tone
 */
export function generateConversationalStoryExample(): any {
    const context: StoryGenerationContext = {
        run_id: 'example_conversational_001',
        tone: 'conversational',
        analytics_data: EXAMPLE_ANALYTICS_DATA,
        dataset_profile: EXAMPLE_DATASET_PROFILE
    };

    return NarrativeEngine.generateStory(context);
}

/**
 * Demo: Print both stories to console
 */
export function demoStoryGeneration(): void {
    console.log('='.repeat(80));
    console.log('FORMAL TONE STORY');
    console.log('='.repeat(80));

    const formalStory = generateFormalStoryExample();
    console.log(`Title: ${formalStory.title}`);
    console.log(`Summary: ${formalStory.summary}`);
    console.log(`\nStory Points (${formalStory.points.length}):\n`);

    formalStory.points.forEach((point: any, index: number) => {
        console.log(`${index + 1}. ${point.headline}`);
        console.log(`   ${point.narrative}\n`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('CONVERSATIONAL TONE STORY');
    console.log('='.repeat(80));

    const conversationalStory = generateConversationalStoryExample();
    console.log(`Title: ${conversationalStory.title}`);
    console.log(`Summary: ${conversationalStory.summary}`);
    console.log(`\nStory Points (${conversationalStory.points.length}):\n`);

    conversationalStory.points.forEach((point: any, index: number) => {
        console.log(`${index + 1}. ${point.headline}`);
        console.log(`   ${point.narrative}\n`);
    });
}

// Example output structure
export const EXAMPLE_STORY_OUTPUT = {
    formal: {
        title: "Analysis: Revenue increased 23.2% Q1-Q4 2025",
        summary: "The data indicates Revenue increased from $8,200,000 to $10,100,000 over Q1-Q4 2025.",
        points: [
            {
                headline: "Revenue increased 23.2% Q1-Q4 2025",
                narrative: "Analysis indicates that Revenue increased from $8,200,000 to $10,100,000 over Q1-Q4 2025. This represents a 23.2% growth. This growth was driven primarily by enterprise customers."
            },
            {
                headline: "Total Revenue analysis reveals Enterprise Segment contribution",
                narrative: "Examination of Total Revenue ($10,100,000) demonstrates that Enterprise Segment accounts for 65% of the total. This segment exhibits dominant performance relative to other categories."
            }
        ]
    },
    conversational: {
        title: "Revenue jumped 23.2%",
        summary: "The takeaway: Revenue jumped from $8,200,000 to $10,100,000 over Q1-Q4 2025.",
        points: [
            {
                headline: "Revenue jumped 23.2%",
                narrative: "Here's what happened: Revenue jumped from $8,200,000 to $10,100,000 over Q1-Q4 2025. That's a 23.2% growth - that's significant."
            },
            {
                headline: "Let's break down Total Revenue",
                narrative: "When we zoom into Total Revenue, Enterprise Segment stands out - it's driving 65% of the total. That's more than half!"
            }
        ]
    }
};
