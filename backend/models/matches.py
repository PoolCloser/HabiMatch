from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID

from backend.models.database import get_db
from backend.models.models import DiscoveryDecision
from backend.models.schemas import MatchedUser, MutualMatchesResponse
from backend.models.auth import require_auth

router = APIRouter(tags=["Matches"])


@router.get("/", response_model=MutualMatchesResponse)
def get_mutual_matches(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_auth),
):
    user_id = UUID(current_user["sub"])

    outgoing = (
        db.query(DiscoveryDecision)
        .filter(
            DiscoveryDecision.user_id == user_id,
            DiscoveryDecision.decision == "like",
        )
        .all()
    )

    liked_ids = {row.target_user_id for row in outgoing}
    if not liked_ids:
        return MutualMatchesResponse(matches=[], total=0)

    incoming = (
        db.query(DiscoveryDecision)
        .filter(
            DiscoveryDecision.target_user_id == user_id,
            DiscoveryDecision.user_id.in_(liked_ids),
            DiscoveryDecision.decision == "like",
        )
        .all()
    )

    matches = [
        MatchedUser(user_id=row.user_id, matched_at=row.created_at)
        for row in incoming
    ]

    return MutualMatchesResponse(matches=matches, total=len(matches))
