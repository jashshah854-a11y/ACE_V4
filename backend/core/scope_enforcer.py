"""Scope enforcer - trims dataframes based on scope constraints."""

import pandas as pd
from core.state_manager import StateManager


class ScopeViolationError(Exception):
    """Raised when an agent violates its scope constraints."""
    pass


class ScopeEnforcer:
    """Guards agent execution against scope constraints defined by the task contract."""

    def __init__(self, state: StateManager, agent: str = ""):
        self.state = state
        self.agent = agent
        self.constraints = state.read("scope_constraints") or []

    def trim_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Apply scope constraints to trim the dataframe. Returns df as-is if no constraints apply."""
        contract = self.state.read("task_contract") or {}
        allowed_columns = contract.get("allowed_columns")
        if allowed_columns and isinstance(allowed_columns, list):
            valid = [c for c in allowed_columns if c in df.columns]
            if valid:
                return df[valid]
        return df
