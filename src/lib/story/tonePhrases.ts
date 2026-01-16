/**
 * Tone Phrase Libraries
 * 
 * Provides tone-specific phrases for transitions, metrics, and conclusions.
 */

export interface PhraseLibrary {
    transitions: string[];
    metric_descriptions: string[];
    conclusions: string[];
    intensifiers: string[];
    qualifiers: string[];
}

// ============================================================================
// FORMAL TONE PHRASES
// ============================================================================

export const FORMAL_PHRASES: PhraseLibrary = {
    transitions: [
        'Subsequently,',
        'Furthermore,',
        'In addition,',
        'Moreover,',
        'Consequently,',
        'Additionally,',
        'Following this,',
        'Building upon this,',
        'As a result,',
        'Therefore,'
    ],

    metric_descriptions: [
        'demonstrates a {{trend}}',
        'indicates {{direction}}',
        'exhibits {{pattern}}',
        'reveals {{insight}}',
        'shows evidence of {{finding}}',
        'displays {{characteristic}}',
        'manifests {{behavior}}',
        'presents {{observation}}'
    ],

    conclusions: [
        'This suggests',
        'The data indicates',
        'Analysis reveals',
        'Evidence demonstrates',
        'Findings show',
        'Results indicate',
        'This implies',
        'The pattern suggests'
    ],

    intensifiers: [
        'significantly',
        'substantially',
        'notably',
        'markedly',
        'considerably',
        'appreciably'
    ],

    qualifiers: [
        'approximately',
        'roughly',
        'nearly',
        'about',
        'close to',
        'in the vicinity of'
    ]
};

// ============================================================================
// CONVERSATIONAL TONE PHRASES
// ============================================================================

export const CONVERSATIONAL_PHRASES: PhraseLibrary = {
    transitions: [
        "Here's what's interesting:",
        'Now, let's look at',
    'Next up:',
        'Moving on,',
        "Here's the thing:",
        'Check this out:',
        'Get this:',
        'And here's why: ',
    'So what does this mean?',
        'The bottom line:'
    ],

    metric_descriptions: [
        'shows a {{trend}}',
        'is {{direction}}',
        'has a {{pattern}}',
        'tells us {{insight}}',
        'points to {{finding}}',
        'looks like {{characteristic}}',
        'is doing {{behavior}}',
        'gives us {{observation}}'
    ],

    conclusions: [
        'What this means:',
        'The takeaway:',
        'Bottom line:',
        'Here's why this matters: ',
    'So what?',
        'The key insight:',
        'Why this is important:',
        'What you need to know:'
    ],

    intensifiers: [
        'really',
        'pretty',
        'quite',
        'very',
        'super',
        'way'
    ],

    qualifiers: [
        'about',
        'around',
        'roughly',
        'close to',
        'somewhere near',
        'in the ballpark of'
    ]
};

// ============================================================================
// PLAYFUL TONE PHRASES (Future Phase)
// ============================================================================

export const PLAYFUL_PHRASES: PhraseLibrary = {
    transitions: [
        'Plot twist:',
        'Wait for it...',
        'Buckle up:',
        'Here comes the fun part:',
        'Ready for this?',
        'Surprise!',
        'Guess what:',
        'Hold onto your hat:'
    ],

    metric_descriptions: [
        'is going {{trend}}',
        'is totally {{direction}}',
        'is rocking a {{pattern}}',
        'is screaming {{insight}}',
        'is all about {{finding}}',
        'is showing off {{characteristic}}',
        'is pulling a {{behavior}}',
        'is telling us {{observation}}'
    ],

    conclusions: [
        'The moral of the story:',
        'What's the verdict ? ',
    'The big reveal:',
        'Drumroll please...',
        'And the winner is:',
        'The punchline:',
        'The secret sauce:',
        'The magic ingredient:'
    ],

    intensifiers: [
        'super',
        'mega',
        'crazy',
        'insanely',
        'wildly',
        'ridiculously'
    ],

    qualifiers: [
        'about',
        'ish',
        'give or take',
        'more or less',
        'in that neighborhood',
        'ballpark'
    ]
};

// ============================================================================
// PHRASE REGISTRY
// ============================================================================

export const PHRASE_LIBRARIES: Record<string, PhraseLibrary> = {
    formal: FORMAL_PHRASES,
    conversational: CONVERSATIONAL_PHRASES,
    playful: PLAYFUL_PHRASES
};

export function getPhraseLibrary(tone: 'formal' | 'conversational' | 'playful'): PhraseLibrary {
    return PHRASE_LIBRARIES[tone];
}

export function selectRandomPhrase(phrases: string[]): string {
    return phrases[Math.floor(Math.random() * phrases.length)];
}

export function selectPhrase(phrases: string[], index: number): string {
    return phrases[index % phrases.length];
}
