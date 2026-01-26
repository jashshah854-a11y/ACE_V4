import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { ReportProfile } from "@/types/reportTypes";
import { getSyntheticTimeColumn, setSyntheticTimeColumn } from "@/lib/timelineHelper";
import { API_BASE } from "@/lib/api-client";

interface TimelineHelperProps {
  profile?: ReportProfile;
  runId: string;
  initialColumn?: string;
}

export function TimelineHelper({ profile, runId, initialColumn }: TimelineHelperProps) {
  const columns = useMemo(() => {
    if (!profile?.columns) return [] as Array<{ name: string; description?: string }>;
    return Object.entries(profile.columns).map(([name, meta]) => ({
      name,
      description: meta?.dtype || meta?.type || ''
    }));
  }, [profile?.columns]);

  const storedColumn = useMemo(() => initialColumn || (runId ? getSyntheticTimeColumn(runId) : undefined), [initialColumn, runId]);

  const [selection, setSelection] = useState<string>(storedColumn || columns[0]?.name || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fallback = storedColumn || columns[0]?.name || "";
    setSelection(fallback);
  }, [storedColumn, columns]);

  if (!columns.length) return null;

  const persistTimeline = async (column?: string) => {
    const response = await fetch(`${API_BASE}/run/${runId}/timeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ column } as { column?: string }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || "Failed to save timeline selection");
    }
    setSyntheticTimeColumn(runId, column);
    return response.json();
  };

  const handleApply = async () => {
    if (!selection) return;
    setSaving(true);
    try {
      await persistTimeline(selection);
      setMessage(`Timeline helper activated for ${selection}. Refreshing...`);
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to save timeline selection");
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await persistTimeline(undefined);
      setMessage('Timeline helper cleared. Refreshing...');
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to clear timeline selection");
      setSaving(false);
    }
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
          <Button onClick={handleApply} disabled={!selection || saving} data-allow-disabled>
            Generate Timeline
          </Button>
          <Button variant="ghost" onClick={handleClear} disabled={saving} data-allow-disabled>
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
