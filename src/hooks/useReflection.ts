import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const API_BASE = 'http://localhost:8000'; // Or generic config

interface ReflectionData {
    id: string;
    reflection_text: string;
    display_location: string;
}

export const useReflection = (runId: string) => {
    const [reflection, setReflection] = useState<ReflectionData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!runId) return;

        const fetchReflection = async () => {
            setLoading(true);
            try {
                // 1. Get/Create Anonymous User ID
                let userId = localStorage.getItem('ace_user_id');
                if (!userId) {
                    userId = uuidv4();
                    localStorage.setItem('ace_user_id', userId);
                }

                // 2. Call Internal Generator Endpoint
                // Note: In prod this would be hidden/gatewayed, but for ACE V4 internal logic this is fine.
                const response = await fetch(`${API_BASE}/api/internal/generate-reflections`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        run_id: runId,
                        user_id: userId
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'generated' && data.reflection) {
                        setReflection(data.reflection);
                    } else {
                        setReflection(null);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch reflection:', error);
            } finally {
                setLoading(false);
            }
        };

        // Delay slightly to not block critical render (Reflection is low priority)
        const timer = setTimeout(fetchReflection, 2000);
        return () => clearTimeout(timer);
    }, [runId]);

    const dismissReflection = () => {
        // In strict Phase 5.3, we might tell backend about dismissal?
        // Reflection model has 'dismissed' field.
        // For V1, local dismiss is visually sufficient, but backend needs to know to burn the pattern.
        // TODO: Add backend dismiss endpoint? 
        // Plan said "If dismissed once... never shown again."
        // We'll effectively hide it now.
        setReflection(null);
    };

    return { reflection, loading, dismissReflection };
};
