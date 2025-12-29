web: sh -c "uvicorn backend.api.server:app --host 0.0.0.0 --port ${PORT:-8000}"
worker: python -m jobs.worker
