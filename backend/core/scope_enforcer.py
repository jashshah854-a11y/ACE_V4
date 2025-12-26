"""Scope enforcement helpers to prevent out-of-contract exploration."""

from __future__ import annotations

from typing import Iterable, List, Optional, Sequence

import pandas as pd

from core.data_guardrails import append_limitation
from core.state_manager import StateManager


class ScopeViolationError(RuntimeError):
    """Raised when an agent attempts to operate outside the signed task contract."""


class ScopeEnforcer:
    def __init__(self, state_manager: StateManager, agent: str):
        self.state_manager = state_manager
        self.agent = agent
        self.contract = state_manager.read("task_contract") or {}
        inclusions = self.contract.get("scope_inclusions") or []
        self.allowed = {col.lower(): col for col in inclusions}
        exclusions = self.contract.get("scope_exclusions") or []
        self.excluded = {col.lower() for col in exclusions}

    def _note(self, message: str, severity: str = "warning") -> None:
        append_limitation(self.state_manager, message, agent=self.agent, severity=severity)

    def filter_columns(self, requested: Sequence[str]) -> List[str]:
        if not requested:
            raise ScopeViolationError("No columns supplied for scope enforcement.")

        filtered: List[str] = []
        dropped: List[str] = []
        whitelist = set(self.allowed.keys()) if self.allowed else None

        for column in requested:
            lower = column.lower()
            if lower in self.excluded:
                dropped.append(column)
                continue
            if whitelist is not None and lower not in whitelist:
                dropped.append(column)
                continue
            filtered.append(column)

        if dropped:
            self._note(
                f"Scope lock trimmed columns for {self.agent}: {', '.join(dropped[:5])}",
                severity="warning",
            )

        if not filtered:
            raise ScopeViolationError("Scope lock removed all requested columns. Create a new run with expanded scope.")

        return filtered

    def trim_dataframe(self, df: pd.DataFrame, requested: Optional[Sequence[str]] = None) -> pd.DataFrame:
        requested_cols: Sequence[str] = requested or list(df.columns)
        kept = self.filter_columns(requested_cols)
        missing = [col for col in kept if col not in df.columns]
        if missing:
            raise ScopeViolationError(
                f"Contract requires columns that are absent in the dataset: {', '.join(missing[:5])}."
            )
        trimmed = df[kept].copy()
        if len(kept) != len(df.columns):
            self._note(
                f"{self.agent.title()} limited to {len(kept)} in-scope columns (was {len(df.columns)}).",
                severity="info",
            )
        return trimmed


