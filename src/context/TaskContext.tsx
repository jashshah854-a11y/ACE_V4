import { createContext, ReactNode, useContext, useState, useCallback, useMemo } from "react";

interface TaskContractState {
  primaryQuestion?: string;
  outOfScopeDimensions: string[];
}

interface TaskContextValue extends TaskContractState {
  updateTaskContract: (payload: Partial<TaskContractState>) => void;
  resetTaskContract: () => void;
}

const DEFAULT_STATE: TaskContractState = {
  primaryQuestion: undefined,
  outOfScopeDimensions: [],
};

const STORAGE_KEY = "ace_task_contract";

const TaskContext = createContext<TaskContextValue>({
  ...DEFAULT_STATE,
  updateTaskContract: () => undefined,
  resetTaskContract: () => undefined,
});

export function TaskProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TaskContractState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return DEFAULT_STATE; // If nothing stored, return default
      }

      let parsed: any;
      try {
        parsed = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse task contract from localStorage:', e);
        localStorage.removeItem(STORAGE_KEY); // Clear corrupted data
        return DEFAULT_STATE; // Return default if parsing fails
      }

      // Original validation logic, applied to the parsed object
      return {
        primaryQuestion: typeof parsed?.primaryQuestion === "string" ? parsed.primaryQuestion : undefined,
        outOfScopeDimensions: Array.isArray(parsed?.outOfScopeDimensions)
          ? parsed.outOfScopeDimensions.filter((entry: unknown): entry is string => typeof entry === "string")
          : [],
      };
    } catch (error) {
      console.warn("Failed to restore task contract context", error);
    }
    return DEFAULT_STATE;
  });

  const persist = useCallback((next: TaskContractState) => {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn("Failed to persist task contract context", error);
    }
  }, []);

  const updateTaskContract = useCallback((payload: Partial<TaskContractState>) => {
    persist({
      primaryQuestion: payload.primaryQuestion ?? state.primaryQuestion,
      outOfScopeDimensions: payload.outOfScopeDimensions ?? state.outOfScopeDimensions,
    });
  }, [persist, state.primaryQuestion, state.outOfScopeDimensions]);

  const resetTaskContract = useCallback(() => {
    persist(DEFAULT_STATE);
  }, [persist]);

  const value = useMemo<TaskContextValue>(() => ({
    ...state,
    updateTaskContract,
    resetTaskContract,
  }), [state, updateTaskContract, resetTaskContract]);

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTaskContext() {
  return useContext(TaskContext);
}
