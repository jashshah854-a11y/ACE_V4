# Phase 1 – SaaS Auth & Tenancy Design

## Goals
- Add multi-tenant awareness without disrupting existing single-tenant pipeline.
- Provide authentication/authorization for API + UI clients.
- Keep legacy behavior when AUTH_MODE=disabled.

## Key Decisions
1. **Config Flags**
   - `ACE_AUTH_ENABLED` (bool, default False) toggles enforcement.
   - `ACE_TENANCY_MODE` ("single" | "multi"), default single; multi requires orgs/projects.
   - `ACE_TOKEN_SECRET` & `ACE_TOKEN_EXPIRES_MIN` for JWT signing.

2. **Storage**
   - Lightweight SQLite (`data/saas.db`) using SQLAlchemy for:
     - Users (id, email, hashed_password, status, org_id).
     - Organizations (id, name, plan, limits).
     - API Tokens (id, user_id, hashed_token, scopes, last_used_at).
   - Run metadata table linking `run_id -> org_id -> project_id` to preserve tenant context while orchestrator still writes to filesystem.

3. **Run Path Isolation**
   - Maintain existing folder layout but prefix with org/project when auth enabled: `runs/{org_slug}/{project_id}/{run_id}`.
   - `StateManager` gains helper to resolve run path from metadata, falls back to old mode when tenancy disabled.

4. **Auth Flow**
   - Email/password signup (owner), invitations later.
   - Login returns short-lived JWT for UI; API tokens hashed+stored for programmatic uploads.
   - FastAPI dependency `get_current_subject` enforces user/org membership when `ACE_AUTH_ENABLED`.

5. **Backward Compatibility**
   - All new dependencies behind feature flag; when disabled API behaves exactly as before (no user requirement, same `data` structure).
   - CLI worker obtains tenant context from run metadata only when available; else defaults to legacy behavior.

6. **Testing Strategy**
   - Unit tests for password hashing/token issuance.
   - Integration tests hitting `/run` with and without auth to prove compatibility.
   - Migration tests ensuring toggling flag does not modify existing runs.
