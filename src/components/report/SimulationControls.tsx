import React, { useState, useEffect, useCallback } from 'react';
import { Sliders, RotateCcw, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { simulateScenario, SimulationResult } from '@/lib/api-client';

interface SimulationControlsProps {
    runId: string;
    availableColumns: string[];
    onSimulationResult?: (result: SimulationResult | null) => void;
}

export default function SimulationControls({
    runId,
    availableColumns,
    onSimulationResult
}: SimulationControlsProps) {
    const [exploreMode, setExploreMode] = useState(false);
    const [selectedColumn, setSelectedColumn] = useState<string>('');
    const [modificationFactor, setModificationFactor] = useState(1.0);
    const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Debounced simulation
    useEffect(() => {
        if (!exploreMode || !selectedColumn || modificationFactor === 1.0) {
            setSimulationResult(null);
            onSimulationResult?.(null);
            return;
        }

        const timeoutId = setTimeout(async () => {
            try {
                setIsSimulating(true);
                setError(null);

                const result = await simulateScenario(runId, {
                    target_column: selectedColumn,
                    modification_factor: modificationFactor
                });

                setSimulationResult(result);
                onSimulationResult?.(result);
            } catch (err) {
                console.error('Simulation error:', err);
                setError(err instanceof Error ? err.message : 'Simulation failed');
                setSimulationResult(null);
                onSimulationResult?.(null);
            } finally {
                setIsSimulating(false);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [exploreMode, selectedColumn, modificationFactor, runId, onSimulationResult]);

    const handleReset = useCallback(() => {
        setModificationFactor(1.0);
        setSimulationResult(null);
        setError(null);
        onSimulationResult?.(null);
    }, [onSimulationResult]);

    const percentageChange = ((modificationFactor - 1) * 100).toFixed(0);
    const changeSign = modificationFactor > 1 ? '+' : '';

    return (
        <div className="border-t border-gray-200 dark:border-gray-800 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
            {/* Toggle Header */}
            <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Explore Mode
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            What-If Simulation Engine
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => {
                        setExploreMode(!exploreMode);
                        if (exploreMode) handleReset();
                    }}
                    className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${exploreMode
                            ? 'bg-purple-600 dark:bg-purple-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }
          `}
                >
                    <span
                        className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${exploreMode ? 'translate-x-6' : 'translate-x-1'}
            `}
                    />
                </button>
            </div>

            {/* Simulation Controls */}
            <AnimatePresence>
                {exploreMode && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-4 space-y-4">
                            {/* Column Selector */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Parameter to Modify
                                </label>
                                <select
                                    value={selectedColumn}
                                    onChange={(e) => {
                                        setSelectedColumn(e.target.value);
                                        handleReset();
                                    }}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">Select a parameter...</option>
                                    {availableColumns.map((col) => (
                                        <option key={col} value={col}>
                                            {col}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Slider */}
                            {selectedColumn && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                            Modification
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <span className={`
                        text-sm font-mono font-bold
                        ${modificationFactor > 1 ? 'text-green-600 dark:text-green-400' :
                                                    modificationFactor < 1 ? 'text-red-600 dark:text-red-400' :
                                                        'text-gray-600 dark:text-gray-400'}
                      `}>
                                                {changeSign}{percentageChange}%
                                            </span>
                                            <button
                                                onClick={handleReset}
                                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                                title="Reset"
                                            >
                                                <RotateCcw className="w-3 h-3 text-gray-500" />
                                            </button>
                                        </div>
                                    </div>

                                    <input
                                        type="range"
                                        min="0.5"
                                        max="1.5"
                                        step="0.05"
                                        value={modificationFactor}
                                        onChange={(e) => setModificationFactor(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                    />

                                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        <span>-50%</span>
                                        <span>0%</span>
                                        <span>+50%</span>
                                    </div>
                                </div>
                            )}

                            {/* Loading State */}
                            {isSimulating && (
                                <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
                                    <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                                    <span>Simulating scenario...</span>
                                </div>
                            )}

                            {/* Error State */}
                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                                    <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
                                </div>
                            )}

                            {/* Delta Visualization */}
                            {simulationResult?.delta && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 rounded-lg"
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                        <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                                            Projected Impact
                                        </h4>
                                    </div>

                                    {/* Churn Risk Delta */}
                                    {simulationResult.delta.churn_risk && (
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-600 dark:text-gray-400">Churn Risk</p>
                                            <div className="flex items-center gap-3 font-mono text-sm">
                                                <span className="text-gray-700 dark:text-gray-300">
                                                    {simulationResult.delta.churn_risk.original.toFixed(1)}%
                                                </span>
                                                <span className="text-gray-400">→</span>
                                                <span className="font-bold text-gray-900 dark:text-gray-100">
                                                    {simulationResult.delta.churn_risk.simulated.toFixed(1)}%
                                                </span>
                                                <span className={`
                          flex items-center gap-1 font-bold
                          ${simulationResult.delta.churn_risk.delta < 0
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : 'text-red-600 dark:text-red-400'}
                        `}>
                                                    {simulationResult.delta.churn_risk.delta < 0 ? '▼' : '▲'}
                                                    {Math.abs(simulationResult.delta.churn_risk.delta).toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Ghost Revenue Delta */}
                                    {simulationResult.delta.ghost_revenue && (
                                        <div className="space-y-1 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                            <p className="text-xs text-gray-600 dark:text-gray-400">Ghost Revenue Opportunities</p>
                                            <div className="flex items-center gap-3 font-mono text-sm">
                                                <span className="text-gray-700 dark:text-gray-300">
                                                    {simulationResult.delta.ghost_revenue.original}
                                                </span>
                                                <span className="text-gray-400">→</span>
                                                <span className="font-bold text-gray-900 dark:text-gray-100">
                                                    {simulationResult.delta.ghost_revenue.simulated}
                                                </span>
                                                <span className={`
                          font-bold
                          ${simulationResult.delta.ghost_revenue.delta < 0
                                                        ? 'text-red-600 dark:text-red-400'
                                                        : 'text-green-600 dark:text-green-400'}
                        `}>
                                                    ({simulationResult.delta.ghost_revenue.delta > 0 ? '+' : ''}
                                                    {simulationResult.delta.ghost_revenue.delta})
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
