/**
 * Anecdote Library
 * 
 * Provides contextual analogies and metaphors for data storytelling.
 */

export interface Anecdote {
    category: 'outliers' | 'correlations' | 'trends' | 'distributions' | 'comparisons';
    text: string;
    tone: 'formal' | 'conversational' | 'playful';
}

// ============================================================================
// OUTLIER ANECDOTES
// ============================================================================

export const OUTLIER_ANECDOTES: Anecdote[] = [
    {
        category: 'outliers',
        tone: 'conversational',
        text: 'Think of outliers like the tall person in a crowd photo - they stand out, but they're still part of the group'
  },
    {
        category: 'outliers',
        tone: 'conversational',
        text: 'Outliers are like students who arrive late to class - noticeable and worth investigating'
    },
    {
        category: 'outliers',
        tone: 'playful',
        text: 'These outliers are the unicorns of your dataset - rare, special, and definitely worth a closer look'
    },
    {
        category: 'outliers',
        tone: 'formal',
        text: 'These data points represent statistical anomalies that warrant further investigation'
    }
];

// ============================================================================
// CORRELATION ANECDOTES
// ============================================================================

export const CORRELATION_ANECDOTES: Anecdote[] = [
    {
        category: 'correlations',
        tone: 'conversational',
        text: 'When X goes up and Y goes up together, it's like two friends walking in sync'
  },
    {
        category: 'correlations',
        tone: 'conversational',
        text: 'A strong correlation is like a shadow following you - consistent and predictable'
    },
    {
        category: 'correlations',
        tone: 'playful',
        text: 'These two variables are like dance partners - when one moves, the other follows'
    },
    {
        category: 'correlations',
        tone: 'formal',
        text: 'This relationship demonstrates a statistically significant association between the variables'
    }
];

// ============================================================================
// TREND ANECDOTES
// ============================================================================

export const TREND_ANECDOTES: Anecdote[] = [
    {
        category: 'trends',
        tone: 'conversational',
        text: 'Trends are like the tide - they move slowly but steadily in one direction'
    },
    {
        category: 'trends',
        tone: 'conversational',
        text: 'Think of this trend as a marathon runner's pace - consistent over time'
  },
{
    category: 'trends',
        tone: 'playful',
            text: 'This trend is like a rocket ship - once it starts, it keeps going!'
},
{
    category: 'trends',
        tone: 'formal',
            text: 'The temporal pattern exhibits consistent directional movement'
}
];

// ============================================================================
// DISTRIBUTION ANECDOTES
// ============================================================================

export const DISTRIBUTION_ANECDOTES: Anecdote[] = [
    {
        category: 'distributions',
        tone: 'conversational',
        text: 'Most values cluster around the middle, like people gathering at the center of a party'
    },
    {
        category: 'distributions',
        tone: 'conversational',
        text: 'The distribution is like a bell curve - most data points hang out in the middle'
    },
    {
        category: 'distributions',
        tone: 'playful',
        text: 'Your data is like a crowd at a concert - most people in the middle, a few at the edges'
    },
    {
        category: 'distributions',
        tone: 'formal',
        text: 'The distribution exhibits central tendency with moderate dispersion'
    }
];

// ============================================================================
// COMPARISON ANECDOTES
// ============================================================================

export const COMPARISON_ANECDOTES: Anecdote[] = [
    {
        category: 'comparisons',
        tone: 'conversational',
        text: 'Comparing these two is like comparing apples to oranges - both fruit, but different'
    },
    {
        category: 'comparisons',
        tone: 'conversational',
        text: 'The difference is like night and day - clear and significant'
    },
    {
        category: 'comparisons',
        tone: 'playful',
        text: 'It's a David vs.Goliath situation - one clearly dominates the other'
  },
{
    category: 'comparisons',
        tone: 'formal',
            text: 'Comparative analysis reveals substantial differential between the entities'
}
];

// ============================================================================
// ANECDOTE REGISTRY
// ============================================================================

export const ALL_ANECDOTES: Anecdote[] = [
    ...OUTLIER_ANECDOTES,
    ...CORRELATION_ANECDOTES,
    ...TREND_ANECDOTES,
    ...DISTRIBUTION_ANECDOTES,
    ...COMPARISON_ANECDOTES
];

export function getAnecdote(
    category: Anecdote['category'],
    tone: Anecdote['tone']
): string | null {
    const matches = ALL_ANECDOTES.filter(
        a => a.category === category && a.tone === tone
    );

    if (matches.length === 0) return null;

    // Return random anecdote from matches
    return matches[Math.floor(Math.random() * matches.length)].text;
}

export function getAnecdotes(category: Anecdote['category']): Anecdote[] {
    return ALL_ANECDOTES.filter(a => a.category === category);
}
