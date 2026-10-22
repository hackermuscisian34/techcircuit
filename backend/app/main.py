from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.session import engine, Base
from app.seed.synthetic_brand import seed_database
from app.api.v1.auth import router as auth_router
from app.api.v1.rulebooks import router as rulebooks_router
from app.api.v1.facts import router as facts_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.approvals import router as approvals_router
from app.api.v1.governance import router as governance_router
from app.api.v1.audit import router as audit_router
from app.api.v1.assets import router as assets_router
Base.metadata.create_all(bind=engine)
app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION, description="CANON: Open-Source Brand Governance Compiler. Transforms brand guidelines into versioned, testable rules, evaluates promotional claims against certified evidence, enforces 'No Citation, No Blocking Flag', and maintains tamper-evident audit receipts.", openapi_url=f'{settings.API_V1_STR}/openapi.json', docs_url=f'{settings.API_V1_STR}/docs')
app.add_middleware(CORSMiddleware, allow_origins=['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8000', 'http://127.0.0.1:8000'], allow_credentials=True, allow_methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], allow_headers=['*'])
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(rulebooks_router, prefix=settings.API_V1_STR)
app.include_router(facts_router, prefix=settings.API_V1_STR)
app.include_router(reviews_router, prefix=settings.API_V1_STR)
app.include_router(approvals_router, prefix=settings.API_V1_STR)
app.include_router(governance_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(assets_router, prefix=settings.API_V1_STR)

@app.on_event('startup')
def on_startup():
    try:
        seed_database()
    except Exception as e:
        print(f'Startup notice: {e}')

@app.get('/health', tags=['Health'])
def health_check():
    return {'status': 'healthy', 'version': settings.VERSION, 'database': 'connected', 'ollama_model': settings.OLLAMA_MODEL, 'default_workspace': settings.DEFAULT_WORKSPACE_ID}

@app.get('/', tags=['Root'])
def root():
    return {'name': settings.PROJECT_NAME, 'version': settings.VERSION, 'docs': f'{settings.API_V1_STR}/docs', 'description': 'CANON: The Open-Source Brand Governance Compiler.'}
