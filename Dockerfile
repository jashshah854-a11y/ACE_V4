# Python backend only
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (gcc for compilation, cairo/pango for weasyprint)
RUN apt-get update && apt-get install -y \
    gcc \
    libffi-dev \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt ./
COPY backend/requirements.txt ./backend/requirements.txt

# Install Python dependencies from both requirements files
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy all backend code
COPY backend ./backend


# Create data directory for runs
RUN mkdir -p backend/data/runs

# Railway provides PORT env var
ENV PORT=8080
EXPOSE 8080

# Start FastAPI server (shell form for variable expansion)
CMD sh -c "uvicorn backend.api.server:app --host 0.0.0.0 --port ${PORT:-8080}"
