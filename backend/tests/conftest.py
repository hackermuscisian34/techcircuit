import os
os.environ["ENVIRONMENT"] = "test"
os.environ["SMTP_HOST"] = ""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.session import Base
from app.seed.synthetic_brand import seed_database, WORKSPACE_ID
from app.db.models import Workspace, User, Rulebook, Rule, Fact
from app.config import settings

settings.SMTP_HOST = None

TEST_DB_URL = 'sqlite:///:memory:'

@pytest.fixture(scope='function')
def db_session():
    engine = create_engine(TEST_DB_URL, connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()
    seed_database(session, is_test=True)
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope='function')
def client(db_session):
    from starlette.testclient import TestClient
    from app.main import app
    from app.db.session import get_db

    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
