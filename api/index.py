"""
Vercel serverless function handler for ACE V4 FastAPI app.
This file is required for Vercel to properly deploy the Python backend.

Note: For production ML workloads, consider deploying the backend separately
on Railway/Render/Fly.io due to Vercel's 250MB serverless function limit.
"""
import sys
import os
from pathlib import Path

# Get the project root (parent of api directory)
project_root = Path(__file__).parent.parent
backend_path = project_root / "backend"

# Add backend to Python path
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

# Set PYTHONPATH environment variable
os.environ["PYTHONPATH"] = str(backend_path)

# Fix for joblib warning on Windows (if running on Windows)
if os.name == 'nt':
    os.environ["LOKY_MAX_CPU_COUNT"] = str(os.cpu_count() or 4)

# Try to import with minimal dependencies first
try:
    # Import the FastAPI app
    # The import path works because we added backend to sys.path
    from api.server import app
except ImportError as e:
    # If ML libraries are missing, create a minimal app that explains the situation
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    
    app = FastAPI(title="ACE V4 API - Deployment Notice")
    
    @app.get("/")
    async def root():
        return JSONResponse({
            "message": "ACE V4 API",
            "notice": "Backend requires ML libraries (pandas, numpy, scikit-learn, scipy) which exceed Vercel's 250MB limit.",
            "recommendation": "Deploy backend separately on Railway, Render, or Fly.io",
            "status": "limited"
        })
    
    @app.get("/health")
    async def health():
        return {"status": "limited", "message": "Backend not fully deployed on Vercel"}

# Export the app for Vercel
# Vercel will automatically handle ASGI apps
__all__ = ["app"]
