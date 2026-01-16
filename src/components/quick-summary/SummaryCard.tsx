/**
 * Summary Card Component
 * 
 * Displays a question with chart, statistics, and interpretation.
 */

import React from 'react';
import { QuickSummaryData, NumericStats, CategoricalStats } from '@/types/QuickSummaryTypes';

interface SummaryCardProps {
    question: string;
    summary: QuickSummaryData;
}

export function SummaryCard({ question, summary }: SummaryCardProps) {
    // Determine what type of question this is and extract relevant data
    const questionType = getQuestionType(question);
    const data = getDataForQuestion(question, summary);

    if (!data) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{question}</h2>
                <p className="text-gray-500">No data available for this question.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">{question}</h2>

            {/* Statistics Grid */}
            {questionType === 'distribution' && data.stats && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <StatBox label="Mean" value={formatNumber(data.stats.mean)} />
                    <StatBox label="Median" value={formatNumber(data.stats.median)} />
                    <StatBox label="Std Dev" value={formatNumber(data.stats.std)} />
                </div>
            )}

            {questionType === 'correlation' && data.correlation && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <StatBox
                        label="Correlation"
                        value={data.correlation.corr.toFixed(3)}
                        highlight={Math.abs(data.correlation.corr) > 0.7}
                    />
                    <StatBox label="X Variable" value={data.correlation.x} />
                    <StatBox label="Y Variable" value={data.correlation.y} />
                </div>
            )}

            {questionType === 'categories' && data.categories && (
                <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Top Categories</h3>
                    <div className="space-y-2">
                        {data.categories.slice(0, 5).map((cat, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                                    <div
                                        className="absolute inset-y-0 left-0 bg-blue-500 rounded-full"
                                        style={{ width: `${(cat.count / data.categories[0].count) * 100}%` }}
                                    />
                                    <span className="absolute inset-0 flex items-center px-3 text-sm font-medium text-gray-900">
                                        {cat.value}
                                    </span>
                                </div>
                                <span className="text-sm text-gray-600 w-16 text-right">
                                    {cat.count.toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Interpretation */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Interpretation</h3>
                <p className="text-sm text-blue-800">
                    {generateInterpretation(questionType, data)}
                </p>
            </div>
        </div>
    );
}

function StatBox({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
    return (
        <div className={`p-4 rounded-lg border ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="text-xs text-gray-600 mb-1">{label}</div>
            <div className={`text-2xl font-bold ${highlight ? 'text-blue-900' : 'text-gray-900'}`}>
                {value}
            </div>
        </div>
    );
}

function getQuestionType(question: string): 'distribution' | 'correlation' | 'categories' | 'unknown' {
    const lower = question.toLowerCase();
    if (lower.includes('distribution')) return 'distribution';
    if (lower.includes('relate') || lower.includes('relationship')) return 'correlation';
    if (lower.includes('common') || lower.includes('categories')) return 'categories';
    return 'unknown';
}

function getDataForQuestion(question: string, summary: QuickSummaryData) {
    const type = getQuestionType(question);

    if (type === 'distribution') {
        // Extract column name from question
        const match = question.match(/distribution of (.+)\?/i);
        if (match) {
            const columnName = match[1];
            const stats = summary.statistics[columnName] as NumericStats;
            if (stats && 'mean' in stats) {
                return { stats, columnName };
            }
        }
    }

    if (type === 'correlation') {
        // Extract variable names from question
        const match = question.match(/how does (.+) relate to (.+)\?/i);
        if (match) {
            const x = match[1];
            const y = match[2];
            const correlation = summary.correlations.find(c =>
                (c.x === x && c.y === y) || (c.x === y && c.y === x)
            );
            if (correlation) {
                return { correlation };
            }
        }
    }

    if (type === 'categories') {
        // Extract column name from question
        const match = question.match(/most common (.+) values?\?/i);
        if (match) {
            const columnName = match[1];
            const stats = summary.statistics[columnName] as CategoricalStats;
            if (stats && 'top_categories' in stats) {
                return { categories: stats.top_categories, columnName };
            }
        }
    }

    return null;
}

function generateInterpretation(type: string, data: any): string {
    if (type === 'distribution' && data.stats) {
        const { mean, median, std } = data.stats;
        const skew = mean - median;
        if (Math.abs(skew) < std * 0.1) {
            return `The distribution of ${data.columnName} is roughly symmetric, with values centered around ${formatNumber(mean)}.`;
        } else if (skew > 0) {
            return `The distribution of ${data.columnName} is right-skewed, with a few high values pulling the mean (${formatNumber(mean)}) above the median (${formatNumber(median)}).`;
        } else {
            return `The distribution of ${data.columnName} is left-skewed, with a few low values pulling the mean (${formatNumber(mean)}) below the median (${formatNumber(median)}).`;
        }
    }

    if (type === 'correlation' && data.correlation) {
        const { corr, x, y } = data.correlation;
        const strength = Math.abs(corr) > 0.7 ? 'strong' : Math.abs(corr) > 0.4 ? 'moderate' : 'weak';
        const direction = corr > 0 ? 'positive' : 'negative';
        return `There is a ${strength} ${direction} correlation (r = ${corr.toFixed(3)}) between ${x} and ${y}. ${Math.abs(corr) > 0.7
                ? 'This suggests a meaningful relationship worth investigating further.'
                : 'This relationship may not be practically significant.'
            }`;
    }

    if (type === 'categories' && data.categories) {
        const topCategory = data.categories[0];
        const totalCount = data.categories.reduce((sum: number, cat: any) => sum + cat.count, 0);
        const topPercentage = ((topCategory.count / totalCount) * 100).toFixed(1);
        return `The most common ${data.columnName} is "${topCategory.value}", accounting for ${topPercentage}% of all records. The top 5 categories represent the majority of the data.`;
    }

    return 'No interpretation available for this question type.';
}

function formatNumber(num: number): string {
    if (Math.abs(num) >= 1000) {
        return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
    }
    return num.toFixed(2);
}
