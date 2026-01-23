/**
 * Quick Summary View Page
 * 
 * Main page for Quick View mode with 2-panel layout.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QuickSummaryData } from '@/types/QuickSummaryTypes';
import { SummaryCard } from '@/components/quick-summary/SummaryCard';
import { StoryCanvas } from '@/components/story/StoryCanvas';
import { Story, ToneProfile } from '@/types/StoryTypes';
import { API_BASE } from '@/lib/api-client';
import { useRunManifest } from '@/hooks/useRunManifest';

export default function QuickSummaryView() {
    const { runId } = useParams<{ runId: string }>();
    const [viewMode, setViewMode] = useState<'dashboard' | 'story'>('dashboard');

    // Dashboard State
    const [summary, setSummary] = useState<QuickSummaryData | null>(null);
    const [activeQuestion, setActiveQuestion] = useState<string | null>(null);

    // Story State
    const [story, setStory] = useState<Story | null>(null);
    const [currentTone, setCurrentTone] = useState<ToneProfile>('conversational');

    const [loading, setLoading] = useState(true);
    const [storyLoading, setStoryLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { data: manifest, loading: manifestLoading, compatible: manifestCompatible } = useRunManifest(runId);

    // Fetch Summary (Dashboard Data)
    useEffect(() => {
        if (!runId) return;

        const fetchSummary = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_BASE}/run/${runId}/summary`);

                if (!response.ok) {
                    throw new Error(`Failed to fetch summary: ${response.statusText}`);
                }

                const data = await response.json();
                setSummary(data);

                // Auto-select first question
                if (data.questions && data.questions.length > 0) {
                    setActiveQuestion(data.questions[0]);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load summary');
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, [runId]);

    // Fetch Story (Narrative Data)
    useEffect(() => {
        if (!runId || viewMode !== 'story') return;

        const fetchStory = async () => {
            try {
                setStoryLoading(true);
                const response = await fetch(
                    `${API_BASE}/run/${runId}/story?tone=${currentTone}`
                );

                if (!response.ok) {
                    throw new Error(`Failed to fetch story: ${response.statusText}`);
                }

                const data = await response.json();
                setStory(data);
            } catch (err) {
                console.error('Failed to load story:', err);
                // Fallback or error notification could go here
            } finally {
                setStoryLoading(false);
            }
        };

        fetchStory();
    }, [runId, viewMode, currentTone]);

    if (!runId) {
        return null;
    }

    if (manifestLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading manifest...</p>
                </div>
            </div>
        );
    }

    if (!manifestCompatible) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="text-amber-500 text-5xl mb-4">âš ï¸</div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Manifest Incompatible</h2>
                    <p className="text-gray-600 mb-6">This summary requires a newer manifest version.</p>
                </div>
            </div>
        );
    }

    if (manifest?.render_policy && !manifest.render_policy.allow_report) {
        return null;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Computing insights...</p>
                </div>
            </div>
        );
    }

    if (error || !summary) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load Insights</h2>
                    <p className="text-gray-600 mb-6">{error || 'Data not available'}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Header / Mode Switcher */}
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-lg font-bold text-gray-900">Quick Summary</h1>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button
                        onClick={() => setViewMode('dashboard')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'dashboard'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={() => setViewMode('story')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'story'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Story Mode ✨
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {viewMode === 'story' ? (
                    <div className="absolute inset-0 p-6 overflow-hidden">
                        {story ? (
                            <StoryCanvas
                                story={story}
                                onToneChange={setCurrentTone}
                                isLoading={storyLoading}
                                className="h-full w-full max-w-6xl mx-auto shadow-xl ring-1 ring-black/5"
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-[300px_1fr] h-full">
                        {/* Sidebar */}
                        <aside className="bg-white border-r border-gray-200 overflow-y-auto">
                            <div className="p-6">
                                {/* Dataset Metadata */}
                                <div className="mb-8">
                                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Dataset Overview</h2>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <span className="text-sm text-gray-600">Total Rows</span>
                                            <span className="font-mono font-bold text-gray-900">{summary.row_count.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <span className="text-sm text-gray-600">Columns</span>
                                            <span className="font-mono font-bold text-gray-900">{summary.column_count}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Suggested Questions */}
                                <div>
                                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Suggested Questions</h2>
                                    <div className="space-y-2">
                                        {summary.questions.map((question, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setActiveQuestion(question)}
                                                className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all duration-200 border ${activeQuestion === question
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                                                    : 'bg-white text-gray-600 border-transparent hover:bg-gray-50 hover:border-gray-200'
                                                    }`}
                                            >
                                                {question}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </aside>

                        {/* Main Content */}
                        <main className="overflow-y-auto p-8 bg-gray-50/50">
                            {activeQuestion ? (
                                <div className="max-w-4xl mx-auto">
                                    <SummaryCard
                                        question={activeQuestion}
                                        summary={summary}
                                    />
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                                    <div className="text-6xl mb-4">👈</div>
                                    <h3 className="text-xl font-medium text-gray-900 mb-2">Select a Question</h3>
                                    <p className="text-gray-500">Choose a question from the sidebar to generate insights</p>
                                </div>
                            )}
                        </main>
                    </div>
                )}
            </div>
        </div>
    );
}
