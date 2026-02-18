import React from 'react';
import { motion } from 'framer-motion';

export const ZoneALoader = () => {
    return (
        <div className="w-16 md:w-20 border-r border-slate-800 bg-slate-950 flex flex-col items-center py-6 gap-8 z-20 relative">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2 w-full px-2">
                    <div className="relative">
                        {/* Pulsing Outer Ring */}
                        <motion.div
                            animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 2, delay: i * 0.2 }}
                            className="absolute inset-0 rounded-full bg-teal-500/20 blur-sm"
                        />
                        {/* Core Node */}
                        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center relative z-10">
                            <motion.div
                                animate={{ opacity: [0.2, 0.5, 0.2] }}
                                transition={{ repeat: Infinity, duration: 2, delay: i * 0.2 }}
                                className="w-4 h-4 rounded-full bg-slate-700"
                            />
                        </div>
                    </div>

                    {/* Label Line */}
                    <motion.div
                        animate={{ width: ["30%", "60%", "30%"], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ repeat: Infinity, duration: 3, delay: i * 0.3 }}
                        className="h-1 bg-slate-800 rounded-full"
                    />
                </div>
            ))}

            {/* Connecting Spine Line - Shimmering */}
            <div className="absolute top-10 bottom-10 left-1/2 w-px -ml-[0.5px] bg-slate-900 -z-10 overflow-hidden">
                <motion.div
                    className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-transparent via-teal-500/30 to-transparent"
                    animate={{ top: ['-100%', '200%'] }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                />
            </div>
        </div>
    );
};
