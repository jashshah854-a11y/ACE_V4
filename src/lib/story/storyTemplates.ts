/**
 * Story Type Templates
 * 
 * Defines the 5 core story patterns with tone variations.
 */

export type StoryType =
    | 'change_over_time'
    | 'drill_down'
    | 'contrast'
    | 'outliers'
    | 'intersections';

export type ToneProfile = 'formal' | 'conversational' | 'playful';

export interface TemplateVariable {
    name: string;
    type: 'string' | 'number' | 'percent' | 'currency';
    required: boolean;
}

export interface ConditionalLogic {
    condition: string;
    thenValue: string;
    elseValue?: string;
}

export interface StoryTemplate {
    story_type: StoryType;
    tone: ToneProfile;
    headline: string;
    narrative: string;
    variables: Record<string, TemplateVariable | ConditionalLogic>;
    visual_type: 'line_chart' | 'bar_chart' | 'scatter_plot' | 'map' | 'table';
    focus: string;
}

// ============================================================================
// CHANGE OVER TIME TEMPLATES
// ============================================================================

export const CHANGE_OVER_TIME_FORMAL: StoryTemplate = {
    story_type: 'change_over_time',
    tone: 'formal',
    headline: '{{metric_name}} {{trend_direction}} {{change_percent}}% {{time_period}}',
    narrative: `Analysis indicates that {{metric_name}} {{trend_direction}} from {{start_value}} to {{end_value}} over {{time_period}}. This represents a {{change_percent}}% {{trend_type}}. {{context_statement}}`,
    variables: {
        trend_direction: {
            condition: '{{change_percent}} > 0',
            thenValue: 'increased',
            elseValue: 'decreased'
        },
        trend_type: {
            condition: '{{change_percent}} > 0',
            thenValue: 'growth',
            elseValue: 'decline'
        }
    },
    visual_type: 'line_chart',
    focus: 'Temporal trend analysis'
};

export const CHANGE_OVER_TIME_CONVERSATIONAL: StoryTemplate = {
    story_type: 'change_over_time',
    tone: 'conversational',
    headline: '{{metric_name}} {{trend_verb}} {{change_percent}}%',
    narrative: `Here's what happened: {{metric_name}} {{trend_verb}} from {{start_value}} to {{end_value}} over {{time_period}}. That's a {{change_percent}}% {{trend_type}} - {{impact_phrase}}.`,
    variables: {
        trend_verb: {
            condition: '{{change_percent}} > 20',
            thenValue: 'skyrocketed',
            elseValue: {
                condition: '{{change_percent}} > 10',
                thenValue: 'jumped',
                elseValue: {
                    condition: '{{change_percent}} > 0',
                    thenValue: 'increased',
                    elseValue: 'dropped'
                }
            }
        },
        impact_phrase: {
            condition: '{{change_percent}} > 15',
            thenValue: "that's significant",
            elseValue: 'worth noting'
        }
    },
    visual_type: 'line_chart',
    focus: 'Temporal trend with context'
};

// ============================================================================
// DRILL DOWN TEMPLATES
// ============================================================================

export const DRILL_DOWN_FORMAL: StoryTemplate = {
    story_type: 'drill_down',
    tone: 'formal',
    headline: '{{parent_metric}} analysis reveals {{child_metric}} contribution',
    narrative: `Examination of {{parent_metric}} ({{parent_value}}) demonstrates that {{child_metric}} accounts for {{contribution_percent}}% of the total. This segment exhibits {{performance_descriptor}} performance relative to other categories.`,
    variables: {
        performance_descriptor: {
            condition: '{{contribution_percent}} > 50',
            thenValue: 'dominant',
            elseValue: {
                condition: '{{contribution_percent}} > 25',
                thenValue: 'significant',
                elseValue: 'moderate'
            }
        }
    },
    visual_type: 'bar_chart',
    focus: 'Hierarchical breakdown'
};

export const DRILL_DOWN_CONVERSATIONAL: StoryTemplate = {
    story_type: 'drill_down',
    tone: 'conversational',
    headline: "Let's break down {{parent_metric}}",
    narrative: `When we zoom into {{parent_metric}}, {{child_metric}} stands out - it's driving {{contribution_percent}}% of the total. {{insight_phrase}}.`,
    variables: {
        insight_phrase: {
            condition: '{{contribution_percent}} > 50',
            thenValue: "That's more than half!",
            elseValue: {
                condition: '{{contribution_percent}} > 25',
                thenValue: "That's a big chunk",
                elseValue: "It's a meaningful contributor"
            }
        }
    },
    visual_type: 'bar_chart',
    focus: 'Segment exploration'
};

// ============================================================================
// CONTRAST TEMPLATES
// ============================================================================

export const CONTRAST_FORMAL: StoryTemplate = {
    story_type: 'contrast',
    tone: 'formal',
    headline: '{{item_a}} vs {{item_b}}: {{difference_percent}}% differential',
    narrative: `Comparative analysis reveals that {{item_a}} ({{value_a}}) {{comparison_verb}} {{item_b}} ({{value_b}}) by {{difference_percent}}%. The primary contributing factor is {{driver}}.`,
    variables: {
        comparison_verb: {
            condition: '{{value_a}} > {{value_b}}',
            thenValue: 'exceeds',
            elseValue: 'underperforms relative to'
        }
    },
    visual_type: 'bar_chart',
    focus: 'Side-by-side comparison'
};

export const CONTRAST_CONVERSATIONAL: StoryTemplate = {
    story_type: 'contrast',
    tone: 'conversational',
    headline: '{{item_a}} {{comparison_action}} {{item_b}}',
    narrative: `Here's the comparison: {{item_a}} is at {{value_a}}, while {{item_b}} is at {{value_b}}. That's a {{difference_percent}}% difference, mainly because of {{driver}}.`,
    variables: {
        comparison_action: {
            condition: '{{value_a}} > {{value_b}}',
            thenValue: 'outperforms',
            elseValue: 'trails'
        }
    },
    visual_type: 'bar_chart',
    focus: 'Performance comparison'
};

// ============================================================================
// OUTLIERS TEMPLATES
// ============================================================================

export const OUTLIERS_FORMAL: StoryTemplate = {
    story_type: 'outliers',
    tone: 'formal',
    headline: 'Anomaly detected: {{outlier_count}} {{entity_type}} exceed normal range',
    narrative: `Statistical analysis identifies {{outlier_count}} {{entity_type}} that deviate significantly from the mean ({{mean_value}}). These outliers range from {{outlier_min}} to {{outlier_max}}, representing {{outlier_percent}}% of the dataset. {{explanation}}.`,
    variables: {},
    visual_type: 'scatter_plot',
    focus: 'Exception identification'
};

export const OUTLIERS_CONVERSATIONAL: StoryTemplate = {
    story_type: 'outliers',
    tone: 'conversational',
    headline: 'Some {{entity_type}} stand out from the crowd',
    narrative: `Most {{entity_type}} cluster around {{mean_value}}, but {{outlier_count}} are way different - ranging from {{outlier_min}} to {{outlier_max}}. Think of them like {{anecdote}}. {{explanation}}.`,
    variables: {
        anecdote: {
            condition: 'true',
            thenValue: 'the tall person in a crowd photo - easy to spot'
        }
    },
    visual_type: 'scatter_plot',
    focus: 'Anomaly exploration'
};

// ============================================================================
// INTERSECTIONS TEMPLATES
// ============================================================================

export const INTERSECTIONS_FORMAL: StoryTemplate = {
    story_type: 'intersections',
    tone: 'formal',
    headline: '{{factor_a}} and {{factor_b}} correlation: {{correlation_coefficient}}',
    narrative: `Analysis reveals a {{correlation_strength}} {{correlation_direction}} correlation (r = {{correlation_coefficient}}) between {{factor_a}} and {{factor_b}}. This relationship suggests {{implication}}.`,
    variables: {
        correlation_strength: {
            condition: 'Math.abs({{correlation_coefficient}}) > 0.7',
            thenValue: 'strong',
            elseValue: {
                condition: 'Math.abs({{correlation_coefficient}}) > 0.4',
                thenValue: 'moderate',
                elseValue: 'weak'
            }
        },
        correlation_direction: {
            condition: '{{correlation_coefficient}} > 0',
            thenValue: 'positive',
            elseValue: 'negative'
        }
    },
    visual_type: 'scatter_plot',
    focus: 'Multi-factor relationship'
};

export const INTERSECTIONS_CONVERSATIONAL: StoryTemplate = {
    story_type: 'intersections',
    tone: 'conversational',
    headline: 'How {{factor_a}} relates to {{factor_b}}',
    narrative: `There's a {{correlation_strength}} connection between {{factor_a}} and {{factor_b}} (correlation: {{correlation_coefficient}}). When {{factor_a}} goes {{direction_a}}, {{factor_b}} tends to go {{direction_b}}. {{insight}}.`,
    variables: {
        correlation_strength: {
            condition: 'Math.abs({{correlation_coefficient}}) > 0.7',
            thenValue: 'strong',
            elseValue: {
                condition: 'Math.abs({{correlation_coefficient}}) > 0.4',
                thenValue: 'clear',
                elseValue: 'weak'
            }
        },
        direction_a: {
            condition: '{{correlation_coefficient}} > 0',
            thenValue: 'up',
            elseValue: 'up'
        },
        direction_b: {
            condition: '{{correlation_coefficient}} > 0',
            thenValue: 'up',
            elseValue: 'down'
        }
    },
    visual_type: 'scatter_plot',
    focus: 'Relationship discovery'
};

// ============================================================================
// TEMPLATE REGISTRY
// ============================================================================

export const STORY_TEMPLATES: Record<string, StoryTemplate> = {
    'change_over_time_formal': CHANGE_OVER_TIME_FORMAL,
    'change_over_time_conversational': CHANGE_OVER_TIME_CONVERSATIONAL,
    'drill_down_formal': DRILL_DOWN_FORMAL,
    'drill_down_conversational': DRILL_DOWN_CONVERSATIONAL,
    'contrast_formal': CONTRAST_FORMAL,
    'contrast_conversational': CONTRAST_CONVERSATIONAL,
    'outliers_formal': OUTLIERS_FORMAL,
    'outliers_conversational': OUTLIERS_CONVERSATIONAL,
    'intersections_formal': INTERSECTIONS_FORMAL,
    'intersections_conversational': INTERSECTIONS_CONVERSATIONAL,
};

export function getTemplate(storyType: StoryType, tone: ToneProfile): StoryTemplate {
    const key = `${storyType}_${tone}`;
    return STORY_TEMPLATES[key];
}
