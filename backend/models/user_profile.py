from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.models.database import get_db
from backend.models.models import Profile
from backend.models.schemas import ProfileCreate, ProfileUpdate, ProfileResponse
from backend.models.auth import require_auth  # ← already correct, just keep this
from uuid import UUID

router = APIRouter(tags=["Profile"])

@router.post("/", response_model=ProfileResponse)
def create_profile(
    profile_data: ProfileCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth)
):
    user_id = UUID(current_user["sub"])
    existing = db.query(Profile).filter(Profile.id == user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists. Use PUT to update.")
    profile = Profile(id=user_id, **profile_data.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

@router.put("/", response_model=ProfileResponse)
def update_profile(
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth)
):
    user_id = UUID(current_user["sub"])
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    for key, value in profile_data.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile

@router.get("/", response_model=ProfileResponse)
def get_profile(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth)
):
    user_id = UUID(current_user["sub"])
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.delete("/", status_code=204)
def delete_profile(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth)
):
    user_id = UUID(current_user["sub"])
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if profile:
        db.delete(profile)
        db.commit()