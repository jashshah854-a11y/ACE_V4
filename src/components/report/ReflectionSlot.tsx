import React, { useState } from 'react';

interface ReflectionProps {
    text: string;
    onDismiss: () => void;
}

export const ReflectionSlot: React.FC<ReflectionProps> = ({ text, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible || !text) return null;

    const handleDismiss = () => {
        setIsVisible(false);
        onDismiss();
    };

    return (
        <div className="mt-8 border-t border-gray-100 pt-6 animate-fade-in">
            <div className="flex items-start justify-between group">
                <div className="flex gap-3">
                    <div className="w-1 h-1 rounded-full bg-ace-purple/30 mt-2.5 shrink-0" />
                    <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-2xl selection:bg-ace-purple/10">
                        {text}
                    </p>
                </div>

                <button
                    onClick={handleDismiss}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50 bg-transparent border-none cursor-pointer"
                    aria-label="Dismiss reflection"
                >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.5 3.5L3.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>
        </div>
    );
};
