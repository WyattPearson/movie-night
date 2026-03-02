from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from dependencies import get_supabase, get_admin_user
from models.schemas import (
    MovieNightCreate, MovieNightUpdate, MovieNightResponse,
    AllowlistEntry, AllowlistResponse,
)
from services.genre import pick_random_genre

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Movie Nights ──────────────────────────────────────────────────────────────

@router.post("/movie-nights", response_model=MovieNightResponse, status_code=status.HTTP_201_CREATED)
async def create_movie_night(
    body: MovieNightCreate,
    _: dict = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase),
):
    # Prevent duplicate month/year
    existing = (
        supabase.table("movie_nights")
        .select("id")
        .eq("month", body.month)
        .eq("year", body.year)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="A movie night already exists for that month/year")

    row = body.model_dump()
    row["event_date"] = str(row["event_date"])
    row["event_time"] = str(row["event_time"])
    row["status"] = "pending"
    result = supabase.table("movie_nights").insert(row).execute()
    return result.data[0]


@router.get("/movie-nights/random-genre")
async def get_random_genre(_: dict = Depends(get_admin_user)):
    """Suggests a random genre for the admin to use or override."""
    return await pick_random_genre()


@router.delete("/movie-nights/{movie_night_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_movie_night(
    movie_night_id: str,
    _: dict = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase),
):
    """Delete a movie night and all its associated data (cascade)."""
    result = supabase.table("movie_nights").delete().eq("id", movie_night_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Movie night not found")


@router.patch("/movie-nights/{movie_night_id}", response_model=MovieNightResponse)
def update_movie_night(
    movie_night_id: str,
    body: MovieNightUpdate,
    _: dict = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase),
):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "event_date" in updates:
        updates["event_date"] = str(updates["event_date"])
    if "event_time" in updates:
        updates["event_time"] = str(updates["event_time"])
    if "status" in updates:
        updates["status"] = updates["status"].value if hasattr(updates["status"], "value") else updates["status"]
    if "nominations_close_at" in updates:
        updates["nominations_close_at"] = updates["nominations_close_at"].isoformat()
    if "voting_close_at" in updates:
        updates["voting_close_at"] = updates["voting_close_at"].isoformat()

    result = supabase.table("movie_nights").update(updates).eq("id", movie_night_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Movie night not found")
    return result.data[0]


# ── Allowlist ─────────────────────────────────────────────────────────────────

@router.get("/allowlist", response_model=list[AllowlistResponse])
def list_allowlist(
    _: dict = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("allowed_emails").select("*").order("added_at", desc=True).execute()
    return result.data or []


@router.post("/allowlist", response_model=AllowlistResponse, status_code=status.HTTP_201_CREATED)
def add_to_allowlist(
    body: AllowlistEntry,
    _: dict = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("allowed_emails").insert({"email": body.email}).execute()
    return result.data[0]


@router.delete("/allowlist/{email}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_allowlist(
    email: str,
    _: dict = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("allowed_emails").delete().eq("email", email).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Email not found in allowlist")


# ── Admin views ───────────────────────────────────────────────────────────────

@router.get("/nominations/{movie_night_id}")
def admin_view_nominations(
    movie_night_id: str,
    _: dict = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase),
):
    result = (
        supabase.table("nominations")
        .select("*, profiles(display_name, avatar_url)")
        .eq("movie_night_id", movie_night_id)
        .execute()
    )
    nominations = []
    for n in (result.data or []):
        profile = n.pop("profiles", {}) or {}
        n["nominator_name"] = profile.get("display_name", "Unknown")
        n["nominator_avatar"] = profile.get("avatar_url")
        nominations.append(n)
    return nominations


@router.get("/rsvps/{movie_night_id}")
def admin_view_rsvps(
    movie_night_id: str,
    _: dict = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase),
):
    result = (
        supabase.table("rsvps")
        .select("*, profiles(display_name, avatar_url)")
        .eq("movie_night_id", movie_night_id)
        .execute()
    )
    rsvps = []
    for r in (result.data or []):
        profile = r.pop("profiles", {}) or {}
        r["display_name"] = profile.get("display_name", "Unknown")
        r["avatar_url"] = profile.get("avatar_url")
        rsvps.append(r)
    return rsvps


@router.get("/votes/summary/{movie_night_id}")
def admin_vote_summary(
    movie_night_id: str,
    _: dict = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase),
):
    """Returns vote count (not individual ballots) so admin can see participation."""
    votes = (
        supabase.table("votes")
        .select("id", count="exact")
        .eq("movie_night_id", movie_night_id)
        .execute()
    )
    nominations = (
        supabase.table("nominations")
        .select("id", count="exact")
        .eq("movie_night_id", movie_night_id)
        .execute()
    )
    return {
        "vote_count": votes.count or 0,
        "nomination_count": nominations.count or 0,
    }
