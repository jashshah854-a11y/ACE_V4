import React from 'react';
import { motion } from 'framer-motion';

export const ZoneBLoader = () => {
    // Generate random line widths for realistic "paragraph" look
    const lines = [
        "w-3/4", "w-full", "w-5/6", "w-full", "w-4/5", // Para 1
        "w-full", "w-2/3", "w-11/12", "w-full",        // Para 2
        "w-5/6", "w-full", "w-3/4"                     // Para 3
    ];

    return (
        <div className="flex-1 bg-slate-50 dark:bg-[#0a0f16] p-8 md:p-12 overflow-hidden relative">
            <div className="max-w-[800px] mx-auto space-y-8">

                {/* Header Section */}
                <div className="space-y-4 mb-12">
                    <motion.div
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="h-2 w-24 bg-blue-500/20 rounded mb-4"
                    />
                    <motion.div
                        animate={{ opacity: [0.5, 0.8, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2.5 }}
                        className="h-8 w-2/3 bg-slate-200 dark:bg-slate-800 rounded"
                    />
                    <motion.div
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ repeat: Infinity, duration: 2.5, delay: 0.2 }}
                        className="h-8 w-1/2 bg-slate-200 dark:bg-slate-800 rounded"
                    />
                </div>

                {/* Narrative Body */}
                <div className="space-y-3">
                    {lines.map((width, idx) => (
                        <div key={idx} className={`${idx === 5 || idx === 9 ? 'mb-8' : ''}`}>
                            <motion.div
                                className={`h-4 bg-slate-200 dark:bg-slate-800/50 rounded ${width}`}
                                initial={{ opacity: 0.1 }}
                                animate={{ opacity: [0.1, 0.3, 0.1] }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 2,
                                    delay: idx * 0.1, // Stagger effect
                                    ease: "easeInOut"
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Interactive Claim Placeholder */}
                <div className="mt-12 p-6 border border-slate-200 dark:border-slate-800/50 rounded-lg bg-slate-50 dark:bg-slate-900/30">
                    <div className="flex justify-between items-center">
                        <div className="space-y-2 flex-1">
                            <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                            <div className="h-3 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
                        </div>
                        <motion.div
                            animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.5, 0.2] }}
                            transition={{ repeat: Infinity, duration: 3 }}
                            className="h-10 w-10 rounded-full bg-blue-500/10"
                        />
                    </div>
                </div>
            </div>

            {/* Shimmer Overlay */}
            <motion.div
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent"
                animate={{ translateX: ['-100%', '200%'] }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                style={{ skewX: -20 }}
            />
        </div>
    );
};
