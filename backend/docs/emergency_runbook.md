# Emergency Runbook: Phase 5 Safety System

## Overview

This runbook provides procedures for emergency safety incidents involving the Phase 5 intelligence system. Use this when immediate action is required to protect users from unwanted tracking, reflections, or assertions.

---

## Kill Switch Procedures

### Kill Switch 1: REFLECTION_GLOBAL_OFF

**Purpose**: Completely disables reflection generation, emission, and all related operations.

**When to Activate**:

- Reflection content quality issues detected
- Privacy incident involving reflection data
- Regulatory compliance requirement
- System behaving unexpectedly with reflections

**How to Activate**:

#### Method 1: Environment Variable (Preferred for Production)

```bash
# Set environment variable
export KILL_SWITCH_REFLECTION_GLOBAL_OFF=true

# Restart backend service
# Railway/Heroku:
railway restart
# OR
heroku ps:restart

# Verify activation
curl https://your-api.example.com/health
# Check logs for: "KILL_SWITCH_REFLECTION_GLOBAL_OFF: True"
```

#### Method 2: Runtime (Development/Staging Only)

```python
# In Python REPL or admin script
from backend.api.server import safety_guard
safety_guard.kill_switch_reflection_off = True
```

**Verification**:

1. **Test Reflection Generation**:

   ```bash
   curl -X POST https://your-api.example.com/api/internal/generate-reflections \
     -H "Content-Type: application/json" \
     -d '{"run_id": "test_run", "user_id": "test_user"}'
   
   # Expected response:
   # {"status": "none", "reason": "Kill Switch Active: Reflections Disabled"}
   ```

2. **Check Audit Logs**:

   ```bash
   # SSH into server
   cd /path/to/backend/data/audit_logs
   grep "kill_switch" safety_audit_*.jsonl
   
   # Should see entries like:
   # {"timestamp":"2026-01-20T...", "action_type":"reflection_generation", 
   #  "reason_code":"kill_switch_reflection_global_off", ...}
   ```

**Impact**:

- ✅ **Zero reflections generated** (fail-closed)
- ✅ **Zero reflections emitted to UI** (graceful degradation)
- ✅ **All reflection-related writes blocked**
- ⚠️ UI reflection slot will be empty (no error shown to user)

---

### Kill Switch 2: PATTERN_MONITOR_PAUSE

**Purpose**: Halts pattern candidate creation and monitoring jobs.

**When to Activate**:

- Pattern detection logic issues
- Backend performance degradation from monitoring
- Data quality concerns in pattern candidates

**How to Activate**:

```bash
# Set environment variable
export KILL_SWITCH_PATTERN_MONITOR_PAUSE=true

# Restart service
railway restart

# Verify
curl https://your-api.example.com/api/internal/pattern-monitor
# Expected: {"status": "paused", "candidates_found": 0, ...}
```

**Verification**:
Check audit logs:

```bash
grep "pattern_monitor" safety_audit_*.jsonl | grep "kill_switch"
```

**Impact**:

- ✅ No new pattern candidates created
- ✅ Monitoring jobs skip all users
- ⚠️ Downstream: No new reflections (pattern dependency)

---

## Recovery Procedures

### Deactivating Kill Switches

**Step 1: Remove Environment Variable**

```bash
# Unset the variable
unset KILL_SWITCH_REFLECTION_GLOBAL_OFF
# OR
export KILL_SWITCH_REFLECTION_GLOBAL_OFF=false

# Restart service
railway restart
```

**Step 2: Verify Normal Operation**

```bash
# Test reflection generation (should succeed if other gates pass)
curl -X POST https://your-api.example.com/api/internal/generate-reflections \
  -H "Content-Type: application/json" \
  -d '{"run_id": "test_run", "user_id": "test_user"}'

# Should NOT see kill switch in response
```

**Step 3: Monitor for 24 Hours**

- Check audit logs for anomalies
- Verify reflection quality
- Monitor user feedback channels

---

## Consent Revocation

**Emergency Consent Disable** (all users):

```bash
# Set mock consent to false
export MOCK_CONSENT_VALUE=false

# Restart service
railway restart
```

**Verification**:

```bash
# Attempt decision touch
curl -X POST https://your-api.example.com/api/decision-touch \
  -H "Content-Type: application/json" \
  -d '{"touch_type": "action_click", "user_id": "test_user", ...}'

# Check audit logs for "no_consent" blocks
grep "no_consent" safety_audit_*.jsonl
```

**Impact**:

- ✅ Zero decision touches recorded
- ✅ Zero patterns created
- ✅ Zero reflections or assertions
- ✅ Complete tracking halt

---

## Audit Log Inspection

### Query Last 24 Hours of Safety Events

**Method 1: Direct File Inspection**

```bash
cd /path/to/backend/data/audit_logs

# Today's log
cat safety_audit_$(date +%Y-%m-%d).jsonl | jq .

# Filter by action type
cat safety_audit_*.jsonl | jq 'select(.action_type == "reflection_generation")'

# Filter by reason code
cat safety_audit_*.jsonl | jq 'select(.reason_code == "no_consent")'

# Count blocks by reason
cat safety_audit_*.jsonl | jq -r '.reason_code' | sort | uniq -c
```

**Method 2: Python Query Helper**

```python
from backend.core.audit_logger import AuditLogger
from datetime import datetime, timedelta

logger = AuditLogger(mode="file")

# Last 24 hours
events = logger.query_audit_logs(
    start_date=datetime.utcnow() - timedelta(hours=24),
    limit=10000
)

# Group by reason code
from collections import Counter
reasons = Counter(e.reason_code for e in events)
print(reasons)

# Export for analysis
export_path = logger.export_last_24h()
print(f"Exported to: {export_path}")
```

---

## Circuit Breaker Manual Reset

If caps are hit and need emergency reset:

```python
from backend.api.server import circuit_breaker

# View current stats
stats = circuit_breaker.get_global_stats()
print(stats)

# EMERGENCY RESET (use with caution)
circuit_breaker.global_reflection_emissions.clear()
circuit_breaker.global_assertion_creations.clear()

# Per-user reset
user_id = "user_123"
circuit_breaker.user_reflections[user_id].clear()
circuit_breaker.user_assertion_count[user_id] = 0
```

**⚠️ Warning**: Manual resets bypass safety caps. Only use during genuine emergencies.

---

## Rollback Procedures

### Complete Rollback to Pre-Phase-5

If Phase 5 must be completely disabled:

**Step 1: Disable All Safety Features**

```bash
export KILL_SWITCH_REFLECTION_GLOBAL_OFF=true
export KILL_SWITCH_PATTERN_MONITOR_PAUSE=true
export MOCK_CONSENT_VALUE=false
```

**Step 2: Verify Zero Activity**

```bash
# No decision touches
# No patterns
# No reflections
# No assertions

# Check audit logs confirm all blocks
tail -f backend/data/audit_logs/safety_audit_*.jsonl
```

**Step 3: Communicate with Users**

- UI will show empty reflection slots (graceful)
- No error messages displayed
- Reports still function normally

---

## Emergency Contact Decision Tree

```
Is this a PRIVACY incident?
├─ YES → Activate REFLECTION_GLOBAL_OFF immediately
│         Then investigate root cause
│
└─ NO → Is this a PERFORMANCE issue?
         ├─ YES → Activate PATTERN_MONITOR_PAUSE
         │         Monitor backend metrics
         │
         └─ NO → Is this a consent compliance issue?
                  └─ YES → Set MOCK_CONSENT_VALUE=false
                            Halt all tracking
```

---

## Post-Incident Checklist

After resolving an incident:

- [ ] Export audit logs for incident period
- [ ] Document root cause
- [ ] Update this runbook if procedures failed
- [ ] Review circuit breaker thresholds
- [ ] Conduct postmortem within 48 hours
- [ ] Update user communication templates

---

## Quick Reference

| Kill Switch | Env Var | Blocks |
|------------|---------|--------|
| Reflection Global Off | `KILL_SWITCH_REFLECTION_GLOBAL_OFF=true` | Generation, Emission, All reflection ops |
| Pattern Monitor Pause | `KILL_SWITCH_PATTERN_MONITOR_PAUSE=true` | Candidate creation, Monitoring jobs |
| Consent Disable | `MOCK_CONSENT_VALUE=false` | All tracking, All memory operations |

**Audit Log Location**: `backend/data/audit_logs/safety_audit_YYYY-MM-DD.jsonl`

**Test Verification**: `curl https://your-api/health` (check logs for kill switch status)
