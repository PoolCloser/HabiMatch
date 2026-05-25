from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ProfileBase(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = Field(default=None, max_length=500)
    birthdate: Optional[date] = None
    gender: Optional[str] = None
    location: Optional[str] = None


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(ProfileBase):
    pass


class ProfileResponse(ProfileBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LifestylePreferencesBase(BaseModel):
    sleep_behavior_score: Optional[int] = Field(default=None, ge=1, le=10)
    sleep_tolerance_score: Optional[int] = Field(default=None, ge=1, le=10)
    clean_behavior_score: Optional[int] = Field(default=None, ge=1, le=10)
    clean_tolerance_score: Optional[int] = Field(default=None, ge=1, le=10)
    noise_behavior_score: Optional[int] = Field(default=None, ge=1, le=10)
    noise_tolerance_score: Optional[int] = Field(default=None, ge=1, le=10)
    guest_behavior_score: Optional[int] = Field(default=None, ge=1, le=10)
    guest_tolerance_score: Optional[int] = Field(default=None, ge=1, le=10)
    conflict_behavior_score: Optional[int] = Field(default=None, ge=1, le=10)
    conflict_tolerance_score: Optional[int] = Field(default=None, ge=1, le=10)
    cooking_behavior_score: Optional[int] = Field(default=None, ge=1, le=10)
    cooking_tolerance_score: Optional[int] = Field(default=None, ge=1, le=10)
    cohabitation_tolerance_score: Optional[int] = Field(default=None, ge=1, le=10)
    smokes: Optional[bool] = None
    ok_with_smoking: Optional[bool] = None
    uses_marijuana: Optional[bool] = None
    ok_with_marijuana: Optional[bool] = None
    drinks_alcohol: Optional[bool] = None
    ok_with_alcohol: Optional[bool] = None
    has_pets: Optional[bool] = None
    ok_with_pets: Optional[bool] = None
    partner_stays_over: Optional[bool] = None
    ok_with_partners_staying: Optional[bool] = None
    study_or_wfh: Optional[bool] = None
    budget_min: Optional[int] = Field(default=None, ge=0)
    budget_max: Optional[int] = Field(default=None, ge=0)
    move_in_date: Optional[date] = None


class LifestylePreferencesCreate(LifestylePreferencesBase):
    pass


class LifestylePreferencesUpdate(LifestylePreferencesBase):
    pass


class LifestylePreferencesResponse(LifestylePreferencesBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FullProfileResponse(BaseModel):
    profile: ProfileResponse
    lifestyle: Optional[LifestylePreferencesResponse] = None
