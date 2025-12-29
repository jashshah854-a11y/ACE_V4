import { ReactNode } from "react";

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    message: string;
    action?: ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-4 text-center">
            {icon && (
                <div className="mb-6 text-[hsl(var(--library-muted))]/40">
                    {icon}
                </div>
            )}
            <h2 className="font-[family-name:var(--font-library-heading)] text-2xl text-[hsl(var(--library-text))] mb-3">
                {title}
            </h2>
            <p className="font-[family-name:var(--font-library-body)] text-[hsl(var(--library-muted))] max-w-md mb-6">
                {message}
            </p>
            {action && <div>{action}</div>}
        </div>
    );
}

interface ErrorStateProps {
    title?: string;
    message: string;
    action?: ReactNode;
}

export function ErrorState({
    title = "Something does not add up here",
    message,
    action
}: ErrorStateProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-4 text-center">
            <div className="mb-6">
                <div className="w-16 h-16 rounded-full bg-[hsl(var(--lab-alert))]/10 flex items-center justify-center">
                    <span className="text-[hsl(var(--lab-alert))] text-2xl">!</span>
                </div>
            </div>
            <h2 className="font-[family-name:var(--font-library-heading)] text-2xl text-[hsl(var(--library-text))] mb-3">
                {title}
            </h2>
            <p className="font-[family-name:var(--font-library-body)] text-[hsl(var(--library-muted))] max-w-md mb-6">
                {message}
            </p>
            {action && <div>{action}</div>}
        </div>
    );
}

interface LoadingStateProps {
    message?: string;
}

export function LoadingState({ message = "Thinking..." }: LoadingStateProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
            <div className="flex gap-1 mb-4">
                <span className="animate-bounce text-[hsl(var(--lab-signal))]" style={{ animationDelay: "0ms" }}>.</span>
                <span className="animate-bounce text-[hsl(var(--lab-signal))]" style={{ animationDelay: "150ms" }}>.</span>
                <span className="animate-bounce text-[hsl(var(--lab-signal))]" style={{ animationDelay: "300ms" }}>.</span>
            </div>
            <p className="font-[family-name:var(--font-lab)] text-sm text-[hsl(var(--lab-silver))]">
                {message}
            </p>
        </div>
    );
}
