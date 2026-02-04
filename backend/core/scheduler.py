"""Scheduled run management for ACE V4.

Allows users to schedule recurring analysis runs.
Note: Actual scheduling requires an external cron/task scheduler.
This module manages the schedule definitions and provides endpoints
to trigger scheduled runs.
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from enum import Enum


class ScheduleFrequency(str, Enum):
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


@dataclass
class ScheduledRun:
    """A scheduled recurring run configuration."""
    id: str
    name: str
    description: str = ""
    enabled: bool = True
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    # Schedule settings
    frequency: str = "daily"  # hourly, daily, weekly, monthly
    hour: int = 0  # Hour of day (0-23) for daily/weekly/monthly
    day_of_week: int = 0  # Day of week (0=Monday) for weekly
    day_of_month: int = 1  # Day of month (1-28) for monthly

    # Dataset configuration
    dataset_path: Optional[str] = None
    dataset_url: Optional[str] = None  # For remote datasets

    # Analysis configuration (same as AnalysisConfig)
    config_id: Optional[str] = None  # Reference to saved config
    target_column: Optional[str] = None
    model_type: Optional[str] = None
    fast_mode: bool = True

    # Notification settings
    notify_on_complete: bool = False
    notify_email: Optional[str] = None
    webhook_url: Optional[str] = None

    # Run history
    last_run_at: Optional[float] = None
    last_run_id: Optional[str] = None
    last_run_status: Optional[str] = None
    run_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ScheduledRun":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})

    def should_run_now(self) -> bool:
        """Check if this schedule should run based on current time."""
        now = datetime.now()

        if self.frequency == ScheduleFrequency.HOURLY:
            return True  # Run every hour

        if self.frequency == ScheduleFrequency.DAILY:
            return now.hour == self.hour

        if self.frequency == ScheduleFrequency.WEEKLY:
            return now.weekday() == self.day_of_week and now.hour == self.hour

        if self.frequency == ScheduleFrequency.MONTHLY:
            return now.day == self.day_of_month and now.hour == self.hour

        return False

    def get_next_run_time(self) -> Optional[str]:
        """Get estimated next run time as ISO string."""
        now = datetime.now()

        if self.frequency == ScheduleFrequency.HOURLY:
            next_run = now.replace(minute=0, second=0, microsecond=0)
            if next_run <= now:
                from datetime import timedelta
                next_run = next_run + timedelta(hours=1)
            return next_run.isoformat()

        if self.frequency == ScheduleFrequency.DAILY:
            next_run = now.replace(hour=self.hour, minute=0, second=0, microsecond=0)
            if next_run <= now:
                from datetime import timedelta
                next_run = next_run + timedelta(days=1)
            return next_run.isoformat()

        if self.frequency == ScheduleFrequency.WEEKLY:
            from datetime import timedelta
            days_ahead = self.day_of_week - now.weekday()
            if days_ahead < 0 or (days_ahead == 0 and now.hour >= self.hour):
                days_ahead += 7
            next_run = now + timedelta(days=days_ahead)
            next_run = next_run.replace(hour=self.hour, minute=0, second=0, microsecond=0)
            return next_run.isoformat()

        if self.frequency == ScheduleFrequency.MONTHLY:
            next_run = now.replace(day=self.day_of_month, hour=self.hour, minute=0, second=0, microsecond=0)
            if next_run <= now:
                # Move to next month
                if now.month == 12:
                    next_run = next_run.replace(year=now.year + 1, month=1)
                else:
                    next_run = next_run.replace(month=now.month + 1)
            return next_run.isoformat()

        return None

    def to_run_config(self) -> Dict[str, Any]:
        """Convert to run_config format for starting an analysis."""
        config: Dict[str, Any] = {}

        if self.target_column:
            config["target_column"] = self.target_column
        if self.model_type:
            config["model_type"] = self.model_type
        if self.fast_mode:
            config["fast_mode"] = True

        config["scheduled_run_id"] = self.id
        config["scheduled_run_name"] = self.name

        return config


class SchedulerStore:
    """Manages scheduled run configurations."""

    def __init__(self, storage_path: Optional[Path] = None):
        if storage_path is None:
            storage_path = Path("data/schedules")
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self._schedules_file = self.storage_path / "schedules.json"
        self._schedules: Dict[str, ScheduledRun] = {}
        self._load()

    def _load(self):
        """Load schedules from disk."""
        if self._schedules_file.exists():
            try:
                with open(self._schedules_file) as f:
                    data = json.load(f)
                self._schedules = {
                    k: ScheduledRun.from_dict(v) for k, v in data.items()
                }
            except Exception:
                self._schedules = {}

    def _save(self):
        """Save schedules to disk."""
        data = {k: v.to_dict() for k, v in self._schedules.items()}
        with open(self._schedules_file, "w") as f:
            json.dump(data, f, indent=2)

    def create(self, schedule: ScheduledRun) -> ScheduledRun:
        """Create a new scheduled run."""
        if not schedule.id:
            schedule.id = f"schedule_{int(time.time() * 1000)}"
        schedule.created_at = time.time()
        schedule.updated_at = time.time()
        self._schedules[schedule.id] = schedule
        self._save()
        return schedule

    def update(self, schedule_id: str, updates: Dict[str, Any]) -> Optional[ScheduledRun]:
        """Update an existing schedule."""
        if schedule_id not in self._schedules:
            return None

        schedule = self._schedules[schedule_id]
        for key, value in updates.items():
            if hasattr(schedule, key):
                setattr(schedule, key, value)
        schedule.updated_at = time.time()
        self._save()
        return schedule

    def delete(self, schedule_id: str) -> bool:
        """Delete a schedule."""
        if schedule_id in self._schedules:
            del self._schedules[schedule_id]
            self._save()
            return True
        return False

    def get(self, schedule_id: str) -> Optional[ScheduledRun]:
        """Get a schedule by ID."""
        return self._schedules.get(schedule_id)

    def list(self, enabled_only: bool = False) -> List[ScheduledRun]:
        """List all schedules."""
        schedules = list(self._schedules.values())

        if enabled_only:
            schedules = [s for s in schedules if s.enabled]

        schedules.sort(key=lambda s: s.updated_at, reverse=True)
        return schedules

    def get_due_schedules(self) -> List[ScheduledRun]:
        """Get schedules that are due to run now."""
        return [
            s for s in self._schedules.values()
            if s.enabled and s.should_run_now()
        ]

    def record_run(
        self,
        schedule_id: str,
        run_id: str,
        status: str,
    ):
        """Record that a scheduled run was executed."""
        schedule = self._schedules.get(schedule_id)
        if schedule:
            schedule.last_run_at = time.time()
            schedule.last_run_id = run_id
            schedule.last_run_status = status
            schedule.run_count += 1
            self._save()


# Global store instance
_scheduler_store: Optional[SchedulerStore] = None


def get_scheduler_store(storage_path: Optional[Path] = None) -> SchedulerStore:
    """Get or create the global scheduler store."""
    global _scheduler_store
    if _scheduler_store is None:
        _scheduler_store = SchedulerStore(storage_path)
    return _scheduler_store
