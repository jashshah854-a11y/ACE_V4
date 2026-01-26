"""
Audit Logger for Phase 5 Safety System.

Logs all blocked actions to provide verifiable compliance trail.

Dev/Staging: JSONL file append
Production: Database table or platform logs (documented path)
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict


# Whitelist of safe context keys for audit logs
SAFE_CONTEXT_KEYS = {
    'touch_type',
    'pattern_age_days',
    'reflection_id',
    'assertion_id',
    'cap_exceeded',
    'cooldown_active',
    'component'
}


@dataclass
class AuditEvent:
    """Schema for audit log entries."""
    timestamp: str  # ISO format
    action_type: str  # e.g., "decision_touch", "reflection_generation"
    allowed: bool  # Required: True if allowed, False if denied
    reason_code: str  # e.g., "ok", "kill_switch_active", "no_consent"
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    kill_switch_snapshot: Optional[Dict[str, bool]] = None
    context: Optional[Dict[str, Any]] = None  # Sanitized safe context only


class AuditLogger:
    """
    Append-only audit logger for safety events.
    
    Phase 6.0: JSONL file-based logging
    Phase 6.1+: Database table migration path documented
    """
    
    def __init__(self, log_dir: Optional[Path] = None, mode: str = "file"):
        """
        Initialize audit logger.
        
        Args:
            log_dir: Directory for log files (default: backend/data/audit_logs/)
            mode: "file" or "database" (database is Phase 6.1+)
        """
        self.mode = mode
        
        if mode == "file":
            if log_dir is None:
                # Default to backend/data/audit_logs/
                backend_dir = Path(__file__).parent.parent
                log_dir = backend_dir / "data" / "audit_logs"
            
            self.log_dir = Path(log_dir)
            self.log_dir.mkdir(parents=True, exist_ok=True)
            
            # Daily log files for easier management
            self.current_log_file = self._get_current_log_file()
        
        elif mode == "database":
            # Phase 6.1+ stub
            raise NotImplementedError(
                "Database audit logging is a Phase 6.1+ feature. "
                "Use file mode for Phase 6.0."
            )
        else:
            raise ValueError(f"Unknown audit logger mode: {mode}")
    
    def _get_current_log_file(self) -> Path:
        """Get log file path for current date."""
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        return self.log_dir / f"safety_audit_{date_str}.jsonl"
    
    def sanitize_context(self, context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Sanitize context to only include safe keys.
        
        Removes:
        - Payload content
        - Freeform text beyond whitelisted keys
        - Raw user input
        - Sensitive data
        
        Args:
            context: Raw context dictionary
            
        Returns:
            Sanitized context with only SAFE_CONTEXT_KEYS
        """
        if not context:
            return {}
        
        sanitized = {}
        for key in SAFE_CONTEXT_KEYS:
            if key in context:
                value = context[key]
                # Additional safety: limit string length
                if isinstance(value, str) and len(value) > 200:
                    value = value[:200] + "..."
                sanitized[key] = value
        
        return sanitized
    
    def log_decision(
        self,
        action_type: str,
        allowed: bool,
        reason_code: str,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        kill_switch_snapshot: Optional[Dict[str, bool]] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        """
        Log a safety decision (allow or deny).
        
        This is the primary public method for logging ALL safety decisions.
        
        Args:
            action_type: Type of action (e.g., "reflection_generation")
            allowed: True if allowed, False if denied
            reason_code: Reason for decision (e.g., "ok", "no_consent")
            user_id: User affected (if available)
            request_id: Request ID for tracing
            kill_switch_snapshot: State of kill switches at time of decision
            context: Additional safe context (will be sanitized)
        """
        # Sanitize context
        safe_context = self.sanitize_context(context)
        
        event = AuditEvent(
            timestamp=datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            action_type=action_type,
            allowed=allowed,
            reason_code=reason_code,
            user_id=user_id,
            request_id=request_id,
            kill_switch_snapshot=kill_switch_snapshot,
            context=safe_context if safe_context else None
        )
        
        if self.mode == "file":
            self._write_to_file(event)
        elif self.mode == "database":
            self._write_to_database(event)
    
    def log_blocked_action(
        self,
        timestamp: datetime,
        action_type: str,
        reason_code: str,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        kill_switch_snapshot: Optional[Dict[str, bool]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        DEPRECATED: Use log_decision() instead.
        
        Legacy method for backward compatibility.
        Converts to normalized log_decision format.
        """
        self.log_decision(
            action_type=action_type,
            allowed=False,  # This method was only for blocks
            reason_code=reason_code,
            user_id=user_id,
            request_id=request_id,
            kill_switch_snapshot=kill_switch_snapshot,
            context=metadata  # Will be sanitized
        )
    
    def _write_to_file(self, event: AuditEvent):
        """Append event to JSONL log file."""
        log_file = self._get_current_log_file()
        
        try:
            with open(log_file, 'a', encoding='utf-8') as f:
                json.dump(asdict(event), f, ensure_ascii=False)
                f.write('\n')
        except Exception as e:
            # Fail gracefully - don't break the main flow
            # Log to stderr so it appears in platform logs
            print(f"[AUDIT_LOGGER_ERROR] Failed to write audit log: {e}", flush=True)
    
    def _write_to_database(self, event: AuditEvent):
        """
        Write event to database table.
        
        Phase 6.1+ implementation:
        
        SQL (pseudo):
            INSERT INTO audit_events (
                timestamp, action_type, reason_code, user_id,
                request_id, kill_switch_snapshot, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        
        Schema:
            CREATE TABLE audit_events (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP NOT NULL,
                action_type VARCHAR(100) NOT NULL,
                reason_code VARCHAR(100) NOT NULL,
                user_id VARCHAR(255),
                request_id VARCHAR(255),
                kill_switch_snapshot JSONB,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX idx_audit_timestamp ON audit_events(timestamp DESC);
            CREATE INDEX idx_audit_user ON audit_events(user_id);
            CREATE INDEX idx_audit_reason ON audit_events(reason_code);
        """
        raise NotImplementedError("Database mode is Phase 6.1+")
    
    def query_audit_logs(
        self,
        action_type: Optional[str] = None,
        reason_code: Optional[str] = None,
        user_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 1000
    ) -> List[AuditEvent]:
        """
        Query audit logs with filters.
        
        Args:
            action_type: Filter by action type
            reason_code: Filter by reason code
            user_id: Filter by user
            start_date: Events after this date
            end_date: Events before this date
            limit: Maximum results to return
            
        Returns:
            List of matching AuditEvent objects
        """
        if self.mode == "file":
            return self._query_from_files(
                action_type, reason_code, user_id, start_date, end_date, limit
            )
        elif self.mode == "database":
            return self._query_from_database(
                action_type, reason_code, user_id, start_date, end_date, limit
            )
    
    def _query_from_files(
        self,
        action_type: Optional[str],
        reason_code: Optional[str],
        user_id: Optional[str],
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        limit: int
    ) -> List[AuditEvent]:
        """Query JSONL log files."""
        results = []
        
        # Determine which log files to scan
        log_files = sorted(self.log_dir.glob("safety_audit_*.jsonl"), reverse=True)
        
        for log_file in log_files:
            if len(results) >= limit:
                break
            
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        if len(results) >= limit:
                            break
                        
                        try:
                            event_dict = json.loads(line.strip())
                            event = AuditEvent(**event_dict)
                            
                            # Apply filters
                            if action_type and event.action_type != action_type:
                                continue
                            if reason_code and event.reason_code != reason_code:
                                continue
                            if user_id and event.user_id != user_id:
                                continue
                            
                            event_time = datetime.fromisoformat(event.timestamp.replace('Z', '+00:00'))
                            if start_date and event_time < start_date:
                                continue
                            if end_date and event_time > end_date:
                                continue
                            
                            results.append(event)
                        except (json.JSONDecodeError, TypeError):
                            # Skip malformed lines
                            continue
            except FileNotFoundError:
                # File doesn't exist yet, skip
                continue
        
        return results
    
    def _query_from_database(
        self,
        action_type: Optional[str],
        reason_code: Optional[str],
        user_id: Optional[str],
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        limit: int
    ) -> List[AuditEvent]:
        """
        Query from database.
        
        Phase 6.1+ implementation:
        Build dynamic WHERE clause based on provided filters.
        """
        raise NotImplementedError("Database mode is Phase 6.1+")
    
    def export_last_24h(self, output_path: Optional[Path] = None) -> Path:
        """
        Export last 24 hours of safety events for emergency review.
        
        Args:
            output_path: Where to save export (default: auto-generated)
            
        Returns:
            Path to exported file
        """
        if output_path is None:
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            output_path = self.log_dir / f"emergency_export_{timestamp}.jsonl"
        
        start_time = datetime.now(timezone.utc) - (24 * 3600)  # 24 hours ago (in seconds)
        
        events = self.query_audit_logs(start_date=start_time, limit=100000)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            for event in events:
                json.dump(asdict(event), f, ensure_ascii=False)
                f.write('\n')
        
        return output_path