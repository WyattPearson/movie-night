from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from dependencies import get_supabase, get_current_user
from models.schemas import NominationCreate, NominationResponse

router = APIRouter(prefix="/nominations", tags=["nominations"])


@router.post("/", response_model=NominationResponse, status_code=status.HTTP_201_CREATED)
def create_nomination(
    body: NominationCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    # Verify the movie night is in nominations_open status
    mn = supabase.table("movie_nights").select("status, genre_tmdb_id").eq("id", body.movie_night_id).single().execute()
    if not mn.data:
        raise HTTPException(status_code=404, detail="Movie night not found")
    if mn.data["status"] != "nominations_open":
        raise HTTPException(status_code=400, detail="Nominations are not currently open")

    # One nomination per user per movie night (admins exempt for testing)
    profile = supabase.table("profiles").select("is_admin, display_name").eq("id", current_user["id"]).single().execute()
    is_admin = profile.data and profile.data.get("is_admin")

    if not is_admin:
        existing = (
            supabase.table("nominations")
            .select("id")
            .eq("movie_night_id", body.movie_night_id)
            .eq("user_id", current_user["id"])
            .execute()
        )
        if existing.data:
            raise HTTPException(status_code=409, detail="You have already nominated a movie this month")

    row = {
        "movie_night_id": body.movie_night_id,
        "user_id": current_user["id"],
        "tmdb_movie_id": body.tmdb_movie_id,
        "tmdb_data": body.tmdb_data,
    }
    result = supabase.table("nominations").insert(row).execute()
    nomination = result.data[0]

    nomination["nominator_name"] = profile.data["display_name"] if profile.data else None

    return nomination


@router.get("/{movie_night_id}", response_model=list[NominationResponse])
def list_nominations(
    movie_night_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Returns all nominations for a movie night.
    Nominator names are never revealed here — only the winner's nominator is
    shown on the results page once the movie night is completed.
    """
    mn = supabase.table("movie_nights").select("status").eq("id", movie_night_id).single().execute()
    if not mn.data:
        raise HTTPException(status_code=404, detail="Movie night not found")

    noms = (
        supabase.table("nominations")
        .select("id, movie_night_id, user_id, tmdb_movie_id, tmdb_data, created_at")
        .eq("movie_night_id", movie_night_id)
        .execute()
    )

    return [dict(n, nominator_name=None) for n in (noms.data or [])]


@router.delete("/{nomination_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_nomination(
    nomination_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Users can retract their own nomination while nominations are open."""
    nom = (
        supabase.table("nominations")
        .select("user_id, movie_night_id")
        .eq("id", nomination_id)
        .single()
        .execute()
    )
    if not nom.data:
        raise HTTPException(status_code=404, detail="Nomination not found")
    if nom.data["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your nomination")

    mn = supabase.table("movie_nights").select("status").eq("id", nom.data["movie_night_id"]).single().execute()
    if mn.data and mn.data["status"] != "nominations_open":
        raise HTTPException(status_code=400, detail="Nominations are closed")

    supabase.table("nominations").delete().eq("id", nomination_id).execute()
