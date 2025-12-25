# ACE Insights Engine + ACE-V2 Integration Guide

## Overview

This guide explains how to connect the **ACE Insights Engine** (React/Vite UI) with **ACE-V2** (Python FastAPI backend) to create a complete intelligence analysis platform.

## Architecture

```
ACE Insights Engine (Frontend)  <--HTTP-->  ACE-V2 FastAPI (Backend)
    Vite + React + TypeScript                  Python + FastAPI
          Lovable Deploy                    Railway/Render/Fly.io
```

## Setup Instructions

### 1. Backend Setup (ACE-V2)

#### Local Development
```bash
# Navigate to ACE-V2 directory
cd ACE-V2

# Install dependencies
pip install -r requirements.txt

# Start the server
python -m uvicorn api.server:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

#### Production Deployment (Railway)
1. Push ACE-V2 to GitHub
2. Go to [railway.app](https://railway.app) and connect your repo
3. Set start command: `uvicorn api.server:app --host 0.0.0.0 --port $PORT`
4. Copy the deployed URL (e.g., `https://your-app.railway.app`)

### 2. Frontend Setup (ACE Insights Engine)

#### Environment Configuration
```bash
# In ace-insights-engine directory, create .env.local
cp .env.example .env.local
```

Edit `.env.local`:
```env
# For local development
VITE_ACE_API_BASE_URL=http://localhost:8000

# For production (replace with your deployed backend URL)
# VITE_ACE_API_BASE_URL=https://your-app.railway.app
```

#### Local Development
```bash
npm install
npm run dev
```

#### Lovable Deployment
1. In Lovable project settings, add environment variable:
   - Key: `VITE_ACE_API_BASE_URL`
   - Value: Your deployed backend URL
2. Deploy from Lovable UI

## Usage Example

### Trigger an ACE Run

```typescript
import { triggerRun } from '@/lib/api-client';

const handleFileUpload = async (file: File) => {
  try {
    const result = await triggerRun(file);
    console.log('Run started:', result.run_id);
    // Navigate to results page or poll for completion
  } catch (error) {
    console.error('Failed to start run:', error);
  }
};
```

### Get Results

```typescript
import { getReport, getArtifact } from '@/lib/api-client';

// Get final markdown report
const report = await getReport(runId);

// Get specific artifacts
const personas = await getArtifact(runId, 'personas');
const anomalies = await getArtifact(runId, 'anomalies');
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/run` | POST | Upload file and trigger ACE run |
| `/runs/{run_id}/report` | GET | Get final markdown report |
| `/runs/{run_id}/artifacts/{name}` | GET | Get specific artifact JSON |
| `/runs` | GET | List all available runs |

## Troubleshooting

### CORS Errors
Make sure the backend has CORS middleware enabled. Check `api/server.py` for:
```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)
```

### Backend Connection Failed
- Verify `VITE_ACE_API_BASE_URL` is set correctly
- Check backend is running: `curl http://localhost:8000/docs`
- Ensure no firewall is blocking ports

### File Upload Fails
- Check file format (CSV, JSON, NDJSON, logs supported)
- Verify file size < 100MB
- Check backend logs for detailed error

## Next Steps

1. **Add File Upload UI**: Create a component in `src/components` to upload files
2. **Results Dashboard**: Build views to display personas, anomalies, and insights
3. **Real-time Updates**: Add polling or WebSockets for run progress
4. **Authentication**: Add auth layer if needed for production

## Support

For issues:
- Backend: Check `ACE-V2/README.md`
- Frontend: Check `ace-insights-engine/README.md`
- API Docs: Visit `{BACKEND_URL}/docs`
