import React from 'react';
import { motion } from 'framer-motion';

export const ZoneCLoader = () => {
    return (
        <div className="w-[350px] shrinking-0 border-l border-slate-800 bg-slate-950 flex flex-col relative overflow-hidden">

            {/* Laser Scan Line */}
            <motion.div
                className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.5)] z-20"
                animate={{ top: ['0%', '100%'] }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            />

            <div className="p-4 space-y-6 relative z-10">

                {/* Metric Cards Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-slate-900/50 border border-slate-800 p-3 rounded h-24 flex flex-col justify-between">
                            <div className="h-2 w-12 bg-slate-800 rounded" />
                            <motion.div
                                animate={{ width: ["40%", "80%", "40%"] }}
                                transition={{ repeat: Infinity, duration: 4, delay: i * 0.2 }}
                                className="h-6 bg-slate-800 rounded w-2/3"
                            />
                        </div>
                    ))}
                </div>

                {/* Chart Skeleton */}
                <div className="bg-slate-900/30 border border-slate-800 rounded p-4 h-64 relative">
                    <div className="h-3 w-24 bg-slate-800 rounded mb-8" />

                    {/* Bars */}
                    <div className="flex items-end justify-between h-40 px-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <motion.div
                                key={i}
                                className="w-8 bg-slate-800 rounded-t"
                                animate={{ height: ["20%", "60%", "30%"] }}
                                transition={{ repeat: Infinity, duration: 2, delay: i * 0.1 }}
                            />
                        ))}
                    </div>
                </div>

                {/* Data List */}
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                            <div className="h-2 w-32 bg-slate-800/50 rounded" />
                            <div className="h-2 w-12 bg-slate-800/50 rounded" />
                        </div>
                    ))}
                </div>

            </div>

            {/* Matrix Background Effect */}
            <div className="absolute inset-0 opacity-5 pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(32, 255, 100, .3) 25%, rgba(32, 255, 100, .3) 26%, transparent 27%, transparent 74%, rgba(32, 255, 100, .3) 75%, rgba(32, 255, 100, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(32, 255, 100, .3) 25%, rgba(32, 255, 100, .3) 26%, transparent 27%, transparent 74%, rgba(32, 255, 100, .3) 75%, rgba(32, 255, 100, .3) 76%, transparent 77%, transparent)', backgroundSize: '30px 30px' }}>
            </div>

        </div>
    );
};
