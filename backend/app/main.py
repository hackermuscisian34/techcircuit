import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        seed_database()
    except Exception as e:
        print(f'Startup notice: {e}')
    yield

is_prod = settings.ENVIRONMENT.lower() in ('production', 'prod')
raw_origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS]
sanitized_cors_origins = [o for o in raw_origins if o != '*'] if is_prod else raw_origins

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="CANON / FIDELIS: Open-Source Brand Governance Compiler. Transforms brand guidelines into versioned, testable rules, evaluates promotional claims against certified evidence, enforces 'No Citation, No Blocking Flag', and maintains tamper-evident audit receipts.",
    openapi_url=f'{settings.API_V1_STR}/openapi.json',
    docs_url=f'{settings.API_V1_STR}/docs',
    lifespan=lifespan,
)

from app.core.rate_limit import RateLimitMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=sanitized_cors_origins,
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allow_headers=['*'],
)
app.add_middleware(RateLimitMiddleware)

@app.middleware('http')
async def security_and_observability_middleware(request: Request, call_next):
    correlation_id = request.headers.get('X-Correlation-ID') or str(uuid.uuid4())
    request.state.correlation_id = correlation_id
    response = await call_next(request)
    response.headers['X-Correlation-ID'] = correlation_id
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    if is_prod:
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response

app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(rulebooks_router, prefix=settings.API_V1_STR)
app.include_router(facts_router, prefix=settings.API_V1_STR)
app.include_router(reviews_router, prefix=settings.API_V1_STR)
app.include_router(approvals_router, prefix=settings.API_V1_STR)
app.include_router(governance_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(assets_router, prefix=settings.API_V1_STR)

@app.api_route('/health', methods=['GET', 'HEAD'], tags=['Health'])
def health_check():
    active_is_hf = bool(settings.effective_hf_token or settings.LLM_PROVIDER == 'huggingface') and settings.LLM_PROVIDER != 'ollama'
    active_provider = 'huggingface' if active_is_hf else 'ollama'
    active_model = settings.HF_MODEL if active_is_hf else settings.OLLAMA_MODEL
    db_status = 'connected'
    try:
        with engine.connect() as conn:
            conn.execute(text('SELECT 1'))
    except Exception:
        db_status = 'error'

    return {
        'status': 'healthy' if db_status == 'connected' else 'degraded',
        'version': settings.VERSION,
        'environment': settings.ENVIRONMENT,
        'database': db_status,
        'llm_provider': active_provider,
        'llm_model': active_model,
        'llm_region': settings.HF_REGION,
        'ollama_model': settings.OLLAMA_MODEL,
        'default_workspace': settings.DEFAULT_WORKSPACE_ID,
    }

@app.get('/health/live', tags=['Health'])
def liveness_probe():
    return {'status': 'alive', 'version': settings.VERSION}

@app.get('/health/ready', tags=['Health'])
def readiness_probe():
    try:
        with engine.connect() as conn:
            conn.execute(text('SELECT 1'))
    except Exception:
        raise HTTPException(status_code=503, detail='Database connection failed.')
    try:
        storage_path = Path(settings.STORAGE_DIR)
        storage_path.mkdir(parents=True, exist_ok=True)
    except Exception:
        raise HTTPException(status_code=503, detail='Storage subsystem inaccessible.')
    return {
        'status': 'ready',
        'version': settings.VERSION,
        'database': 'connected',
        'storage': 'accessible',
    }

@app.api_route('/', methods=['GET', 'HEAD'], tags=['Root'])
def root():
    return {'name': settings.PROJECT_NAME, 'version': settings.VERSION, 'docs': f'{settings.API_V1_STR}/docs', 'description': 'CANON: The Open-Source Brand Governance Compiler.'}
