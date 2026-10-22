from pathlib import Path
from typing import Optional
from pydantic import ConfigDict
from pydantic_settings import BaseSettings
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = 'CANON Brand Governance Platform'
    VERSION: str = '1.0.0'
    API_V1_STR: str = '/api/v1'
    ENVIRONMENT: str = 'development'
    BASE_DIR: Path = BASE_DIR
    DATABASE_URL: str = f'sqlite:///{BASE_DIR}/canon.db'
    OLLAMA_BASE_URL: str = 'http://localhost:11434'
    OLLAMA_MODEL: str = 'qwen2.5:1.5b'
    OLLAMA_FALLBACK_MODEL: str = 'qwen2.5:1.5b'
    OLLAMA_TIMEOUT_SECONDS: float = 45.0
    ALLOW_MOCK_LLM_FALLBACK: bool = True
    SECRET_KEY: str = 'canon-hackathon-super-secret-key-change-in-production'
    ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    DEFAULT_WORKSPACE_ID: str = 'ws-apexdynamics-001'
    MAX_UPLOAD_SIZE_MB: int = 15
    ALLOWED_EXTENSIONS: list[str] = ['.pdf', '.docx', '.txt', '.png', '.jpg', '.jpeg']
    STORAGE_DIR: str = f'{BASE_DIR}/storage'
    MAX_ASSET_UPLOAD_SIZE_MB: int = 25
    ALLOWED_ASSET_EXTENSIONS: list[str] = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.pdf', '.docx', '.txt', '.ttf', '.woff', '.woff2']
    model_config = ConfigDict(case_sensitive=True, env_file='.env', extra='ignore')

    def validate_production_settings(self) -> None:
        if self.ENVIRONMENT.lower() == 'production':
            if not self.SECRET_KEY or self.SECRET_KEY == 'canon-hackathon-super-secret-key-change-in-production':
                raise ValueError('FATAL SECURITY: Insecure default SECRET_KEY in production environment.')
settings = Settings()
settings.validate_production_settings()
