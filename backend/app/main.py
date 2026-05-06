from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends
from app.matching import CompatibilityRequest, CompatibilityResponse, calculate_compatibility
from app.middleware.auth import require_auth

from backend.models.user_profile import router as profile_router
from backend.models.lifestyle import router as lifestyle_router  # ✅ ADD THIS

app = FastAPI(title="HabiMatch API")

app.include_router(profile_router, prefix="/profile", tags=["profile"])
app.include_router(lifestyle_router, prefix="/lifestyle", tags=["lifestyle"])  # ✅ ADD THIS


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