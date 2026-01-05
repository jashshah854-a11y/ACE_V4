import React from 'react';
import { X, Send, Sparkles, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReportDataResult } from '@/types/reportTypes';
import { BusinessPulse } from './business/BusinessPulse';
import { PredictiveDriversChart } from './predictive/PredictiveDriversChart';

interface EvidenceRailProps {
    isOpen: boolean;
    onClose: () => void;
    activeEvidence: 'business_pulse' | 'predictive_drivers' | null;
    data: ReportDataResult;
    runId: string;
}

const SUGGESTION_CHIPS = {
    business_pulse: [
        { label: 'Forecast Next Month', icon: '📈' },
        { label: 'Compare Segments', icon: '🔀' },
    ],
    predictive_drivers: [
        { label: 'Remove Outliers', icon: '🎯' },
        { label: 'Explain Top Driver', icon: '💡' },
    ],
};

export default function EvidenceRail({ isOpen, onClose, activeEvidence, data, runId }: EvidenceRailProps) {
    const [askQuery, setAskQuery] = React.useState('');
    const [isAsking, setIsAsking] = React.useState(false);
    const [reasoningSteps, setReasoningSteps] = React.useState<string[]>([]);
    const [answer, setAnswer] = React.useState<string | null>(null);

    // Close on Escape key
    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const handleAskSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!askQuery.trim()) return;

        setIsAsking(true);
        setReasoningSteps([]);
        setAnswer(null);

        try {
            const response = await fetch('http://localhost:8000/api/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: askQuery,
                    context: activeEvidence,
                    evidence_type: activeEvidence || 'business_pulse',
                    run_id: runId
                })
            });

            if (!response.ok) throw new Error('Ask request failed');

            const result = await response.json();

            // Animate reasoning steps (300ms delay between each)
            for (const step of result.reasoning_steps) {
                await new Promise(resolve => setTimeout(resolve, 300));
                setReasoningSteps(prev => [...prev, step]);
            }

            setAnswer(result.answer);
        } catch (error) {
            console.error('Ask error:', error);
            setAnswer('Error processing query. Please try again.');
        } finally {
            setIsAsking(false);
            setAskQuery('');
        }
    };

    const handleChipClick = (chipLabel: string) => {
        setAskQuery(chipLabel);
    };

    // Calculate dynamic suggestions based on data signals
    const suggestions = React.useMemo(() => {
        const baseSuggestions = activeEvidence ? SUGGESTION_CHIPS[activeEvidence] : [];
        const dynamicSuggestions = [];

        if (activeEvidence === 'business_pulse' && data.enhancedAnalytics) {
            // Signal 1: Churn Risk > 20%
            const churnRisk = data.enhancedAnalytics.business_intelligence?.churn_risk?.at_risk_percentage || 0;
            if (churnRisk > 20) {
                dynamicSuggestions.push({
                    label: 'Analyze High-Risk Segment',
                    icon: '🚨',
                    action: 'What are the top drivers of churn in this segment?'
                });
            }

            // Signal 2: Behavioral Clusters Found
            const hasClusters = data.enhancedAnalytics.behavioral_clusters && data.enhancedAnalytics.behavioral_clusters.length > 0;
            if (hasClusters) {
                dynamicSuggestions.push({
                    label: 'View Identified Personas',
                    icon: '👥',
                    action: 'Describe the key behavioral characteristics of these segments.'
                });
            }
        }

        return [...dynamicSuggestions, ...baseSuggestions];
    }, [activeEvidence, data.enhancedAnalytics]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                    />

                    {/* Rail */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-[480px] bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                                    Evidence Lab
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    Raw metrics & mathematical proof
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                aria-label="Close evidence rail"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Contextual Suggestion Chips */}
                        {suggestions.length > 0 && (
                            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-purple-500" />
                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                        Suggested Actions
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {suggestions.map((chip) => (
                                        <button
                                            key={chip.label}
                                            onClick={() => handleChipClick('action' in chip ? chip.action : chip.label)}
                                            className="px-3 py-1.5 text-xs font-medium bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                                        >
                                            <span className="mr-1.5">{chip.icon}</span>
                                            {chip.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Content */}
                        <div className="p-6" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {activeEvidence === 'business_pulse' && data.enhancedAnalytics?.business_intelligence && (
                                <div>
                                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                                        <p className="text-xs text-blue-700 dark:text-blue-300 uppercase tracking-wide font-semibold">
                                            Source: Enhanced Analytics Engine
                                        </p>
                                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                            Zero-Touch Business Intelligence
                                        </p>
                                    </div>
                                    <BusinessPulse data={data.enhancedAnalytics.business_intelligence} />
                                </div>
                            )}

                            {activeEvidence === 'predictive_drivers' && data.enhancedAnalytics?.feature_importance && (
                                <div>
                                    <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                                        <p className="text-xs text-purple-700 dark:text-purple-300 uppercase tracking-wide font-semibold">
                                            Source: Predictive Model
                                        </p>
                                        <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                                            Feature Importance Analysis
                                        </p>
                                    </div>
                                    <PredictiveDriversChart data={data.enhancedAnalytics.feature_importance} />
                                </div>
                            )}

                            {!activeEvidence && (
                                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                    <p className="text-sm">No evidence selected</p>
                                </div>
                            )}
                        </div>

                        {/* Response Area */}
                        {/* Ask ACE Interface */}
                        <div className="border-t border-gray-200 dark:border-gray-800 p-6 bg-gray-50 dark:bg-gray-900/50">
                            {/* Reasoning Steps (Monospace - Evidence) */}
                            {reasoningSteps.length > 0 && (
                                <div className="mb-4 space-y-2 font-mono text-xs">
                                    {reasoningSteps.map((step, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex items-center gap-2 text-gray-600 dark:text-gray-400"
                                        >
                                            <CheckCircle className="w-3 h-3 text-green-500" />
                                            <span>{step}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {/* Answer (Serif - Story/Narrative) */}
                            {answer && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                                >
                                    <p className="text-sm font-serif text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                                        {answer}
                                    </p>
                                </motion.div>
                            )}
                        </div>

                        {/* Ask Interface (The Mouth) */}
                        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-4">
                            <form onSubmit={handleAskSubmit} className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={askQuery}
                                        onChange={(e) => setAskQuery(e.target.value)}
                                        placeholder="Ask a question about this segment..."
                                        className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 font-mono"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!askQuery.trim()}
                                        className="p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                                        aria-label="Submit question"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs">Enter</kbd> to submit • <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs">Esc</kbd> to close
                                </p>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
