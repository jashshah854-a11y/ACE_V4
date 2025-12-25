from accounts import models, services
from accounts.database import Base
from accounts.security import ALGORITHM, create_access_token, hash_password, verify_password
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import jwt



def make_session():
    engine = create_engine('sqlite:///:memory:', future=True)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, future=True)


def test_user_org_and_api_token_flow():
    Session = make_session()
    with Session() as session:
        org = services.create_organization(session, name='Acme Corp', slug='acme')
        user = services.create_user(
            session,
            org_id=org.id,
            email='owner@example.com',
            password='Supersafe123!',
            role='owner',
            is_owner=True,
        )
        authed = services.authenticate_user(session, 'owner@example.com', 'Supersafe123!')
        assert authed is not None
        secret, token = services.create_api_token(session, user, 'cli')
        session.commit()
        user_id = user.id
        org_id = org.id

    with Session() as session:
        retrieved = services.verify_api_token(session, secret)
        assert retrieved is not None
        assert retrieved.user_id == user_id
        services.bind_run(session, run_id='run-test', org_id=org_id, project_id=None, run_path='/tmp/run-test')
        binding = session.get(models.RunBinding, 'run-test')
        assert binding is not None
        assert binding.org_id == org_id


def test_password_helpers_and_access_token():
    password = 'AnotherStrong!1'
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed)

    dummy_user = type('User', (), {'id': 'abc123', 'org_id': 'org1'})
    token, expires = create_access_token(dummy_user.id, dummy_user.org_id)
    assert expires > 0
    decoded = jwt.decode(token, options={"verify_signature": False}, algorithms=[ALGORITHM])
    assert decoded['sub'] == 'abc123'
    assert decoded['org'] == 'org1'
