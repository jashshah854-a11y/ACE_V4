"""
Vercel serverless function handler for ACE V4 FastAPI app.
This file is required for Vercel to properly deploy the Python backend.
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

# Import the FastAPI app
# The import path works because we added backend to sys.path
from api.server import app

# Export the app for Vercel
# Vercel will automatically handle ASGI apps
__all__ = ["app"]
