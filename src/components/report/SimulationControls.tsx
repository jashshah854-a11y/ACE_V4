import React, { useState, useEffect, useCallback } from 'react';
import { Zap, RotateCcw, Plus, X, Play, Lightbulb, Activity, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { simulateScenario, SimulationResult, Modification } from '@/lib/api-client';

interface SimulationControlsProps {
    runId: string;
    availableColumns: string[];
    onSimulationResult?: (result: SimulationResult | null, context?: { modifications: Modification[] }) => void;
    hint?: string | null;
}

const ACTION_COLOR = '#005eb8';
const THINKING_STEPS = [
    'Cloning dataset snapshot',
    'Re-running KPI engines',
    'Tracing governed impacts'
];

export default function SimulationControls({
    runId,
    availableColumns,
    onSimulationResult,
    hint
}: SimulationControlsProps) {
    const [exploreMode, setExploreMode] = useState(false);
    const [scenarios, setScenarios] = useState<Modification[]>([]);
    const [selectedColumn, setSelectedColumn] = useState<string>('');
    const [modificationFactor, setModificationFactor] = useState(1.0);
    const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);

    useEffect(() => {
        if (availableColumns.length > 0 && !selectedColumn) {
            setSelectedColumn(availableColumns[0]);
        }
    }, [availableColumns, selectedColumn]);

    useEffect(() => {
        if (!isSimulating) {
            const timeout = window.setTimeout(() => setThinkingSteps([]), 400);
            return () => window.clearTimeout(timeout);
        }
        setThinkingSteps([]);
        const timers = THINKING_STEPS.map((step, idx) =>
            window.setTimeout(() => {
                setThinkingSteps(prev => [...prev, step]);
            }, idx * 600)
        );
        return () => timers.forEach(window.clearTimeout);
    }, [isSimulating]);

    const addScenario = useCallback(() => {
        if (!selectedColumn || modificationFactor === 1.0) return;
        setScenarios(prev => {
            const filtered = prev.filter(s => s.target_column !== selectedColumn);
            return [
                ...filtered,
                {
                    target_column: selectedColumn,
                    modification_factor: modificationFactor
                }
            ];
        });
        setModificationFactor(1.0);
    }, [selectedColumn, modificationFactor]);

    const removeScenario = useCallback((column: string) => {
        setScenarios(prev => {
            const next = prev.filter(s => s.target_column !== column);
            if (next.length === 0) {
                setSimulationResult(null);
                onSimulationResult?.(null, { modifications: [] });
            }
            return next;
        });
    }, [onSimulationResult]);

    const runSimulation = useCallback(async () => {
        if (scenarios.length === 0) return;
        try {
            setIsSimulating(true);
            setError(null);
            const result = await simulateScenario(runId, {
                modifications: scenarios
            });
            setSimulationResult(result);
            onSimulationResult?.(result, { modifications: scenarios });
        } catch (err) {
            console.error('Simulation error:', err);
            setError(err instanceof Error ? err.message : 'Simulation failed');
            setSimulationResult(null);
            onSimulationResult?.(null, { modifications: [] });
        } finally {
            setIsSimulating(false);
        }
    }, [runId, scenarios, onSimulationResult]);

    const handleReset = useCallback(() => {
        setScenarios([]);
        setModificationFactor(1.0);
        setSimulationResult(null);
        setError(null);
        onSimulationResult?.(null, { modifications: [] });
    }, [onSimulationResult]);

    const percentageChange = ((modificationFactor - 1) * 100).toFixed(0);
    const changeSign = modificationFactor > 1 ? '+' : '';

    return (
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-cyan-400 via-blue-500 to-purple-600 animate-pulse" />
            <div className="relative space-y-5 p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">Neural Chamber</p>
                        <h3 className="mt-1 font-serif text-2xl">What-If Cockpit</h3>
                        <p className="text-sm text-slate-400">RAM-only scenarios that respect governance locks.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {exploreMode && scenarios.length > 0 && (
                            <button
                                onClick={handleReset}
                                className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-xs text-slate-200 hover:bg-white/5"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Reset
                            </button>
                        )}
                        <button
                            onClick={() => {
                                setExploreMode(!exploreMode);
                                if (exploreMode) handleReset();
                            }}
                            className="relative inline-flex h-6 w-12 items-center rounded-full border border-white/20 bg-white/10 transition"
                            style={exploreMode ? { backgroundColor: ACTION_COLOR, borderColor: ACTION_COLOR } : undefined}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    exploreMode ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {hint ? (
                    <div
                        data-guidance-context="global"
                        className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200"
                    >
                        <Lightbulb className="mt-0.5 h-4 w-4" />
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.4em] text-amber-300">Diagnostics Hint</p>
                            <p>{hint}</p>
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-slate-500">Guidance will surface once diagnostics finish.</p>
                )}

                <AnimatePresence initial={false}>
                    {exploreMode && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="space-y-5 pt-2">
                                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                        <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Target Variable</label>
                                        <select
                                            value={selectedColumn}
                                            onChange={(e) => setSelectedColumn(e.target.value)}
                                            className="mt-2 w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="" disabled>Select a column...</option>
                                            {availableColumns.map((col) => (
                                                <option key={col} value={col} className="bg-slate-900">{col}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-slate-400">
                                            <span>Modification</span>
                                            <span className="font-mono text-sm" style={{ color: ACTION_COLOR }}>
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
                                            className="mt-3 w-full"
                                            style={{ accentColor: ACTION_COLOR }}
                                        />
                                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                                            <span>-50%</span>
                                            <span>0%</span>
                                            <span>+50%</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={addScenario}
                                        disabled={!selectedColumn || modificationFactor === 1.0}
                                        className="h-full rounded-2xl border border-dashed border-white/20 px-4 py-3 text-sm uppercase tracking-[0.3em] text-slate-300 transition hover:border-white/40 disabled:opacity-40"
                                    >
                                        <div className="flex h-full flex-col items-center justify-center gap-2">
                                            <Plus className="h-5 w-5" />
                                            Stage Input
                                        </div>
                                    </button>
                                </div>

                                {scenarios.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {scenarios.map((scenario) => {
                                            const pct = ((scenario.modification_factor - 1) * 100).toFixed(0);
                                            const sign = scenario.modification_factor > 1 ? '+' : '';
                                            const isPositive = scenario.modification_factor >= 1;
                                            return (
                                                <div
                                                    key={scenario.target_column}
                                                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-mono ${
                                                        isPositive
                                                            ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                                                            : 'border-rose-400/40 bg-rose-500/10 text-rose-200'
                                                    }`}
                                                >
                                                    <span className="font-sans text-xs uppercase tracking-wide">
                                                        {scenario.target_column}
                                                    </span>
                                                    <span>{sign}{pct}%</span>
                                                    <button
                                                        onClick={() => removeScenario(scenario.target_column)}
                                                        className="rounded-full bg-white/10 p-0.5 hover:bg-white/20"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500">Stage at least one variable to unlock the cockpit.</p>
                                )}

                                <div className="flex flex-col gap-2 pt-1">
                                    <button
                                        onClick={runSimulation}
                                        disabled={scenarios.length === 0 || isSimulating}
                                        className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white shadow-lg transition disabled:opacity-40"
                                        style={!isSimulating ? { backgroundColor: ACTION_COLOR, boxShadow: '0 15px 40px rgba(0,94,184,0.45)' } : { backgroundColor: ACTION_COLOR }}
                                    >
                                        {isSimulating ? (
                                            <>
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                                                Running Scenario
                                            </>
                                        ) : (
                                            <>
                                                <Play className="h-4 w-4" />
                                                Run Simulation
                                            </>
                                        )}
                                    </button>
                                    {scenarios.length === 0 && (
                                        <p className="text-center text-xs text-slate-500">Add at least one modification to activate the cockpit.</p>
                                    )}
                                </div>

                                {error && (
                                    <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                                        {error}
                                    </div>
                                )}

                                {thinkingSteps.length > 0 && (
                                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                        <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400 mb-3">Reasoning Stream</p>
                                        <div className="space-y-2 font-mono text-xs">
                                            {thinkingSteps.map((step) => (
                                                <div key={step} className="flex items-center gap-2 text-slate-200">
                                                    <Activity className=\"h-3.5 w-3.5\" style={{ color: ACTION_COLOR }} />
                                                    <span>{step}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {simulationResult?.delta && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                                    >
                                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                                            <Sliders className=\"h-4 w-4\" style={{ color: ACTION_COLOR }} />
                                            Projected Impact
                                        </div>
                                        {simulationResult.delta.churn_risk && (
                                            <DeltaRow
                                                label="Churn Risk"
                                                original={`${simulationResult.delta.churn_risk.original.toFixed(1)}%`}
                                                simulated={`${simulationResult.delta.churn_risk.simulated.toFixed(1)}%`}
                                                delta={`${simulationResult.delta.churn_risk.delta.toFixed(1)}%`}
                                                improved={simulationResult.delta.churn_risk.delta < 0}
                                            />
                                        )}
                                        {simulationResult.delta.ghost_revenue && (
                                            <DeltaRow
                                                label="Ghost Revenue"
                                                original={simulationResult.delta.ghost_revenue.original}
                                                simulated={simulationResult.delta.ghost_revenue.simulated}
                                                delta={simulationResult.delta.ghost_revenue.delta}
                                                improved={simulationResult.delta.ghost_revenue.delta > 0}
                                            />
                                        )}
                                        {scenarios.length > 0 && (
                                            <div className="pt-3 text-xs text-slate-400">
                                                <p className="uppercase tracking-[0.3em] text-slate-500">Inputs Tested</p>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {scenarios.map((scenario) => {
                                                        const pct = ((scenario.modification_factor - 1) * 100).toFixed(0);
                                                        const sign = scenario.modification_factor > 1 ? '+' : '';
                                                        return (
                                                            <span
                                                                key={`delta-${scenario.target_column}`}
                                                                className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-mono"
                                                            >
                                                                {scenario.target_column}: {sign}{pct}%
                                                            </span>
                                                        );
                                                    })}
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
        </div>
    );
}

function DeltaRow({ label, original, simulated, delta, improved }: { label: string; original: string | number; simulated: string | number; delta: string | number; improved: boolean; }) {
    return (
        <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">{label}</p>
            <div className="flex items-center gap-3 font-mono text-sm">
                <span className="text-slate-300">{original}</span>
                <span className="text-slate-500">→</span>
                <span className="font-bold text-white">{simulated}</span>
                <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                        improved ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'
                    }`}
                >
                    {delta}
                </span>
            </div>
        </div>
    );
}
