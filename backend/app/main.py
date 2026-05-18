from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends
from app.matching import CompatibilityRequest, CompatibilityResponse, calculate_compatibility
from app.middleware.auth import require_auth

from backend.models.user_profile import router as profile_router
from backend.models.lifestyle import router as lifestyle_router
from backend.models.matches import router as matches_router

app = FastAPI(title="HabiMatch API")

app.include_router(profile_router, prefix="/profile", tags=["profile"])
app.include_router(lifestyle_router, prefix="/lifestyle", tags=["lifestyle"])
app.include_router(matches_router, prefix="/matches", tags=["matches"])


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


@app.get("/feed")
def get_feed(user: dict = Depends(require_auth)):
    # Mock profile suggestions for the mobile feed until this endpoint is backed by the profiles table.
    return {
        "suggestions": [
            {
                "id": "11111111-1111-1111-1111-111111111111",
                "full_name": "Maya Chen",
                "avatar_url": "https://example.com/maya.jpg",
                "bio": "Clean, quiet, and looking for a respectful roommate.",
                "age": 24,
                "gender": "female",
                "location": "Los Angeles, CA",
                "questionnaire_complete": True,
                "wake_time": "7:00 AM",
                "sleep_time": "11:00 PM",
                "cleanliness": "very_clean",
                "noise_level": "quiet",
                "wfh_frequency": "hybrid",
                "social_level": "moderate",
                "guest_frequency": "sometimes",
                "smoking": "no",
                "pets": "no",
                "budget": "$1200-$1800",
            },
            {
                "id": "22222222-2222-2222-2222-222222222222",
                "full_name": "Jordan Lee",
                "avatar_url": "https://example.com/jordan.jpg",
                "bio": "Works hybrid, likes shared dinners, and keeps common spaces tidy.",
                "age": 27,
                "gender": "nonbinary",
                "location": "Santa Monica, CA",
                "questionnaire_complete": True,
                "wake_time": "8:00 AM",
                "sleep_time": "12:00 AM",
                "cleanliness": "clean",
                "noise_level": "moderate",
                "wfh_frequency": "hybrid",
                "social_level": "social",
                "guest_frequency": "occasionally",
                "smoking": "no",
                "pets": "cat",
                "budget": "$1500-$2200",
            },
        ]
    }
