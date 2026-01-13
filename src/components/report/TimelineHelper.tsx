import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ReportProfile } from "@/types/reportTypes";
import { setSyntheticTimeColumn } from "@/lib/timelineHelper";

interface TimelineHelperProps {
  profile?: ReportProfile;
  runId: string;
}

export function TimelineHelper({ profile, runId }: TimelineHelperProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const columns = useMemo(() => {
    if (!profile?.columns) return [] as Array<{ name: string; description?: string }>;
    return Object.entries(profile.columns).map(([name, meta]) => ({
      name,
      description: meta?.dtype || meta?.type || ''
    }));
  }, [profile?.columns]);

  const [selection, setSelection] = useState<string>(columns[0]?.name || "");

  if (!columns.length) return null;

  const handleApply = () => {
    if (!selection) return;
    setSaving(true);
    setSyntheticTimeColumn(runId, selection);
    setMessage(`Timeline helper activated for ${selection}. Refreshing...`);
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  const handleClear = () => {
    setSaving(true);
    setSyntheticTimeColumn(runId, undefined);
    setMessage('Timeline helper cleared. Refreshing...');
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div className="border border-dashed border-indigo-300 bg-indigo-50/70 dark:bg-indigo-900/20 rounded-xl p-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">Need a timeline?</p>
          <p className="text-xs text-muted-foreground max-w-xl">
            Select a column that best represents order (like month, week, or period). We'll treat it as the timeline so trend tools can run.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <select
            className="h-10 rounded-lg border border-border bg-white dark:bg-gray-900 px-3 text-sm"
            value={selection}
            onChange={(e) => setSelection(e.target.value)}
            disabled={saving}
          >
            <option value="">Select column</option>
            {columns.map(({ name, description }) => (
              <option key={name} value={name}>
                {name}{description ? ` (${description})` : ""}
              </option>
            ))}
          </select>
          <Button onClick={handleApply} disabled={!selection || saving}>
            Generate Timeline
          </Button>
          <Button variant="ghost" onClick={handleClear} disabled={saving}>
            Clear
          </Button>
        </div>
      </div>
      {message && (
        <p className="text-xs text-indigo-600 dark:text-indigo-300 mt-2">{message}</p>
      )}
    </div>
  );
}
