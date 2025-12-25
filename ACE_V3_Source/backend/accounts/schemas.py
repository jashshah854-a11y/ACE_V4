from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class OrgCreate(BaseModel):
    name: str
    slug: str
    plan: str = 'free'


class OrgRead(BaseModel):
    id: str
    name: str
    slug: str
    plan: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    email: str
    password: str = Field(min_length=8)
    org_id: Optional[str] = None
    role: str = 'member'


class UserRead(BaseModel):
    id: str
    email: str
    org_id: str
    role: str
    status: str
    is_owner: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    expires_in: int


class LoginRequest(BaseModel):
    email: str
    password: str


class ApiTokenCreate(BaseModel):
    name: str
    scopes: str = 'run:write run:read'


class ApiTokenRead(BaseModel):
    id: str
    name: str
    prefix: str
    scopes: str
    created_at: datetime
    last_used_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

class SignupRequest(BaseModel):
    org_name: str
    org_slug: str
    email: str
    password: str = Field(min_length=8)


class AuthenticatedUser(BaseModel):
    token: str
    expires_in: int
    user: UserRead
    organization: OrgRead



class ApiTokenResponse(ApiTokenRead):
    secret: Optional[str] = None
