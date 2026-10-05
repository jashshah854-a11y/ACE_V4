# ACE V4 Project State
> Claude: Read this at the start of every session before doing anything else.
> Update when deploy status, pipeline state, or architecture changes.
> Last updated: 2026-05-05

## What This Project Does
Multi-agent AI analytics platform: accepts CSV uploads, runs a 19-step automated analysis pipeline (clustering, regression, anomaly detection, AI insight synthesis, narrative generation), produces executive-grade reports with a React frontend monitoring pipeline progress.

## Current State
- Backend: Python/FastAPI multi-agent pipeline
- Frontend: React SPA
- Deployed on Vercel
- See CLAUDE.md for full architecture details

## Stack & Key Files
- Backend: Python/FastAPI in `backend/`
- Frontend: React in frontend directory
- Archive folder contains older versions

## Database State
- No Prisma/Neon — check CLAUDE.md for DB details

## Deferred Items
- [ ] Audit this file and fill in real current state at next session start

## Next Session Entry Point
Read CLAUDE.md first for full architecture, then check backend/main.py and frontend entry point.
