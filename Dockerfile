FROM python:3.11-slim
WORKDIR /app

# Install build dependencies for python packages (just in case)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
# Explicitly copy to requirements.txt in root
COPY backend/requirements.txt requirements.txt

# Install Python dependencies
# Correctly reference the file in root
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend Code
COPY backend/ backend/
# Also copy core/ code if it exists (it seems Orchestrator uses it?)
# I'll enable copying everything distinct just to be safe, but sticking to previous pattern:
# Just backend? Wait, orchestrator.py is in backend?
# Let's check where orchestrator.py is.
# user_state says: c:/Users/jashs/Projects/ACE_V4_Orchestrator/ace-insights-engine/backend/orchestrator.py
# So COPY backend/ backend/ covers it.

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=8080
ENV PYTHONPATH=/app/backend

# Command to run the application
CMD ["python", "backend/api/server.py"]
