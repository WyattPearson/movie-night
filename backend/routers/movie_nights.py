from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from dependencies import get_supabase, get_current_user
from models.schemas import MovieNightResponse
from datetime import datetime, timezone

router = APIRouter(prefix="/movie-nights", tags=["movie-nights"])

# Status transitions driven by deadline timestamps
_DEADLINE_TRANSITIONS = [
    ("nominations_open", "nominations_close_at", "voting_open"),
    ("voting_open",      "voting_close_at",      "voting_closed"),
]


def _maybe_advance(mn: dict, supabase: Client) -> dict:
    """If a phase deadline has passed, advance the status in-place and return the updated row."""
    now = datetime.now(timezone.utc)
    for current_status, deadline_field, next_status in _DEADLINE_TRANSITIONS:
        if mn.get("status") != current_status:
            continue
        raw = mn.get(deadline_field)
        if not raw:
            continue
        deadline = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if now >= deadline:
            updated = (
                supabase.table("movie_nights")
                .update({"status": next_status})
                .eq("id", mn["id"])
                .execute()
            )
            if updated.data:
                mn = updated.data[0]
    return mn


@router.get("/current", response_model=MovieNightResponse | None)
def get_current_movie_night(
    _: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Returns the most recent non-archived movie night, auto-advancing status if a deadline passed."""
    result = (
        supabase.table("movie_nights")
        .select("*")
        .not_.eq("status", "archived")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        return None
    return _maybe_advance(result.data[0], supabase)


@router.get("/{movie_night_id}", response_model=MovieNightResponse)
def get_movie_night(
    movie_night_id: str,
    _: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("movie_nights").select("*").eq("id", movie_night_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie night not found")
    return result.data


@router.get("/", response_model=list[MovieNightResponse])
def list_movie_nights(
    _: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Returns all movie nights ordered by most recent first."""
    result = supabase.table("movie_nights").select("*").order("created_at", desc=True).execute()
    return result.data or []
