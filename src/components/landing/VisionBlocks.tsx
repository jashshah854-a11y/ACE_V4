import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const visionStatements = [
    "Dashboards show facts. ACE shows meaning.",
    "Others report. ACE reasons.",
    "We do not guess. We ground every claim in evidence.",
];

export function VisionBlocks() {
    return (
        <section className="relative py-32 bg-[#0F1115]">
            <div className="max-w-6xl mx-auto px-6">
                <div className="space-y-32">
                    {visionStatements.map((statement, index) => (
                        <VisionBlock key={index} statement={statement} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function VisionBlock({ statement, index }: { statement: string; index: number }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 60 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
            transition={{
                duration: 1.2,
                delay: 0.3,
                ease: [0.16, 1, 0.3, 1], // Smooth easing
            }}
            className="relative"
        >
            {/* Statement */}
            <h2
                className="text-4xl md:text-6xl lg:text-7xl font-bold text-[#E2E4E9] leading-[1.2]"
                style={{ fontFamily: 'Inter Tight, sans-serif' }}
            >
                {statement.split('. ').map((part, i, arr) => (
                    <span key={i}>
                        {i === 1 ? (
                            <span className="bg-gradient-to-r from-[#2DD4BF] to-[#3B82F6] bg-clip-text text-transparent">
                                {part}
                            </span>
                        ) : (
                            part
                        )}
                        {i < arr.length - 1 && '. '}
                    </span>
                ))}
            </h2>

            {/* Accent line */}
            <motion.div
                initial={{ scaleX: 0 }}
                animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
                transition={{ duration: 1, delay: 0.6 }}
                className="h-1 w-32 bg-gradient-to-r from-[#2DD4BF] to-[#3B82F6] mt-8 origin-left"
            />

            {/* Number indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="absolute -left-16 top-0 text-8xl font-bold text-[#E2E4E9]/5 font-mono"
            >
                {String(index + 1).padStart(2, '0')}
            </motion.div>
        </motion.div>
    );
}
