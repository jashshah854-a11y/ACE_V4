/**
 * Quick Summary View Page
 * 
 * Main page for Quick View mode with 2-panel layout.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QuickSummaryData } from '@/types/QuickSummaryTypes';

export default function QuickSummaryView() {
    const { runId } = useParams<{ runId: string }>();
    const [summary, setSummary] = useState<QuickSummaryData | null>(null);
    const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!runId) return;

        const fetchSummary = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/run/${runId}/summary`);

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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Computing summary...</p>
                </div>
            </div>
        );
    }

    if (error || !summary) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center max-w-md">
                    <div className="text-red-600 text-5xl mb-4">⚠️</div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Summary</h2>
                    <p className="text-gray-600">{error || 'Summary data not available'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-[30%_70%] h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="bg-white border-r border-gray-200 overflow-y-auto">
                <div className="p-6">
                    {/* Dataset Metadata */}
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-3">Dataset Overview</h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Rows:</span>
                                <span className="font-medium text-gray-900">{summary.row_count.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Columns:</span>
                                <span className="font-medium text-gray-900">{summary.column_count}</span>
                            </div>
                        </div>
                    </div>

                    {/* Suggested Questions */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-3">Suggested Questions</h2>
                        <div className="space-y-2">
                            {summary.questions.map((question, index) => (
                                <button
                                    key={index}
                                    onClick={() => setActiveQuestion(question)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeQuestion === question
                                            ? 'bg-blue-100 text-blue-900 font-medium'
                                            : 'text-gray-700 hover:bg-gray-100'
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
            <main className="overflow-y-auto p-6">
                {activeQuestion ? (
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-6">{activeQuestion}</h1>

                        {/* Placeholder for chart and stats */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <p className="text-gray-600">
                                Chart and statistics for "{activeQuestion}" will be displayed here.
                            </p>

                            {/* Show raw data for now */}
                            <div className="mt-4 p-4 bg-gray-50 rounded text-xs font-mono">
                                <pre>{JSON.stringify(summary, null, 2)}</pre>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-500 mt-12">
                        <p>Select a question from the sidebar to view insights</p>
                    </div>
                )}
            </main>
        </div>
    );
}
