import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function HeroSection() {
    const navigate = useNavigate();

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0F1115]">
            {/* Animated Background */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 bg-gradient-to-br from-[#2DD4BF]/10 via-transparent to-[#3B82F6]/10" />
                {/* Neural network nodes */}
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-[#2DD4BF] rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                            opacity: [0.2, 0.8, 0.2],
                            scale: [1, 1.5, 1],
                        }}
                        transition={{
                            duration: 3 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                        }}
                    />
                ))}
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 mb-8"
                >
                    <Sparkles className="w-4 h-4 text-[#2DD4BF]" />
                    <span className="text-sm font-mono text-[#E2E4E9]/80">
                        Evidence-led analysis
                    </span>
                </motion.div>

                {/* Headline */}
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="text-6xl md:text-7xl lg:text-8xl font-bold text-[#E2E4E9] mb-6 leading-[1.1]"
                    style={{ fontFamily: 'Inter Tight, sans-serif' }}
                >
                    Turn raw data into{' '}
                    <span className="bg-gradient-to-r from-[#2DD4BF] to-[#3B82F6] bg-clip-text text-transparent">
                        evidence-led decisions
                    </span>
                </motion.h1>

                {/* Subtext */}
                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.4 }}
                    className="text-xl md:text-2xl text-[#E2E4E9]/70 mb-12 max-w-3xl mx-auto"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                >
                    Your data is messy. ACE makes it legible.
                </motion.p>

                {/* CTA Button */}
                <motion.button
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.6 }}
                    onClick={() => navigate('/upload')}
                    className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#2DD4BF] to-[#3B82F6] text-white text-lg font-semibold rounded-xl overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(45,212,191,0.4)]"
                >
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#2DD4BF] to-[#3B82F6] opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />

                    <span className="relative z-10">Upload your data</span>
                    <ArrowRight className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>

                {/* Trust indicator */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.8 }}
                    className="mt-8 text-sm font-mono text-[#E2E4E9]/50"
                >
                    Evidence-first. Uncertainty visible. No bluffing.
                </motion.p>
            </div>

            {/* Scroll indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-6 h-10 border-2 border-[#E2E4E9]/30 rounded-full flex items-start justify-center p-2"
                >
                    <div className="w-1 h-2 bg-[#2DD4BF] rounded-full" />
                </motion.div>
            </motion.div>
        </section>
    );
}
