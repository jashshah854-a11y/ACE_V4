import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ThreePanelCanvasProps {
    /** Left Panel (20%) - The Pulse: Dataset Identity & Quality Metrics */
    pulsePanel: ReactNode;

    /** Center Panel (50%) - The Narrative: Pyramid Principle storytelling */
    narrativePanel: ReactNode;

    /** Right Panel (30%) - The Lab: Raw evidence and mathematical proof */
    labPanel: ReactNode;

    /** Whether the lab panel is currently open (for mobile/tablet) */
    isLabOpen?: boolean;

    /** Callback when lab panel should close (mobile/tablet) */
    onLabClose?: () => void;

    /** Additional className for the root container */
    className?: string;
}

/**
 * Three-Panel Insight Canvas — Neural Refinery Layout
 * 
 * Fixed-viewport triptych implementing the Pyramid Principle for data intelligence.
 * 
 * **Layout:**
 * - Left (20%): The Pulse — Dataset identity, quality gates, safe mode banner
 * - Center (50%): The Narrative — SCQA story blocks, governing thoughts
 * - Right (30%): The Lab — Evidence objects, click-to-verify lineage
 * 
 * **Scroll Behavior:**
 * - Left panel: Fixed (no scroll)
 * - Center panel: Independent vertical scroll
 * - Right panel: Independent vertical scroll
 * 
 * **Responsive:**
 * - Desktop (≥1280px): Full three-panel layout
 * - Tablet (768-1279px): Collapsible left panel, center + right
 * - Mobile (<768px): Single column, tabbed navigation
 */
export function ThreePanelCanvas({
    pulsePanel,
    narrativePanel,
    labPanel,
    isLabOpen = true,
    onLabClose,
    className,
}: ThreePanelCanvasProps) {
    return (
        <div
            className={cn(
                "flex h-screen w-full overflow-hidden bg-background",
                className
            )}
        >
            {/* ZONE A: The Pulse (Left — 20%) */}
            <aside
                className={cn(
                    "hidden lg:flex flex-col flex-shrink-0 w-[20%] min-w-[260px] max-w-[320px]",
                    "border-r border-border bg-authority text-white",
                    "overflow-hidden" // Fixed, no scroll
                )}
            >
                {pulsePanel}
            </aside>

            {/* ZONE B: The Narrative (Center — 50%) */}
            <main
                className={cn(
                    "flex-1 overflow-y-auto",
                    "bg-background",
                    // Smooth scrolling
                    "scroll-smooth",
                    // Optimize scroll performance
                    "[will-change:transform]"
                )}
            >
                <div className="max-w-4xl mx-auto px-breathe py-12">
                    {narrativePanel}
                </div>
            </main>

            {/* ZONE C: The Lab (Right — 30%) */}
            <aside
                className={cn(
                    // Desktop: Permanent sidebar
                    "hidden lg:flex flex-col flex-shrink-0",
                    "w-[30%] min-w-[320px] max-w-[480px]",
                    "border-l border-lab-accent/20",
                    "bg-lab-bg text-lab-text",
                    "overflow-y-auto",
                    // Smooth scrolling
                    "scroll-smooth",
                    // Optimize scroll performance
                    "[will-change:transform]",
                    // Conditional visibility
                    !isLabOpen && "lg:hidden"
                )}
            >
                {labPanel}
            </aside>

            {/* Mobile/Tablet: Lab Panel Overlay */}
            {isLabOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                        onClick={onLabClose}
                        aria-hidden="true"
                    />

                    {/* Slide-in Panel */}
                    <aside
                        className={cn(
                            "fixed right-0 top-0 bottom-0 z-50",
                            "w-[85vw] max-w-[400px]",
                            "bg-lab-bg text-lab-text",
                            "border-l border-lab-accent/20",
                            "overflow-y-auto",
                            "lg:hidden",
                            // Slide-in animation
                            "animate-in slide-in-from-right duration-300"
                        )}
                    >
                        {labPanel}
                    </aside>
                </>
            )}

            {/* Mobile: Pulse Panel Drawer (if needed in future) */}
            {/* For now, pulse metrics will be shown in a collapsed header on mobile */}
        </div>
    );
}

/**
 * Mobile Tab Navigation Component
 * 
 * Provides tabbed navigation between Pulse, Narrative, and Lab on mobile devices.
 * This is an alternative to the overlay approach for mobile UX.
 */
interface MobileTabNavigationProps {
    activeTab: 'pulse' | 'narrative' | 'lab';
    onTabChange: (tab: 'pulse' | 'narrative' | 'lab') => void;
}

export function MobileTabNavigation({ activeTab, onTabChange }: MobileTabNavigationProps) {
    const tabs = [
        { id: 'pulse' as const, label: 'Overview', icon: '📊' },
        { id: 'narrative' as const, label: 'Narrative', icon: '📖' },
        { id: 'lab' as const, label: 'Evidence', icon: '🔬' },
    ];

    return (
        <nav className="lg:hidden flex border-b border-border bg-background sticky top-0 z-30">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                        "flex-1 px-4 py-3 text-sm font-ui font-medium transition-colors",
                        "border-b-2",
                        activeTab === tab.id
                            ? "border-action text-action bg-action/5"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                >
                    <span className="mr-2" aria-hidden="true">{tab.icon}</span>
                    {tab.label}
                </button>
            ))}
        </nav>
    );
}

/**
 * Responsive Three-Panel Canvas with Mobile Tabs
 * 
 * Wrapper that handles mobile tab navigation automatically.
 */
interface ResponsiveThreePanelCanvasProps extends Omit<ThreePanelCanvasProps, 'isLabOpen' | 'onLabClose'> {
    /** Initial tab for mobile view */
    defaultMobileTab?: 'pulse' | 'narrative' | 'lab';
}

export function ResponsiveThreePanelCanvas({
    pulsePanel,
    narrativePanel,
    labPanel,
    defaultMobileTab = 'narrative',
    className,
}: ResponsiveThreePanelCanvasProps) {
    const [mobileTab, setMobileTab] = React.useState<'pulse' | 'narrative' | 'lab'>(defaultMobileTab);
    const [isLabOpen, setIsLabOpen] = React.useState(false);

    return (
        <>
            {/* Mobile Tab Navigation */}
            <MobileTabNavigation activeTab={mobileTab} onTabChange={setMobileTab} />

            {/* Main Canvas */}
            <div className={cn("lg:flex h-screen", className)}>
                {/* Desktop: Three-panel layout */}
                <div className="hidden lg:flex w-full">
                    <ThreePanelCanvas
                        pulsePanel={pulsePanel}
                        narrativePanel={narrativePanel}
                        labPanel={labPanel}
                        isLabOpen={isLabOpen}
                        onLabClose={() => setIsLabOpen(false)}
                    />
                </div>

                {/* Mobile: Single panel based on active tab */}
                <div className="lg:hidden h-full overflow-y-auto">
                    {mobileTab === 'pulse' && (
                        <div className="p-4 bg-authority text-white min-h-full">
                            {pulsePanel}
                        </div>
                    )}
                    {mobileTab === 'narrative' && (
                        <div className="p-4">
                            {narrativePanel}
                        </div>
                    )}
                    {mobileTab === 'lab' && (
                        <div className="bg-lab-bg text-lab-text min-h-full p-4">
                            {labPanel}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
