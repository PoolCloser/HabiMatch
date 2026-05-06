# lifestyle.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.models.database import get_db
from backend.models.models import LifestylePreferences
from backend.models.schemas import LifestylePreferencesCreate, LifestylePreferencesUpdate, LifestylePreferencesResponse
from backend.models.auth import require_auth  # ← was get_current_user
from uuid import UUID

router = APIRouter(tags=["Lifestyle"])

@router.post("/", response_model=LifestylePreferencesResponse)
def create_lifestyle(
    data: LifestylePreferencesCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth)  # ← was get_current_user
):
    user_id = UUID(current_user["sub"])  # ← was current_user["id"]

    existing = db.query(LifestylePreferences).filter(LifestylePreferences.user_id == user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Lifestyle preferences already exist. Use PUT to update.")

    lifestyle = LifestylePreferences(user_id=user_id, **data.model_dump())
    db.add(lifestyle)
    db.commit()
    db.refresh(lifestyle)
    return lifestyle

@router.put("/", response_model=LifestylePreferencesResponse)
def update_lifestyle(
    data: LifestylePreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth)  # ← was get_current_user
):
    user_id = UUID(current_user["sub"])  # ← was current_user["id"]

    lifestyle = db.query(LifestylePreferences).filter(LifestylePreferences.user_id == user_id).first()
    if not lifestyle:
        raise HTTPException(status_code=404, detail="Lifestyle preferences not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(lifestyle, key, value)

    db.commit()
    db.refresh(lifestyle)
    return lifestyle

@router.get("/", response_model=LifestylePreferencesResponse)
def get_lifestyle(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth)  # ← was get_current_user
):
    user_id = UUID(current_user["sub"])  # ← was current_user["id"]

    lifestyle = db.query(LifestylePreferences).filter(LifestylePreferences.user_id == user_id).first()
    if not lifestyle:
        raise HTTPException(status_code=404, detail="Lifestyle preferences not found")

    return lifestyle