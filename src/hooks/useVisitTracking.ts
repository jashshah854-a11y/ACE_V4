import { useEffect, useState } from 'react';

/**
 * Phase 5.2: Visit Tracking Hook
 * 
 * Detects return visits to enable outcome tagging timing.
 * Stores visit count in sessionStorage.
 */

const VISIT_COUNT_PREFIX = 'ace_visit_count_';

export function useVisitTracking(runId?: string) {
    const [visitCount, setVisitCount] = useState<number>(0);
    const [isReturnVisit, setIsReturnVisit] = useState<boolean>(false);

    useEffect(() => {
        if (!runId || typeof window === 'undefined') return;

        const key = `${VISIT_COUNT_PREFIX}${runId}`;
        const storedCount = sessionStorage.getItem(key);
        const currentCount = storedCount ? parseInt(storedCount, 10) : 0;
        const newCount = currentCount + 1;

        sessionStorage.setItem(key, newCount.toString());
        setVisitCount(newCount);
        setIsReturnVisit(newCount > 1);
    }, [runId]);

    return { visitCount, isReturnVisit };
}
