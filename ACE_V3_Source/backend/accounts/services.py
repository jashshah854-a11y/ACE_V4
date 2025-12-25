from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models
from .security import hash_password, verify_password, generate_api_token


class AccountError(Exception):
    pass


def create_organization(session: Session, name: str, slug: str, plan: str = 'free') -> models.Organization:
    exists = session.scalar(select(models.Organization).where(models.Organization.slug == slug))
    if exists:
        raise AccountError('Organization slug already in use')
    org = models.Organization(name=name, slug=slug, plan=plan)
    session.add(org)
    session.flush()
    return org


def ensure_project(session: Session, org_id: str, *, name: str, slug: str) -> models.Project:
    project = session.scalar(
        select(models.Project).where(models.Project.org_id == org_id, models.Project.slug == slug)
    )
    if project:
        return project
    project = models.Project(org_id=org_id, name=name, slug=slug)
    session.add(project)
    session.flush()
    return project


def create_user(session: Session, *, org_id: str, email: str, password: str, role: str = 'member', is_owner: bool = False) -> models.User:
    existing = session.scalar(select(models.User).where(models.User.email == email))
    if existing:
        raise AccountError('Email already registered')
    user = models.User(
        org_id=org_id,
        email=email.lower(),
        hashed_password=hash_password(password),
        role=role,
        is_owner=is_owner,
    )
    session.add(user)
    session.flush()
    return user


def authenticate_user(session: Session, email: str, password: str) -> Optional[models.User]:
    user = session.scalar(select(models.User).where(models.User.email == email.lower()))
    if not user or user.status != 'active':
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_api_token(session: Session, user: models.User, name: str, scopes: str = 'run:write run:read') -> Tuple[str, models.ApiToken]:
    prefix, secret = generate_api_token()
    token = models.ApiToken(
        user_id=user.id,
        name=name,
        prefix=prefix,
        token_hash=hash_password(secret),
        scopes=scopes,
    )
    session.add(token)
    session.flush()
    full_token = f"{prefix}.{secret}"
    return full_token, token


def verify_api_token(session: Session, presented: str) -> Optional[models.ApiToken]:
    if '.' not in presented:
        return None
    prefix, secret = presented.split('.', 1)
    token = session.scalar(select(models.ApiToken).where(models.ApiToken.prefix == prefix))
    if not token:
        return None
    if not verify_password(secret, token.token_hash):
        return None
    token.last_used_at = datetime.now(timezone.utc)
    session.add(token)
    return token


def bind_run(session: Session, run_id: str, org_id: Optional[str], project_id: Optional[str], run_path: Optional[str]):
    binding = models.RunBinding(run_id=run_id, org_id=org_id, project_id=project_id, run_path=run_path)
    session.merge(binding)


def bootstrap_signup(session: Session, *, org_name: str, org_slug: str, email: str, password: str) -> Tuple[models.Organization, models.User]:
    org = create_organization(session, name=org_name, slug=org_slug)
    user = create_user(session, org_id=org.id, email=email, password=password, role='owner', is_owner=True)
    ensure_project(session, org.id, name='Default Project', slug='default')
    return org, user
