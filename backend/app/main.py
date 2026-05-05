from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends
from app.matching import CompatibilityRequest, CompatibilityResponse, calculate_compatibility
from app.middleware.auth import require_auth

app = FastAPI(title="HabiMatch API")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/protected")
def protected_example(user: dict = Depends(require_auth)):
    return {"user_id": user.get("sub"), "email": user.get("email")}


@app.post("/matching/compatibility", response_model=CompatibilityResponse)
def calculate_match_compatibility(
    request: CompatibilityRequest,
    _user: dict = Depends(require_auth),
):
    return calculate_compatibility(request.left, request.right)
