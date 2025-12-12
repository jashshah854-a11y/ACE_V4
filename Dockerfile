# Stage 1: Build Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app

# Copy dependency definitions
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code and env files
COPY . .

# Build the application
# Note: Vite will use .env.production automatically
RUN npm run build

# Stage 2: Backend Runtime
FROM python:3.11-slim
WORKDIR /app

# Install build dependencies for python packages (just in case)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend Code
COPY backend/ backend/

# Copy Built Frontend from Stage 1
# server.py expects 'dist' at project root (which is /app/dist here)
COPY --from=frontend-builder /app/dist ./dist

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=8080
ENV PYTHONPATH=/app/backend

# Command to run the application
# We run server.py directly as entrypoint
CMD ["python", "backend/api/server.py"]
