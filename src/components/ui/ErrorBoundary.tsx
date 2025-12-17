import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("UI crashed:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="container px-4 py-16 max-w-3xl">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The app hit a runtime error while rendering this page.
            </p>
          </header>

          <section className="mt-6 rounded-lg border bg-card p-4">
            <p className="text-sm font-mono whitespace-pre-wrap break-words">
              {this.state.error?.message || "Unknown error"}
            </p>
          </section>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              variant="default"
              onClick={() => window.location.reload()}
              aria-label="Reload page"
            >
              Reload
            </Button>
            <Button
              variant="secondary"
              onClick={() => this.setState({ hasError: false, error: undefined })}
              aria-label="Try to recover"
            >
              Try again
            </Button>
          </div>

          <footer className="mt-10 text-xs text-muted-foreground">
            If this keeps happening, the error above is the key clue.
          </footer>
        </main>
      </div>
    );
  }
}
