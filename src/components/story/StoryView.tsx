
import React, { useState, useMemo } from 'react';
import { StoryCanvas } from './StoryCanvas';
import { StoryViewData } from '@/lib/reportViewModel';
import { Story, StoryPoint, ToneProfile } from '@/types/StoryTypes';

interface StoryViewProps {
    data: StoryViewData;
    onChangeStoryPoint?: (index: number) => void;
}

export function StoryView({ data, onChangeStoryPoint }: StoryViewProps) {
    const [tone, setTone] = useState<ToneProfile>('formal');

    const story: Story = useMemo(() => {
        const points: StoryPoint[] = data.sections.map((section, idx) => ({
            id: section.id || `p-${idx}`,
            sequence: idx + 1,
            headline: section.title,
            narrative: section.content,
            narrative_variations: {
                executive: section.content,
                analyst: section.content,
                expert: section.content,
            },
            explanation: {
                what_happened: section.content.split('\n')[0] || "Automated analysis of this section.",
                why_it_happened: section.impact || "Key drivers align with the observed shift.",
                why_it_matters: section.impact || "This impacts the primary business objective.",
                what_to_watch: "Data quality and sample coverage remain the main watchouts.",
            },
            visual: {
                type: 'table',
                data: [],
                config: {
                    title: section.title,
                },
            },
            evidence: [],
            interactions: [],
            metadata: {
                storyType: 'contrast',
                tone,
                confidence: data.meta.confidence || 0.8,
                timestamp: data.meta.date,
            },
        }));

        return {
            run_id: data.meta.runId,
            title: data.headline,
            summary: data.subheadline || "Narrative summary unavailable.",
            tone,
            points,
            metadata: {
                created_at: new Date().toISOString(),
                dataset_name: undefined,
                row_count: undefined,
                column_count: undefined,
            },
        };
    }, [data, tone]);

    return (
        <StoryCanvas
            story={story}
            onToneChange={setTone}
        />
    );
}
