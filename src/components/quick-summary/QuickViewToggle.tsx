/**
 * Quick View Toggle Component
 * 
 * Allows users to switch between Full Report and Quick View modes.
 */

import React from 'react';
import { AnalysisMode } from '@/types/QuickSummaryTypes';

interface QuickViewToggleProps {
    mode: AnalysisMode;
    onModeChange: (mode: AnalysisMode) => void;
}

export function QuickViewToggle({ mode, onModeChange }: QuickViewToggleProps) {
    return (
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={mode === 'summary'}
                    onChange={(e) => onModeChange(e.target.checked ? 'summary' : 'full')}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                    Quick View Mode
                </span>
            </label>

            <div className="flex-1">
                <p className="text-xs text-gray-500">
                    {mode === 'summary'
                        ? '⚡ Fast analysis with basic stats and correlations'
                        : '📊 Full analysis with deep insights and recommendations'
                    }
                </p>
            </div>

            {mode === 'summary' && (
                <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded">
                    Quick
                </span>
            )}
        </div>
    );
}
