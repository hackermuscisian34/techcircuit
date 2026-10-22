import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, Dict, Any, List, Callable
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.config import settings
from app.db.session import get_db
from app.db.models import User
http_bearer = HTTPBearer(auto_error=False)

class PasswordCrypt:
    ALGORITHM = 'sha256'
    ITERATIONS = 100000

    @classmethod
    def derive_hash(cls, passphrase_plain: str) -> str:
        entropy_seed = secrets.token_hex(16)
        derived = hashlib.pbkdf2_hmac(cls.ALGORITHM, passphrase_plain.encode('utf-8'), entropy_seed.encode('utf-8'), cls.ITERATIONS)
        return f'{entropy_seed}${derived.hex()}'

    @classmethod
    def check_match(cls, candidate_plain: str, recorded_digest: str) -> bool:
        try:
            seed_part, digest_part = recorded_digest.split('$')
            computed = hashlib.pbkdf2_hmac(cls.ALGORITHM, candidate_plain.encode('utf-8'), seed_part.encode('utf-8'), cls.ITERATIONS)
            return hmac.compare_digest(computed.hex(), digest_part)
        except Exception:
            return False

def hash_password(password: str) -> str:
    return PasswordCrypt.derive_hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return PasswordCrypt.check_match(plain_password, hashed_password)

class JwtTokenSigner:
    ISSUER_TAG = 'canon-auth'
    TOKEN_CATEGORY = 'access'

    @classmethod
    def mint_token(cls, claim_set: dict, validity_window: Optional[timedelta]=None) -> str:
        payload = dict(claim_set)
        timestamp_now = datetime.now(timezone.utc)
        expiration = timestamp_now + validity_window if validity_window else timestamp_now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        payload.update({'exp': expiration, 'iat': timestamp_now, 'type': cls.TOKEN_CATEGORY, 'iss': cls.ISSUER_TAG})
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    @classmethod
    def inspect_token(cls, raw_jwt: str) -> Optional[dict]:
        try:
            claims = jwt.decode(raw_jwt, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={'require': ['exp', 'sub']})
            if claims.get('type') != cls.TOKEN_CATEGORY:
                return None
            return claims
        except (jwt.PyJWTError, Exception):
            return None

def create_access_token(data: dict, expires_delta: Optional[timedelta]=None) -> str:
    return JwtTokenSigner.mint_token(data, expires_delta)

def decode_access_token(token: str) -> Optional[dict]:
    return JwtTokenSigner.inspect_token(token)

class PrincipalResolver:

    @staticmethod
    def resolve_authenticated_user(bearer_envelope: Optional[HTTPAuthorizationCredentials], database_session: Session) -> User:
        if not bearer_envelope or not bearer_envelope.credentials:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Authentication credentials were not provided.', headers={'WWW-Authenticate': 'Bearer'})
        extracted_claims = JwtTokenSigner.inspect_token(bearer_envelope.credentials)
        if not extracted_claims:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid, expired, or malformed authentication token.', headers={'WWW-Authenticate': 'Bearer'})
        subject_identifier = extracted_claims.get('sub')
        if not subject_identifier:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Token missing subject identifier.', headers={'WWW-Authenticate': 'Bearer'})
        principal = database_session.query(User).filter(User.id == subject_identifier, User.is_active.is_(True)).first()
        if not principal:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User associated with this token does not exist or has been deactivated.', headers={'WWW-Authenticate': 'Bearer'})
        return principal

def get_current_user(auth: Optional[HTTPAuthorizationCredentials]=Depends(http_bearer), db: Session=Depends(get_db)) -> User:
    return PrincipalResolver.resolve_authenticated_user(auth, db)

class RoleGatekeeper:

    @staticmethod
    def enforce(*authorized_ranks: str) -> Callable[[User], User]:

        def validator(current_principal: User=Depends(get_current_user)) -> User:
            if current_principal.role not in authorized_ranks:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Role '{current_principal.role}' is not authorized for this resource. Required: {', '.join(authorized_ranks)}")
            return current_principal
        return validator

def require_roles(*allowed_roles: str) -> Callable[[User], User]:
    return RoleGatekeeper.enforce(*allowed_roles)
REDACTION_PATTERNS = [('\\b(Project\\s+[A-Z][a-zA-Z0-9]+)\\b', '[CONFIDENTIAL_PROJECT]'), ('\\b(Titan\\s+V[0-9]+|AeroX-[0-9]+)\\b', '[PRE_RELEASE_CODENAME]'), ('\\$(\\d{1,3}(,\\d{3})*(\\.\\d{2})?)\\s*(per|\\/)\\s*(mo|year|seat|user|month)', '[MASKED_PRICING]'), ('\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b', '[REDACTED_EMAIL]'), ('\\b(sk-[a-zA-Z0-9]{24,}|ghp_[a-zA-Z0-9]{24,}|bearer\\s+[a-zA-Z0-9_\\-\\.]+)\\b', '[REDACTED_SECRET]', re.IGNORECASE)]

class RedactionMaskEngine:

    @classmethod
    def mask_corpus(cls, untrusted_corpus: str) -> Tuple[str, Dict[str, str]]:
        active_buffer = untrusted_corpus
        token_vault: Dict[str, str] = {}
        for rule in REDACTION_PATTERNS:
            expr_str = rule[0]
            token_base = rule[1]
            regex_flags = rule[2] if len(rule) > 2 else 0
            matches = list(re.finditer(expr_str, active_buffer, flags=regex_flags))
            for occurrence in reversed(matches):
                verbatim_slice = occurrence.group(0)
                mask_label = f'{token_base}_{len(token_vault) + 1}'
                token_vault[mask_label] = verbatim_slice
                idx_left, idx_right = occurrence.span()
                active_buffer = active_buffer[:idx_left] + mask_label + active_buffer[idx_right:]
        return (active_buffer, token_vault)

def sanitize_and_redact_content(text: str) -> Tuple[str, Dict[str, str]]:
    return RedactionMaskEngine.mask_corpus(text)
