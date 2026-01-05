import React, { useState, useEffect, useCallback } from 'react';
import { Sliders, RotateCcw, Zap, Plus, X, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { simulateScenario, SimulationResult, Modification } from '@/lib/api-client';

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

    // Multi-parameter state
    const [scenarios, setScenarios] = useState<Modification[]>([]);

    // Current input state
    const [selectedColumn, setSelectedColumn] = useState<string>('');
    const [modificationFactor, setModificationFactor] = useState(1.0);

    const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial load
    useEffect(() => {
        if (availableColumns.length > 0 && !selectedColumn) {
            setSelectedColumn(availableColumns[0]);
        }
    }, [availableColumns, selectedColumn]);

    // Handle Adding Scenario
    const addScenario = useCallback(() => {
        if (!selectedColumn || modificationFactor === 1.0) return;

        setScenarios(prev => {
            // Remove existing for same column if exists
            const filtered = prev.filter(s => s.target_column !== selectedColumn);
            return [...filtered, {
                target_column: selectedColumn,
                modification_factor: modificationFactor
            }];
        });

        // Reset factor but keep column for convenience
        setModificationFactor(1.0);
    }, [selectedColumn, modificationFactor]);

    // Handle Removing Scenario
    const removeScenario = useCallback((column: string) => {
        setScenarios(prev => {
            const next = prev.filter(s => s.target_column !== column);
            if (next.length === 0) {
                onSimulationResult?.(null);
                setSimulationResult(null);
            }
            return next;
        });
    }, [onSimulationResult]);

    // Run Simulation (Triggered by button now, not debounce)
    const runSimulation = useCallback(async () => {
        if (scenarios.length === 0) return;

        try {
            setIsSimulating(true);
            setError(null);

            const result = await simulateScenario(runId, {
                modifications: scenarios
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
    }, [runId, scenarios, onSimulationResult]);

    const handleReset = useCallback(() => {
        setScenarios([]);
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
                            Multi-Parameter What-If Simulation
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {exploreMode && scenarios.length > 0 && (
                        <button
                            onClick={handleReset}
                            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Reset
                        </button>
                    )}

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
            </div>

            <AnimatePresence>
                {exploreMode && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 space-y-4">

                            {/* Input Controls */}
                            <div className="flex flex-col md:flex-row gap-4 items-end bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-gray-700/50">
                                <div className="flex-1 space-y-2 w-full">
                                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Target Variable
                                    </label>
                                    <select
                                        value={selectedColumn}
                                        onChange={(e) => setSelectedColumn(e.target.value)}
                                        className="w-full h-9 rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-purple-500"
                                    >
                                        <option value="" disabled>Select a column...</option>
                                        {availableColumns.map(col => (
                                            <option key={col} value={col}>{col}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex-1 space-y-2 w-full">
                                    <div className="flex justify-between">
                                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                            Modification Factor
                                        </label>
                                        <span className={`text-xs font-mono font-bold ${modificationFactor > 1 ? 'text-green-600' : modificationFactor < 1 ? 'text-red-500' : 'text-gray-500'}`}>
                                            {changeSign}{percentageChange}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="1.5"
                                        step="0.05"
                                        value={modificationFactor}
                                        onChange={(e) => setModificationFactor(parseFloat(e.target.value))}
                                        className="w-full accent-purple-600 cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[10px] text-gray-400 font-mono">
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
