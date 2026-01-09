import React, { useState } from 'react';
import { Shield, Brain, PenTool, Layout, ChevronRight, Menu, Terminal as TerminalIcon } from 'lucide-react';
import { NarrativeStream } from './NarrativeStream';
import EvidenceRail from '../report/EvidenceRail'; // Importing from legacy location for now
import { useReportData } from '@/hooks/useReportData';
import { ZoneALoader } from './skeletons/ZoneALoader';
import { ZoneBLoader } from './skeletons/ZoneBLoader';
import { ZoneCLoader } from './skeletons/ZoneCLoader';
import { TerminalOverlay } from './TerminalOverlay';

// --- ZONE A: The Neural Spine (Navigation) ---
interface NeuralSpineProps {
    runId: string;
    status: string;
    activeAgent: string;
    onAgentSelect: (agent: string) => void;
    onOpenTerminal: () => void;
}

const NeuralSpine = ({ runId, status, activeAgent, onAgentSelect, onOpenTerminal }: NeuralSpineProps) => {
    const agents = [
        { id: 'all', label: 'Full Brief', icon: Layout },
        { id: 'sentry', label: 'Sentry', icon: Shield },
        { id: 'analyst', label: 'Analyst', icon: Brain },
        { id: 'fabricator', label: 'Fabricator', icon: PenTool },
        { id: 'expositor', label: 'Expositor', icon: Layout },
    ];

    return (
        <div className="w-[260px] flex-shrink-0 bg-slate-950 border-r border-slate-800 h-screen flex flex-col">
            {/* Mission Control Header */}
            <div className="p-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className={`w - 3 h - 3 rounded - full ${status === 'completed' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-blue-500 animate-pulse'} `} />
                    <div>
                        <p className="text-xs text-slate-500 font-mono">MISSION CONTROL</p>
                        <p className="text-sm font-mono text-slate-300 truncate w-[160px]" title={runId}>{runId}</p>
                    </div>
                </div>
            </div>

            {/* Agent Roster */}
            <div className="flex-1 py-6 space-y-1">
                <p className="px-6 text-xs text-slate-600 font-mono mb-4 uppercase tracking-wider">Neural Agents</p>
                {agents.map((agent) => (
                    <button
                        key={agent.id}
                        onClick={() => onAgentSelect(agent.id)}
                        className={`w - full px - 6 py - 3 flex items - center gap - 3 text - sm transition - colors
                            ${activeAgent === agent.id
                                ? 'bg-slate-900 text-white border-l-2 border-blue-500'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                            } `}
                    >
                        <agent.icon className="w-4 h-4" />
                        <span className="font-medium">{agent.label}</span>
                        {activeAgent === agent.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </button>
                ))}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-800 flex justify-between items-center">
                <p className="text-xs text-slate-600 font-mono">ACE V4.0.0 // SINGULARITY</p>
                {/* Terminal Toggle */}
                <button
                    onClick={onOpenTerminal}
                    className="p-1 hover:bg-slate-900 rounded text-slate-600 hover:text-green-500 transition-colors"
                    title="Open Kernel Debugger"
                >
                    <TerminalIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

// --- MAIN CANVAS COMPONENT ---
interface IntelligenceCanvasProps {
    runId: string;
}

export default function IntelligenceCanvas({ runId }: IntelligenceCanvasProps) {
    const { data, isLoading, error } = useReportData(runId);
    const [activeAgent, setActiveAgent] = useState('all');
    const [isEvidenceOpen, setIsEvidenceOpen] = useState(false); // Collapsed by default
    const [activeEvidenceType, setActiveEvidenceType] = useState<'business_pulse' | 'predictive_drivers' | null>(null);
    const [isTerminalOpen, setIsTerminalOpen] = useState(false);

    // Filter logic: In a real app, we'd parse the markdown and split by agent.
    // For now, we just pass the full content but pretend to filter.
    const displayContent = data?.reportContent || '';

    const handleClaimClick = (type: 'business_pulse' | 'predictive_drivers' | null) => {
        setActiveEvidenceType(type);
        setIsEvidenceOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex h-screen w-full overflow-hidden bg-slate-900">
                {/* ZONE A SKELETON */}
                <ZoneALoader />

                {/* ZONE B SKELETON */}
                <ZoneBLoader />

                {/* ZONE C SKELETON (Hidden on mobile to match responsive behavior) */}
                <div className="hidden lg:block border-l border-slate-800">
                    <ZoneCLoader />
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex h-screen bg-slate-950 items-center justify-center">
                <div className="max-w-md text-center">
                    <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl text-white font-mono mb-2">SIGNAL LOST</h1>
                    <p className="text-slate-400">{error?.message || "Report unavailable"}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-slate-900">
            {/* ZONE A: The Neural Spine */}
            <NeuralSpine
                runId={runId}
                status={data.status}
                activeAgent={activeAgent}
                onAgentSelect={setActiveAgent}
                onOpenTerminal={() => setIsTerminalOpen(true)}
            />

            {/* ZONE B: The Narrative Stream */}
            <div className="flex-1 overflow-y-auto no-scrollbar relative">
                <NarrativeStream
                    content={displayContent}
                    onClaimClick={handleClaimClick}
                />
            </div>

            {/* ZONE C: The Evidence Lab (Collapsible) */}
            {/* 
                We reuse EvidenceRail. In V4 spec, it's a permanent sidebar. 
                For now we keep the 'Overlay' style but treating it as a sidebar might require CSS tweaks 
                to IntelligenceCanvas to shrink Zone B when C is open if we want "Push" effect.
                Given the spec says "Fixed-Viewport Triptych", a Push effect is better than Overlay.
                But EvidenceRail is currently coded fixed right-0.
                Let's use it as is (Overlay) for Phase 1 of V4, or wrap it.
            */}
            <EvidenceRail
                isOpen={isEvidenceOpen}
                onClose={() => setIsEvidenceOpen(false)}
                activeEvidence={activeEvidenceType}
                data={data}
                runId={runId}
            />

            {/* Toggle Button for Zone C if closed */}
            {!isEvidenceOpen && (
                <button
                    onClick={() => setIsEvidenceOpen(true)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 bg-slate-800 p-2 rounded-l-lg text-slate-400 hover:text-white transition-colors shadow-lg z-30"
                    title="Open Evidence Lab"
                >
                    <Menu className="w-6 h-6" />
                </button>
            )}

            {/* TERMINAL OVERLAY */}
            <TerminalOverlay
                isOpen={isTerminalOpen}
                onClose={() => setIsTerminalOpen(false)}
                status={data?.status === 'completed' ? 'SYSTEM_IDLE' : 'PROCESSING'}
            />
        </div>
    );
}
