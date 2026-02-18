
import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, FileText, Sparkles } from 'lucide-react';
import { ToneProfile } from '@/types/StoryTypes';
import { cn } from '@/lib/utils';

interface ToneSelectorProps {
    currentTone: ToneProfile;
    onToneChange: (tone: ToneProfile) => void;
    className?: string;
}

export function ToneSelector({ currentTone, onToneChange, className }: ToneSelectorProps) {
    const tones: { id: ToneProfile; label: string; icon: React.ReactNode }[] = [
        {
            id: 'formal',
            label: 'Formal',
            icon: <FileText className="w-4 h-4" />
        },
        {
            id: 'conversational',
            label: 'Conversational',
            icon: <MessageSquare className="w-4 h-4" />
        },
        {
            id: 'playful',
            label: 'Playful',
            icon: <Sparkles className="w-4 h-4" />
        }
    ];

    return (
        <div className={cn("flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1 rounded-lg border border-gray-200/50", className)}>
            {tones.map((tone) => (
                <button
                    key={tone.id}
                    onClick={() => onToneChange(tone.id)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                        currentTone === tone.id
                            ? "bg-white text-teal-600 shadow-sm ring-1 ring-gray-200"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                    )}
                >
                    {tone.icon}
                    <span>{tone.label}</span>
                    {currentTone === tone.id && (
                        <motion.div
                            layoutId="activeTone"
                            className="absolute inset-0 bg-white rounded-md shadow-sm ring-1 ring-gray-200 -z-10"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                </button>
            ))}
        </div>
    );
}
