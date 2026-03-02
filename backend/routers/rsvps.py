from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from dependencies import get_supabase, get_current_user
from models.schemas import RSVPCreate, RSVPResponse, SnackCreate, SnackResponse

router = APIRouter(tags=["rsvps"])


# ── RSVP ─────────────────────────────────────────────────────────────────────

@router.post("/rsvp", response_model=RSVPResponse, status_code=status.HTTP_200_OK)
def upsert_rsvp(
    body: RSVPCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    row = {
        "movie_night_id": body.movie_night_id,
        "user_id": current_user["id"],
        "status": body.status.value,
    }
    # Upsert on (movie_night_id, user_id) unique constraint
    result = supabase.table("rsvps").upsert(row, on_conflict="movie_night_id,user_id").execute()
    rsvp = result.data[0]

    profile = supabase.table("profiles").select("display_name, avatar_url").eq("id", current_user["id"]).single().execute()
    p = profile.data or {}
    rsvp["display_name"] = p.get("display_name", "")
    rsvp["avatar_url"] = p.get("avatar_url")
    return rsvp


@router.get("/rsvp/{movie_night_id}", response_model=list[RSVPResponse])
def list_rsvps(
    movie_night_id: str,
    _: dict = Depends(get_current_user),
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
        r["display_name"] = profile.get("display_name", "")
        r["avatar_url"] = profile.get("avatar_url")
        rsvps.append(r)
    return rsvps


# ── Snacks ────────────────────────────────────────────────────────────────────

@router.post("/snacks", response_model=SnackResponse, status_code=status.HTTP_201_CREATED)
def add_snack(
    body: SnackCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not body.item.strip():
        raise HTTPException(status_code=400, detail="Item cannot be empty")

    row = {
        "movie_night_id": body.movie_night_id,
        "user_id": current_user["id"],
        "item": body.item.strip(),
    }
    result = supabase.table("snack_signups").insert(row).execute()
    snack = result.data[0]

    profile = supabase.table("profiles").select("display_name").eq("id", current_user["id"]).single().execute()
    snack["display_name"] = (profile.data or {}).get("display_name", "")
    return snack


@router.delete("/snacks/{snack_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_snack(
    snack_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    snack = supabase.table("snack_signups").select("user_id").eq("id", snack_id).single().execute()
    if not snack.data:
        raise HTTPException(status_code=404, detail="Snack not found")
    if snack.data["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your snack signup")
    supabase.table("snack_signups").delete().eq("id", snack_id).execute()


@router.get("/snacks/{movie_night_id}", response_model=list[SnackResponse])
def list_snacks(
    movie_night_id: str,
    _: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = (
        supabase.table("snack_signups")
        .select("*, profiles(display_name)")
        .eq("movie_night_id", movie_night_id)
        .execute()
    )
    snacks = []
    for s in (result.data or []):
        profile = s.pop("profiles", {}) or {}
        s["display_name"] = profile.get("display_name", "")
        snacks.append(s)
    return snacks
