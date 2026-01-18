
import React, { createContext, useContext, useState, useEffect } from 'react';

export type NarrativeMode = 'executive' | 'analyst' | 'expert';

interface NarrativeContextType {
    mode: NarrativeMode;
    setMode: (mode: NarrativeMode) => void;
}

const NarrativeContext = createContext<NarrativeContextType | undefined>(undefined);

export function NarrativeProvider({ children }: { children: React.ReactNode }) {
    // Initialize from localStorage if available, default to 'executive'
    const [mode, setModeState] = useState<NarrativeMode>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('ace_narrative_mode');
            return (saved as NarrativeMode) || 'executive';
        }
        return 'executive';
    });

    const setMode = (newMode: NarrativeMode) => {
        setModeState(newMode);
        localStorage.setItem('ace_narrative_mode', newMode);
    };

    return (
        <NarrativeContext.Provider value={{ mode, setMode }}>
            {children}
        </NarrativeContext.Provider>
    );
}

export function useNarrative() {
    const context = useContext(NarrativeContext);
    if (context === undefined) {
        throw new Error('useNarrative must be used within a NarrativeProvider');
    }
    return context;
}
