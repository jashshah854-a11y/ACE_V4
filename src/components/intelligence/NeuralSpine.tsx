import { useMemo } from "react";
import { cn } from "@/lib/utils";

export interface AgentExecution {
    name: string;
    status: "pending" | "running" | "complete" | "failed";
    duration?: number;  // seconds
    insights_count?: number;
}

interface NeuralSpineProps {
    agents: AgentExecution[];
    onAgentClick?: (agentName: string) => void;
    className?: string;
}

/**
 * Neural Spine - Agent Execution Timeline
 * 
 * Left panel of the Triptych Layout showing which agents ran
 * and their execution status. Part of the "thinking process" visualization.
 */
export function NeuralSpine({ agents, onAgentClick, className }: NeuralSpineProps) {
    // Calculate overall pipeline progress
    const progress = useMemo(() => {
        if (agents.length === 0) return 0;
        const completed = agents.filter(a => a.status === "complete").length;
        return Math.round((completed / agents.length) * 100);
    }, [agents]);

    return (
        <aside className={cn("neural-spine h-full", className)}>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                        Neural Spine
                    </h2>
                    <p className="text-xs text-text-muted mt-1">
                        Agent execution timeline
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Pipeline Progress</span>
                        <span className="text-text-primary font-mono">{progress}%</span>
                    </div>
                    <div className="h-1 bg-midnight rounded-full overflow-hidden">
                        <div
                            className="h-full bg-neural-blue transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Agent Cards */}
                <div className="space-y-3">
                    {agents.length === 0 ? (
                        <div className="text-xs text-text-muted font-mono">
                            No agents executed yet
                        </div>
                    ) : (
                        agents.map((agent) => (
                            <AgentCard
                                key={agent.name}
                                agent={agent}
                                onClick={() => onAgentClick?.(agent.name)}
                            />
                        ))
                    )}
                </div>
            </div>
        </aside>
    );
}

/* Agent Card Component */
interface AgentCardProps {
    agent: AgentExecution;
    onClick?: () => void;
}

function AgentCard({ agent, onClick }: AgentCardProps) {
    const statusConfig = {
        pending: { bg: "bg-midnight", text: "text-text-muted", icon: "○" },
        running: { bg: "bg-midnight", text: "text-neural-blue", icon: "◉", pulse: true },
        complete: { bg: "bg-midnight", text: "text-emerald", icon: "●" },
        failed: { bg: "bg-midnight", text: "text-red-400", icon: "✕" }
    };

    const config = statusConfig[agent.status];

    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full text-left p-3 rounded-lg transition-all",
                config.bg,
                "hover:bg-opacity-80 hover:scale-[1.02]",
                "border border-glass-border",
                config.pulse && "agent-running"
            )}
        >
            <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className={cn("text-lg", config.text)}>
                    {config.icon}
                </div>

                {/* Agent Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-text-primary capitalize truncate">
                            {agent.name}
                        </span>
                        {agent.duration !== undefined && (
                            <span className="text-xs text-text-muted font-mono shrink-0">
                                {agent.duration}s
                            </span>
                        )}
                    </div>

                    {/* Additional metrics */}
                    {agent.status === "complete" && agent.insights_count !== undefined && (
                        <div className="flex gap-3 mt-1 text-xs text-text-muted">
                            <span className="font-mono">
                                💡 {agent.insights_count}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
}
