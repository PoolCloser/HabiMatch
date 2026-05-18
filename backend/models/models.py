# models.py
from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.models.database import Base
import uuid


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    birthdate = Column(Date, nullable=True)
    gender = Column(String, nullable=True)
    location = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    lifestyle_preferences = relationship(
        "LifestylePreferences",
        back_populates="profile",
        uselist=False,
        primaryjoin="Profile.id == foreign(LifestylePreferences.user_id)",
    )


class LifestylePreferences(Base):
    __tablename__ = "lifestyle_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)

    sleep_behavior_score = Column(Integer, nullable=True)
    sleep_tolerance_score = Column(Integer, nullable=True)
    clean_behavior_score = Column(Integer, nullable=True)
    clean_tolerance_score = Column(Integer, nullable=True)
    noise_behavior_score = Column(Integer, nullable=True)
    noise_tolerance_score = Column(Integer, nullable=True)
    guest_behavior_score = Column(Integer, nullable=True)
    guest_tolerance_score = Column(Integer, nullable=True)
    conflict_behavior_score = Column(Integer, nullable=True)
    conflict_tolerance_score = Column(Integer, nullable=True)
    cooking_behavior_score = Column(Integer, nullable=True)
    cooking_tolerance_score = Column(Integer, nullable=True)
    cohabitation_tolerance_score = Column(Integer, nullable=True)

    smokes = Column(Boolean, nullable=True)
    ok_with_smoking = Column(Boolean, nullable=True)
    uses_marijuana = Column(Boolean, nullable=True)
    ok_with_marijuana = Column(Boolean, nullable=True)
    drinks_alcohol = Column(Boolean, nullable=True)
    ok_with_alcohol = Column(Boolean, nullable=True)
    has_pets = Column(Boolean, nullable=True)
    ok_with_pets = Column(Boolean, nullable=True)
    partner_stays_over = Column(Boolean, nullable=True)
    ok_with_partners_staying = Column(Boolean, nullable=True)
    study_or_wfh = Column(Boolean, nullable=True)

    budget_min = Column(Integer, nullable=True)
    budget_max = Column(Integer, nullable=True)
    move_in_date = Column(Date, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    profile = relationship(
        "Profile",
        back_populates="lifestyle_preferences",
        primaryjoin="foreign(LifestylePreferences.user_id) == Profile.id",
    )


class DiscoveryDecision(Base):
    __tablename__ = "discovery_decisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    target_user_id = Column(UUID(as_uuid=True), nullable=False)
    decision = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())