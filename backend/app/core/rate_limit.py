import time
import threading
from collections import defaultdict, deque
from typing import Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from app.config import settings

class SlidingWindowRateLimiter:
    """Thread-safe in-memory sliding window rate limiter."""
    def __init__(self):
        self._lock = threading.Lock()
        # map: (key, category) -> deque of timestamps
        self._windows: dict[tuple[str, str], deque[float]] = defaultdict(deque)

    def is_allowed(self, key: str, category: str, limit: int, window_seconds: int = 60) -> tuple[bool, int]:
        """
        Check if the request is allowed.
        Returns (allowed, retry_after_seconds).
        """
        now = time.time()
        bucket_key = (key, category)

        with self._lock:
            timestamps = self._windows[bucket_key]
            # Prune timestamps older than now - window_seconds
            cutoff = now - window_seconds
            while timestamps and timestamps[0] <= cutoff:
                timestamps.popleft()

            if len(timestamps) >= limit:
                # Calculate retry after
                earliest = timestamps[0]
                retry_after = max(1, int(earliest + window_seconds - now))
                return False, retry_after

            timestamps.append(now)
            return True, 0

    def reset(self):
        """Reset all rate limiter windows (useful for testing)."""
        with self._lock:
            self._windows.clear()

# Global rate limiter instance
limiter = SlidingWindowRateLimiter()

def get_client_identifier(request: Request) -> str:
    """Extract client IP safely without blindly trusting unverified forwarded headers."""
    # In production behind a configured reverse proxy, X-Forwarded-For could be checked.
    # To prevent spoofing, we default to client.host unless specifically configured.
    client = request.client
    return client.host if client else "unknown"

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        path = request.url.path

        # Exempt health checks, docs, static files, and schema
        if path in ("/health", "/health/live", "/health/ready", "/docs", "/openapi.json", "/redoc") or path.startswith("/static"):
            return await call_next(request)

        # Categorize route and determine threshold
        category = "default"
        limit = settings.RATE_LIMIT_DEFAULT_PER_MINUTE

        if "/auth/login" in path or "/auth/register" in path:
            category = "auth"
            limit = settings.RATE_LIMIT_AUTH_PER_MINUTE
        elif "/reviews" in path:
            category = "reviews"
            limit = settings.RATE_LIMIT_REVIEWS_PER_MINUTE
        elif "/assets/upload" in path:
            category = "uploads"
            limit = settings.RATE_LIMIT_UPLOADS_PER_MINUTE

        client_id = get_client_identifier(request)
        allowed, retry_after = limiter.is_allowed(client_id, category, limit, window_seconds=60)

        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"Too many requests for {category}. Rate limit exceeded. Try again in {retry_after} seconds.",
                    "category": category,
                    "retry_after": retry_after,
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(limit),
                }
            )

        response = await call_next(request)
        return response
