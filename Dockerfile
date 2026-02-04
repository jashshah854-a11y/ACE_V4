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

# Install SHAP and ONNX for model explainability and export
RUN pip install --no-cache-dir "shap>=0.42.0" "onnx>=1.14.0" "skl2onnx>=1.16.0" "onnxruntime>=1.16.0"

# Install matplotlib for chart generation (headless mode)
RUN pip install --no-cache-dir matplotlib

# Copy all backend code
COPY backend ./backend


# Create data directory for runs
RUN mkdir -p backend/data/runs

# Railway provides PORT env var
ENV PORT=8080
EXPOSE 8080

# Start FastAPI server (shell form for variable expansion)
CMD sh -c "uvicorn backend.api.server:app --host 0.0.0.0 --port ${PORT:-8080}"
