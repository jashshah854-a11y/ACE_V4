import React, { useEffect, useRef, useState } from 'react';
import { X, Terminal, RefreshCw, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TerminalOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    logs?: string[];
    status?: string;
}

export const TerminalOverlay = ({ isOpen, onClose, logs = [], status = "CONNECTED" }: TerminalOverlayProps) => {
    const bottomRef = useRef<HTMLDivElement>(null);
    const [simulatedLogs, setSimulatedLogs] = useState<string[]>([
        "> ESTABLISHING SECURE CONNECTION...",
        "> NEURAL LINK ACTIVE",
        "> HANDSHAKE COMPLETE [200 OK]",
        "> STREAMING TELEMETRY..."
    ]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [simulatedLogs, logs, isOpen]);

    // Simulation Effect (remove when real backend is connected)
    useEffect(() => {
        if (!isOpen) return;

        const interval = setInterval(() => {
            const randomLog = [
                `[Orchestrator] Validating step context ${Math.random().toString(36).substring(7)}...`,
                `[Fabricator] Narrative generation: ${Math.floor(Math.random() * 100)}% complete`,
                `[Sentry] Analyzing vector embeddings...`,
                `[System] Memory usage: ${Math.floor(300 + Math.random() * 200)}MB`,
                `[Network] Latency: ${Math.floor(Math.random() * 50)}ms`
            ];
            const msg = randomLog[Math.floor(Math.random() * randomLog.length)];
            setSimulatedLogs(prev => [...prev.slice(-50), `> ${new Date().toISOString().split('T')[1].slice(0, -1)} ${msg}`]);
        }, 800);

        return () => clearInterval(interval);
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                >
                    <div className="w-full max-w-4xl h-[600px] bg-black border border-green-500/30 rounded-lg shadow-[0_0_50px_rgba(34,197,94,0.1)] flex flex-col font-mono text-sm overflow-hidden">

                        {/* Terminal Header */}
                        <div className="flex items-center justify-between px-4 py-2 bg-green-900/10 border-b border-green-500/30">
                            <div className="flex items-center gap-2 text-green-500">
                                <Terminal className="w-4 h-4" />
                                <span className="font-bold tracking-wider">ACE_V4_KERNEL_DEBUG</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-xs text-green-400/60">
                                    <Cpu className="w-3 h-3 animate-pulse" />
                                    <span>{status}</span>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="text-green-500/60 hover:text-green-400 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Logs Area */}
                        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs md:text-sm space-y-1 bg-black/90 text-green-500/80 custom-scrollbar">
                            {/* Combined simulated and real logs */}
                            {[...simulatedLogs, ...logs].map((log, i) => (
                                <div key={i} className="break-all hover:bg-green-500/10 px-1 rounded">
                                    <span className="opacity-50 mr-2">$</span>
                                    {log}
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input Line (Fake) */}
                        <div className="p-2 border-t border-green-500/30 bg-black text-green-500 flex items-center gap-2">
                            <span className="animate-pulse">_</span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
