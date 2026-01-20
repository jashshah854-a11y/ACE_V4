import { useCallback, useState, useEffect } from "react";
import { API_BASE } from "@/lib/api-client";

/**
 * Phase 5.1: Decision Capture Hook
 * 
 * Silently tracks executive interactions with Action Items,
 * Supporting Evidence, and Trust signals for contextual memory.
 * 
 * GUARDRAIL 1: Transparency Disclosure
 * No tracking occurs until user acknowledges one-time disclosure.
 * 
 * Usage: const { track, needsDisclosure, acknowledgeDisclosure } = useDecisionTracking(runId);
 */

export type TouchType =
    | 'action_view'
    | 'action_click'
    | 'evidence_expand'
    | 'trust_inspect'
    | 'reflection_dismiss';

interface DecisionTouchContext {
    narrative_mode?: string;
    scroll_depth?: number;
    time_on_page?: number;
    [key: string]: any;
}

const DISCLOSURE_KEY = 'ace_decision_tracking_acknowledged';

export function useDecisionTracking(runId?: string, userId?: string) {
    const sessionId = typeof window !== 'undefined'
        ? sessionStorage.getItem('session_id') || crypto.randomUUID()
        : 'ssr';

    // GUARDRAIL 1: Check if disclosure has been acknowledged
    const [needsDisclosure, setNeedsDisclosure] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return !sessionStorage.getItem(DISCLOSURE_KEY);
    });

    // Store sessionId for future calls
    useEffect(() => {
        if (typeof window !== 'undefined' && !sessionStorage.getItem('session_id')) {
            sessionStorage.setItem('session_id', sessionId);
        }
    }, [sessionId]);

    const acknowledgeDisclosure = useCallback(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem(DISCLOSURE_KEY, 'true');
            setNeedsDisclosure(false);
        }
    }, []);

    const track = useCallback(
        async (touchType: TouchType, targetId: string, context?: DecisionTouchContext) => {
            // GUARDRAIL 1: Block tracking until disclosure acknowledged
            if (needsDisclosure) {
                return; // Silent fail - no tracking if not acknowledged
            }

            // Silent tracking - no user feedback
            if (!runId) return;

            try {
                const payload = {
                    run_id: runId,
                    user_id: userId,
                    session_id: sessionId,
                    touch_type: touchType,
                    target_id: targetId,
                    context: context || {},
                };

                // Fire and forget - don't block UI
                fetch(`${API_BASE}/api/decision-touch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }).catch(() => {
                    // Silent failure - tracking shouldn't break UX
                });
            } catch (error) {
                // Silent failure
            }
        },
        [runId, userId, sessionId, needsDisclosure]
    );

    return {
        track,
        sessionId,
        needsDisclosure,
        acknowledgeDisclosure
    };
}
