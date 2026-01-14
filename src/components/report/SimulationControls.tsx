import React, { useState, useEffect, useCallback } from 'react';
import { Sliders, RotateCcw, Zap, Plus, X, Play, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { simulateScenario, SimulationResult, Modification } from '@/lib/api-client';

interface SimulationControlsProps {
    runId: string;
    availableColumns: string[];
    onSimulationResult?: (result: SimulationResult | null) => void;
    hint?: string | null;
}

export default function SimulationControls({
    runId,
    availableColumns,
    onSimulationResult,
    hint
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

            {hint ? (
                <div
                    data-guidance-context="global"
                    className="mx-6 mt-2 mb-2 inline-flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs sm:text-sm text-amber-900"
                >
                    <Lightbulb className="h-4 w-4 mt-0.5 text-amber-600" />
                    <div>
                        <p className="text-[10px] uppercase tracking-wide text-amber-600">Diagnostics Hint</p>
                        <p className="text-sm">{hint}</p>
                    </div>
                </div>
            ) : (
                <div
                    data-guidance-context="global"
                    className="mx-6 mt-2 mb-2 text-[11px] text-gray-500 dark:text-gray-400"
                >
                    Diagnostics guidance will appear here after the report finishes running.
                </div>
            )}

            <AnimatePresence>
                {exploreMode && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
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

                                <button
                                    onClick={addScenario}
                                    disabled={!selectedColumn || modificationFactor === 1.0}
                                    className="h-9 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden md:inline">Add</span>
                                </button>
                            </div>

                            {/* Active Scenarios List */}
                            {scenarios.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {scenarios.map((scenario) => {
                                        const pct = ((scenario.modification_factor - 1) * 100).toFixed(0);
                                        const sign = scenario.modification_factor > 1 ? '+' : '';
                                        const isPositive = scenario.modification_factor >= 1;

                                        return (
                                            <div
                                                key={scenario.target_column}
                                                className={`
                                                    flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg border text-sm
                                                    ${isPositive
                                                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                                                        : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                                                    }
                                                `}
                                            >
                                                <span className="font-medium">{scenario.target_column}</span>
                                                <span className="font-mono font-bold opacity-80">{sign}{pct}%</span>
                                                <button
                                                    onClick={() => removeScenario(scenario.target_column)}
                                                    className="ml-1 p-0.5 hover:bg-black/5 rounded-full"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Action Area */}
                            <div className="flex flex-col gap-2 justify-end pt-2">
                                <button
                                    onClick={runSimulation}
                                    disabled={scenarios.length === 0 || isSimulating}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm shadow-purple-200 dark:shadow-none"
                                >
                                    {isSimulating ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Running Simulation...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4 fill-current" />
                                            Run Simulation
                                        </>
                                    )}
                                </button>
                                {scenarios.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center">
                                        Add at least one modification to enable simulation.
                                    </p>
                                )}
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-800/50 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    {error}
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
