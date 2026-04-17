import os
import httpx
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_bearer = HTTPBearer()
_jwks_cache: dict | None = None


def _supabase_url() -> str:
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    if not url:
        raise RuntimeError("SUPABASE_URL is not set")
    return url


def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is None:
        url = f"{_supabase_url()}/auth/v1/.well-known/jwks.json"
        response = httpx.get(url, timeout=5)
        response.raise_for_status()
        _jwks_cache = response.json()
    return _jwks_cache


def require_auth(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """FastAPI dependency — verifies the Supabase JWT and returns the decoded payload.

    Supports ECC (P-256) keys via JWKS. Raises 401 if the token is missing,
    expired, or has an invalid signature.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            _get_jwks(),
            algorithms=["ES256"],
            audience="authenticated",
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        )
    return payload
