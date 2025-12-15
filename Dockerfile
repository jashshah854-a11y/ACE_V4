# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy frontend dependencies
COPY package*.json ./
COPY package-lock.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY . .

# Build frontend (creates dist/ folder)
RUN npm run build

# Stage 2: Python backend with built frontend
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies
COPY backend/requirements.txt ./backend/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend ./backend

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/dist ./dist

# Create data directory for runs
RUN mkdir -p data/runs

# Railway provides PORT env var
ENV PORT=8080
EXPOSE 8080

# Start FastAPI server (it will serve the frontend)
CMD uvicorn backend.api.server:app --host 0.0.0.0 --port $PORT
