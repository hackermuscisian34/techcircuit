from pathlib import Path
from typing import Optional, Union, List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = 'CANON Brand Governance Platform'
    VERSION: str = '1.0.0'
    API_V1_STR: str = '/api/v1'
    ENVIRONMENT: str = 'development'
    BASE_DIR: Path = BASE_DIR
    DATABASE_URL: str = f'sqlite:///{BASE_DIR}/canon.db'
    # LLM Provider Configuration (Cloud Open-Source / Local Ollama)
    LLM_PROVIDER: str = 'auto'  # 'huggingface', 'ollama', or 'auto'
    HF_TOKEN: Optional[str] = None
    HF_MODEL: str = 'Qwen/Qwen2.5-7B-Instruct'
    HF_REGION: str = 'auto'  # e.g. 'us-east-1', 'eu-west-1', 'ap-southeast-1', 'auto'
    HF_ENDPOINT_URL: Optional[str] = None
    HF_TIMEOUT_SECONDS: float = 45.0

    OLLAMA_BASE_URL: str = 'http://localhost:11434'
    OLLAMA_MODEL: str = 'qwen2.5:1.5b'
    OLLAMA_FALLBACK_MODEL: str = 'qwen2.5:1.5b'
    OLLAMA_TIMEOUT_SECONDS: float = 45.0
    ALLOW_MOCK_LLM_FALLBACK: bool = True

    CORS_ORIGINS: Union[list[str], str] = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        '*',
    ]

    @field_validator('CORS_ORIGINS', mode='after')
    @classmethod
    def assemble_cors_origins(cls, v: Union[list[str], str]) -> list[str]:
        if isinstance(v, str):
            if v.startswith('[') and v.endswith(']'):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(',') if i.strip()]
        return v

    ENABLE_DEV_PERSONA_SWITCHING: bool = True
    ENABLE_DEMO_ACCOUNTS: bool = True

    # Rate Limiting Settings
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_AUTH_PER_MINUTE: int = 20
    RATE_LIMIT_REVIEWS_PER_MINUTE: int = 40
    RATE_LIMIT_UPLOADS_PER_MINUTE: int = 30
    RATE_LIMIT_DEFAULT_PER_MINUTE: int = 150

    SECRET_KEY: str = 'canon-hackathon-super-secret-key-change-in-production'
    ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    DEFAULT_WORKSPACE_ID: str = 'ws-apexdynamics-001'
    MAX_UPLOAD_SIZE_MB: int = 15
    ALLOWED_EXTENSIONS: list[str] = ['.pdf', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.webp']
    STORAGE_DIR: str = f'{BASE_DIR}/storage'
    MAX_ASSET_UPLOAD_SIZE_MB: int = 25
    ALLOWED_ASSET_EXTENSIONS: list[str] = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.pdf', '.docx', '.txt', '.ttf', '.woff', '.woff2']
    model_config: SettingsConfigDict = {
        'case_sensitive': True,
        'env_file': '.env',
        'extra': 'ignore',
    }

    @property
    def effective_hf_token(self) -> Optional[str]:
        import os
        return (
            self.HF_TOKEN
            or os.environ.get('HF_TOKEN')
            or os.environ.get('HUGGING_FACE_HUB_TOKEN')
            or os.environ.get('HUGGINGFACE_API_KEY')
        )

    def validate_production_settings(self) -> None:
        is_prod = self.ENVIRONMENT.lower() in ('production', 'prod')
        if is_prod:
            insecure_keys = (
                'canon-hackathon-super-secret-key-change-in-production',
                'secret',
                'changeme',
                'password',
                'development-key',
            )
            if not self.SECRET_KEY or self.SECRET_KEY in insecure_keys or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    'FATAL SECURITY: Insecure or insufficient SECRET_KEY in production. '
                    'Must be a cryptographically strong secret of at least 32 characters.'
                )
            if self.ENABLE_DEV_PERSONA_SWITCHING:
                raise ValueError(
                    'FATAL SECURITY: ENABLE_DEV_PERSONA_SWITCHING must be False in production.'
                )
            if self.ENABLE_DEMO_ACCOUNTS:
                raise ValueError(
                    'FATAL SECURITY: ENABLE_DEMO_ACCOUNTS must be False in production.'
                )
            cors = self.CORS_ORIGINS if isinstance(self.CORS_ORIGINS, list) else [self.CORS_ORIGINS]
            if '*' in cors:
                raise ValueError(
                    "FATAL SECURITY: Wildcard '*' CORS origin is strictly forbidden in production with credentials."
                )
        elif self.SECRET_KEY == 'canon-hackathon-super-secret-key-change-in-production':
            import warnings
            warnings.warn(
                '[SECURITY WARNING] Running with default development SECRET_KEY. Change in production.',
                RuntimeWarning,
                stacklevel=2,
            )

settings = Settings()
settings.validate_production_settings()
