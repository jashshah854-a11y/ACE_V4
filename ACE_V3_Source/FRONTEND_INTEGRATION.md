# ACE Frontend Integration Guide

## Report Download Feature

### API Endpoint

**URL**: `/runs/{run_id}/report?format={format}`

**Parameters**:

- `run_id` (path): The run identifier
- `format` (query, optional): Output format - `markdown` (default) or `pdf`

**Examples**:

```
GET /runs/abc123/report                    # Download markdown
GET /runs/abc123/report?format=markdown     # Download markdown (explicit)
GET /runs/abc123/report?format=pdf          # Download PDF
```

### Frontend Implementation

#### Download Button Component (React/TypeScript)

```tsx
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ReportDownloadProps {
  runId: string;
  apiBaseUrl: string;
}

export function ReportDownload({ runId, apiBaseUrl }: ReportDownloadProps) {
  const downloadReport = async (format: 'markdown' | 'pdf') => {
    try {
      const url = `${apiBaseUrl}/runs/${runId}/report?format=${format}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Report not available');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `ace_report_${runId}.${format === 'pdf' ? 'pdf' : 'md'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Show error toast/notification
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Download Report
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => downloadReport('markdown')}>
          Download as Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadReport('pdf')}>
          Download as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## Runtime Display Feature

### API Endpoint

**URL**: `/runs/{run_id}/state`

**Response includes runtime data**:

```json
{
  "run_id": "abc123",
  "status": "complete",
  "steps": {
    "scanner": {
      "status": "completed",
      "runtime_seconds": 15.01,
      "started_at": "2025-12-15T18:20:00Z",
      "completed_at": "2025-12-15T18:20:15Z"
    },
    "interpreter": {
      "status": "completed",
      "runtime_seconds": 8.71,
      ...
    }
  }
}
```

### Frontend Implementation

#### Runtime Formatter Utility

```typescript
export function formatDuration(seconds: number): string {
  if (seconds < 1) {
    return `${(seconds * 1000).toFixed(0)}ms`;
  }
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}
```

#### Pipeline Step Component with Runtime

```tsx
import { Check, Clock, Loader2, XCircle } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface PipelineStepProps {
  step: {
    name: string;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    runtime_seconds?: number;
  };
}

export function PipelineStep({ step }: PipelineStepProps) {
  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div>
          <h3 className="font-medium">{step.name}</h3>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </div>
      </div>
      {step.runtime_seconds && step.status === 'completed' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{formatDuration(step.runtime_seconds)}</span>
        </div>
      )}
    </div>
  );
}
```

#### Full Pipeline Progress Component

```tsx
import { useEffect, useState } from "react";
import { PipelineStep } from "./PipelineStep";

interface PipelineProgressProps {
  runId: string;
  apiBaseUrl: string;
}

export function PipelineProgress({ runId, apiBaseUrl }: PipelineProgressProps) {
  const [state, setState] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/runs/${runId}/state`);
        const data = await response.json();
        setState(data);
        
        // Stop polling if complete
        if (['complete', 'complete_with_errors', 'failed'].includes(data.status)) {
          setIsPolling(false);
        }
      } catch (error) {
        console.error('Failed to fetch state:', error);
      }
    };

    fetchState();
    
    if (isPolling) {
      const interval = setInterval(fetchState, 2000); // Poll every 2 seconds
      return () => clearInterval(interval);
    }
  }, [runId, apiBaseUrl, isPolling]);

  if (!state) {
    return <div>Loading pipeline status...</div>;
  }

  const pipelineSteps = Object.entries(state.steps).map(([key, step]: [string, any]) => ({
    name: step.name,
    description: step.description || key,
    status: step.status,
    runtime_seconds: step.runtime_seconds,
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Analysis Pipeline</h2>
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
          {state.status}
        </span>
      </div>
      {pipelineSteps.map((step, index) => (
        <PipelineStep key={index} step={step} />
      ))}
    </div>
  );
}
```

---

## Complete Integration Example

```tsx
import { useState } from "react";
import { PipelineProgress } from "@/components/PipelineProgress";
import { ReportDownload } from "@/components/ReportDownload";

export function AnalysisPage() {
  const [runId, setRunId] = useState<string | null>(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/run`, {
      method: 'POST',
      body: formData,
    });
    
    const result = await response.json();
    setRunId(result.run_id);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">ACE Intelligence Engine</h1>
      
      {!runId ? (
        <FileUploader onUpload={handleFileUpload} />
      ) : (
        <>
          <div className="mb-6">
            <PipelineProgress runId={runId} apiBaseUrl={API_BASE_URL} />
          </div>
          
          <div className="flex justify-end">
            <ReportDownload runId={runId} apiBaseUrl={API_BASE_URL} />
          </div>
        </>
      )}
    </div>
  );
}
```

---

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/run` | POST | Upload file and start analysis |
| `/runs/{run_id}/state` | GET | Get pipeline status and runtime data |
| `/runs/{run_id}/report` | GET | Download report (markdown/PDF) |
| `/runs/{run_id}/artifacts/{name}` | GET | Get specific artifact JSON |
| `/runs` | GET | List all runs |

---

## Testing

### Test Download

```bash
# Markdown
curl -O "http://localhost:8080/runs/abc123/report?format=markdown"

# PDF
curl -O "http://localhost:8080/runs/abc123/report?format=pdf"
```

### Test Runtime Data

```bash
curl http://localhost:8080/runs/abc123/state | jq '.steps.scanner.runtime_seconds'
# Output: 15.01
```

---

## Notes

- **PDF Caching**: PDFs are cached - they're only regenerated if the markdown file is newer
- **Error Handling**: PDF generation returns 501 if dependencies aren't installed
- **File Names**: Downloads include the run_id for easy identification
- **Polling**: Frontend should poll `/state` every 2-3 seconds while pipeline is running
- **Status Values**: `pending`, `running`, `complete`, `complete_with_errors`, `failed`
