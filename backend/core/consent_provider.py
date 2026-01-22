"""
Consent Provider Interface for Phase 5 Safety System.

This module defines the contract for consent checking and provides
development and production implementations.

CRITICAL: Backend is the source of truth. Frontend never trusted.
Default consent: FALSE (opt-in required).
"""

from abc import ABC, abstractmethod
import os
from typing import Dict


class ConsentProvider(ABC):
    """
    Abstract base for consent checking.
    
    All implementations must provide per-user consent lookup
    with a safe default of False.
    """
    
    @abstractmethod
    def get_consent(self, user_id: str) -> bool:
        """
        Check if user has given memory consent.
        
        Args:
            user_id: User identifier
            
        Returns:
            True if user has opted in, False otherwise (safe default)
        """
        pass


class MockConsentProvider(ConsentProvider):
    """
    Development/staging consent provider.
    
    Controlled by environment variable MOCK_CONSENT_VALUE.
    
    Phase 6.0: Used for development and testing.
    Phase 6.1: Replaced by DatabaseConsentProvider.
    """
    
    def __init__(self):
        """Initialize with env-controlled default."""
        # Safe default: False (opt-in required)
        self.default_consent = self._get_env_bool("MOCK_CONSENT_VALUE", default=False)
        
        # Optional per-user overrides for testing
        # Format: MOCK_CONSENT_USERS=user1:true,user2:false
        self.user_overrides: Dict[str, bool] = {}
        self._load_user_overrides()
    
    def _get_env_bool(self, key: str, default: bool = False) -> bool:
        """Parse boolean from environment variable."""
        value = os.getenv(key, str(default)).lower()
        return value in ('true', '1', 'yes', 'on')
    
    def _load_user_overrides(self):
        """Load per-user consent overrides from env for testing."""
        overrides_str = os.getenv("MOCK_CONSENT_USERS", "")
        if not overrides_str:
            return
        
        try:
            for pair in overrides_str.split(","):
                if not pair.strip():
                    continue
                user_id, consent_str = pair.split(":")
                consent_value = consent_str.strip().lower() in ('true', '1', 'yes')
                self.user_overrides[user_id.strip()] = consent_value
        except Exception:
            # Invalid format, ignore
            pass
    
    def get_consent(self, user_id: str) -> bool:
        """
        Check mock consent for user.
        
        Priority:
        1. Per-user override (if set via MOCK_CONSENT_USERS)
        2. Global default (MOCK_CONSENT_VALUE, defaults to False)
        
        Args:
            user_id: User identifier
            
        Returns:
            Consent status (defaults to False for safety)
        """
        # Check user-specific override first
        if user_id in self.user_overrides:
            return self.user_overrides[user_id]
        
        # Fall back to global default
        return self.default_consent


class DatabaseConsentProvider(ConsentProvider):
    """
    Production consent provider backed by user preferences.
    
    Phase 6.1: Reads from user_preferences table.
    Field: memory_consent (boolean, default FALSE)
    
    This is a STUB for Phase 6.0. Implementation in Phase 6.1.
    """
    
    def __init__(self, db_connection=None):
        """
        Initialize with database connection.
        
        Args:
            db_connection: Database session/connection
        """
        self.db = db_connection
        if self.db is None:
            raise ValueError(
                "DatabaseConsentProvider requires a database connection. "
                "Use MockConsentProvider for Phase 6.0 development."
            )
    
    def get_consent(self, user_id: str) -> bool:
        """
        Query user consent from database.
        
        SQL (pseudo):
            SELECT memory_consent 
            FROM user_preferences 
            WHERE user_id = ?
            
        Returns False if user not found (safe default).
        
        Args:
            user_id: User identifier
            
        Returns:
            User's consent status, False if not found
        """
        # STUB: Phase 6.1 implementation
        # In Phase 6.1, replace with actual DB query:
        #
        # try:
        #     result = self.db.execute(
        #         "SELECT memory_consent FROM user_preferences WHERE user_id = ?",
        #         (user_id,)
        #     ).fetchone()
        #     
        #     if result is None:
        #         # User not found - safe default
        #         return False
        #     
        #     return bool(result['memory_consent'])
        # except Exception:
        #     # Database error - fail safe
        #     return False
        
        raise NotImplementedError(
            "DatabaseConsentProvider is a Phase 6.1 feature. "
            "Use MockConsentProvider for Phase 6.0."
        )


def create_consent_provider(mode: str = "mock", **kwargs) -> ConsentProvider:
    """
    Factory function to create appropriate consent provider.
    
    Args:
        mode: "mock" or "database"
        **kwargs: Additional arguments for provider (e.g., db_connection)
        
    Returns:
        ConsentProvider instance
        
    Example:
        # Development
        provider = create_consent_provider("mock")
        
        # Production (Phase 6.1)
        provider = create_consent_provider("database", db_connection=db)
    """
    if mode == "mock":
        return MockConsentProvider()
    elif mode == "database":
        return DatabaseConsentProvider(db_connection=kwargs.get("db_connection"))
    else:
        raise ValueError(f"Unknown consent provider mode: {mode}")
