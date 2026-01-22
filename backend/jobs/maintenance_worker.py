"""
Maintenance Worker for Phase 8B Dormancy.
Executes periodic governance tasks even when system is idle.

Primary Responsibility:
- Enforce memory decay ("Memory must decay")
- Validate integrity controls

Usage:
    python -m backend.jobs.maintenance_worker
"""

import sys
import os
import logging
from typing import List, Dict
from datetime import datetime, timedelta

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.api.decision_models import MemoryAssertion, ReconciliationNote
from backend.jobs.reconciliation_engine import ReconciliationEngine
from backend.core.audit_logger import AuditLogger

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ace.maintenance")

class MaintenanceWorker:
    def __init__(self, data_source=None):
        self.audit_logger = AuditLogger(mode="file")
        # In a real impl, data_source would be the DB connection
        # For Phase 6.0, we pass in a dict or mock
        self.data_source = data_source or {}

    def run_maintenance(self):
        """Execute all maintenance tasks."""
        logger.info("[MAINTENANCE] Starting dormancy maintenance cycle...")
        
        # Task 1: Memory Decay
        self._enforce_memory_decay()
        
        logger.info("[MAINTENANCE] Cycle complete.")

    def _enforce_memory_decay(self):
        """
        Run reconciliation engine for all users to trigger decay.
        """
        # Mocking user retrieval for Phase 6.0 (In-Memory/File stub)
        # In prod, query distinct user_ids from DB
        users = self._get_all_users()
        
        decay_count = 0
        
        for user_id in users:
            # Load user assertions
            assertions = self._load_user_assertions(user_id)
            
            if not assertions:
                continue
                
            # Initialize engine
            engine = ReconciliationEngine(
                assertions=assertions,
                existing_notes=[]
            )
            
            # Run evaluation (Triggers decay logic)
            # We don't care about the state result here, just the side effects (notes/updates)
            engine.evaluate_coherence(user_id)
            
            # Check for changes
            new_notes = engine.get_reconciliation_notes()
            if new_notes:
                self._save_updates(user_id, assertions, new_notes)
                decay_count += len(new_notes)
                
        # Log the maintenance run
        self.audit_logger.log_decision(
            action_type="maintenance_decay",
            allowed=True,
            reason_code="dormancy_protocol",
            user_id="system",
            context={
                "component": "maintenance_worker",
                "items_processed": len(users),
                "decay_events": decay_count
            }
        )
        logger.info(f"[MAINTENANCE] Decay check complete. {decay_count} items decayed.")

    def _get_all_users(self) -> List[str]:
        """Retrieve list of users to check."""
        if isinstance(self.data_source, dict):
             return list(self.data_source.keys())
        return []

    def _load_user_assertions(self, user_id: str) -> List[MemoryAssertion]:
        """Load assertions for a user."""
        if isinstance(self.data_source, dict):
            return self.data_source.get(user_id, [])
        return []

    def _save_updates(self, user_id: str, assertions: List[MemoryAssertion], notes: List[ReconciliationNote]):
        """Persist updates back to storage."""
        if isinstance(self.data_source, dict):
            # Update the source dict in place for the mock
            self.data_source[user_id] = assertions
            # In a real DB, we would commit items here

if __name__ == "__main__":
    worker = MaintenanceWorker()
    worker.run_maintenance()
