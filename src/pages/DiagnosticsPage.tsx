import { useParams, Link } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";
import { useRunSnapshot } from "@/hooks/useRunSnapshot";
import { isManifestCompatible } from "@/hooks/useRunManifest";

export default function DiagnosticsPage() {
  const { runId } = useParams<{ runId: string }>();
  const { data: snapshot, loading, error } = useRunSnapshot(runId, true);
  const manifest = snapshot?.manifest ?? null;
  const compatible = isManifestCompatible(manifest);

  if (!runId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Run ID not provided.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Loading manifest...</p>
        </div>
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            Snapshot unavailable. Please refresh or rerun the analysis.
          </p>
        </div>
      </div>
    );
  }

  if (!compatible) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <h1 className="text-lg font-semibold mb-2">Manifest Incompatible</h1>
          <p className="text-sm text-muted-foreground">
            This run uses an unsupported manifest version.
          </p>
        </div>
      </div>
    );
  }

  const steps = Object.entries(manifest.steps || {});
  const artifacts = Object.values(manifest.artifacts || {});
  const warnings = manifest.warnings || [];

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <header className="space-y-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Diagnostics</div>
          <h1 className="text-2xl font-semibold">Run Manifest</h1>
          <p className="text-sm text-muted-foreground">
            Run ID: <code className="font-mono">{manifest.run_id}</code>
          </p>
          <div className="text-xs text-muted-foreground">
            <Link to={`/app?run=${manifest.run_id}`} className="underline">
              Back to Report
            </Link>
          </div>
        </header>

        <section className="rounded-xl border border-border/50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Identity</h2>
          <div className="grid gap-2 text-sm">
            <div>Manifest version: {manifest.manifest_version}</div>
            <div>Pipeline version: {manifest.pipeline_version}</div>
            <div>Commit: {manifest.code_commit_hash}</div>
            <div>Dataset fingerprint: {manifest.dataset_fingerprint}</div>
          </div>
        </section>

        <section className="rounded-xl border border-border/50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Warnings</h2>
          {warnings.length === 0 ? (
            <div className="text-sm text-muted-foreground">No warnings recorded.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {warnings.map((warning) => (
                <li key={warning.warning_code} className="rounded-lg bg-muted/40 px-3 py-2">
                  <div className="font-semibold">{warning.warning_code}</div>
                  <div className="text-muted-foreground">{warning.message}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border/50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Steps</h2>
          <div className="grid gap-2 text-sm">
            {steps.map(([step, meta]) => (
              <div key={step} className="flex items-center justify-between border-b border-border/30 pb-2 last:border-b-0 last:pb-0">
                <span className="font-mono">{step}</span>
                <span className="text-muted-foreground">{meta.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border/50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Artifacts</h2>
          {artifacts.length === 0 ? (
            <div className="text-sm text-muted-foreground">No artifacts registered.</div>
          ) : (
            <div className="grid gap-2 text-sm">
              {artifacts.map((artifact) => (
                <div key={artifact.artifact_id} className="flex items-center justify-between border-b border-border/30 pb-2 last:border-b-0 last:pb-0">
                  <span className="font-mono">{artifact.artifact_id}</span>
                  <span className="text-muted-foreground">
                    {artifact.status} · {artifact.valid ? "valid" : "invalid"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
