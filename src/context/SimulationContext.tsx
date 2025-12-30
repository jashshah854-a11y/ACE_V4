
import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

// --- Types & Schemas ---

export interface SimulationModifiers {
    exclude_outliers?: boolean;
    filter_segment?: string; // e.g., "churn_risk"
    time_frame?: { start: string; end: string };
    // Add more modifiers as the engine expands
}

export interface SimulationState {
    base_run_id: string; // ID of the original report
    active_modifiers: SimulationModifiers;
    comparison_mode: boolean; // Triggers Split-View UI
    simulated_run_id?: string; // If null, we are in "Draft" simulation
    feedback_history: Feedback[];
}

export interface AnalystResponse {
    text_content: string;
    chart_config?: any; // To be typed strictly with new chart library
    confidence_score: number;
    evidence_ref?: string;
}

export interface Feedback {
    target_id: string;
    target_type: 'insight' | 'query_response';
    rating: 'positive' | 'negative';
    correction?: string;
    timestamp: number;
}

export interface QueryThread {
    id: string;
    target_data_point: string; // ID of row, segment, or chart clicked
    user_intent: string; // "Why is this segment risky?"
    status: 'thinking' | 'answered' | 'error';
    analyst_response?: AnalystResponse;
    timestamp: number;
}

interface SimulationContextType {
    // State
    simulationState: SimulationState;
    queryThreads: QueryThread[];

    // Actions
    initializeSimulation: (baseRunId: string) => void;
    updateModifiers: (modifiers: Partial<SimulationModifiers>) => void;
    toggleComparisonMode: (enabled: boolean) => void;
    submitFeedback: (feedback: Omit<Feedback, 'timestamp'>) => void;

    // Query Logic
    startQuery: (targetDataPoint: string, userIntent: string) => Promise<void>;

    // Selectors
    isSimulating: boolean;
}

// --- Context Definition ---

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

// --- Provider Component ---

export function SimulationProvider({ children }: { children: ReactNode }) {
    const [simulationState, setSimulationState] = useState<SimulationState>({
        base_run_id: "",
        active_modifiers: {},
        comparison_mode: false,
        feedback_history: [],
    } as SimulationState);

    const [queryThreads, setQueryThreads] = useState<QueryThread[]>([]);

    const initializeSimulation = useCallback((baseRunId: string) => {
        setSimulationState({
            base_run_id: baseRunId,
            active_modifiers: {},
            comparison_mode: false,
            feedback_history: [],
        });
        setQueryThreads([]);
    }, []);

    const updateModifiers = useCallback((newModifiers: Partial<SimulationModifiers>) => {
        setSimulationState(prev => ({
            ...prev,
            active_modifiers: { ...prev.active_modifiers, ...newModifiers },
            // Automatically enable comparison mode if any modifier is active
            comparison_mode: Object.keys(newModifiers).length > 0 || prev.comparison_mode
        }));

        // TODO: Trigger "Fabricator" re-calculation here (Phase 2)
    }, []);

    const submitFeedback = useCallback((feedback: Omit<Feedback, 'timestamp'>) => {
        const newFeedback: Feedback = { ...feedback, timestamp: Date.now() };
        setSimulationState(prev => ({
            ...prev,
            feedback_history: [...(prev.feedback_history || []), newFeedback]
        }));
        console.log("Feedback submitted:", newFeedback); // Placeholder for API call
    }, []);

    const toggleComparisonMode = useCallback((enabled: boolean) => {
        setSimulationState(prev => ({ ...prev, comparison_mode: enabled }));
    }, []);

    const startQuery = useCallback(async (targetDataPoint: string, userIntent: string) => {
        const newThreadId = crypto.randomUUID();

        // 1. Add thread in "Thinking" state
        const newThread: QueryThread = {
            id: newThreadId,
            target_data_point: targetDataPoint,
            user_intent: userIntent,
            status: 'thinking',
            timestamp: Date.now()
        };

        setQueryThreads(prev => [...prev, newThread]);

        // 2. Mock API Call (Replace with real backend call in Phase 1 Implementation)
        try {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            const mockResponse: AnalystResponse = {
                text_content: `I analyzed the data point '${targetDataPoint}'. The primary driver appears to be high volatility in the Q3 sector.`,
                confidence_score: 0.88,
                evidence_ref: "ev_mock_123"
            };

            setQueryThreads(prev => prev.map(t =>
                t.id === newThreadId
                    ? { ...t, status: 'answered', analyst_response: mockResponse }
                    : t
            ));
        } catch (error) {
            console.error("Query failed", error);
            setQueryThreads(prev => prev.map(t =>
                t.id === newThreadId
                    ? { ...t, status: 'error' }
                    : t
            ));
        }
    }, []);

    const isSimulating = Object.keys(simulationState.active_modifiers).length > 0;

    return (
        <SimulationContext.Provider value={{
            simulationState,
            queryThreads,
            initializeSimulation,
            updateModifiers,
            toggleComparisonMode,
            submitFeedback,
            startQuery,
            isSimulating
        }}>
            {children}
        </SimulationContext.Provider>
    );
}

// --- Hook ---

export function useSimulation() {
    const context = useContext(SimulationContext);
    if (context === undefined) {
        throw new Error("useSimulation must be used within a SimulationProvider");
    }
    return context;
}
