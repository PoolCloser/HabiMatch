import base64
import time
import pytest
from cryptography.hazmat.primitives.asymmetric.ec import generate_private_key, SECP256R1
from cryptography.hazmat.primitives.serialization import Encoding, NoEncryption, PrivateFormat
from fastapi.testclient import TestClient
from jose import jwt as jose_jwt
import app.middleware.auth as auth_module
from app.main import app

_private_key = generate_private_key(SECP256R1())
_pub_numbers = _private_key.public_key().public_numbers()
_private_pem = _private_key.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption())


def _b64url(n: int, length: int = 32) -> str:
    return base64.urlsafe_b64encode(n.to_bytes(length, "big")).rstrip(b"=").decode()


TEST_JWKS = {
    "keys": [{
        "kty": "EC",
        "crv": "P-256",
        "kid": "test-key",
        "x": _b64url(_pub_numbers.x),
        "y": _b64url(_pub_numbers.y),
        "use": "sig",
        "alg": "ES256",
    }]
}


@pytest.fixture
def make_token():
    def _make(sub: str = "user-123", aud: str = "authenticated", exp_offset: int = 3600) -> str:
        now = int(time.time())
        return jose_jwt.encode(
            {"sub": sub, "aud": aud, "exp": now + exp_offset, "iat": now},
            _private_pem,
            algorithm="ES256",
            headers={"kid": "test-key"},
        )
    return _make


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(auth_module, "_jwks_cache", TEST_JWKS)
    monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
    return TestClient(app)
