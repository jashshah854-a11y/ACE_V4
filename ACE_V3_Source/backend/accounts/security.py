from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt

from core.config import settings

ALGORITHM = 'HS256'
_PBKDF2_ITERATIONS = 120_000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), _PBKDF2_ITERATIONS)
    return f'pbkdf2${salt}${digest.hex()}'


def verify_password(password: str, hashed: str) -> bool:
    try:
        _, salt, stored = hashed.split('$', 2)
    except ValueError:
        return False
    new_digest = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), _PBKDF2_ITERATIONS).hex()
    return hmac.compare_digest(new_digest, stored)


def create_access_token(subject: str, org_id: Optional[str], *, expires_minutes: Optional[int] = None) -> tuple[str, int]:
    expires = expires_minutes or settings.token_expire_minutes
    expire_at = datetime.now(timezone.utc) + timedelta(minutes=expires)
    payload = {
        'sub': subject,
        'org': org_id,
        'exp': expire_at,
        'iat': datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, settings.token_secret, algorithm=ALGORITHM)
    return token, expires


def generate_api_token(prefix_length: int = 8, secret_length: int = 32) -> tuple[str, str]:
    prefix = secrets.token_hex(prefix_length // 2)
    secret = secrets.token_urlsafe(secret_length)
    return prefix, secret
