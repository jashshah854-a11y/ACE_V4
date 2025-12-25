from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _ts() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return uuid4().hex


class Organization(Base):
    __tablename__ = 'organizations'

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    plan: Mapped[str] = mapped_column(String(50), default='free')
    status: Mapped[str] = mapped_column(String(32), default='active')
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_ts)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_ts, onupdate=_ts)

    users: Mapped[list['User']] = relationship('User', back_populates='organization')
    projects: Mapped[list['Project']] = relationship('Project', back_populates='organization')


class Project(Base):
    __tablename__ = 'projects'
    __table_args__ = (UniqueConstraint('org_id', 'slug', name='uq_project_org_slug'),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(ForeignKey('organizations.id', ondelete='CASCADE'))
    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(64))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_ts)

    organization: Mapped['Organization'] = relationship('Organization', back_populates='projects')


class User(Base):
    __tablename__ = 'users'
    __table_args__ = (UniqueConstraint('email', name='uq_user_email'),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(ForeignKey('organizations.id', ondelete='CASCADE'))
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default='member')
    status: Mapped[str] = mapped_column(String(32), default='active')
    is_owner: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_ts)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_ts, onupdate=_ts)

    organization: Mapped['Organization'] = relationship('Organization', back_populates='users')
    tokens: Mapped[list['ApiToken']] = relationship('ApiToken', back_populates='user')


class ApiToken(Base):
    __tablename__ = 'api_tokens'

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'))
    name: Mapped[str] = mapped_column(String(255))
    prefix: Mapped[str] = mapped_column(String(12), index=True)
    token_hash: Mapped[str] = mapped_column(String(255))
    scopes: Mapped[str] = mapped_column(String(255), default='run:write run:read')
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_ts)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    user: Mapped['User'] = relationship('User', back_populates='tokens')


class RunBinding(Base):
    __tablename__ = 'run_bindings'

    run_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    org_id: Mapped[Optional[str]] = mapped_column(ForeignKey('organizations.id'), nullable=True)
    project_id: Mapped[Optional[str]] = mapped_column(ForeignKey('projects.id'), nullable=True)
    run_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_ts)

    organization: Mapped[Optional['Organization']] = relationship('Organization')
    project: Mapped[Optional['Project']] = relationship('Project')
