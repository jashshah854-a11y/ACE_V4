
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY backend ./backend
# Copy schema_scanner explicitly if needed, but it should be inside backend/
# (Based on file listing, schema_scanner is in backend/schema_scanner)

# Set python path so 'backend' package is resolvable
ENV PYTHONPATH=/app

# Default port (Railway overrides this)
ENV PORT=8000

# Run the application
CMD sh -c "uvicorn backend.api.server:app --host 0.0.0.0 --port ${PORT:-8000}"
