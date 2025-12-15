# Python backend only
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt ./
COPY backend/requirements.txt ./backend/requirements.txt

# Install Python dependencies from both requirements files
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy all backend code
COPY backend ./backend
COPY api ./api

# Create data directory for runs
RUN mkdir -p data/runs

# Railway provides PORT env var
ENV PORT=8080
EXPOSE 8080

# Start FastAPI server
CMD uvicorn backend.api.server:app --host 0.0.0.0 --port $PORT

